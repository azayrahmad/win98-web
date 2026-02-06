import { fs, mounts } from "@zenfs/core";
import { joinPath, getPathName, getParentPath } from '../navigation/path-utils.js';
import { ShellManager } from '../extensions/shell-manager.js';

export class RecycleBinManager {
    static _isFullCache = new Map();

    static async init() {
        // Initialize cache for all drives
        const drives = Array.from(mounts.keys())
            .filter(m => m.match(/^\/[A-Z]:$/i))
            .map(m => m.substring(1, 2).toUpperCase());

        for (const drive of drives) {
            const recyclePath = `/${drive}:/Recycled`;
            try {
                const metadata = await this.getMetadata(recyclePath);
                this._isFullCache.set(recyclePath, Object.keys(metadata).length > 0);
            } catch (e) {
                this._isFullCache.set(recyclePath, false);
            }
        }
    }

    static getDriveRoot(path) {
        const realPath = ShellManager.getRealPath(path);
        if (!realPath) return "/";
        const match = realPath.match(/^(\/[A-Z]:)/i);
        return match ? match[1] : "/";
    }

    static getRecyclePath(path) {
        if (path === "/Recycle Bin" || path === "/Desktop/Recycle Bin") return "/Recycle Bin";

        // If it's already a virtual path in the global recycle bin, it might need translation
        if (path.startsWith("/Recycle Bin/")) {
            const real = ShellManager.getRealPath(path);
            if (real) return getParentPath(real);
            return "/Recycle Bin";
        }

        const driveRoot = this.getDriveRoot(path);
        if (driveRoot === "/" || driveRoot.toUpperCase() === "/E:") return null;
        return joinPath(driveRoot, "Recycled");
    }

    static async getMetadata(recyclePath) {
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
            const recyclePath = this.getRecyclePath(path);
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

                const realPath = ShellManager.getRealPath(path);
                try {
                    await fs.promises.rename(realPath, targetPath);
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
            this.refreshFullState();
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
            const realItemPath = ShellManager.getRealPath(itemPath);
            const match = realItemPath.match(/^(\/[A-Z]:\/Recycled)\/([^/]+)$/i);
            if (!match) continue;
            const recyclePath = match[1];
            const id = match[2];
            if (id === ".metadata.json") continue;
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
            this.refreshFullState();
            document.dispatchEvent(new CustomEvent("recycle-bin-change"));
        }
    }

    static async restoreItem(path) {
        await this.restoreItems([path]);
    }

