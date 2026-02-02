import { resolveMountConfig, InMemory, fs } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";

let isInitialized = false;

export async function initFileSystem(onProgress) {
    if (isInitialized) return;

    try {
        if (onProgress) onProgress("Mounting root...");
        // / is mounted by default, but we can re-mount it if needed or just skip
        // For now, let's just ensure we have our mounts.
        // If / is already mounted, we might need to unmount it first to use manual mount.
        try {
            fs.umount('/');
        } catch (e) {
            // Root might not be unmountable or not mounted
        }
        const rootFs = await resolveMountConfig(InMemory);
        fs.mount('/', rootFs);

        if (onProgress) onProgress("Mounting C: drive...");
        const cDriveFs = await resolveMountConfig({
            backend: IndexedDB,
            name: "win98-c-drive",
        });
        // Ensure C: mount point exists in root
        if (!fs.existsSync('/C:')) {
            await fs.promises.mkdir('/C:');
        }
        fs.mount('/C:', cDriveFs);

        if (onProgress) onProgress("Checking system folders...");
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
        if (!fs.existsSync('/C:/WINDOWS/Temp')) {
            await fs.promises.mkdir('/C:/WINDOWS/Temp');
        }

        // Ensure Program Files/Doom exists
        if (!fs.existsSync('/C:/Program Files')) {
            await fs.promises.mkdir('/C:/Program Files');
        }
        if (!fs.existsSync('/C:/Program Files/Doom')) {
            await fs.promises.mkdir('/C:/Program Files/Doom');
        }
        if (!fs.existsSync('/C:/Program Files/Pinball')) {
            await fs.promises.mkdir('/C:/Program Files/Pinball');
        }
        // Ensure WINDOWS/Desktop directory exists for the Desktop shell extension
        if (!fs.existsSync('/C:/WINDOWS/Desktop')) {
            await fs.promises.mkdir('/C:/WINDOWS/Desktop');
        }

        isInitialized = true;
        console.log("ZenFS initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize ZenFS:", error);
        throw error;
    }
}
