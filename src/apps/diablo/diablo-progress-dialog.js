import { ShowDialogWindow } from '../../shared/components/dialog-window.js';

export class DiabloProgressDialog {
  constructor(options) {
    this.title = options.title || "Downloading...";
    this.parentWindow = options.parentWindow;
    this.onCancel = options.onCancel;
    this.totalSize = options.totalSize || 0;
    this.processedSize = 0;
    this.cancelled = false;

    this._createUI();
  }

  _createUI() {
    const content = document.createElement("div");
    content.className = "diablo-progress-content";
    content.style.width = "300px";
    content.style.padding = "10px";

    this.statusTextEl = document.createElement("div");
    this.statusTextEl.style.marginBottom = "10px";
    this.statusTextEl.textContent = "Preparing...";
    content.appendChild(this.statusTextEl);

    this.progressBarContainer = document.createElement("div");
    this.progressBarContainer.className = "progress-indicator segmented";
    this.progressBarContainer.style.height = "20px";
    this.progressBarContainer.style.padding = "2px";

    this.progressBar = document.createElement("span");
    this.progressBar.className = "progress-indicator-bar";
    this.progressBar.style.width = "0%";
    this.progressBar.style.display = "block";
    this.progressBar.style.height = "100%";
    this.progressBar.style.backgroundImage = "linear-gradient(90deg, var(--ActiveTitle) 6px, transparent 0 2px)";
    this.progressBar.style.backgroundSize = "8px 100%";

    this.progressBarContainer.appendChild(this.progressBar);
    content.appendChild(this.progressBarContainer);

    this.percentEl = document.createElement("div");
    this.percentEl.style.marginTop = "5px";
    this.percentEl.style.textAlign = "center";
    this.percentEl.style.fontSize = "11px";
    this.percentEl.textContent = "0%";
    content.appendChild(this.percentEl);

    this.win = ShowDialogWindow({
      title: this.title,
      content: content,
      modal: true,
      parentWindow: this.parentWindow,
      buttons: [
        {
          label: "Cancel",
          action: () => {
            this.cancelled = true;
            if (this.onCancel) this.onCancel();
            return true;
          }
        }
      ],
    });
  }

  update(status, currentProcessed) {
    if (this.cancelled) return;

    if (status) this.statusTextEl.textContent = status;

    if (currentProcessed !== undefined) {
      this.processedSize = currentProcessed;
    }

    const percent = this.totalSize > 0 ? (this.processedSize / this.totalSize) * 100 : 0;
    if (this.progressBar) {
        this.progressBar.style.width = `${Math.min(100, percent)}%`;
    }
    if (this.percentEl) {
        this.percentEl.textContent = `${Math.round(percent)}%`;
    }
  }

  setTotalSize(size) {
    this.totalSize = size;
  }

  close() {
    if (this.win && !this.win.closed) {
      this.win.close();
    }
  }
}
