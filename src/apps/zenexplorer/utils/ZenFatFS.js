import {
    FileSystem,
    Stats,
    Sync,
    constants
} from '@zenfs/core';

const { S_IFDIR, S_IFREG } = constants;
import { FatFsDisk, FatFsMode } from 'fatfs-wasm';

/**
 * ZenFatFS implements a ZenFS backend using fatfs-wasm.
 */
class FatFS extends FileSystem {
    constructor(disk, label, onWrite) {
        super(0x464154, 'fatfs'); // 'FAT'
        this.disk = disk;
        this.label = label;
        this.onWrite = onWrite;

        // Mount the disk
        this.disk.mount('', 1);
    }

    _notifyWrite() {
        if (this.onWrite) {
            this.onWrite();
        }
    }

    _getStats(path) {
        if (path === '/' || path === '.') {
            return new Stats({
                mode: S_IFDIR | 0o777,
                size: 0,
            });
        }

        try {
            const info = this.disk.stat(path);
            return new Stats({
                mode: (info.isDirectory ? S_IFDIR : S_IFREG) | 0o777,
                size: info.size,
                mtimeMs: info.date.getTime(),
                atimeMs: info.date.getTime(),
                ctimeMs: info.date.getTime(),
            });
        } catch (e) {
            const err = new Error(e.message || 'File not found');
            err.code = 'ENOENT';
            throw err;
        }
    }

    statSync(path) {
        return this._getStats(path);
    }

    readdirSync(path) {
        const entries = [];
        const dir = this.disk.openDir(path);
        try {
            let entry;
            while (entry = dir.read()) {
                if (!entry.name) break;
                if (entry.name !== '.' && entry.name !== '..') {
                    entries.push(entry.name);
                }
            }
        } finally {
            dir.close();
        }
        return entries;
    }

    createFileSync(path, options) {
        this.disk.writeFile(path, new Uint8Array(0));
        this._notifyWrite();
        return this._getStats(path);
    }

    unlinkSync(path) {
        this.disk.unlink(path);
        this._notifyWrite();
    }

    rmdirSync(path) {
        this.disk.unlink(path);
        this._notifyWrite();
    }

    mkdirSync(path, options) {
        this.disk.mkdir(path);
        this._notifyWrite();
        return this._getStats(path);
    }

    renameSync(oldPath, newPath) {
        this.disk.rename(oldPath, newPath);
        this._notifyWrite();
    }

    readSync(path, buffer, offset, length, position) {
        const file = this.disk.open(path, FatFsMode.READ);
        try {
            file.lseek(position);
            return file.read(buffer.subarray(offset, offset + length));
        } finally {
            file.close();
        }
    }

    writeSync(path, buffer, offset, length, position) {
        const file = this.disk.open(path, FatFsMode.WRITE | FatFsMode.OPEN_ALWAYS);
        try {
            file.lseek(position);
            const written = file.write(buffer.subarray(offset, offset + length));
            this._notifyWrite();
            return written;
        } finally {
            file.close();
        }
    }

    truncateSync(path, len) {
        const file = this.disk.open(path, FatFsMode.WRITE | FatFsMode.OPEN_ALWAYS);
        try {
            file.lseek(len);
            file.truncate();
        } finally {
            file.close();
        }
        this._notifyWrite();
    }

    utimesSync(path, atime, mtime) {
        this.disk.utime(path, mtime);
        this._notifyWrite();
    }
}

const SyncFatFS = Sync(FatFS);

export const FAT = {
    name: 'FAT',
    options: {
        data: { type: 'object', required: true },
        label: { type: 'string', required: false },
        onWrite: { type: 'function', required: false }
    },
    async create(options) {
        const disk = await FatFsDisk.create(options.data);
        return new SyncFatFS(disk, options.label, options.onWrite);
    },
    async createAndFormat(options) {
        const disk = await FatFsDisk.create(options.data);
        disk.mkfs();
        return new SyncFatFS(disk, options.label, options.onWrite);
    }
};
