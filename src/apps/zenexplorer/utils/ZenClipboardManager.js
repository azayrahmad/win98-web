/**
 * ZenClipboardManager - Independent clipboard for ZenExplorer
 */

const ZenClipboardManager = {
    items: [],
    operation: null, // 'cut' or 'copy'

    set(items, operation) {
        this.items = items;
        this.operation = operation;
        document.dispatchEvent(new CustomEvent('zen-clipboard-change', { detail: this }));
    },

    get() {
        return {
            items: this.items,
            operation: this.operation,
        };
    },

    clear() {
        this.items = [];
        this.operation = null;
        document.dispatchEvent(new CustomEvent('zen-clipboard-change', { detail: this }));
    },

    isEmpty() {
        return this.items.length === 0;
    },
};

export default ZenClipboardManager;
