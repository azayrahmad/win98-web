import { ShowDialogWindow } from "./dialog-window.js";

/**
 * Creates and shows a progress dialog window.
 * @param {object} options
 * @param {string} options.title - The title of the dialog.
 * @param {string} options.text - The label for the progress bar.
 * @returns {object} An object with an `update(percent)` method and `close()` method.
 */
export function ShowProgressDialog(options) {
    const { title, text } = options;

    const content = document.createElement("div");
    content.className = "progress-dialog-container";
    content.style.padding = "10px";

    const label = document.createElement("div");
    label.className = "progress-dialog-label";
    label.textContent = text;
    label.style.marginBottom = "10px";
    content.appendChild(label);

    const progressContainer = document.createElement("div");
    progressContainer.className = "progress-bar-container sunken-panel";
    progressContainer.style.height = "20px";
    progressContainer.style.width = "100%";
    progressContainer.style.backgroundColor = "var(--Window)";
    progressContainer.style.position = "relative";
    content.appendChild(progressContainer);

    const progressBar = document.createElement("div");
    progressBar.className = "progress-bar-fill";
    progressBar.style.height = "100%";
    progressBar.style.width = "0%";
    progressBar.style.backgroundColor = "var(--ActiveTitle)";
    progressContainer.appendChild(progressBar);

    const percentText = document.createElement("div");
    percentText.className = "progress-percent-text";
    percentText.style.position = "absolute";
    percentText.style.width = "100%";
    percentText.style.textAlign = "center";
    percentText.style.top = "0";
    percentText.style.left = "0";
    percentText.style.lineHeight = "20px";
    percentText.style.color = "var(--WindowText)";
    percentText.style.mixBlendMode = "difference";
    percentText.textContent = "0%";
    progressContainer.appendChild(percentText);

    const win = ShowDialogWindow({
        title,
        content,
        modal: true,
        buttons: [], // No buttons for this loading dialog
    });

    return {
        update: (percent) => {
            const p = Math.min(100, Math.max(0, percent));
            progressBar.style.width = `${p}%`;
            percentText.textContent = `${Math.round(p)}%`;
        },
        close: () => {
            win.close();
        },
        setTitle: (newTitle) => {
            win.title(newTitle);
        },
        setLabel: (newLabel) => {
            label.textContent = newLabel;
        }
    };
}
