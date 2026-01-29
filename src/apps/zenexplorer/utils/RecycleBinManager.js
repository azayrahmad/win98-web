import { fs } from "@zenfs/core";
import { joinPath, getPathName, getParentPath } from "./PathUtils.js";

const RECYCLE_PATH = "/C:/Recycled";
const METADATA_FILE = joinPath(RECYCLE_PATH, ".metadata.json");

/**
 * RecycleBinManager - Manages the Recycle Bin system for ZenExplorer
 */
export class RecycleBinManager {
    /**
     * Initialize the Recycle Bin folder and metadata
     */
    static async init() {
        try {
            const stats = await fs.promises.stat(RECYCLE_PATH);
            if (!stats.isDirectory()) {
                await fs.promises.mkdir(RECYCLE_PATH, { recursive: true });
            }
        } catch (e) {
            await fs.promises.mkdir(RECYCLE_PATH, { recursive: true });
        }

        try {
            await fs.promises.stat(METADATA_FILE);
        } catch (e) {
            await fs.promises.writeFile(METADATA_FILE, JSON.stringify({}));
        }
    }

    /**
     * Get the current metadata object
     * @returns {Promise<Object>}
     */
    static async getMetadata() {
        try {
            const content = await fs.promises.readFile(METADATA_FILE, 'utf8');
            return JSON.parse(content);
        } catch (e) {
            return {};
        }
    }

    /**
     * Save the metadata object
     * @param {Object} metadata
     */
    static async saveMetadata(metadata) {
        await fs.promises.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
    }

    /**
     * Move multiple items to the Recycle Bin
     * @param {string[]} paths
     * @returns {Promise<string[]>} IDs of the recycled items
     */
    static async moveItemsToRecycleBin(paths) {
        const metadata = await this.getMetadata();
        let changed = false;
        const recycledIds = [];

        for (const path of paths) {
            if (this.isRecycledItemPath(path)) continue;

            const id = (typeof crypto.randomUUID === 'function')
                ? crypto.randomUUID()
                : Date.now().toString(36) + Math.random().toString(36).substring(2);

            const name = getPathName(path);
            const targetPath = joinPath(RECYCLE_PATH, id);

            try {
                await fs.promises.rename(path, targetPath);
            } catch (e) {
                await this.copyRecursive(path, targetPath);
                await fs.promises.rm(path, { recursive: true });
            }

            metadata[id] = {
                id,
                originalPath: path,
                originalName: name,
                deletionDate: new Date().toISOString()
            };
            recycledIds.push(id);
            changed = true;
        }

        if (changed) {
            await this.saveMetadata(metadata);
            document.dispatchEvent(new CustomEvent("zen-recycle-bin-change"));
        }

        return recycledIds;
    }

    /**
     * Move an item to the Recycle Bin
     * @param {string} path
     */
    static async moveToRecycleBin(path) {
        await this.moveItemsToRecycleBin([path]);
    }

    /**
     * Restore multiple items from the Recycle Bin
     * @param {string[]} ids
     */
    static async restoreItems(ids) {
        const metadata = await this.getMetadata();
        let changed = false;

        for (const id of ids) {
            const entry = metadata[id];
            if (!entry) continue;

            const srcPath = joinPath(RECYCLE_PATH, id);
            let destPath = entry.originalPath;
            const parentPath = getParentPath(destPath);

            try {
                await fs.promises.stat(parentPath);
            } catch (e) {
                await fs.promises.mkdir(parentPath, { recursive: true });
            }

            destPath = await this._getUniqueRestorePath(destPath);

            try {
                await fs.promises.rename(srcPath, destPath);
            } catch (e) {
                await this.copyRecursive(srcPath, destPath);
                await fs.promises.rm(srcPath, { recursive: true });
            }

            delete metadata[id];
            changed = true;
        }

        if (changed) {
            await this.saveMetadata(metadata);
            document.dispatchEvent(new CustomEvent("zen-recycle-bin-change"));
        }
    }

    /**
     * Restore an item from the Recycle Bin
     * @param {string} id
     */
    static async restoreItem(id) {
        await this.restoreItems([id]);
    }

    /**
     * Empty the Recycle Bin
     */
    static async emptyRecycleBin() {
        const metadata = await this.getMetadata();
        const ids = Object.keys(metadata);

        for (const id of ids) {
            const path = joinPath(RECYCLE_PATH, id);
            try {
                await fs.promises.rm(path, { recursive: true });
            } catch (e) {
                console.error(`Failed to delete recycled item ${id}`, e);
            }
        }

        await this.saveMetadata({});
        document.dispatchEvent(new CustomEvent("zen-recycle-bin-change"));
    }

    /**
     * Check if the Recycle Bin is empty
     * @returns {Promise<boolean>}
     */
    static async isEmpty() {
        const metadata = await this.getMetadata();
        return Object.keys(metadata).length === 0;
    }

    /**
     * Check if a path is the Recycle Bin folder itself
     * @param {string} path
     * @returns {boolean}
     */
    static isRecycleBinPath(path) {
        return path === RECYCLE_PATH;
    }

    /**
     * Check if a path is an item inside the Recycle Bin
     * @param {string} path
     * @returns {boolean}
     */
    static isRecycledItemPath(path) {
        return path.startsWith(RECYCLE_PATH + "/") && path !== METADATA_FILE;
    }

    /**
     * Get unique path for restoration using "Copy of" logic
     * @private
     */
    static async _getUniqueRestorePath(path) {
        let currentPath = path;
        try {
            await fs.promises.stat(currentPath);
            // File exists, need new name
        } catch (e) {
            return currentPath;
        }

        const parent = getParentPath(path);
        const originalName = getPathName(path);

        // Windows-style copy naming: "Copy of X", "Copy (2) of X", etc.
        const copyNOfRegex = /^Copy \((\d+)\) of (.*)$/;
        const copyOfRegex = /^Copy of (.*)$/;

        let baseName = originalName;
        let match;
        if ((match = originalName.match(copyNOfRegex))) {
            baseName = match[2];
        } else if ((match = originalName.match(copyOfRegex))) {
            baseName = match[1];
        }

        let candidateName = `Copy of ${baseName}`;
        currentPath = joinPath(parent, candidateName);
        try {
            await fs.promises.stat(currentPath);
            // "Copy of X" exists, try "Copy (2) of X", etc.
            let counter = 2;
            while (true) {
                candidateName = `Copy (${counter}) of ${baseName}`;
                currentPath = joinPath(parent, candidateName);
                try {
                    await fs.promises.stat(currentPath);
                    counter++;
                } catch (e) {
                    return currentPath;
                }
            }
        } catch (e) {
            return currentPath;
        }
    }

    /**
     * Recursively copy a file or directory
     * @private
     */
    static async copyRecursive(src, dest) {
        const stats = await fs.promises.stat(src);
        if (stats.isDirectory()) {
            await fs.promises.mkdir(dest, { recursive: true });
            const files = await fs.promises.readdir(src);
            for (const file of files) {
                await this.copyRecursive(joinPath(src, file), joinPath(dest, file));
            }
        } else {
            const data = await fs.promises.readFile(src);
            await fs.promises.writeFile(dest, data);
        }
    }
}
