import { openApps } from '../../../system/application.js';
import { getParentPath, getPathName } from '../navigation/path-utils.js';
import { RecycleBinManager } from './recycle-bin-manager.js';
import { ShowDialogWindow } from '../../../shared/components/dialog-window.js';
import { ProgressBarShowDialogWindow } from '../interface/progress-bar-dialog-window.js';

export class DragDropManager {
    constructor() {
        this.isDragging = false;
        this.draggedItems = [];
        this.sourceApp = null;
        this.ghostElement = null;
        this.dropTarget = null;
        this.startX = 0;
        this.startY = 0;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    startDrag(iconElements, sourceApp, x, y, isTouch = false) {
        if (this.isDragging) return;
        this.isDragging = true;
        this.isTouchDrag = isTouch;
        this.draggedItems = iconElements.map(el => {
            const rect = el.getBoundingClientRect();
            return {
                element: el,
                path: el.getAttribute('data-path'),
                type: el.getAttribute('data-type'),
                offsetX: x - rect.left,
                offsetY: y - rect.top
            };
        });
        this.sourceApp = sourceApp;
        this.startX = x;
        this.startY = y;
        if (this.draggedItems.length > 0) {
            this.offsetX = this.draggedItems[0].offsetX;
            this.offsetY = this.draggedItems[0].offsetY;
        }
        this._createGhost(iconElements, x, y);
        this._boundMouseMove = this._handleMouseMove.bind(this);
        this._boundMouseUp = this._handleMouseUp.bind(this);

        if (this.isTouchDrag) {
            document.addEventListener('touchmove', this._boundMouseMove, { passive: false });
            document.addEventListener('touchend', this._boundMouseUp);
            document.addEventListener('touchcancel', this._boundMouseUp);
        } else {
            document.addEventListener('mousemove', this._boundMouseMove);
            document.addEventListener('mouseup', this._boundMouseUp);
        }
        document.body.classList.add('dragging');
    }

    _createGhost(iconElements, x, y) {
        const ghost = document.createElement('div');
        ghost.className = 'drag-ghost';
        ghost.style.position = 'fixed';
        ghost.style.left = `${x - this.offsetX}px`;
        ghost.style.top = `${y - this.offsetY}px`;
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '99999';
        ghost.style.opacity = '0.6';
        iconElements.forEach((el, index) => {
            const item = this.draggedItems[index];
            const clone = el.cloneNode(true);
            clone.classList.remove('selected');
            clone.classList.add('ghost-item');
            clone.style.position = 'absolute';
            clone.style.left = `${this.offsetX - item.offsetX}px`;
            clone.style.top = `${this.offsetY - item.offsetY}px`;
            clone.style.margin = '0';
            ghost.appendChild(clone);
        });
        document.body.appendChild(ghost);
        this.ghostElement = ghost;
    }

    _handleMouseMove(e) {
        if (!this.isDragging) return;
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        const y = e.touches ? e.touches[0].clientY : e.clientY;

        if (this.isTouchDrag && e.cancelable) {
            e.preventDefault();
        }

        if (this.ghostElement) {
            this.ghostElement.style.left = `${x - this.offsetX}px`;
            this.ghostElement.style.top = `${y - this.offsetY}px`;
        }
        this._updateDropTarget(x, y);
    }

    _updateDropTarget(x, y) {
        const elements = document.elementsFromPoint(x, y);
        let newTarget = null;
        for (const el of elements) {
            const icon = el.closest('.explorer-icon');
            if (icon) {
                const type = icon.getAttribute('data-type');
                if (type === 'directory') {
                    const targetPath = icon.getAttribute('data-path');
                    if (!this.draggedItems.some(item => item.path === targetPath || targetPath.startsWith(item.path + '/'))) {
                         const sourceDir = this.draggedItems[0] ? getParentPath(this.draggedItems[0].path) : null;
                         const targetDir = getParentPath(targetPath);
                         if (sourceDir === "/" && targetDir === "/") {}
                         else { newTarget = icon; break; }
                    }
                }
            }
            if (el.classList.contains('explorer-icon-view') || el.classList.contains('desktop')) {
                const targetPath = el.getAttribute('data-current-path');
                if (targetPath) { newTarget = el; break; }
            }
        }
        if (this.dropTarget !== newTarget) {
            if (this.dropTarget) this.dropTarget.classList.remove('drop-target-highlight');
            this.dropTarget = newTarget;
            if (this.dropTarget && this.dropTarget.classList.contains('explorer-icon')) this.dropTarget.classList.add('drop-target-highlight');
        }
    }

    _handleMouseUp(e) {
        if (!this.isDragging) return;
        const dragData = {
            sourceApp: this.sourceApp,
            draggedItems: [...this.draggedItems],
            dropTarget: this.dropTarget,
            offsetX: this.offsetX,
            offsetY: this.offsetY
        };

        const isCopy = e.ctrlKey;
        const x = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientX : e.clientX;
        const y = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0].clientY : e.clientY;

        this._performDrop(x, y, isCopy, dragData);
        this._cleanup();
    }

