import { fs, resolveMountConfig } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";
import { ShowDialogWindow } from "../components/DialogWindow.js";
import { saveLocalFolderHandle, clearLocalFolderHandle, getLocalFolderHandle, escapeName, unescapeName } from "./localFolderUtils.js";
import { ProgressBarDialogWindow } from "../apps/zenexplorer/interface/ProgressBarDialogWindow.js";
import { joinPath, getParentPath } from "../apps/zenexplorer/navigation/PathUtils.js";

async function getTotalSize(path) {
    let total = 0;
    const stats = await fs.promises.stat(path);
    if (stats.isDirectory()) {
        const files = await fs.promises.readdir(path);
        for (const file of files) {
            total += await getTotalSize(joinPath(path, file));
        }
    } else {
        total += stats.size;
    }
    return total;
}

async function countItems(path) {
    let count = 0;
    const stats = await fs.promises.stat(path);
    if (stats.isDirectory()) {
        count++;
        const files = await fs.promises.readdir(path);
        for (const file of files) {
            count += await countItems(joinPath(path, file));
        }
    } else {
        count++;
    }
    return count;
}

async function getHandleStats(handle) {
    let size = 0;
    let items = 0;
    for await (const entry of handle.values()) {
        items++;
        if (entry.kind === 'directory') {
            const stats = await getHandleStats(entry);
            size += stats.size;
            items += stats.items;
        } else {
            const file = await entry.getFile();
            size += file.size;
        }
    }
    return { size, items };
}

async function copyRecursiveToHandle(srcPath, destHandle, dialog) {
    if (dialog && dialog.cancelled) return;
    const stats = await fs.promises.stat(srcPath);

    if (stats.isDirectory()) {
        const files = await fs.promises.readdir(srcPath);
        for (const file of files) {
            const childSrcPath = joinPath(srcPath, file);
            const childStats = await fs.promises.stat(childSrcPath);
            const escapedName = escapeName(file);

            if (childStats.isDirectory()) {
                const subHandle = await destHandle.getDirectoryHandle(escapedName, { create: true });
                await copyRecursiveToHandle(childSrcPath, subHandle, dialog);
            } else {
                const fileHandle = await destHandle.getFileHandle(escapedName, { create: true });
                const writable = await fileHandle.createWritable();
                const data = await fs.promises.readFile(childSrcPath);
                await writable.write(data);
                await writable.close();

                if (dialog) {
                    dialog.processedSize += childStats.size;
                    dialog.processedItems++;
                    dialog.update(childSrcPath, getParentPath(childSrcPath), "Local Folder", childStats.size);
                }
            }
        }
    }
}

async function copyRecursiveFromHandle(srcHandle, destPath, dialog) {
    if (dialog && dialog.cancelled) return;

    for await (const entry of srcHandle.values()) {
        const unescapedName = unescapeName(entry.name);
        const childDestPath = joinPath(destPath, unescapedName);

        if (entry.kind === 'directory') {
            try {
                await fs.promises.mkdir(childDestPath, { recursive: true });
            } catch (e) {}
            await copyRecursiveFromHandle(entry, childDestPath, dialog);
        } else {
            const file = await entry.getFile();
            const buffer = await file.arrayBuffer();
            await fs.promises.writeFile(childDestPath, new Uint8Array(buffer));

            if (dialog) {
                dialog.processedSize += file.size;
                dialog.processedItems++;
                dialog.update(entry.name, "Local Folder", getParentPath(childDestPath), file.size);
            }
        }
    }
}

