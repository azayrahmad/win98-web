import { fs } from "@zenfs/core";

/**
 * Checks if a path is a ZenFS virtual path.
 * @param {string} path
 * @returns {boolean}
 */
export function isZenFSPath(path) {
  return (
    typeof path === "string" &&
    /^\/[A-Z]:/.test(path) && // Path that starts with a drive letter (/A:, /C:, etc)
    !path.startsWith("//") &&
    !path.startsWith("http")
  );
}

/**
 * Gets the MIME type for a given filename based on its extension.
 * @param {string} filename
 * @returns {string}
 */
export function getMimeType(filename) {
  const extension = filename.split(".").pop().toLowerCase();
  const mimeTypes = {
    txt: "text/plain",
    js: "text/javascript",
    json: "application/json",
    md: "text/markdown",
    markdown: "text/markdown",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    py: "text/x-python",
    java: "text/x-java-source",
    c: "text/x-csrc",
    h: "text/x-chdr",
    cpp: "text/x-c++src",
    hpp: "text/x-c++hdr",
    cs: "text/x-csharp",
    sql: "text/x-sql",
    php: "text/x-php",
    rb: "text/x-ruby",
    go: "text/x-go",
    rs: "text/rust",
    ts: "text/typescript",
    sh: "application/x-sh",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    bmp: "image/bmp",
    ico: "image/x-icon",
    cur: "image/x-icon",
    ani: "application/octet-stream", // Animated cursors are proprietary
    pdf: "application/pdf",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    mp4: "video/mp4",
    webm: "video/webm",
    m3u: "audio/x-mpegurl",
    swf: "application/x-shockwave-flash",
  };
  return mimeTypes[extension] || "application/octet-stream";
}

/**
 * Reads a ZenFS file as a Blob.
 * @param {string} path
 * @returns {Promise<Blob>}
 */
export async function getZenFSFileAsBlob(path) {
  const data = await fs.promises.readFile(path);
  const type = getMimeType(path);
  return new Blob([data], { type });
}

/**
 * Reads a ZenFS file as text.
 * @param {string} path
 * @returns {Promise<string>}
 */
export async function getZenFSFileAsText(path) {
  return await fs.promises.readFile(path, "utf8");
}

/**
 * Gets a Blob URL for a ZenFS file.
 * @param {string} path
 * @returns {Promise<string>}
 */
export async function getZenFSFileUrl(path) {
  const blob = await getZenFSFileAsBlob(path);
  return URL.createObjectURL(blob);
}

/**
 * Checks if a path exists using async stat
 * @param {string} path
 * @returns {Promise<boolean>}
 */
export async function existsAsync(path) {
    try {
        await fs.promises.stat(path);
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Adds a shortcut to the desktop (/C:/WINDOWS/Desktop).
 * @param {string} appId The ID of the app to add.
 * @param {string} appTitle The title of the shortcut.
 */
export async function addDesktopShortcut(appId, appTitle) {
  const desktopPath = "/C:/WINDOWS/Desktop";
  try {
    if (!(await existsAsync(desktopPath))) {
      await fs.promises.mkdir(desktopPath, { recursive: true });
    }
    const lnkPath = `${desktopPath}/${appTitle}.lnk.json`;

    if (!(await existsAsync(lnkPath))) {
      await fs.promises.writeFile(lnkPath, JSON.stringify({
        type: "shortcut",
        appId: appId,
      }, null, 2));
      document.dispatchEvent(new CustomEvent("fs-change", { detail: { path: lnkPath } }));
    }
  } catch (error) {
    console.error("Failed to add desktop shortcut to ZenFS", error);
  }
}

/**
 * Removes a shortcut from the desktop (/C:/WINDOWS/Desktop).
 * @param {string} appId The ID of the app to remove.
 */
export async function removeDesktopShortcut(appId) {
  const desktopPath = "/C:/WINDOWS/Desktop";
  try {
    if (await existsAsync(desktopPath)) {
      const files = await fs.promises.readdir(desktopPath);
      for (const file of files) {
        if (file.endsWith(".lnk.json")) {
          const content = await fs.promises.readFile(`${desktopPath}/${file}`, "utf8");
          try {
            const data = JSON.parse(content);
            if (data.appId === appId) {
              await fs.promises.unlink(`${desktopPath}/${file}`);
            }
          } catch (e) {}
        }
      }
      document.dispatchEvent(new CustomEvent("fs-change", { detail: { path: desktopPath } }));
    }
  } catch (error) {
    console.error("Failed to remove desktop shortcut from ZenFS", error);
  }
}
