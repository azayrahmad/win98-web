import { ShowDialogWindow } from "../../../components/DialogWindow.js";

/**
 * Centralized error handling for ZenExplorer
 */

/**
 * Display an error dialog
 * @param {string} title - Dialog title
 * @param {string} message - Error message
 */
export function showError(title, message) {
    ShowDialogWindow({
        title,
        text: message,
        buttons: [{ label: "OK" }]
    });
}

/**
 * Handle file system errors with user-friendly messages
 * @param {string} operation - Operation being performed (e.g., "delete", "rename")
 * @param {Error} error - Error object
 * @param {string} itemName - Optional item name for context
 */
export function handleFileSystemError(operation, error, itemName = "") {
    const operationMessages = {
        delete: `Could not delete ${itemName}`,
        rename: `Cannot rename ${itemName}`,
        create: `Could not create ${itemName}`,
        navigate: `Cannot navigate to ${itemName}`,
        read: `Cannot read ${itemName}`
    };

    const baseMessage = operationMessages[operation] || `Operation failed`;
    const fullMessage = `${baseMessage}: ${error.message}`;

    showError(`Error ${operation.charAt(0).toUpperCase() + operation.slice(1)}ing`, fullMessage);
}
