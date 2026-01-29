import { fs } from "@zenfs/core";
import { initFileSystem } from "./zenfs-init.js";

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
  await initFileSystem();
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
  await initFileSystem();
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
