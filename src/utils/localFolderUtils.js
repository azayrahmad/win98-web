const DB_NAME = 'LocalFolderDB';
const STORE_NAME = 'handles';
const KEY_NAME = 'c-drive-handle';

/**
 * Gets the IndexedDB database instance.
 * @returns {Promise<IDBDatabase>}
 */
function getDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Saves the local folder handle to IndexedDB.
 * @param {FileSystemDirectoryHandle} handle
 * @returns {Promise<void>}
 */
export async function saveLocalFolderHandle(handle) {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(handle, KEY_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Retrieves the local folder handle from IndexedDB.
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
export async function getLocalFolderHandle() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(KEY_NAME);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Clears the local folder handle from IndexedDB.
 * @returns {Promise<void>}
 */
export async function clearLocalFolderHandle() {
    const db = await getDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(KEY_NAME);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

/**
 * Checks if a local folder handle is stored and should be used.
 * @returns {Promise<boolean>}
 */
export async function isLocalFolderEnabled() {
    const handle = await getLocalFolderHandle();
    return !!handle;
}

/**
 * Checks if the File System Access API is supported.
 * @returns {boolean}
 */
export function isFileSystemAccessSupported() {
    return 'showDirectoryPicker' in window;
}
