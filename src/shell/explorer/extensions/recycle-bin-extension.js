import { fs, mounts } from "@zenfs/core";
import { RecycleBinManager } from '../file-operations/recycle-bin-manager.js';
import { joinPath, getPathName } from '../navigation/path-utils.js';
import { VirtualStats } from './shell-manager.js';
import { ICONS } from '../../../config/icons.js';

export class RecycleBinExtension {
    constructor() {
        this.path = "/Recycle Bin";
        this.virtualId = "recycle-bin";
    }

    handlesPath(path) {
        return path === this.path || path.startsWith(this.path + "/");
    }

    async readdir(path) {
        if (path !== this.path) return null;

        const allEntries = [];
        const drives = Array.from(mounts.keys())
            .filter(m => m.match(/^\/[A-Z]:$/i))
            .map(m => m.substring(1, 2).toUpperCase());

        for (const drive of drives) {
            const recyclePath = `/${drive}:/Recycled`;
            try {
                const metadata = await RecycleBinManager.getMetadata(recyclePath);
                for (const id in metadata) {
                    // Prefix the ID with drive letter to avoid collisions and track origin
                    allEntries.push(`${drive}_${id}`);
                }
            } catch (e) {
                // Drive might not be mounted or no Recycled folder
            }
        }
        return allEntries;
    }

    async stat(path) {
        if (path === this.path) {
            const isEmpty = await RecycleBinManager.isAnyBinFull() === false;
            return new VirtualStats({
                isDirectory: true,
                size: 0,
                mtime: new Date(),
                isVirtual: true,
                icon: isEmpty ? ICONS.recycleBinEmpty : ICONS.recycleBinFull
            });
        }

        const match = path.match(/^\/Recycle Bin\/([A-Z])_([^/]+)$/i);
        if (match) {
            const drive = match[1].toUpperCase();
            const id = match[2];
            const realRecyclePath = `/${drive}:/Recycled/${id}`;

            try {
                const stats = await fs.promises.stat(realRecyclePath);
                const metadata = await RecycleBinManager.getMetadata(`/${drive}:/Recycled`);
                const entry = metadata[id];

                return new VirtualStats({
                    isDirectory: stats.isDirectory(),
                    size: stats.size,
                    mtime: stats.mtime,
                    atime: stats.atime,
                    ctime: stats.ctime,
                    isVirtual: true,
                    originalName: entry ? entry.originalName : id,
                    originalPath: entry ? entry.originalPath : null,
                    deletionDate: entry ? entry.deletionDate : null
                });
            } catch (e) {
                // Might be .metadata.json or missing
            }
        }
        return null;
    }

    getRealPath(path) {
        const match = path.match(/^\/Recycle Bin\/([A-Z])_([^/]+)$/i);
        if (match) {
            const drive = match[1].toUpperCase();
            const id = match[2];
            return `/${drive}:/Recycled/${id}`;
        }
        return null;
    }

    async onOpen(path, app) {
        if (path === this.path) {
            app.navigateTo(path);
            return true;
        }
        return false;
    }

    getColumns(path) {
        if (path === this.path) {
            return [
                { label: "Name", key: "name", width: 200 },
                { label: "Original Location", key: "originalLocation", width: 250 },
                { label: "Date Deleted", key: "dateDeleted", width: 150 },
                { label: "Size", key: "size", width: 80 },
                { label: "Type", key: "type", width: 100 }
            ];
        }
        return null;
    }

    async getColumnValue(path, key, stat) {
        if (key === "originalLocation") return stat.originalPath || "";
        if (key === "dateDeleted") {
            if (!stat.deletionDate) return "";
            const d = new Date(stat.deletionDate);
            return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        }
        if (key === "name") return stat.originalName || getPathName(path);
        return null;
    }
}
