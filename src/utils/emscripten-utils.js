import { Emscripten } from "@zenfs/emscripten";
import { fs } from "@zenfs/core";

/**
 * Creates directories recursively in an Emscripten FS.
 * @param {object} FS - The Emscripten FS object.
 * @param {string} path - The path to create.
 */
export function mkdirRecursive(FS, path) {
    const parts = path.split('/').filter(p => p);
    let current = '';
    for (const part of parts) {
        current += '/' + part;
        try {
            FS.mkdir(current);
        } catch (e) {
            if (e.errno !== 20 && e.code !== 'EEXIST') {
                console.warn(`Could not create directory ${current}:`, e);
            }
        }
    }
}

/**
 * Sets up the Emscripten filesystem bridge.
 * @param {HTMLIFrameElement} iframe - The iframe containing the Emscripten module.
 * @param {string} localPath - The ZenFS path where the Emscripten FS should be mounted.
 * @param {string} subfolder - Optional subfolder within Emscripten FS to promote to root.
 * @param {string} syncSourcePath - Optional ZenFS path to sync files from to Emscripten root.
 * @returns {Promise<boolean>}
 */
export async function setupEmscriptenFS(iframe, localPath, subfolder = null, syncSourcePath = null) {
    return new Promise((resolvePromise) => {
        let attempts = 0;
        const maxAttempts = 100; // 10 seconds

        const checkRuntime = () => {
            const guestWindow = iframe.contentWindow;
            if (!guestWindow) {
                resolvePromise(false);
                return;
            }

            const FS = guestWindow.FS;
            const Module = guestWindow.Module;

            // Wait for runtime to be initialized
            if (FS && Module && Module.run && !Module.runtimeExited) {
                try {
                    // Sync initial files from ZenFS to Emscripten FS (always to root)
                    // We sync from BOTH localPath (persistence) and syncSourcePath (game data)
                    const sources = [];
                    if (localPath) sources.push(localPath);
                    if (syncSourcePath && syncSourcePath !== localPath) sources.push(syncSourcePath);

                    for (const source of sources) {
                        let exists = false;
                        try {
                            fs.statSync(source);
                            exists = true;
                        } catch (e) {}

                        if (exists) {
                            const files = fs.readdirSync(source);
                            for (const file of files) {
                                const filePath = `${source}/${file}`;
                                try {
                                    if (!fs.statSync(filePath).isDirectory()) {
                                        const data = fs.readFileSync(filePath);
                                        FS.writeFile(`/${file}`, new Uint8Array(data));
                                        console.log(`Synced ${file} from ${source} to Emscripten FS root`);
                                    }
                                } catch (e) {
                                    console.warn(`Could not sync ${file} from ${source}:`, e);
                                }
                            }
                        }
                    }

                    // Promote subfolder contents to root if requested
                    if (subfolder && subfolder !== "/") {
                        try {
                            const files = FS.readdir(subfolder);
                            for (const file of files) {
                                if (file === "." || file === "..") continue;
                                FS.rename(`${subfolder}/${file}`, `/${file}`);
                            }
                            // Don't rmdir/symlink if it might break things, just leave it or use a link
                            try {
                                FS.rmdir(subfolder);
                                FS.symlink('/', subfolder);
                            } catch (e) {
                                console.warn(`Could not replace ${subfolder} with symlink, assets are at root anyway.`);
                            }
                            console.log(`Promoted ${subfolder} contents to root.`);
                        } catch (err) {
                            console.warn(`Failed to promote subfolder ${subfolder}:`, err);
                        }
                    }

                    // Mount the Emscripten root to ZenFS
                    fs.mount(localPath, Emscripten.create({ FS }));
                    console.log(`Mounted Emscripten root to ${localPath}`);
                    resolvePromise(true);
                } catch (err) {
                    console.error("Error setting up Emscripten FS:", err);
                    resolvePromise(false);
                }
            } else if (attempts < maxAttempts) {
                attempts++;
                setTimeout(checkRuntime, 100);
            } else {
                console.warn("Timed out waiting for Emscripten FS/Module");
                resolvePromise(false);
            }
        };

        checkRuntime();
    });
}

/**
 * Tears down the Emscripten filesystem bridge and syncs back files.
 * @param {HTMLIFrameElement} iframe - The iframe containing the Emscripten module.
 * @param {string} localPath - The ZenFS path where the Emscripten FS was mounted.
 * @param {string[]} excludeFiles - List of filenames to exclude from sync-back.
 */
export function teardownEmscriptenFS(iframe, localPath, excludeFiles = []) {
    try {
        const guestWindow = iframe.contentWindow;
        if (!guestWindow || !guestWindow.FS) {
            fs.umount(localPath);
            return;
        }

        const FS = guestWindow.FS;

        // Recursive sync-back helper
        const syncBack = (zenPath, emPath) => {
            const files = FS.readdir(emPath);
            for (const file of files) {
                if (file === "." || file === ".." || file === "dev" || file === "proc" || file === "tmp" || file === "home") continue;
                if (emPath === "/" && excludeFiles.includes(file)) continue;

                const fullEmPath = emPath === "/" ? `/${file}` : `${emPath}/${file}`;
                const fullZenPath = `${zenPath}/${file}`;

                try {
                    const stat = FS.stat(fullEmPath);
                    if (FS.isDir(stat.mode)) {
                        if (!fs.existsSync(fullZenPath)) {
                            fs.mkdirSync(fullZenPath);
                        }
                        syncBack(fullZenPath, fullEmPath);
                    } else {
                        const data = FS.readFile(fullEmPath);
                        fs.writeFileSync(fullZenPath, new Uint8Array(data));
                        console.log(`Synced back ${file} to ZenFS at ${fullZenPath}`);
                    }
                } catch (e) {
                    // Skip if symlink or other error
                }
            }
        };

        syncBack(localPath, "/");

        fs.umount(localPath);
        console.log(`Unmounted ${localPath}`);
    } catch (err) {
        console.error("Error tearing down Emscripten FS:", err);
        try { fs.umount(localPath); } catch (e) {}
    }
}

/**
 * Preloads game data from the server into ZenFS.
 * @param {string} targetDir - The ZenFS directory to save to.
 * @param {string} sourceDir - The server directory to download from.
 * @param {string[]} files - List of files to download.
 * @param {Function} onFileStart - Callback when a file starts downloading.
 */
export async function preloadGameData(targetDir, sourceDir, files, onFileStart) {
    for (const file of files) {
        const targetPath = `${targetDir}${file}`;
        let exists = false;
        try {
            fs.statSync(targetPath);
            exists = true;
        } catch (e) {}

        if (exists) continue;

        if (onFileStart) onFileStart(file);

        try {
            console.log(`Fetching ${sourceDir}${file}...`);
            const response = await fetch(`${sourceDir}${file}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.arrayBuffer();
            fs.writeFileSync(targetPath, new Uint8Array(data));
            console.log(`Preloaded ${file} to ${targetPath}`);
        } catch (err) {
            console.error(`Failed to preload ${file}:`, err);
        }
    }
}

/**
 * Sets up activity tracking for an iframe to prevent it from being seen as "inactive".
 * @param {HTMLIFrameElement} iframe
 * @param {Function} onActivity
 */
export function setupIframeInactivity(iframe, onActivity) {
    if (!onActivity) return () => {};

    const events = ['mousedown', 'keydown', 'touchstart'];
    const handler = () => onActivity();

    events.forEach(event => {
        iframe.contentWindow?.addEventListener(event, handler);
    });

    return () => {
        events.forEach(event => {
            iframe.contentWindow?.removeEventListener(event, handler);
        });
    };
}
