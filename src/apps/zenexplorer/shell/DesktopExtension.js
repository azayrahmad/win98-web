import { ICONS } from '../../../config/icons.js';
import { VirtualStats } from '../utils/ZenShellManager.js';

export class DesktopExtension {
    constructor() {
        this.path = '/C:/WINDOWS/Desktop';
    }

    handlesPath(path) {
        return path === this.path || path.startsWith(this.path + '/');
    }

    async stat(path) {
        if (path === this.path) {
            return new VirtualStats({ isDirectory: true });
        }
        if (path === this.path + '/My Computer' ||
            path === this.path + '/Recycle Bin' ||
            path === this.path + '/My Documents') {
            return new VirtualStats({ isDirectory: true });
        }
        return null; // Fallback to real filesystem
    }

    async readdir(path) {
        if (path === this.path) {
            return ['My Computer', 'Recycle Bin', 'My Documents'];
        }
        return null;
    }

    getIconObj(path) {
        if (path === this.path + '/My Computer') {
            return ICONS.computer;
        }
        if (path === this.path + '/Recycle Bin' || path === '//recycle-bin') {
            return ICONS.recycleBinEmpty;
        }
        if (path === this.path + '/My Documents' || path === '/C:/My Documents') {
            return ICONS.folder;
        }
        return null;
    }

    async onOpen(path, app) {
        if (path === '/' || path === this.path + '/My Computer') {
            const { launchApp } = await import('../../../utils/appManager.js');
            launchApp('zenexplorer', '/');
            return true;
        }
        if (path === '//recycle-bin' || path === this.path + '/Recycle Bin') {
            const { launchApp } = await import('../../../utils/appManager.js');
            launchApp('zenexplorer', '//recycle-bin');
            return true;
        }
        if (path === '/C:/My Documents' || path === this.path + '/My Documents') {
            const { launchApp } = await import('../../../utils/appManager.js');
            launchApp('zenexplorer', '/C:/My Documents');
            return true;
        }
        return false;
    }
}
