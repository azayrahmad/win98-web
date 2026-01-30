import { ZenDirectoryView } from './components/ZenDirectoryView.js';
import { IconManager } from '../../components/IconManager.js';
import ZenLayoutManager from './utils/ZenLayoutManager.js';
import ZenDragDropManager from './utils/ZenDragDropManager.js';
import { ZenContextMenuBuilder } from './utils/ZenContextMenuBuilder.js';
import { ZenShellManager } from './utils/ZenShellManager.js';
import { getAssociation } from '../../utils/directory.js';
import { getItem, LOCAL_STORAGE_KEYS } from '../../utils/localStorage.js';

export class ZenDesktopApp {
    constructor() {
        this.currentPath = '/C:/WINDOWS/Desktop';
        this.viewMode = 'large';
        this.id = 'desktop';
    }

    async init() {
        this.iconContainer = document.getElementById('desktop');
        if (!this.iconContainer) {
            console.error('Desktop container not found');
            return;
        }

        this.iconContainer.innerHTML = '';
        this.iconContainer.className = 'desktop explorer-icon-view large-icons';
        this.iconContainer.setAttribute('data-current-path', this.currentPath);

        this.directoryView = new ZenDirectoryView(this);
        this.contextMenuBuilder = new ZenContextMenuBuilder(this);

        // Mock status bar for ZenDirectoryView
        this.statusBar = { setText: () => {} };

        this.iconManager = new IconManager(this.iconContainer, {
            iconSelector: '.explorer-icon',
            onDragStart: (e, icon, selectedIcons) => {
                ZenDragDropManager.startDrag(selectedIcons, this, e.clientX, e.clientY);
            },
            onItemContext: (e, icon) => {
                const menuItems = this.contextMenuBuilder.buildItemMenu(e, icon);
                new window.ContextMenu(menuItems, e);
            },
            onBackgroundContext: (e) => {
                const menuItems = this.contextMenuBuilder.buildBackgroundMenu(e);
                new window.ContextMenu(menuItems, e);
            },
            onSelectionChange: () => {
                this.directoryView.handleSelectionChange();
            }
        });

        // Setup event listeners
        this.iconContainer.addEventListener('dblclick', (e) => {
            const icon = e.target.closest('.explorer-icon');
            if (icon) {
                this.openFile(icon);
            }
        });

        // FS change listener
        document.addEventListener('zen-fs-change', (e) => {
            if (e.detail?.path === this.currentPath || e.detail?.path === '/') {
                this.refresh();
            }
        });

        // Layout change listener
        document.addEventListener('zen-layout-change', (e) => {
            if (e.detail.path === this.currentPath) {
                this.refresh();
            }
        });

        // Wallpaper listener
        document.addEventListener('wallpaper-changed', () => {
            this.applyWallpaper();
        });

        await this.refresh();
        this.applyWallpaper();
    }

    applyWallpaper() {
        if (!this.iconContainer) return;

        const wallpaper = getItem(LOCAL_STORAGE_KEYS.WALLPAPER);
        const mode = getItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE) || 'stretch';

        if (wallpaper && wallpaper !== 'none') {
            const img = new Image();
            img.onload = () => {
                const naturalWidth = img.naturalWidth;
                const naturalHeight = img.naturalHeight;
                const scaledWidth = naturalWidth; // desktop usually uses full size
                const scaledHeight = naturalHeight;

                this.iconContainer.style.backgroundImage = `url(${wallpaper})`;
                this.iconContainer.style.backgroundRepeat = 'no-repeat';
                this.iconContainer.style.backgroundPosition = 'center center';

                switch (mode) {
                    case 'stretch':
                        this.iconContainer.style.backgroundSize = '100% 100%';
                        break;
                    case 'center':
                        this.iconContainer.style.backgroundSize = 'auto';
                        break;
                    case 'tile':
                        this.iconContainer.style.backgroundRepeat = 'repeat';
                        this.iconContainer.style.backgroundSize = 'auto';
                        this.iconContainer.style.backgroundPosition = '0 0';
                        break;
                    default:
                        this.iconContainer.style.backgroundSize = '100% 100%';
                        break;
                }
            };
            img.src = wallpaper;
        } else {
            this.iconContainer.style.backgroundImage = 'none';
        }
    }

    async refresh() {
        await this.directoryView.renderDirectoryContents(this.currentPath);
        const layout = await ZenLayoutManager.getLayout(this.currentPath);
        this._autoArrange = layout.autoArrange;
    }

    get autoArrange() {
        return this._autoArrange;
    }

    set autoArrange(value) {
        this._autoArrange = value;
    }

    async handleRearrange(sourcePaths, x, y, offsets) {
        const layout = await ZenLayoutManager.getLayout(this.currentPath);
        if (!layout.autoArrange) {
            sourcePaths.forEach((path, index) => {
                const name = path.split('/').pop();
                const offset = offsets ? offsets[index] : { x: 0, y: 0 };
                layout.positions[name] = { x: x + offset.x, y: y + offset.y };
            });
        } else {
            // Simple reorder for desktop
            const names = sourcePaths.map(p => p.split('/').pop());
            const currentOrder = layout.order || [];
            let newOrder = currentOrder.filter(n => !names.includes(n));
            newOrder.push(...names);
            layout.order = newOrder;
        }
        await ZenLayoutManager.saveLayout(this.currentPath, layout);
    }

    async openFile(icon) {
        const name = icon.getAttribute('data-name');
        const fullPath = icon.getAttribute('data-path');
        const type = icon.getAttribute('data-type');

        // Try shell extension first
        const handled = await ZenShellManager.onOpen(fullPath, this);
        if (handled) return;

        const { launchApp } = await import('../../utils/appManager.js');
        if (type === 'directory') {
            launchApp('zenexplorer', fullPath);
        } else {
            const association = getAssociation(name);
            if (association.appId) {
                launchApp(association.appId, fullPath);
            } else {
                alert(`Cannot open file: ${name}`);
            }
        }
    }
}
