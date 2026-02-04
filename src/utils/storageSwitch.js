import { fs, resolveMountConfig, mount, umount } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";
import { ShowDialogWindow } from "../components/DialogWindow.js";
import { joinPath } from "../apps/zenexplorer/navigation/PathUtils.js";

const DB_NAME = "LocalFolderDB";
const STORE_NAME = "handles";
const HANDLE_KEY = "c-drive-handle";

/**
 * Open the IndexedDB for storage handles
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.error);
  });
}

/**
 * Get the stored FileSystemDirectoryHandle
 */
export async function getStoredHandle() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("Failed to get stored handle:", e);
    return null;
  }
}

/**
 * Store a FileSystemDirectoryHandle
 */
export async function storeHandle(handle) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(handle, HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove the stored handle
 */
export async function removeStoredHandle() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if the target directory handle is empty
 */
async function isDirectoryEmpty(handle) {
    for await (const entry of handle.values()) {
        return false;
    }
    return true;
}

/**
 * Copy a file from ZenFS to a native FileSystemDirectoryHandle
 */
async function copyToNative(zenfsPath, targetHandle, fileName, onProgress) {
    const data = await fs.promises.readFile(zenfsPath);
    // Escape filename with .z
    const escapedName = fileName + ".z";
    const fileHandle = await targetHandle.getFileHandle(escapedName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    if (onProgress) onProgress(data.length);
}

/**
 * Recursively copy a directory from ZenFS to a native FileSystemDirectoryHandle
 */
async function copyDirectoryToNative(zenfsPath, targetHandle, onProgress) {
    const entries = await fs.promises.readdir(zenfsPath);
    for (const entry of entries) {
        const fullPath = joinPath(zenfsPath, entry);
        const stats = await fs.promises.stat(fullPath);
        if (stats.isDirectory()) {
            const escapedName = entry + ".z";
            const subHandle = await targetHandle.getDirectoryHandle(escapedName, { create: true });
            await copyDirectoryToNative(fullPath, subHandle, onProgress);
        } else {
            await copyToNative(fullPath, targetHandle, entry, onProgress);
        }
    }
}

/**
 * Migrate from ZenFS (IndexedDB) to a native local folder
 */
export async function migrateToLocalFolder(targetHandle, onProgress) {
    if (!(await isDirectoryEmpty(targetHandle))) {
        const confirmed = await new Promise(resolve => {
            ShowDialogWindow({
                title: "Folder Not Empty",
                text: "The selected folder is not empty. Do you want to overwrite existing files?",
                buttons: [
                    { label: "Yes", action: (win) => { win.close(); resolve(true); } },
                    { label: "No", action: (win) => { win.close(); resolve(false); } }
                ]
            });
        });
        if (!confirmed) return false;
    }

    await copyDirectoryToNative("/C:", targetHandle, onProgress);
    await storeHandle(targetHandle);
    return true;
}

/**
 * Recursively copy a directory in ZenFS
 */
async function copyDirectoryRecursive(src, dest, onProgress) {
    if (!fs.existsSync(dest)) {
        await fs.promises.mkdir(dest, { recursive: true });
    }
    const entries = await fs.promises.readdir(src);
    for (const entry of entries) {
        const srcPath = joinPath(src, entry);
        const destPath = joinPath(dest, entry);
        const stats = await fs.promises.stat(srcPath);
        if (stats.isDirectory()) {
            await copyDirectoryRecursive(srcPath, destPath, onProgress);
        } else {
            const data = await fs.promises.readFile(srcPath);
            await fs.promises.writeFile(destPath, data);
            if (onProgress) onProgress(data.length);
        }
    }
}

/**
 * Migration from Local Folder back to IndexedDB
 */
export async function migrateToIndexedDB(onProgress) {
    // 1. Create/resolve the IndexedDB mount config
    const idbFs = await resolveMountConfig({
        backend: IndexedDB,
        name: "win98-c-drive",
    });

    // 2. Mount it temporarily
    const tempMount = "/temp-c";
    if (!fs.existsSync(tempMount)) {
        await fs.promises.mkdir(tempMount);
    }
    mount(tempMount, idbFs);

    try {
        // 3. Copy everything from /C: to /temp-c
        // (Assuming /C: is currently the local folder)
        await copyDirectoryRecursive("/C:", tempMount, onProgress);

        // 4. Remove the stored handle
        await removeStoredHandle();
        return true;
    } catch (e) {
        console.error("Failed to migrate to IndexedDB:", e);
        throw e;
    } finally {
        umount(tempMount);
    }
}