    static async moveItemsFromRecycleBin(itemPaths, destinationPath, dialog = null) {
        const groups = {};
        for (const itemPath of itemPaths) {
            const realItemPath = ShellManager.getRealPath(itemPath);
            const match = realItemPath.match(/^(\/[A-Z]:\/Recycled)\/([^/]+)$/i);
            if (!match) continue;
            const recyclePath = match[1];
            const id = match[2];
            if (id === ".metadata.json") continue;
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
                let destPath = joinPath(destinationPath, entry.originalName);

                if (dialog) {
                    dialog.update(entry.originalName, recyclePath, destinationPath, 0);
                }

                try {
                    await fs.promises.stat(destinationPath);
                } catch (e) {
                    await fs.promises.mkdir(destinationPath, { recursive: true });
                }

                // Ensure unique name in destination
                let finalDestPath = destPath;
                try {
                    await fs.promises.stat(finalDestPath);
                    const extIndex = entry.originalName.lastIndexOf('.');
                    const base = extIndex > 0 ? entry.originalName.substring(0, extIndex) : entry.originalName;
                    const ext = extIndex > 0 ? entry.originalName.substring(extIndex) : '';
                    let counter = 1;
                    while (true) {
                        finalDestPath = joinPath(destinationPath, `${base} (${counter})${ext}`);
                        try {
                            await fs.promises.stat(finalDestPath);
                            counter++;
                        } catch (e) {
                            break;
                        }
                    }
                } catch (e) {}

                try {
                    await fs.promises.rename(srcPath, ShellManager.getRealPath(finalDestPath));
                    if (dialog) {
                        const stats = await fs.promises.stat(ShellManager.getRealPath(finalDestPath));
                        dialog.finishItem(stats.isDirectory() ? 0 : stats.size);
                        dialog.update(entry.originalName, recyclePath, destinationPath, 0);
                    }
                } catch (e) {
                    await this.copyRecursive(srcPath, finalDestPath, dialog);
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
            this.refreshFullState();
            document.dispatchEvent(new CustomEvent("recycle-bin-change"));
        }
    }

    static async emptyRecycleBin(recyclePath, dialog = null) {
        if (recyclePath === "/Recycle Bin") {
            return this.emptyAllRecycleBins(dialog);
        }

        const metadata = await this.getMetadata(recyclePath);
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
        this.refreshFullState();
        document.dispatchEvent(new CustomEvent("recycle-bin-change"));
    }

    static async emptyAllRecycleBins(dialog = null) {
        const drives = Array.from(mounts.keys())
            .filter(m => m.match(/^\/[A-Z]:$/i))
            .map(m => m.substring(1, 2).toUpperCase());
        for (const drive of drives) {
            const recyclePath = `/${drive}:/Recycled`;
            try {
                await fs.promises.stat(recyclePath);
                await this.emptyRecycleBin(recyclePath, dialog);
            } catch (e) {}
        }
        this.refreshFullState();
        document.dispatchEvent(new CustomEvent("recycle-bin-change"));
    }

    static async isAnyBinFull() {
        const drives = Array.from(mounts.keys())
            .filter(m => m.match(/^\/[A-Z]:$/i))
            .map(m => m.substring(1, 2).toUpperCase());
        for (const drive of drives) {
            const recyclePath = `/${drive}:/Recycled`;
            try {
                const isEmpty = await this.isEmpty(recyclePath);
                if (!isEmpty) return true;
            } catch (e) {}
        }
        return false;
    }

    static async refreshFullState() {
        await this.init();
        // Trigger a refresh of icons that might depend on empty/full state
        document.dispatchEvent(new CustomEvent("desktop-refresh"));
        document.dispatchEvent(new CustomEvent("theme-changed"));
    }

    static isFullSync(recyclePath) {
        if (recyclePath === "/Recycle Bin" || recyclePath === "/Desktop/Recycle Bin") {
            return Array.from(this._isFullCache.values()).some(v => v === true);
        }
        return this._isFullCache.get(recyclePath) || false;
    }

    static async isEmpty(recyclePath) {
        if (recyclePath === "/Recycle Bin" || recyclePath === "/Desktop/Recycle Bin") {
            return !(await this.isAnyBinFull());
        }
        const metadata = await this.getMetadata(recyclePath);
        const isEmpty = Object.keys(metadata).length === 0;
        this._isFullCache.set(recyclePath, !isEmpty);
        return isEmpty;
    }

    static isRecycleBinPath(path) {
        return !!path.match(/^\/[A-Z]:\/Recycled$/i) || path === "/Recycle Bin" || path === "/Desktop/Recycle Bin";
    }

    static isRecycledItemPath(path) {
        const realPath = ShellManager.getRealPath(path);
        const match = realPath.match(/^(\/[A-Z]:\/Recycled)\/([^/]+)$/i);
        if (!match) return false;
        return match[2] !== ".metadata.json";
    }

    static async getRecycledItemInfo(path) {
        const realPath = ShellManager.getRealPath(path);
        const match = realPath.match(/^(\/[A-Z]:\/Recycled)\/([^/]+)$/i);
        if (!match) return null;

        const recyclePath = match[1];
        const id = match[2];
        if (id === ".metadata.json") return null;

        const metadata = await this.getMetadata(recyclePath);
        return metadata[id] || null;
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
        const realSrc = ShellManager.getRealPath(src);
        const realDest = ShellManager.getRealPath(dest);
        const stats = await fs.promises.stat(realSrc);
        const sourceDir = getParentPath(src);
        const destDir = getParentPath(dest);

        if (stats.isDirectory()) {
            await fs.promises.mkdir(realDest, { recursive: true });
            const files = await fs.promises.readdir(realSrc);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.copyRecursive(joinPath(src, file), joinPath(dest, file), dialog);
            }
        } else {
            if (dialog) {
                dialog.update(src, sourceDir, destDir, 0);
            }
            const data = await fs.promises.readFile(realSrc);
            await fs.promises.writeFile(realDest, data);
            if (dialog) {
                dialog.finishItem(stats.size);
                dialog.update(src, sourceDir, destDir, 0);
            }
        }
    }

    static async removeRecursive(path, dialog = null, reportProgress = true) {
        if (dialog && dialog.cancelled) return;
        let stats;
        const realPath = ShellManager.getRealPath(path);
        try {
            stats = await fs.promises.stat(realPath);
        } catch (e) {
            return;
        }

        if (stats.isDirectory()) {
            const files = await fs.promises.readdir(realPath);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.removeRecursive(joinPath(path, file), dialog, reportProgress);
            }
            if (dialog && dialog.cancelled) return;
            await fs.promises.rmdir(realPath);
        } else {
            if (dialog && reportProgress) {
                const sourceDir = getParentPath(path);
                dialog.update(path, sourceDir, null, 0);
            }
            await fs.promises.unlink(realPath);
            if (dialog && reportProgress) {
                dialog.finishItem(stats.size);
                const sourceDir = getParentPath(path);
                dialog.update(path, sourceDir, null, 0);
            }
        }
    }
}
