import { kernel } from '../../../system/kernel.js';

/**
 * Legacy RecycleBinManager proxying to RecycleBinService in Kernel.
 * @deprecated Use kernel.use('recycleBin') instead.
 */
export class RecycleBinManager {
    static async init() {
        return kernel.use('recycleBin').init();
    }

    static getDriveRoot(path) {
        return kernel.use('recycleBin').getDriveRoot(path);
    }

    static getRecyclePath(path) {
        return kernel.use('recycleBin').getRecyclePath(path);
    }

    static async getMetadata(recyclePath) {
        return kernel.use('recycleBin').getMetadata(recyclePath);
    }

    static async saveMetadata(recyclePath, metadata) {
        return kernel.use('recycleBin').saveMetadata(recyclePath, metadata);
    }

    static async moveItemsToRecycleBin(paths, dialog = null) {
        return kernel.use('recycleBin').moveItemsToRecycleBin(paths, dialog);
    }

    static async moveToRecycleBin(path) {
        return kernel.use('recycleBin').moveItemsToRecycleBin([path]);
    }

    static async restoreItems(itemPaths, dialog = null) {
        return kernel.use('recycleBin').restoreItems(itemPaths, dialog);
    }

    static async restoreItem(path) {
        return kernel.use('recycleBin').restoreItems([path]);
    }

    static async moveItemsFromRecycleBin(itemPaths, destinationPath, dialog = null) {
        return kernel.use('recycleBin').moveItemsFromRecycleBin(itemPaths, destinationPath, dialog);
    }

    static async emptyRecycleBin(recyclePath, dialog = null) {
        return kernel.use('recycleBin').emptyRecycleBin(recyclePath, dialog);
    }

    static async emptyAllRecycleBins(dialog = null) {
        return kernel.use('recycleBin').emptyAllRecycleBins(dialog);
    }

    static async isAnyBinFull() {
        return kernel.use('recycleBin').isAnyBinFull();
    }

    static async refreshFullState() {
        return kernel.use('recycleBin').refreshFullState();
    }

    static isFullSync(recyclePath) {
        return kernel.use('recycleBin').isFullSync(recyclePath);
    }

    static async isEmpty(recyclePath) {
        return kernel.use('recycleBin').isEmpty(recyclePath);
    }

    static isRecycleBinPath(path) {
        return kernel.use('recycleBin').isRecycleBinPath(path);
    }

    static isRecycledItemPath(path) {
        return kernel.use('recycleBin').isRecycledItemPath(path);
    }

    static async getRecycledItemInfo(path) {
        return kernel.use('recycleBin').getRecycledItemInfo(path);
    }
}
