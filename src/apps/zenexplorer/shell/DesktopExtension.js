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
        if (path === this.path + '/My Computer') {
            return new VirtualStats({ isDirectory: true });
        }
        return null; // Fallback to real filesystem
    }

    async readdir(path) {
        if (path === this.path) {
            return ['My Computer'];
        }
        return null;
    }

    getIconObj(path) {
        if (path === this.path + '/My Computer') {
            return ICONS.computer;
        }
        return null;
    }

    async getVirtualItems(path) {
        if (path !== this.path) return [];

        return [
            {
                name: 'My Computer',
                path: '/',
                type: 'directory',
                icon: ICONS.computer,
                isVirtual: true,
            }
        ];
    }

    async onOpen(path, app) {
        if (path === '/' || path === this.path + '/My Computer') {
            const { launchApp } = await import('../../../utils/appManager.js');
            launchApp('zenexplorer', '/');
            return true;
        }
        return false;
    }
}
