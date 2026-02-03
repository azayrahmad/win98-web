import { fs, resolveMountConfig } from "@zenfs/core";
import { IndexedDB, WebAccess } from "@zenfs/dom";
import { ShowDialogWindow } from "../components/DialogWindow.js";
import { saveLocalFolderHandle, clearLocalFolderHandle } from "./localFolderUtils.js";
import { wrapWebAccess } from "./zenfs-init.js";
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
        count++; // count the directory itself? or just files?
        const files = await fs.promises.readdir(path);
        for (const file of files) {
            count += await countItems(joinPath(path, file));
        }
    } else {
        count++;
    }
    return count;
}

async function copyRecursive(src, dest, dialog) {
    if (dialog && dialog.cancelled) return;
    const stats = await fs.promises.stat(src);
    if (stats.isDirectory()) {
        try {
            await fs.promises.mkdir(dest, { recursive: true });
        } catch (e) {}
        const files = await fs.promises.readdir(src);
        for (const file of files) {
            await copyRecursive(joinPath(src, file), joinPath(dest, file), dialog);
        }
    } else {
        const data = await fs.promises.readFile(src);
        await fs.promises.writeFile(dest, data);
        if (dialog) {
            dialog.processedSize += stats.size;
            dialog.processedItems++;
            dialog.update(src, getParentPath(src), getParentPath(dest), stats.size);
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

            // Overwrite: we need to clear it first or just let copyRecursive overwrite
            // To be safe, let's delete it if we can
            try {
                await handle.removeEntry('win98-c-drive', { recursive: true });
            } catch (e) {
                console.warn("Failed to delete existing win98-c-drive, will attempt to overwrite files", e);
            }
        }

        win98Handle = await handle.getDirectoryHandle('win98-c-drive', { create: true });

        // Mount temporary target
        const targetFs = await resolveMountConfig({
            backend: WebAccess,
            handle: win98Handle,
        });
        wrapWebAccess(targetFs);
        const TEMP_MOUNT = '/temp-migration-target';
        fs.mount(TEMP_MOUNT, targetFs);

        const totalSize = await getTotalSize('/C:');
        const totalItems = await countItems('/C:');
        const dialog = new ProgressBarDialogWindow('copy', totalItems, totalSize);
        dialog.fromToEl.textContent = "Moving C: contents to local folder...";

        try {
            await copyRecursive('/C:', TEMP_MOUNT, dialog);
            if (dialog.cancelled) {
                fs.umount(TEMP_MOUNT);
                return;
            }

            await saveLocalFolderHandle(handle);
            fs.umount(TEMP_MOUNT);
            dialog.close();

            ShowDialogWindow({
                title: "Migration Complete",
                text: "Successfully migrated C: drive to local folder. Please restart the system to apply changes.",
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
        // Mount the original IndexedDB temporarily
        const targetFs = await resolveMountConfig({
            backend: IndexedDB,
            name: "win98-c-drive",
        });
        const TEMP_MOUNT = '/temp-migration-target-idb';
        fs.mount(TEMP_MOUNT, targetFs);

        // Optional: clear the target IndexedDB before copying
        // For simplicity, we'll just overwrite.

        const totalSize = await getTotalSize('/C:');
        const totalItems = await countItems('/C:');
        const dialog = new ProgressBarDialogWindow('copy', totalItems, totalSize);
        dialog.fromToEl.textContent = "Moving C: contents back to IndexedDB...";

        try {
            await copyRecursive('/C:', TEMP_MOUNT, dialog);
            if (dialog.cancelled) {
                fs.umount(TEMP_MOUNT);
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
    }
}
