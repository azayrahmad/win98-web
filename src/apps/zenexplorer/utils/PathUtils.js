import { ZenFloppyManager } from "./ZenFloppyManager.js";
import { ZenCDManager } from "./ZenCDManager.js";
import { ZenRemovableDiskManager } from "./ZenRemovableDiskManager.js";

/**
 * Utility functions for path manipulation in ZenExplorer
 */

/**
 * Safely join path segments
 * @param {string} base - Base path
 * @param {string} name - Path segment to append
 * @returns {string} Joined path
 */
export function joinPath(base, name) {
    if (base === "/") return `/${name}`;
    const b = base.endsWith("/") ? base : base + "/";
    const n = name.startsWith("/") ? name.substring(1) : name;
    return b + n;
}

/**
 * Get parent directory path
 * @param {string} path - Current path
 * @returns {string} Parent path
 */
export function getParentPath(path) {
    if (path === "/") return "/";
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
}

/**
 * Extract folder/file name from path
 * @param {string} path - Full path
 * @param {string} rootName - Name to use for root path (default: "My Computer")
 * @returns {string} Path name
 */
export function getPathName(path, rootName = "My Computer") {
    if (path === "/" || path === "My Computer") return rootName;
    const parts = path.split("/").filter(Boolean);
    return parts.pop() || path;
}

/**
 * Normalize path format (remove trailing slashes, handle empty paths)
 * @param {string} path - Path to normalize
 * @returns {string} Normalized path
 */
export function normalizePath(path) {
    if (!path || path === "/") return "/";
    return "/" + path.split("/").filter(Boolean).join("/");
}

/**
 * Format path for display in Address Bar
 * @param {string} path - Internal path
 * @returns {string} Windows-style path
 */
export function formatPathForDisplay(path) {
    if (path === "/" || path === "My Computer") return "My Computer";

    // Normalize to forward slashes and ensure absolute for processing
    let p = path.replace(/\\/g, "/");
    if (!p.startsWith("/")) p = "/" + p;

    // Split segments
    const segments = p.split("/").filter(Boolean);
    if (segments.length === 0) return "My Computer";

    // Handle drive letter
    if (segments[0].match(/^[A-Z]:$/i)) {
        let drivePath = segments[0].toUpperCase();
        if (segments.length === 1) {
            return drivePath + "\\";
        }
        return drivePath + "\\" + segments.slice(1).join("\\");
    }

    // Default: join with backslashes
    return segments.join("\\");
}

/**
 * Get display name for a path (used for window title, sidebar, and icon labels)
 * @param {string} path - Internal path or name
 * @returns {string} Display name
 */
export function getDisplayName(path) {
    if (path === "/" || path === "My Computer") return "My Computer";
    const name = path.split("/").filter(Boolean).pop();
    if (name && name.match(/^A:$/i)) {
        const label = ZenFloppyManager.getLabel();
        return label ? `${label} (${name.toUpperCase()})` : `3½ Floppy (${name.toUpperCase()})`;
    }
    if (name && name.match(/^E:$/i)) {
        const label = ZenCDManager.getLabel();
        return label ? `${label} (${name.toUpperCase()})` : `CD-ROM (${name.toUpperCase()})`;
    }
    if (name && name.match(/^[A-Z]:$/i)) {
        const letter = name.charAt(0).toUpperCase();
        if (ZenRemovableDiskManager.isMounted(letter)) {
            return `Removable Disk (${letter}:)`;
        }
        return `(${name.toUpperCase()})`;
    }
    return name || path;
}
