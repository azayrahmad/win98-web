import { ShowDialogWindow } from '../../shared/components/dialog-window.js';

export class DosGamesDownloaderProgressDialog {
  constructor(options) {
    this.title = options.title || "Downloading...";
    this.parentWindow = options.parentWindow;
    this.onCancel = options.onCancel;
    this.totalSize = options.totalSize || 0;
    this.processedSize = 0;
    this.startTime = Date.now();
    this.cancelled = false;

    this._createUI();
  }

  _createUI() {
    const gifUrl = new URL("../../shell/explorer/assets/copying.gif", import.meta.url).href;

    const content = document.createElement("div");
    content.className = "progress-dialog-content";
    content.style.width = "400px";

    // GIF container
    const gifContainer = document.createElement("div");
    gifContainer.style.height = "60px";
    gifContainer.style.marginBottom = "10px";
    gifContainer.style.display = "flex";
    gifContainer.style.alignItems = "left";
    gifContainer.style.justifyContent = "left";
    gifContainer.style.overflow = "hidden";

    const gifEl = document.createElement("img");
    gifEl.src = gifUrl;
    gifEl.style.maxWidth = "100%";
    gifEl.style.maxHeight = "100%";
    gifContainer.appendChild(gifEl);
    content.appendChild(gifContainer);

    // Current action/file
    this.statusTextEl = document.createElement("div");
    this.statusTextEl.style.whiteSpace = "nowrap";
    this.statusTextEl.style.overflow = "hidden";
    this.statusTextEl.style.textOverflow = "ellipsis";
    this.statusTextEl.textContent = "Preparing...";
    content.appendChild(this.statusTextEl);

    // From/To info
    this.fromEl = document.createElement("div");
    this.fromEl.style.fontSize = "11px";
    this.fromEl.style.minHeight = "1.2em";
    this.fromEl.style.whiteSpace = "nowrap";
    this.fromEl.style.overflow = "hidden";
    this.fromEl.style.textOverflow = "ellipsis";
    this.fromEl.textContent = " ";
    content.appendChild(this.fromEl);

    this.toEl = document.createElement("div");
    this.toEl.style.marginBottom = "10px";
    this.toEl.style.fontSize = "11px";
    this.toEl.style.minHeight = "1.2em";
    this.toEl.style.whiteSpace = "nowrap";
    this.toEl.style.overflow = "hidden";
    this.toEl.style.textOverflow = "ellipsis";
    this.toEl.textContent = " ";
    content.appendChild(this.toEl);

    // Progress bar section
    const progressSection = document.createElement("div");
    progressSection.style.display = "flex";
    progressSection.style.alignItems = "flex-end";
    progressSection.style.gap = "10px";

    const progressInfo = document.createElement("div");
    progressInfo.style.flexGrow = "1";

    this.progressBarContainer = document.createElement("div");
    this.progressBarContainer.className = "progress-indicator segmented";
    this.progressBarContainer.style.height = "15px";
    this.progressBarContainer.style.padding = "3px";

    this.progressBar = document.createElement("span");
    this.progressBar.className = "progress-indicator-bar";
    this.progressBar.style.width = "0%";
    this.progressBar.style.backgroundImage = "linear-gradient(90deg,var(--ActiveTitle) 6px,transparent 0 2px)";
    this.progressBar.style.backgroundSize = "8px 100%";
    this.progressBarContainer.appendChild(this.progressBar);

    progressInfo.appendChild(this.progressBarContainer);

    this.timeRemainingEl = document.createElement("div");
    this.timeRemainingEl.style.marginTop = "5px";
    this.timeRemainingEl.style.fontSize = "11px";
    this.timeRemainingEl.style.minHeight = "1.2em";
    this.timeRemainingEl.textContent = "";
    progressInfo.appendChild(this.timeRemainingEl);

    progressSection.appendChild(progressInfo);

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.minWidth = "50px";
    cancelBtn.onclick = () => {
      this.cancelled = true;
      if (this.onCancel) this.onCancel();
      this.close();
    };
    progressSection.appendChild(cancelBtn);

    content.appendChild(progressSection);

    this.win = ShowDialogWindow({
      title: this.title,
      content: content,
      modal: true,
      parentWindow: this.parentWindow,
      buttons: [],
    });
  }

  update(status, from, to, currentProcessed) {
    if (this.cancelled) return;

    if (status) this.statusTextEl.textContent = status;
    if (from) this.fromEl.textContent = `From '${from}'`;
    if (to) this.toEl.textContent = `To '${to}'`;

    if (currentProcessed !== undefined) {
      this.processedSize = currentProcessed;
    }

    const percent = this.totalSize > 0 ? (this.processedSize / this.totalSize) * 100 : 0;
    if (this.progressBar) {
        this.progressBar.style.width = `${Math.min(100, percent)}%`;
    }

    // Time remaining
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000;
    if (elapsed > 1 && this.processedSize > 0 && this.totalSize > 0) {
      const speed = this.processedSize / elapsed;
      const remaining = (this.totalSize - this.processedSize) / speed;
      this.timeRemainingEl.textContent = this._formatTime(remaining);
    }
  }

  setTotalSize(size) {
    this.totalSize = size;
  }

  _formatTime(seconds) {
    if (seconds < 1) return "0 Seconds Remaining";
    if (seconds > 3600 * 24 * 7) return "Calculating...";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (minutes > 0) return `${minutes} Minutes Remaining`;
    return `${secs} Seconds Remaining`;
  }

  close() {
    if (this.win && !this.win.closed) {
      this.win.close();
    }
  }
}
