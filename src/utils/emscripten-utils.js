import { fs } from "@zenfs/core";
import { Emscripten } from "@zenfs/emscripten";

/**
 * Shared utility for managing Emscripten-based applications with ZenFS.
 */

/**
 * Sets up the Emscripten filesystem by syncing files from host ZenFS to MEMFS
 * and mounting the MEMFS to the host ZenFS.
 * @param {Object} guestModule - The Emscripten Module object from the iframe.
 * @param {string} localPath - The host ZenFS path to mount to.
 * @returns {Promise<boolean>}
 */
export async function setupEmscriptenFS(guestModule, localPath) {
  if (!guestModule) {
    console.error("Guest module not found");
    return false;
  }

  // Handle cases where FS might not be attached to Module yet
  let FS = guestModule.FS;
  if (!FS) {
    console.warn("FS not found on Module, waiting...");
    for (let i = 0; i < 10; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      FS = guestModule.FS;
      if (FS) break;
    }
  }

  if (!FS) {
    console.error("Guest FS not found after waiting");
    return false;
  }

  // 1. Sync persistent files from host ZenFS to iframe MEMFS
  try {
    const loadRecursive = async (srcPath, destPath) => {
      if (!fs.existsSync(srcPath)) return;
      const entries = await fs.promises.readdir(srcPath);
      for (const entry of entries) {
        const fullSrcPath = `${srcPath}/${entry}`;
        const fullDestPath = destPath === "/" ? `/${entry}` : `${destPath}/${entry}`;
        const stat = await fs.promises.stat(fullSrcPath);
        if (stat.isDirectory()) {
          try {
            FS.mkdir(fullDestPath);
          } catch (e) {}
          await loadRecursive(fullSrcPath, fullDestPath);
        } else {
          const data = await fs.promises.readFile(fullSrcPath);
          FS.writeFile(fullDestPath, new Uint8Array(data));
        }
      }
    };
    await loadRecursive(localPath, "/");
  } catch (e) {
    console.warn(`Failed to load persistent files from ZenFS path ${localPath}:`, e);
  }

  // 2. Mount iframe's FS to host ZenFS
  try {
    const emscriptenFS = Emscripten.create({ FS: FS });
    fs.mount(localPath, emscriptenFS);
    document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { path: localPath } }));
    return true;
  } catch (e) {
    console.error(`Failed to mount Emscripten FS to ${localPath}:`, e);
    return false;
  }
}

/**
 * Teards down the Emscripten filesystem by syncing files back to host ZenFS
 * and unmounting.
 * @param {Object} guestModule - The Emscripten Module object from the iframe.
 * @param {string} localPath - The host ZenFS path.
 * @param {Array<string>} excludeList - List of filenames to exclude from sync-back.
 */
export async function teardownEmscriptenFS(guestModule, localPath, excludeList = []) {
  if (!guestModule || !guestModule.FS) return;

  const FS = guestModule.FS;

  // 1. Collect files from iframe FS to sync back
  const syncData = [];
  const allFiles = [];
  const collectFiles = (path) => {
    const entries = FS.readdir(path).filter((e) => e !== "." && e !== "..");
    for (const entry of entries) {
      const fullPath = path === "/" ? `/${entry}` : `${path}/${entry}`;
      allFiles.push(fullPath);
      try {
        const stat = FS.stat(fullPath);
        if (FS.isDir(stat.mode)) {
          collectFiles(fullPath);
        } else {
          if (excludeList.some(excluded => entry.toLowerCase() === excluded.toLowerCase())) {
            continue;
          }

          syncData.push({
            path: fullPath,
            data: new Uint8Array(FS.readFile(fullPath)),
          });
        }
      } catch (e) {}
    }
  };
  collectFiles("/");
  console.log(`[Emscripten Sync] All files in guest FS at ${localPath}:`, allFiles);

  // 2. Unmount from host ZenFS
  try {
    fs.umount(localPath);
  } catch (e) {
    console.error(`Failed to unmount FS from ${localPath}:`, e);
  }

  // 3. Persist changed files back to host ZenFS (IndexedDB)
  for (const item of syncData) {
    const targetPath = `${localPath}${item.path}`;
    const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));

    if (!fs.existsSync(targetDir)) {
      await mkdirRecursive(targetDir);
    }
    await fs.promises.writeFile(targetPath, item.data);
  }

  document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { path: localPath } }));
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

/**
 * Sets up inactivity listeners for an iframe.
 * @param {HTMLIFrameElement} iframe
 */
export function setupIframeInactivity(iframe) {
  if (!iframe) return;

  const resetTimer = () => window.System.resetInactivityTimer();

  const setupListeners = () => {
    try {
      const iframeDoc = iframe.contentWindow.document;
      iframeDoc.addEventListener("mousemove", resetTimer);
      iframeDoc.addEventListener("mousedown", resetTimer);
      iframeDoc.addEventListener("keydown", resetTimer);
    } catch (e) {
      console.warn("Could not add inactivity listeners to iframe.", e);
    }
  };

  iframe.addEventListener("load", setupListeners);

  if (iframe.contentWindow && iframe.contentWindow.document.readyState === "complete") {
    setupListeners();
  }
}
