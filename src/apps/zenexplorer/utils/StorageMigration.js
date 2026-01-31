import { fs, mount, umount, mounts } from "@zenfs/core";
import { WebAccess, IndexedDB } from "@zenfs/dom";
import { setItem, LOCAL_STORAGE_KEYS } from "../../../utils/localStorage.js";
import { storeHandle, removeHandle } from "../../../utils/handle-persistence.js";
import { ShowDialogWindow } from "../../../components/DialogWindow.js";
import { ProgressBarDialogWindow } from "../components/ProgressBarDialogWindow.js";
import { joinPath, getParentPath } from "./PathUtils.js";

/**
 * Handles migration of C: drive between IndexedDB and Local Folder
 */

export async function migrateCDrive(targetType) {
    if (targetType === 'local') {
        return migrateToLocal();
    } else {
        return migrateToIndexedDB();
    }
}

async function migrateToLocal() {
    try {
        const handle = await window.showDirectoryPicker({
            mode: 'readwrite'
        });

        const dialog = new ProgressBarDialogWindow("copy", 0, 0);
        dialog.win.setTitle("Migrating C: Drive to Local Folder");

        try {
            // 1. Mount target temporarily
            const targetFs = await WebAccess.create({ handle });
            const tempPath = '/temp_migration';
            if (!fs.existsSync(tempPath)) {
                await fs.promises.mkdir(tempPath);
            }
            mount(tempPath, targetFs);

            // 2. Calculate total size
            const totalSize = await getRecursiveSize('/C:');
            dialog.totalSize = totalSize;

            // 3. Copy
            await copyRecursive('/C:', tempPath, dialog);

            // 4. Save settings and clear source
            await storeHandle('c-drive', handle);
            setItem(LOCAL_STORAGE_KEYS.C_DRIVE_STORAGE_TYPE, 'local');

            // Optional: Clear IndexedDB to save space (agreed with user)
            try {
                dialog.win.setTitle("Cleaning up IndexedDB...");
                await clearDirectoryContents('/C:');
            } catch (e) {
                console.warn("Failed to clear IndexedDB after migration:", e);
            }

            // 5. Cleanup
            umount(tempPath);
            await fs.promises.rmdir(tempPath);

            dialog.close();

            ShowDialogWindow({
                title: "Storage Migration",
                text: "Migration complete. The changes will take effect after you restart azOS. Would you like to restart now?",
                buttons: [
                    { label: "Restart Now", action: () => window.location.reload() },
                    { label: "Later", isDefault: true }
                ],
                modal: true
            });
            return true;
        } catch (e) {
            dialog.close();
            throw e;
        }
    } catch (e) {
        if (e.name !== 'AbortError') {
            console.error("Migration failed:", e);
            alert("Migration failed: " + e.message);
        }
        return false;
    }
}

async function migrateToIndexedDB() {
    try {
        const dialog = new ProgressBarDialogWindow("copy", 0, 0);
        dialog.win.setTitle("Migrating C: Drive to IndexedDB");

        try {
            // 1. Mount target temporarily
            const targetFs = await IndexedDB.create({ name: 'win98-c-drive' });
            const tempPath = '/temp_migration';
            if (!fs.existsSync(tempPath)) {
                await fs.promises.mkdir(tempPath);
            }
            mount(tempPath, targetFs);

            // 2. Calculate total size
            const totalSize = await getRecursiveSize('/C:');
            dialog.totalSize = totalSize;

            // 3. Copy
            await copyRecursive('/C:', tempPath, dialog);

            // 4. Save settings and clear source
            await removeHandle('c-drive');
            setItem(LOCAL_STORAGE_KEYS.C_DRIVE_STORAGE_TYPE, 'indexeddb');

            // Optional: Clear Local Folder to save space
            try {
                dialog.win.setTitle("Cleaning up local folder...");
                await clearDirectoryContents('/C:');
            } catch (e) {
                console.warn("Failed to clear local folder after migration:", e);
            }

            // 5. Cleanup
            umount(tempPath);
            await fs.promises.rmdir(tempPath);

            dialog.close();

            ShowDialogWindow({
                title: "Storage Migration",
                text: "Migration complete. The changes will take effect after you restart azOS. Would you like to restart now?",
                buttons: [
                    { label: "Restart Now", action: () => window.location.reload() },
                    { label: "Later", isDefault: true }
                ],
                modal: true
            });
            return true;
        } catch (e) {
            dialog.close();
            throw e;
        }
    } catch (e) {
        console.error("Migration failed:", e);
        alert("Migration failed: " + e.message);
        return false;
    }
}

async function getRecursiveSize(path) {
    let size = 0;
    try {
        const files = await fs.promises.readdir(path);
        for (const file of files) {
            if (file === '.zen_layout.json') continue; // Skip layout files if preferred, but usually we want them
            const fullPath = joinPath(path, file);
            const stats = await fs.promises.stat(fullPath);
            if (stats.isDirectory()) {
                size += await getRecursiveSize(fullPath);
            } else {
                size += stats.size;
            }
        }
    } catch (e) {
        console.warn(`Failed to get size for ${path}:`, e);
    }
    return size;
}

async function copyRecursive(src, dest, dialog) {
    if (dialog.cancelled) return;

    const stats = await fs.promises.stat(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            await fs.promises.mkdir(dest, { recursive: true });
        }
        const files = await fs.promises.readdir(src);
        for (const file of files) {
            if (dialog.cancelled) return;
            await copyRecursive(joinPath(src, file), joinPath(dest, file), dialog);
        }
    } else {
        const sourceDir = getParentPath(src);
        const destDir = getParentPath(dest);

        // Use a chunked copy for progress reporting
        const bufferSize = 256 * 1024; // 256KB
        const buffer = new Uint8Array(bufferSize);
        let bytesReadTotal = 0;

        const handleIn = await fs.promises.open(src, 'r');
        const handleOut = await fs.promises.open(dest, 'w');

        try {
            while (bytesReadTotal < stats.size) {
                if (dialog.cancelled) break;

                const { bytesRead } = await handleIn.read(buffer, 0, bufferSize, bytesReadTotal);
                if (bytesRead === 0) break;

                await handleOut.write(buffer, 0, bytesRead, bytesReadTotal);
                bytesReadTotal += bytesRead;

                dialog.update(src, sourceDir, destDir, bytesReadTotal);
            }
        } finally {
            await handleIn.close();
            await handleOut.close();
        }

        dialog.finishItem(stats.size);
    }
}

async function clearDirectoryContents(path) {
    const files = await fs.promises.readdir(path);
    for (const file of files) {
        const fullPath = joinPath(path, file);
        try {
            const stats = await fs.promises.stat(fullPath);
            if (stats.isDirectory()) {
                await removeRecursive(fullPath);
            } else {
                await fs.promises.unlink(fullPath);
            }
        } catch (e) {
            console.warn(`Failed to delete ${fullPath}:`, e);
        }
    }
}

async function removeRecursive(path) {
    const files = await fs.promises.readdir(path);
    for (const file of files) {
        const fullPath = joinPath(path, file);
        const stats = await fs.promises.stat(fullPath);
        if (stats.isDirectory()) {
            await removeRecursive(fullPath);
        } else {
            await fs.promises.unlink(fullPath);
        }
    }
    await fs.promises.rmdir(path);
}
