import { mounts, fs } from "@zenfs/core";
import { ICONS } from "../../../config/icons.js";
import { VirtualStats, ShellManager } from "./ShellManager.js";
import { getPathName, joinPath } from "../navigation/PathUtils.js";
import { RecycleBinManager } from "../fileoperations/RecycleBinManager.js";
import { getAssociation } from "../../../utils/directory.js";

/**
 * RecycleBinExtension - Shell extension for the global Recycle Bin
 */
export class RecycleBinExtension {
    constructor() {
        this.path = "/Recycle Bin";
    }

    /**
     * Check if this extension handles the given path
     * @param {string} path
     * @returns {boolean}
     */
    handlesPath(path) {
        return path === this.path || path.startsWith(this.path + "/");
    }

    /**
     * Get all currently mounted recycle bin paths
     * @returns {string[]}
     */
    getRecyclePaths() {
        const recyclePaths = [];
        for (const mountPoint of mounts.keys()) {
            if (mountPoint.match(/^\/[A-Z]:$/i)) {
                recyclePaths.push(joinPath(mountPoint, "Recycled"));
            }
        }
        return recyclePaths;
    }

    /**
     * Get virtual stats for a path
     * @param {string} path
     * @returns {Promise<VirtualStats>}
     */
    async stat(path) {
        if (path === this.path) {
            return new VirtualStats({ isDirectory: true, isVirtual: true });
        }

        // It's an item inside the Recycle Bin: /Recycle Bin/UUID
        // We need to find which drive it belongs to
        const id = getPathName(path);
        const recyclePaths = this.getRecyclePaths();

        for (const rp of recyclePaths) {
            const metadata = await RecycleBinManager.getMetadata(rp);
            if (metadata[id]) {
                const realPath = joinPath(rp, id);
                const realStat = await fs.promises.stat(realPath);
                return new VirtualStats({
                    isDirectory: realStat.isDirectory(),
                    isVirtual: true,
                    size: realStat.size,
                    atime: realStat.atime,
                    mtime: realStat.mtime,
                    ctime: realStat.ctime,
                    birthtime: realStat.birthtime
                });
            }
        }

        throw new Error(`ENOENT: no such file or directory, stat '${path}'`);
    }

    /**
     * Read virtual directory contents
     * @param {string} path
     * @returns {Promise<string[]|null>}
     */
    async readdir(path) {
        if (path === this.path) {
            const allIds = new Set();
            const recyclePaths = this.getRecyclePaths();
            for (const rp of recyclePaths) {
                try {
                    const metadata = await RecycleBinManager.getMetadata(rp);
                    Object.keys(metadata).forEach(id => allIds.add(id));
                } catch (e) {}
            }
            return Array.from(allIds);
        }
        return null;
    }

    /**
     * Get custom icon object for a path
     * @param {string} path
     * @returns {Promise<Object|null>}
     */
    async getIconObj(path) {
        if (path === this.path) {
            const empty = await this.isEmpty();
            return empty ? ICONS.recycleBinEmpty : ICONS.recycleBinFull;
        }

        const id = getPathName(path);
        const recyclePaths = this.getRecyclePaths();
        for (const rp of recyclePaths) {
            const metadata = await RecycleBinManager.getMetadata(rp);
            if (metadata[id]) {
                const entry = metadata[id];
                // We don't know if it's a directory here without statting,
                // but stat is available in ShellManager if needed.
                // However, renderFileIcon usually calls getIconObj.
                // Actually, renderFileIcon has its own logic for items in Recycle Bin.
                return null; // Let renderFileIcon handle it
            }
        }

        return null;
    }

    /**
     * Get custom icon for a path
     * @param {string} path
     * @param {number} size
     * @returns {Promise<string|null>}
     */
    async getIcon(path, size = 32) {
        const iconObj = await this.getIconObj(path);
        return iconObj ? iconObj[size] : null;
    }

    /**
     * Check if all recycle bins are empty
     * @returns {Promise<boolean>}
     */
    async isEmpty() {
        const recyclePaths = this.getRecyclePaths();
        for (const rp of recyclePaths) {
            const empty = await RecycleBinManager.isEmpty(rp);
            if (!empty) return false;
        }
        return true;
    }

    /**
     * Handle opening a path
     * @param {string} path
     * @param {Object} app - ZenExplorerApp instance
     * @returns {Promise<boolean>}
     */
    async onOpen(path, app) {
        if (path === this.path) {
            app.navigateTo(this.path);
            return true;
        }
        return false;
    }

    /**
     * Get columns for the Recycle Bin directory
     * @returns {Object[]}
     */
    getColumns() {
        return [
            { label: "Name", key: "name" },
            { label: "Original Location", key: "originalLocation" },
            { label: "Date Deleted", key: "dateDeleted" },
            { label: "Size", key: "size" },
            { label: "Type", key: "type" },
        ];
    }

    /**
     * Get column value for Recycle Bin items
     * @param {string} fullPath
     * @param {string} columnKey
     * @param {Object} stats
     * @returns {Promise<string|null>}
     */
    async getColumnValue(fullPath, columnKey, stats) {
        const id = getPathName(fullPath);
        const recyclePaths = this.getRecyclePaths();

        for (const rp of recyclePaths) {
            const metadata = await RecycleBinManager.getMetadata(rp);
            if (metadata[id]) {
                const entry = metadata[id];
                if (columnKey === "name") return entry.originalName;
                if (columnKey === "originalLocation") return entry.originalPath;
                if (columnKey === "dateDeleted") return new Date(entry.deletionDate).toLocaleString();
                if (columnKey === "type") return stats.isDirectory() ? "Folder" : getAssociation(entry.originalName).name || "File";
            }
        }
        return null;
    }
}
