/**
 * ZenUndoManager - Manages the undo stack for file operations in ZenExplorer
 */

const ZenUndoManager = {
    stack: [],

    /**
     * Push a new operation onto the stack
     * @param {Object} operation - The operation to record
     * @param {string} operation.type - 'move', 'copy', 'delete', 'rename', 'create'
     * @param {Object} operation.data - Data needed to undo the operation
     */
    push(operation) {
        this.stack.push(operation);
        document.dispatchEvent(new CustomEvent('zen-undo-change'));
    },

    /**
     * Pop the last operation from the stack
     * @returns {Object|null} The last operation or null if empty
     */
    pop() {
        if (this.stack.length === 0) return null;
        const op = this.stack.pop();
        document.dispatchEvent(new CustomEvent('zen-undo-change'));
        return op;
    },

    /**
     * Peek at the last operation on the stack
     * @returns {Object|null} The last operation or null if empty
     */
    peek() {
        if (this.stack.length === 0) return null;
        return this.stack[this.stack.length - 1];
    },

    /**
     * Clear the undo stack
     */
    clear() {
        this.stack = [];
        document.dispatchEvent(new CustomEvent('zen-undo-change'));
    },

    /**
     * Check if there are operations that can be undone
     * @returns {boolean}
     */
    canUndo() {
        return this.stack.length > 0;
    },

    /**
     * Get the display label for the undo action
     * @returns {string}
     */
    getUndoLabel() {
        const op = this.peek();
        if (!op) return "Undo";

        switch (op.type) {
            case 'move': return "Undo Move";
            case 'copy': return "Undo Copy";
            case 'delete': return "Undo Delete";
            case 'rename': return "Undo Rename";
            case 'create': return "Undo Create";
            default: return "Undo";
        }
    }
};

export default ZenUndoManager;
