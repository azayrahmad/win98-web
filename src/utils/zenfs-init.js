import { resolveMountConfig, InMemory, fs } from "@zenfs/core";
import { IndexedDB, WebAccess } from "@zenfs/dom";
import { migrateToZenFS, PINNED_PATH, START_MENU_PATH, FAVORITES_PATH } from "./startMenuUtils.js";
import { migrateShortcuts } from "./migrateShortcuts.js";
import startMenuConfig from "../config/startmenu.js";
import { getStartupApps } from "./startupManager.js";
import { apps } from "../config/apps.js";
import { existsAsync } from "./zenfs-utils.js";
import { getStoredHandle } from "./storageSwitch.js";

let isInitialized = false;

const wrappedBackends = new WeakMap();

/**
 * Wraps a WebAccess backend to append .z to all filenames on the host filesystem.
 * This bypasses browser/OS restrictions on reserved filenames like CON, PRN, or .lnk.
 */
function wrapWebAccess(backend) {
    if (wrappedBackends.has(backend)) {
        return wrappedBackends.get(backend);
    }

    const wrapPath = (path) => {
        if (typeof path !== 'string' || !path || path === '/') return path;
        return path.split('/')
            .map(segment => segment && segment !== '.' && segment !== '..' ? segment + '.z' : segment)
            .join('/');
    };

    const unwrapPath = (path) => {
        if (typeof path !== 'string' || !path) return path;
        return path.split('/')
            .map(segment => segment.endsWith('.z') ? segment.slice(0, -2) : segment)
            .join('/');
    };

    const pathMethods = ['stat', 'statSync', 'open', 'openSync', 'replacems', 'replacemsSync',
                       'mkdir', 'mkdirSync', 'rmdir', 'rmdirSync', 'unlink', 'unlinkSync',
                       'link', 'linkSync', 'symlink', 'symlinkSync', 'readlink', 'readlinkSync',
                       'chown', 'chownSync', 'chmod', 'chmodSync', 'utimes', 'utimesSync',
                       'access', 'accessSync', 'readdir', 'readdirSync'];

    const proxy = new Proxy(backend, {
        get(target, prop, receiver) {
            const value = Reflect.get(target, prop, receiver);
            if (typeof value !== 'function') {
                return value;
            }

            return function (...args) {
                if (pathMethods.includes(prop)) {
                    args[0] = wrapPath(args[0]);
                }

                if (prop === 'rename' || prop === 'renameSync') {
                    args[0] = wrapPath(args[0]);
                    args[1] = wrapPath(args[1]);
                }

                const result = Reflect.apply(value, receiver, args);

                if (result instanceof Promise) {
                    return result.then(res => {
                        if (prop === 'readdir') {
                            return res.map(unwrapPath);
                        }
                        return res;
                    });
                }

                if (prop === 'readdirSync') {
                    return result.map(unwrapPath);
                }

                return result;
            };
        }
    });

    wrappedBackends.set(backend, proxy);
    return proxy;
}

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
                // Re-request permission. This needs a user gesture if not already granted.
                const permission = await localFolderHandle.requestPermission({ mode: 'readwrite' });
                if (permission === 'granted') {
                    const webAccessFs = await WebAccess.create({ handle: localFolderHandle });
                    cDriveFs = wrapWebAccess(webAccessFs);
                    console.log("C: drive mounted using Local Folder.");
                }
            } catch (err) {
                console.warn("Failed to mount Local Folder, falling back to IndexedDB:", err);
            }
        }

        if (!cDriveFs) {
            cDriveFs = await resolveMountConfig({
                backend: IndexedDB,
                name: "win98-c-drive",
            });
            console.log("C: drive mounted using IndexedDB.");
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
        const aboutLnkPath = `${PINNED_PATH}/About.lnk.json`;
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
                    const lnkPath = `${startupPath}/${label}.lnk.json`;
                    if (!(await existsAsync(lnkPath))) {
                        await fs.promises.writeFile(lnkPath, JSON.stringify({
                            type: "shortcut",
                            appId: appId,
                        }, null, 2));
                    }
                }
            }
        }

        if (!(await existsAsync("/C:/.shortcuts_migrated"))) {
            if (onProgress) onProgress("Migrating shortcuts...");
            await migrateShortcuts("/C:");
            await fs.promises.writeFile("/C:/.shortcuts_migrated", "done");
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
