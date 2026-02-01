import { fs } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";

/**
 * Sets up the Emscripten filesystem by syncing persistent files from ZenFS to MEMFS
 * and mounting the MEMFS back to the host ZenFS.
 * @param {HTMLIFrameElement} iframe
 * @param {string} baseLocalPath
 * @returns {Promise<boolean>}
 */
export async function setupEmscriptenFS(iframe, baseLocalPath) {
    if (!iframe || !iframe.contentWindow) return false;

    const guestModule = iframe.contentWindow.Module;
    if (!guestModule || !guestModule.FS) {
        console.error("Emscripten guest module or FS not found");
        return false;
    }

    const FS = guestModule.FS;

    // 1. Sync persistent files from host ZenFS to iframe MEMFS
    try {
        await loadRecursive(baseLocalPath, "/", FS);
    } catch (e) {
        console.warn("Failed to load persistent files from ZenFS:", e);
    }

    // 2. Mount iframe's FS to host ZenFS
    try {
        const emscriptenFS = Emscripten.create({ FS: FS });
        fs.mount(baseLocalPath, emscriptenFS);
        document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { path: baseLocalPath } }));
        return true;
    } catch (e) {
        console.error("Failed to mount Emscripten FS:", e);
        return false;
    }
}

/**
 * Syncs files from MEMFS back to ZenFS and unmounts the filesystem.
 * @param {HTMLIFrameElement} iframe
 * @param {string} baseLocalPath
 * @param {string[]} excludeFiles
 */
export async function teardownEmscriptenFS(iframe, baseLocalPath, excludeFiles = []) {
    if (!iframe || !iframe.contentWindow) return;

    const guestModule = iframe.contentWindow.Module;
    if (!guestModule || !guestModule.FS) return;
    const FS = guestModule.FS;

    // 1. Collect files from iframe FS to sync back
    const syncData = [];
    const collectFiles = (path) => {
        const entries = FS.readdir(path).filter((e) => e !== "." && e !== "..");
        for (const entry of entries) {
            const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
            try {
                const stat = FS.stat(fullPath);
                if (FS.isDir(stat.mode)) {
                    collectFiles(fullPath);
                } else {
                    if (excludeFiles.some(f => entry.toLowerCase() === f.toLowerCase())) continue;

                    syncData.push({
                        path: fullPath,
                        data: new Uint8Array(FS.readFile(fullPath)),
                    });
                }
            } catch (e) { }
        }
    };
    collectFiles("/");

    // 2. Unmount from host ZenFS
    try {
        fs.umount(baseLocalPath);
    } catch (e) {
        console.error("Failed to unmount Emscripten FS:", e);
    }

    // 3. Persist changed files back to host ZenFS
    for (const item of syncData) {
        const targetPath = `${baseLocalPath}${item.path}`;
        const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));

        if (!fs.existsSync(targetDir)) {
            await mkdirRecursive(targetDir);
        }
        await fs.promises.writeFile(targetPath, item.data);
    }

    document.dispatchEvent(
        new CustomEvent("zen-fs-change", { detail: { path: baseLocalPath } }),
    );
}

/**
 * Recursively creates directories in ZenFS.
 * @param {string} path
 */
export async function mkdirRecursive(path) {
    const parts = path.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
        current += "/" + part;
        if (!fs.existsSync(current)) {
            await fs.promises.mkdir(current);
        }
    }
}

async function loadRecursive(localPath, emPath, FS) {
    if (!fs.existsSync(localPath)) return;
    const entries = await fs.promises.readdir(localPath);
    for (const entry of entries) {
        const fullLocalPath = `${localPath}/${entry}`;
        const fullEmPath = emPath === "/" ? `/${entry}` : `${emPath}/${entry}`;
        const stat = await fs.promises.stat(fullLocalPath);
        if (stat.isDirectory()) {
            try {
                FS.mkdir(fullEmPath);
            } catch (e) { }
            await loadRecursive(fullLocalPath, fullEmPath, FS);
        } else {
            const data = await fs.promises.readFile(fullLocalPath);
            FS.writeFile(fullEmPath, new Uint8Array(data));
        }
    }
}

/**
 * Preloads game data from a remote URL to a local ZenFS path.
 * @param {string} baseLocalPath
 * @param {string} baseRemotePath
 * @param {string[]} files
 * @param {function} onProgress
 */
export async function preloadGameData(baseLocalPath, baseRemotePath, files, onProgress) {
    let needed = false;
    for (const file of files) {
        if (!fs.existsSync(baseLocalPath + file)) {
            needed = true;
            break;
        }
    }

    if (needed) {
        for (const file of files) {
            const targetPath = baseLocalPath + file;
            if (!fs.existsSync(targetPath)) {
                if (onProgress) onProgress(file);
                const response = await fetch(baseRemotePath + file);
                const buffer = await response.arrayBuffer();

                // Ensure target directory exists
                const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));
                if (!fs.existsSync(targetDir)) {
                    await mkdirRecursive(targetDir);
                }

                await fs.promises.writeFile(targetPath, new Uint8Array(buffer));
            }
        }
    }
}

/**
 * Sets up inactivity listeners on an iframe to reset the system inactivity timer.
 * @param {HTMLIFrameElement} iframe
 */
export function setupIframeInactivity(iframe) {
    if (!iframe) return;
    const resetTimer = () => window.System?.resetInactivityTimer?.();
    const setupListeners = () => {
        try {
            const iframeDoc = iframe.contentWindow.document;
            iframeDoc.addEventListener("mousemove", resetTimer);
            iframeDoc.addEventListener("mousedown", resetTimer);
            iframeDoc.addEventListener("keydown", resetTimer);
        } catch (e) {
            console.warn("Could not add inactivity listeners to iframe", e);
        }
    };
    iframe.addEventListener("load", setupListeners);
    if (iframe.contentWindow && iframe.contentWindow.document.readyState === "complete") {
        setupListeners();
    }
}
