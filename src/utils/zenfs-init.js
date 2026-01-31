import { configure, InMemory, fs } from "@zenfs/core";
import { IndexedDB, WebAccess } from "@zenfs/dom";
import { getItem, LOCAL_STORAGE_KEYS } from "./localStorage.js";
import { getHandle } from "./handle-persistence.js";

let isInitialized = false;

export async function initFileSystem() {
    if (isInitialized) return;

    try {
        const storageType = getItem(LOCAL_STORAGE_KEYS.C_DRIVE_STORAGE_TYPE) || 'indexeddb';
        let cDriveBackend = {
            backend: IndexedDB,
            name: "win98-c-drive",
        };

        if (storageType === 'local') {
            try {
                const handle = await getHandle('c-drive');
                if (handle) {
                    const permission = await handle.queryPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        cDriveBackend = await WebAccess.create({ handle });
                    } else {
                        console.warn("Permission not granted for local C: drive, falling back to IndexedDB.");
                    }
                }
            } catch (e) {
                console.error("Failed to load local C: drive handle:", e);
            }
        }

        await configure({
            mounts: {
                "/": InMemory,
                "/C:": cDriveBackend,
            },
        });

        // Ensure A: and E: drive directory exists in the root
        if (!fs.existsSync('/A:')) {
            await fs.promises.mkdir('/A:');
        }
        if (!fs.existsSync('/E:')) {
            await fs.promises.mkdir('/E:');
        }

        // Ensure WINDOWS directory exists on C: for persistence
        if (!fs.existsSync('/C:/WINDOWS')) {
            await fs.promises.mkdir('/C:/WINDOWS');
        }

        isInitialized = true;
        console.log("ZenFS initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize ZenFS:", error);
    }
}
