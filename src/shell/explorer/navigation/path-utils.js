import { FloppyManager } from '../drives/floppy-manager.js';
import { CDManager } from '../drives/cd-manager.js';
import { RemovableDiskManager } from '../drives/removable-disk-manager.js';

/**
 * Safely join path segments
 */
export function joinPath(base, name) {
    if (base === "/") return `/${name}`;
    const b = base.endsWith("/") ? base : base + "/";
    const n = name.startsWith("/") ? name.substring(1) : name;
    return b + n;
}

/**
 * Get parent directory path
 */
export function getParentPath(path) {
    if (path === "/") return "/";
    const parts = path.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
}

/**
 * Extract folder/file name from path
 */
export function getPathName(path, rootName = "My Computer") {
    if (path === "/" || path === "My Computer") return rootName;
    const parts = path.split("/").filter(Boolean);
    return parts.pop() || path;
}

/**
 * Normalize path format
 */
export function normalizePath(path) {
    if (!path || path === "/") return "/";
    return "/" + path.split("/").filter(Boolean).join("/");
}

/**
 * Format path for display in Address Bar
 */
export function formatPathForDisplay(path) {
    if (path === "/" || path === "My Computer") return "My Computer";

    let p = path.replace(/\\/g, "/");
    if (!p.startsWith("/")) p = "/" + p;

    const segments = p.split("/").filter(Boolean);
    if (segments.length === 0) return "My Computer";

    if (segments[0].match(/^[A-Z]:$/i)) {
        let drivePath = segments[0].toUpperCase();
        if (segments.length === 1) {
            return drivePath + "\\";
        }
        return drivePath + "\\" + segments.slice(1).join("\\");
    }

    return segments.join("\\");
}

/**
 * Get display name for a path
 */
export function getDisplayName(path) {
    if (path === "/" || path === "My Computer") return "My Computer";
    let name = path.split("/").filter(Boolean).pop();

    if (name && (name.endsWith(".lnk.json") || name.endsWith(".lnk"))) {
        name = name.replace(".lnk.json", "").replace(".lnk", "");
    }

    if (name && name.match(/^A:$/i)) {
        const label = FloppyManager.getLabel();
        return label ? `${label} (${name.toUpperCase()})` : `3½ Floppy (${name.toUpperCase()})`;
    }
    if (name && name.match(/^E:$/i)) {
        const label = CDManager.getLabel();
        return label ? `${label} (${name.toUpperCase()})` : `CD-ROM (${name.toUpperCase()})`;
    }
    if (name && name.match(/^[A-Z]:$/i)) {
        const letter = name.charAt(0).toUpperCase();
        if (RemovableDiskManager.isMounted(letter)) {
            const label = RemovableDiskManager.getLabel(letter);
            return label ? `${label} (${letter}:)` : `Removable Disk (${letter}:)`;
        }
        return `(${name.toUpperCase()})`;
    }
    return name || path;
}

/**
 * Get the human-readable label for a drive without the drive letter
 * @param {string} path - Path to get label for
 * @returns {string|null} - Label if it's a drive, null otherwise
 */
export function getDriveLabel(path) {
    if (!path) return null;
    const name = getPathName(path);

    if (!name || !name.match(/^[A-Z]:$/i) || path === "My Computer") return null;

    if (name.match(/^A:$/i)) {
        return FloppyManager.getLabel() || "3½ Floppy";
    }
    if (name.match(/^E:$/i)) {
        return CDManager.getLabel() || "CD-ROM";
    }
    if (name.match(/^C:$/i)) {
        return "Local Disk";
    }

    const letter = name.charAt(0).toUpperCase();
    return RemovableDiskManager.getLabel(letter) || "Removable Disk";
}
