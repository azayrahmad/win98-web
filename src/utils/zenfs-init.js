import { resolveMountConfig, InMemory, fs } from "@zenfs/core";
import { IndexedDB, WebAccess } from "@zenfs/dom";
import { migrateToZenFS, PINNED_PATH, START_MENU_PATH, FAVORITES_PATH } from "./startMenuUtils.js";
import startMenuConfig from "../config/startmenu.js";
import { getStartupApps } from "./startupManager.js";
import { apps } from "../config/apps.js";
import { existsAsync } from "./zenfs-utils.js";

let isInitialized = false;

export async function initFileSystem(onProgress, localFolderHandle = null) {
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
        let cDriveFs;
        if (localFolderHandle) {
            try {
                // Try to get win98-c-drive subfolder handle
                const subfolderHandle = await localFolderHandle.getDirectoryHandle('win98-c-drive', { create: true });
                cDriveFs = await resolveMountConfig({
                    backend: WebAccess,
                    handle: subfolderHandle,
                });
                console.log("C: drive mounted from local folder.");
            } catch (e) {
                console.error("Failed to mount local folder, falling back to IndexedDB:", e);
                cDriveFs = await resolveMountConfig({
                    backend: IndexedDB,
                    name: "win98-c-drive",
                });
            }
        } else {
            cDriveFs = await resolveMountConfig({
                backend: IndexedDB,
                name: "win98-c-drive",
            });
        }
        // Ensure C: mount point exists in root
        if (!(await existsAsync('/C:'))) {
            await fs.promises.mkdir('/C:');
        }
        fs.mount('/C:', cDriveFs);

        if (onProgress) onProgress("Checking system folders...");
        // Ensure A: and E: drive directory exists in the root
        if (!(await existsAsync('/A:'))) {
            await fs.promises.mkdir('/A:');
        }
        if (!(await existsAsync('/E:'))) {
            await fs.promises.mkdir('/E:');
        }

        // Ensure WINDOWS directory exists on C: for persistence
        if (!(await existsAsync('/C:/WINDOWS'))) {
            await fs.promises.mkdir('/C:/WINDOWS');
        }

        // Ensure Program Files/Doom exists
        if (!(await existsAsync('/C:/Program Files'))) {
            await fs.promises.mkdir('/C:/Program Files');
        }
        if (!(await existsAsync('/C:/Program Files/Doom'))) {
            await fs.promises.mkdir('/C:/Program Files/Doom');
        }
        // Ensure WINDOWS/Desktop directory exists for the Desktop shell extension
        if (!(await existsAsync('/C:/WINDOWS/Desktop'))) {
            await fs.promises.mkdir('/C:/WINDOWS/Desktop');
        }

        // Ensure My Documents directory exists
        if (!(await existsAsync('/C:/My Documents'))) {
            await fs.promises.mkdir('/C:/My Documents');
        }

        if (onProgress) onProgress("Initializing Start Menu...");
        // Ensure PINNED_PATH exists (C:/WINDOWS/Start Menu)
        if (!(await existsAsync(PINNED_PATH))) {
            await fs.promises.mkdir(PINNED_PATH, { recursive: true });
        }

        // Ensure About shortcut exists in PINNED_PATH
        const aboutLnkPath = `${PINNED_PATH}/About.lnk`;
        if (!(await existsAsync(aboutLnkPath))) {
            await fs.promises.writeFile(aboutLnkPath, JSON.stringify({
                type: "shortcut",
                appId: "about",
            }, null, 2));
        }

        if (!(await existsAsync(START_MENU_PATH))) {
            const programsConfig = startMenuConfig.find(item => item.label === "Programs");
            if (programsConfig && programsConfig.submenu) {
                await migrateToZenFS(programsConfig.submenu, START_MENU_PATH);
            }

            // Migrate startup apps from localStorage to ZenFS
            const startupApps = await getStartupApps();
            if (startupApps.length > 0) {
                const startupPath = `${START_MENU_PATH}/StartUp`;
                if (!(await existsAsync(startupPath))) {
                    await fs.promises.mkdir(startupPath, { recursive: true });
                }
                for (const appId of startupApps) {
                    const app = apps.find(a => a.id === appId);
                    const label = app ? app.title : appId;
                    const lnkPath = `${startupPath}/${label}.lnk`;
                    if (!(await existsAsync(lnkPath))) {
                        await fs.promises.writeFile(lnkPath, JSON.stringify({
                            type: "shortcut",
                            appId: appId,
                        }, null, 2));
                    }
                }
            }
        }

        if (onProgress) onProgress("Initializing Favorites...");
        if (!(await existsAsync(FAVORITES_PATH))) {
            const favoritesConfig = startMenuConfig.find(item => item.label === "Favorites");
            if (favoritesConfig && favoritesConfig.submenu) {
                await migrateToZenFS(favoritesConfig.submenu, FAVORITES_PATH);
            }
        }

        isInitialized = true;
        console.log("ZenFS initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize ZenFS:", error);
        throw error;
    }
}
