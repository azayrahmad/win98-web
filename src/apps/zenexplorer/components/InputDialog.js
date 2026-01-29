import { ShowDialogWindow } from "../../../components/DialogWindow.js";

/**
 * InputDialog - Reusable input dialog component
 */

/**
 * Show an input dialog
 * @param {Object} options - Dialog options
 * @param {string} options.title - Dialog title
 * @param {string} options.label - Input label text
 * @param {string} options.defaultValue - Default input value
 * @param {Function} options.onSubmit - Callback when OK is clicked (receives input value)
 * @param {Window} options.parentWindow - Parent window for modal
 */
export function showInputDialog({ title, label, defaultValue, onSubmit, parentWindow }) {
    const input = document.createElement("input");
    input.type = "text";
    input.value = defaultValue;
    input.style.width = "100%";
    input.style.boxSizing = "border-box";
    input.style.marginBottom = "10px";

    // Select text on focus
    setTimeout(() => input.select(), 100);

    const content = document.createElement("div");
    content.textContent = label;
    content.appendChild(input);

    ShowDialogWindow({
        title,
        content,
        parentWindow,
        modal: true,
        buttons: [
            {
                label: "OK",
                isDefault: true,
                action: async () => {
                    const value = input.value.trim();
                    if (!value) return false; // Prevent closing if empty

                    if (onSubmit) {
                        await onSubmit(value);
                    }
                }
            },
            { label: "Cancel" }
        ]
    });
}
