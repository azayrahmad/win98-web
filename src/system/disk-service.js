/**
 * DiskService manages directory handles for removable disks using IndexedDB.
 */
export class DiskService {
  constructor() {
    this.DB_NAME = 'removable-disks-db';
    this.STORE_NAME = 'removable-disks';
  }

  async _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  async saveDiskHandle(letter, handle) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.put(handle, letter.toUpperCase());
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async removeDiskHandle(letter) {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.delete(letter.toUpperCase());
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAllDiskHandles() {
    const db = await this._openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
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
}
