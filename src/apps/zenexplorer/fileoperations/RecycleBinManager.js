import { fs, mounts } from "@zenfs/core";
import { joinPath, getPathName, getParentPath } from "../navigation/PathUtils.js";

export class RecycleBinManager {
    static async init() {
        // No longer creates /C:/Recycled by default.
        // Recycle bins are created on-demand per drive.
    }

    static getDriveRoot(path) {
        const match = path.match(/^(\/[A-Z]:)/i);
        return match ? match[1] : "/";
    }

    static async getRecyclePath(path) {
        if (path.startsWith("/Recycle Bin/")) {
            const id = getPathName(path);
            const allPaths = this.getAllRecyclePaths();
            for (const p of allPaths) {
                const metadata = await this._getSingleMetadata(p);
                if (metadata[id]) return p;
            }
            return null;
        }
        const driveRoot = this.getDriveRoot(path);
        if (driveRoot === "/" || driveRoot.toUpperCase() === "/E:") return null;
        return joinPath(driveRoot, "Recycled");
    }

    static getAllRecyclePaths() {
        const paths = [];
        for (const mountPoint of mounts.keys()) {
            if (mountPoint.match(/^\/[A-Z]:$/i)) {
                paths.push(joinPath(mountPoint, "Recycled"));
            }
        }
        return paths;
    }

    static async getMetadata(recyclePath) {
        if (recyclePath === "/Recycle Bin" || recyclePath === "/C:/WINDOWS/Desktop/Recycle Bin") {
            const allMetadata = {};
            const paths = this.getAllRecyclePaths();
            for (const p of paths) {
                const m = await this._getSingleMetadata(p);
                Object.assign(allMetadata, m);
            }
            return allMetadata;
        }
        return this._getSingleMetadata(recyclePath);
    }

    static async _getSingleMetadata(recyclePath) {
        const metadataFile = joinPath(recyclePath, ".metadata.json");
        try {
            const content = await fs.promises.readFile(metadataFile, 'utf8');
            return JSON.parse(content);
        } catch (e) {
            return {};
        }
    }

    static async saveMetadata(recyclePath, metadata) {
        const metadataFile = joinPath(recyclePath, ".metadata.json");
        await fs.promises.writeFile(metadataFile, JSON.stringify(metadata, null, 2));
    }

    static async moveItemsToRecycleBin(paths, dialog = null) {
        const groups = {};
        for (const path of paths) {
            const recyclePath = await this.getRecyclePath(path);
            if (!recyclePath) continue;
            if (!groups[recyclePath]) groups[recyclePath] = [];
            groups[recyclePath].push(path);
        }

        const allRecycledPaths = [];
        for (const recyclePath in groups) {
            const items = groups[recyclePath];
            const metadataFile = joinPath(recyclePath, ".metadata.json");

            try {
                await fs.promises.stat(recyclePath);
            } catch (e) {
                await fs.promises.mkdir(recyclePath, { recursive: true });
            }

            try {
                await fs.promises.stat(metadataFile);
            } catch (e) {
                await fs.promises.writeFile(metadataFile, JSON.stringify({}));
            }

            const metadata = await this.getMetadata(recyclePath);
            let changed = false;

            for (const path of items) {
                if (dialog && dialog.cancelled) break;
                if (this.isRecycledItemPath(path)) continue;

                const id = (typeof crypto.randomUUID === 'function')
                    ? crypto.randomUUID()
                    : Date.now().toString(36) + Math.random().toString(36).substring(2);

                const name = getPathName(path);
                const targetPath = joinPath(recyclePath, id);

                const sourceDir = getParentPath(path);
                if (dialog) {
                    dialog.update(path, sourceDir, recyclePath, 0);
                }

                try {
                    await fs.promises.rename(path, targetPath);
                    if (dialog) {
                        const stats = await fs.promises.stat(targetPath);
                        dialog.finishItem(stats.isDirectory() ? 0 : stats.size);
                        dialog.update(path, sourceDir, recyclePath, 0);
                    }
                } catch (e) {
                    await this.copyRecursive(path, targetPath, dialog);
                    await this.removeRecursive(path, dialog, false);
                }

                metadata[id] = {
                    id,
                    originalPath: path,
                    originalName: name,
                    deletionDate: new Date().toISOString()
                };
                allRecycledPaths.push(targetPath);
                changed = true;
            }

            if (changed) {
                await this.saveMetadata(recyclePath, metadata);
            }
        }

        if (allRecycledPaths.length > 0) {
            document.dispatchEvent(new CustomEvent("recycle-bin-change"));
        }

        return allRecycledPaths;
    }

