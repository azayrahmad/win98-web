/**
 * Utility to persist FileSystemDirectoryHandles for removable disks in IndexedDB
 */

const DB_NAME = 'removable-disks-db';
const STORE_NAME = 'removable-disks';

/**
 * Opens the IndexedDB for removable disks
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

/**
 * Saves a directory handle for a specific drive letter
 * @param {string} letter - Drive letter (e.g., 'F')
 * @param {FileSystemDirectoryHandle} handle
 * @returns {Promise<void>}
 */
export async function saveDiskHandle(letter, handle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.put(handle, letter.toUpperCase());
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Removes a directory handle for a specific drive letter
 * @param {string} letter - Drive letter (e.g., 'F')
 * @returns {Promise<void>}
 */
export async function removeDiskHandle(letter) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(letter.toUpperCase());
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Retrieves all persisted directory handles
 * @returns {Promise<Object>} Mapping of drive letter to handle
 */
export async function getAllDiskHandles() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const handles = {};
        const cursorRequest = store.openCursor();

        cursorRequest.onsuccess = (e) => {
            const cursor = e.target.result;
            if (cursor) {
                handles[cursor.key] = cursor.value;
                cursor.continue();
            } else {
                resolve(handles);
            }
        };

        cursorRequest.onerror = () => reject(cursorRequest.error);
    });
}