    async _performDrop(x, y, isCopy, dragData) {
        const { sourceApp, draggedItems, dropTarget, offsetX, offsetY } = dragData;
        if (!dropTarget || !sourceApp) return;
        let destinationPath = null;
        let targetWindow = dropTarget.closest('.window');
        let targetApp = targetWindow ? openApps.get(targetWindow.id) : null;
        if (dropTarget.classList.contains('explorer-icon')) destinationPath = dropTarget.getAttribute('data-path');
        else if (dropTarget.classList.contains('explorer-icon-view') || dropTarget.classList.contains('desktop')) destinationPath = dropTarget.getAttribute('data-current-path');
        if (!destinationPath) return;
        const sourcePaths = draggedItems.map(item => item.path);
        const offsets = draggedItems.map(item => ({ x: offsetX - item.offsetX, y: offsetY - item.offsetY }));
        let dropX = null, dropY = null;

        let container = (targetApp && targetApp.iconContainer);
        if (!container && dropTarget) {
            container = dropTarget.closest('.explorer-icon-view') || dropTarget.closest('.desktop');
        }

        if (container) {
            const rect = container.getBoundingClientRect();
            dropX = x - rect.left + (container.scrollLeft || 0) - offsetX;
            dropY = y - rect.top + (container.scrollTop || 0) - offsetY;
        }
        const sourceDir = sourcePaths[0].substring(0, sourcePaths[0].lastIndexOf('/')) || '/';
        if (!isCopy && destinationPath === sourceDir) {
            if (sourceApp.handleRearrange) await sourceApp.handleRearrange(sourcePaths, dropX, dropY, offsets);
            return;
        }
        if (sourceDir === "/") return;
        if (sourcePaths.some(p => RecycleBinManager.isRecycledItemPath(p))) {
            await sourceApp.fileOps.moveItemsFromRecycleBin(sourcePaths, destinationPath);
            return;
        }
        if (RecycleBinManager.isRecycleBinPath(destinationPath)) {
            const message = sourcePaths.length === 1
                ? `Are you sure you want to send '${getPathName(sourcePaths[0])}' to the Recycle Bin?`
                : `Are you sure you want to send these ${sourcePaths.length} items to the Recycle Bin?`;

            ShowDialogWindow({
                title: "Confirm File Delete",
                text: message,
                modal: true,
                buttons: [
                    {
                        label: "Yes",
                        isDefault: true,
                        action: async () => {
                            const totalSize = await sourceApp.fileOps.getTotalSize(sourcePaths);
                            const dialog = new ProgressBarShowDialogWindow("recycle", sourcePaths.length, totalSize);
                            try {
                                await RecycleBinManager.moveItemsToRecycleBin(sourcePaths, dialog);
                            } finally {
                                dialog.close();
                            }
                        }
                    },
                    { label: "No" }
                ]
            });
            return;
        }
        const totalSize = await sourceApp.fileOps.getTotalSize(sourcePaths);
        const dialog = new ProgressBarShowDialogWindow(isCopy ? "copy" : "move", sourcePaths.length, totalSize);
        try {
            if (isCopy) await sourceApp.fileOps.copyItemsDirect(sourcePaths, destinationPath, { dropX, dropY, offsets }, dialog);
            else await sourceApp.fileOps.moveItemsDirect(sourcePaths, destinationPath, { dropX, dropY, offsets }, dialog);
        } catch (err) { console.error('Drop failed:', err); }
        finally { dialog.close(); }
    }

    _cleanup() {
        this.isDragging = false;
        if (this.ghostElement && this.ghostElement.parentElement) this.ghostElement.parentElement.removeChild(this.ghostElement);
        this.ghostElement = null;
        if (this.dropTarget) this.dropTarget.classList.remove('drop-target-highlight');
        this.dropTarget = null;

        if (this.isTouchDrag) {
            document.removeEventListener('touchmove', this._boundMouseMove);
            document.removeEventListener('touchend', this._boundMouseUp);
            document.removeEventListener('touchcancel', this._boundMouseUp);
        } else {
            document.removeEventListener('mousemove', this._boundMouseMove);
            document.removeEventListener('mouseup', this._boundMouseUp);
        }

        document.body.classList.remove('dragging');
        this.draggedItems = [];
        this.sourceApp = null;
        this.isTouchDrag = false;
    }
}
export default new DragDropManager();