    static async moveToRecycleBin(path) {
        await this.moveItemsToRecycleBin([path]);
    }

    static async restoreItems(itemPaths, dialog = null) {
        const groups = {};
        for (const itemPath of itemPaths) {
            let match = itemPath.match(/^(\/[A-Z]:\/Recycled)\/([^/]+)$/i);
            let recyclePath, id;
            if (match) {
                recyclePath = match[1];
                id = match[2];
            } else if (itemPath.startsWith("/Recycle Bin/")) {
                id = getPathName(itemPath);
                // Find which recycle bin has this ID
                const allPaths = this.getAllRecyclePaths();
                for (const p of allPaths) {
                    const metadata = await this._getSingleMetadata(p);
                    if (metadata[id]) {
                        recyclePath = p;
                        break;
                    }
                }
            }

            if (!recyclePath || !id || id === ".metadata.json") continue;
            if (!groups[recyclePath]) groups[recyclePath] = [];
            groups[recyclePath].push(id);
        }

        let anyChanged = false;
        for (const recyclePath in groups) {
            const ids = groups[recyclePath];
            const metadata = await this.getMetadata(recyclePath);
            let changed = false;

            for (const id of ids) {
                if (dialog && dialog.cancelled) break;
                const entry = metadata[id];
                if (!entry) continue;

                const srcPath = joinPath(recyclePath, id);
                let destPath = entry.originalPath;
                const parentPath = getParentPath(destPath);

                if (dialog) {
                    dialog.update(entry.originalName, recyclePath, parentPath, 0);
                }

                try {
                    await fs.promises.stat(parentPath);
                } catch (e) {
                    await fs.promises.mkdir(parentPath, { recursive: true });
                }

                destPath = await this._getUniqueRestorePath(destPath);

                try {
                    await fs.promises.rename(srcPath, destPath);
                    if (dialog) {
                        const stats = await fs.promises.stat(destPath);
                        dialog.finishItem(stats.isDirectory() ? 0 : stats.size);
                        dialog.update(entry.originalName, recyclePath, parentPath, 0);
                    }
                } catch (e) {
                    await this.copyRecursive(srcPath, destPath, dialog);
                    await this.removeRecursive(srcPath, dialog, false);
                }

                delete metadata[id];
                changed = true;
                anyChanged = true;
            }

            if (changed) {
                await this.saveMetadata(recyclePath, metadata);
            }
        }

        if (anyChanged) {
            document.dispatchEvent(new CustomEvent("recycle-bin-change"));
        }
    }

    static async restoreItem(path) {
        await this.restoreItems([path]);
    }

    static async emptyAllRecycleBins(dialog = null) {
        const recyclePaths = this.getAllRecyclePaths();
        for (const recyclePath of recyclePaths) {
            if (dialog && dialog.cancelled) break;
            await this._emptySingleRecycleBin(recyclePath, dialog);
        }
        document.dispatchEvent(new CustomEvent("recycle-bin-change"));
    }

