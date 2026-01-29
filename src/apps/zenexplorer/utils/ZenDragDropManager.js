/**
 * ZenDragDropManager - Handles custom drag and drop for ZenExplorer
 */
export class ZenDragDropManager {
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

    /**
     * Start a drag operation
     * @param {Array<HTMLElement>} iconElements - The icons being dragged
     * @param {ZenExplorerApp} sourceApp - The application instance where drag started
     * @param {number} x - Initial X coordinate
     * @param {number} y - Initial Y coordinate
     */
    startDrag(iconElements, sourceApp, x, y) {
        if (this.isDragging) return;
        this.isDragging = true;
        this.draggedItems = iconElements.map(el => ({
            element: el,
            path: el.getAttribute('data-path'),
            type: el.getAttribute('data-type')
        }));
        this.sourceApp = sourceApp;
        this.startX = x;
        this.startY = y;

        // Calculate offset from first icon
        if (iconElements.length > 0) {
            const rect = iconElements[0].getBoundingClientRect();
            this.offsetX = x - rect.left;
            this.offsetY = y - rect.top;
        }

        this._createGhost(iconElements, x, y);

        this._boundMouseMove = this._handleMouseMove.bind(this);
        this._boundMouseUp = this._handleMouseUp.bind(this);

        document.addEventListener('mousemove', this._boundMouseMove);
        document.addEventListener('mouseup', this._boundMouseUp);

        document.body.classList.add('zen-dragging');
    }

    /**
     * Create the ghost element following the cursor
     * @private
     */
    _createGhost(iconElements, x, y) {
        const ghost = document.createElement('div');
        ghost.className = 'zen-drag-ghost';
        ghost.style.position = 'fixed';
        ghost.style.left = `${x - this.offsetX}px`;
        ghost.style.top = `${y - this.offsetY}px`;
        ghost.style.pointerEvents = 'none';
        ghost.style.zIndex = '99999';
        ghost.style.opacity = '0.6';

        iconElements.forEach((el, index) => {
            const clone = el.cloneNode(true);
            clone.classList.remove('selected');
            clone.classList.add('ghost-item');

            if (index > 0) {
                clone.style.position = 'absolute';
                clone.style.left = `${index * 4}px`;
                clone.style.top = `${index * 4}px`;
            }

            ghost.appendChild(clone);
        });

        document.body.appendChild(ghost);
        this.ghostElement = ghost;
    }

    /**
     * Handle mouse move during drag
     * @private
     */
    _handleMouseMove(e) {
        if (!this.isDragging) return;

        if (this.ghostElement) {
            this.ghostElement.style.left = `${e.clientX - this.offsetX}px`;
            this.ghostElement.style.top = `${e.clientY - this.offsetY}px`;
        }

        this._updateDropTarget(e);
    }

    /**
     * Detect potential drop target under cursor
     * @private
     */
    _updateDropTarget(e) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);

        let newTarget = null;
        for (const el of elements) {
            // Priority 1: Folder/Drive icon
            const icon = el.closest('.explorer-icon');
            if (icon) {
                const type = icon.getAttribute('data-type');
                if (type === 'directory') {
                    const targetPath = icon.getAttribute('data-path');
                    // Don't allow dropping on itself or its children
                    if (!this.draggedItems.some(item => item.path === targetPath || targetPath.startsWith(item.path + '/'))) {
                         newTarget = icon;
                         break;
                    }
                }
            }

            // Priority 2: Explorer icon view background
            if (el.classList.contains('explorer-icon-view')) {
                const targetPath = el.getAttribute('data-current-path');
                if (targetPath) {
                    // Check if we are dragging into the same folder
                    const sourcePath = this.draggedItems[0] ? this.draggedItems[0].path.split('/').slice(0, -1).join('/') || '/' : '';
                    // Note: This logic might be simple, but usually you can't drop in same folder unless it's a copy
                    newTarget = el;
                    break;
                }
            }
        }

        if (this.dropTarget !== newTarget) {
            if (this.dropTarget) {
                this.dropTarget.classList.remove('drop-target-highlight');
            }
            this.dropTarget = newTarget;
            if (this.dropTarget && this.dropTarget.classList.contains('explorer-icon')) {
                this.dropTarget.classList.add('drop-target-highlight');
            }
        }
    }

    /**
     * Handle mouse up to complete drag
     * @private
     */
    _handleMouseUp(e) {
        if (!this.isDragging) return;

        const isCopy = e.ctrlKey;
        this._performDrop(e, isCopy);

        this._cleanup();
    }

    /**
     * Perform the actual drop operation
     * @private
     */
    async _performDrop(e, isCopy) {
        if (!this.dropTarget) return;

        let destinationPath = null;
        if (this.dropTarget.classList.contains('explorer-icon')) {
            destinationPath = this.dropTarget.getAttribute('data-path');
        } else if (this.dropTarget.classList.contains('explorer-icon-view')) {
            destinationPath = this.dropTarget.getAttribute('data-current-path');
        }

        if (!destinationPath) return;

        const sourcePaths = this.draggedItems.map(item => item.path);

        // Prevent dropping on itself or same folder if not copy
        const sourceDir = sourcePaths[0].substring(0, sourcePaths[0].lastIndexOf('/')) || '/';
        if (!isCopy && destinationPath === sourceDir) {
            return;
        }

        try {
            if (isCopy) {
                await this.sourceApp.fileOps.copyItemsDirect(sourcePaths, destinationPath);
            } else {
                await this.sourceApp.fileOps.moveItemsDirect(sourcePaths, destinationPath);
            }
        } catch (err) {
            console.error('Drop failed:', err);
        }
    }

    /**
     * Cleanup drag state and elements
     * @private
     */
    _cleanup() {
        this.isDragging = false;
        if (this.ghostElement && this.ghostElement.parentElement) {
            this.ghostElement.parentElement.removeChild(this.ghostElement);
        }
        this.ghostElement = null;

        if (this.dropTarget) {
            this.dropTarget.classList.remove('drop-target-highlight');
        }
        this.dropTarget = null;

        document.removeEventListener('mousemove', this._boundMouseMove);
        document.removeEventListener('mouseup', this._boundMouseUp);
        document.body.classList.remove('zen-dragging');

        this.draggedItems = [];
        this.sourceApp = null;
    }
}

export default new ZenDragDropManager();