export async function switchToLocalFolder() {
    if (!('showDirectoryPicker' in window)) {
        ShowDialogWindow({
            title: "Not Supported",
            text: "Your browser does not support the File System Access API.",
            buttons: [{ label: "OK" }]
        });
        return;
    }

    try {
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });

        let win98Handle;
        let exists = false;
        try {
            win98Handle = await handle.getDirectoryHandle('win98-c-drive');
            exists = true;
        } catch (e) {
            // Does not exist
        }

        if (exists) {
            const result = await new Promise((resolve) => {
                ShowDialogWindow({
                    title: "Folder Already Exists",
                    text: "The folder already contains 'win98-c-drive'. Would you like to use the existing data or overwrite it with current IndexedDB data?",
                    buttons: [
                        { label: "Use Existing", action: () => { resolve('existing'); return true; } },
                        { label: "Overwrite", action: () => { resolve('overwrite'); return true; } },
                        { label: "Cancel", action: () => { resolve('cancel'); return true; } }
                    ]
                });
            });

            if (result === 'cancel') return;
            if (result === 'existing') {
                await saveLocalFolderHandle(handle);
                ShowDialogWindow({
                    title: "Storage Switched",
                    text: "C: drive has been linked to the local folder. Please restart the system to apply changes.",
                    buttons: [{ label: "OK", action: () => { location.reload(); } }]
                });
                return;
            }

            try {
                await handle.removeEntry('win98-c-drive', { recursive: true });
            } catch (e) {
                console.warn("Failed to delete existing win98-c-drive, will attempt to overwrite files", e);
            }
        }

        win98Handle = await handle.getDirectoryHandle('win98-c-drive', { create: true });

        const totalSize = await getTotalSize('/C:');
        const totalItems = await countItems('/C:');
        const dialog = new ProgressBarDialogWindow('copy', totalItems, totalSize);
        dialog.fromToEl.textContent = "Moving C: contents to local folder...";

        try {
            await copyRecursiveToHandle('/C:', win98Handle, dialog);
            if (dialog.cancelled) {
                dialog.close();
                return;
            }

            await saveLocalFolderHandle(handle);
            dialog.close();

            ShowDialogWindow({
                title: "Migration Complete",
                text: "Successfully migrated C: drive to local folder. Please restart the system to apply changes.",
                buttons: [{ label: "Restart Now", action: () => { location.reload(); } }]
            });
        } catch (error) {
            console.error("Migration failed:", error);
            dialog.close();
            ShowDialogWindow({
                title: "Migration Failed",
                text: "An error occurred during migration: " + error.message,
                buttons: [{ label: "OK" }]
            });
        }

    } catch (error) {
        if (error.name === 'AbortError') return;
        console.error("Error during storage switch:", error);
    }
}

export async function switchToIndexedDB() {
    const confirm = await new Promise((resolve) => {
        ShowDialogWindow({
            title: "Confirm Switch",
            text: "Are you sure you want to switch back to IndexedDB? Current C: drive contents in the local folder will be copied back to IndexedDB.",
            buttons: [
                { label: "Yes", action: () => { resolve(true); return true; } },
                { label: "No", action: () => { resolve(false); return true; } }
            ]
        });
    });

    if (!confirm) return;

    try {
        const handle = await getLocalFolderHandle();
        if (!handle) {
             throw new Error("Local folder handle not found.");
        }

        // Check permission
        const permission = await handle.queryPermission({ mode: 'readwrite' });
        if (permission !== 'granted') {
             const newPermission = await handle.requestPermission({ mode: 'readwrite' });
             if (newPermission !== 'granted') {
                 throw new Error("Permission denied to access local folder.");
             }
        }

        const win98Handle = await handle.getDirectoryHandle('win98-c-drive');

        const targetFs = await resolveMountConfig({
            backend: IndexedDB,
            name: "win98-c-drive",
        });
        const TEMP_MOUNT = '/temp-migration-target-idb';
        fs.mount(TEMP_MOUNT, targetFs);

        const stats = await getHandleStats(win98Handle);
        const dialog = new ProgressBarDialogWindow('copy', stats.items, stats.size);
        dialog.fromToEl.textContent = "Moving C: contents back to IndexedDB...";

        try {
            await copyRecursiveFromHandle(win98Handle, TEMP_MOUNT, dialog);
            if (dialog.cancelled) {
                fs.umount(TEMP_MOUNT);
                dialog.close();
                return;
            }

            await clearLocalFolderHandle();
            fs.umount(TEMP_MOUNT);
            dialog.close();

            ShowDialogWindow({
                title: "Switch Complete",
                text: "C: drive will use IndexedDB on next boot. Please restart the system.",
                buttons: [{ label: "Restart Now", action: () => { location.reload(); } }]
            });
        } catch (error) {
            console.error("Migration failed:", error);
            fs.umount(TEMP_MOUNT);
            dialog.close();
            ShowDialogWindow({
                title: "Migration Failed",
                text: "An error occurred during migration: " + error.message,
                buttons: [{ label: "OK" }]
            });
        }
    } catch (error) {
        console.error("Error during storage switch:", error);
        ShowDialogWindow({
            title: "Error",
            text: "Failed to switch storage: " + error.message,
            buttons: [{ label: "OK" }]
        });
    }
}