    static async _emptySingleRecycleBin(recyclePath, dialog = null) {
        const metadata = await this._getSingleMetadata(recyclePath);
        const ids = Object.keys(metadata);

        for (const id of ids) {
            if (dialog && dialog.cancelled) break;
            const path = joinPath(recyclePath, id);
            try {
                if (dialog) {
                    await this.removeRecursive(path, dialog);
                } else {
                    await fs.promises.rm(path, { recursive: true });
                }
            } catch (e) {
                console.error(`Failed to delete recycled item ${id}`, e);
            }
        }

        if (dialog && dialog.cancelled) {
            const remainingMetadata = {};
            for (const id in metadata) {
                try {
                    await fs.promises.stat(joinPath(recyclePath, id));
                    remainingMetadata[id] = metadata[id];
                } catch (e) {}
            }
            await this.saveMetadata(recyclePath, remainingMetadata);
        } else {
            await this.saveMetadata(recyclePath, {});
        }
    }

    static async isEmpty(recyclePath) {
        if (recyclePath === "/Recycle Bin" || recyclePath === "/C:/WINDOWS/Desktop/Recycle Bin") {
            const paths = this.getAllRecyclePaths();
            for (const p of paths) {
                const empty = await this._getSingleMetadata(p).then(m => Object.keys(m).length === 0);
                if (!empty) return false;
            }
            return true;
        }
        const metadata = await this.getMetadata(recyclePath);
        return Object.keys(metadata).length === 0;
    }

    static isRecycleBinPath(path) {
        return !!path.match(/^\/[A-Z]:\/Recycled$/i) || path === "/Recycle Bin" || path === "/C:/WINDOWS/Desktop/Recycle Bin";
    }

    static isRecycledItemPath(path) {
        const match = path.match(/^(\/[A-Z]:\/Recycled)\/([^/]+)$/i) ||
                      path.match(/^(\/Recycle Bin)\/([^/]+)$/i) ||
                      path.match(/^(\/C:\/WINDOWS\/Desktop\/Recycle Bin)\/([^/]+)$/i);
        if (!match) return false;
        const filename = path.split('/').pop();
        return filename !== ".metadata.json";
    }

    static async _getUniqueRestorePath(path) {
        let currentPath = path;
        try {
            await fs.promises.stat(currentPath);
        } catch (e) {
            return currentPath;
        }

        const parent = getParentPath(path);
        const originalName = getPathName(path);
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

    static async copyRecursive(src, dest, dialog = null) {
        if (dialog && dialog.cancelled) return;
        const stats = await fs.promises.stat(src);
        const sourceDir = getParentPath(src);
        const destDir = getParentPath(dest);

        if (stats.isDirectory()) {
            await fs.promises.mkdir(dest, { recursive: true });
            const files = await fs.promises.readdir(src);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.copyRecursive(joinPath(src, file), joinPath(dest, file), dialog);
            }
        } else {
            if (dialog) {
                dialog.update(src, sourceDir, destDir, 0);
            }
            const data = await fs.promises.readFile(src);
            await fs.promises.writeFile(dest, data);
            if (dialog) {
                dialog.finishItem(stats.size);
                dialog.update(src, sourceDir, destDir, 0);
            }
        }
    }

    static async removeRecursive(path, dialog = null, reportProgress = true) {
        if (dialog && dialog.cancelled) return;
        let stats;
        try {
            stats = await fs.promises.stat(path);
        } catch (e) {
            return;
        }

        if (stats.isDirectory()) {
            const files = await fs.promises.readdir(path);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.removeRecursive(joinPath(path, file), dialog, reportProgress);
            }
            if (dialog && dialog.cancelled) return;
            await fs.promises.rmdir(path);
        } else {
            if (dialog && reportProgress) {
                const sourceDir = getParentPath(path);
                dialog.update(path, sourceDir, null, 0);
            }
            await fs.promises.unlink(path);
            if (dialog && reportProgress) {
                dialog.finishItem(stats.size);
                const sourceDir = getParentPath(path);
                dialog.update(path, sourceDir, null, 0);
            }
        }
    }
}
