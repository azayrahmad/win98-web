import { configure, InMemory, fs } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";

let isInitialized = false;

export async function initFileSystem() {
    if (isInitialized) return;

    try {
        await configure({
            mounts: {
                "/": InMemory,
                "/C:": {
                    backend: IndexedDB,
                    name: "win98-c-drive",
                },
            },
        });

        // Ensure A: and E: drive directory exists in the root
        if (!fs.existsSync('/A:')) {
            await fs.promises.mkdir('/A:');
        }
        if (!fs.existsSync('/E:')) {
            await fs.promises.mkdir('/E:');
        }

        isInitialized = true;
        console.log("ZenFS initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize ZenFS:", error);
    }
}
