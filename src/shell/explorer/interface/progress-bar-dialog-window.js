import { getDisplayName } from '../navigation/path-utils.js';
import { ShowDialogWindow } from '../../../shared/components/dialog-window.js';

/**
 * ProgressBarShowDialogWindow - Shows progress for file operations
 */
export class ProgressBarShowDialogWindow {
  constructor(operation, totalItems, totalSize, onCancel) {
    this.operation = operation; // 'copy' or 'move'
    this.totalItems = totalItems;
    this.totalSize = totalSize;
    this.onCancel = onCancel;
    this.cancelled = false;

    this.startTime = Date.now();
    this.processedSize = 0;
    this.processedItems = 0;

    this._createUI();
  }

  _createUI() {
    const title = {
      copy: "Copying...",
      move: "Moving...",
      recycle: "Recycling...",
      delete: "Deleting...",
      empty: "Emptying Recycle Bin...",
      restore: "Restoring...",
      shortcut: "Creating Shortcuts..."
    }[this.operation] || "Processing...";

    const gifUrl = {
      copy: new URL("../assets/copying.gif", import.meta.url).href,
      move: new URL("../assets/moving.gif", import.meta.url).href,
      recycle: new URL("../assets/moving.gif", import.meta.url).href,
      delete: new URL("../assets/copying.gif", import.meta.url).href,
      empty: new URL("../assets/moving.gif", import.meta.url).href,
      restore: new URL("../assets/moving.gif", import.meta.url).href,
      shortcut: new URL("../assets/moving.gif", import.meta.url).href
    }[this.operation] || new URL("../assets/moving.gif", import.meta.url).href;

    const content = document.createElement("div");
    content.className = "progress-dialog-content";
    content.style.width = "400px";

    // 1. gif image placeholder
    this.gifContainer = document.createElement("div");
    this.gifContainer.style.height = "60px";
    this.gifContainer.style.marginBottom = "10px";
    this.gifContainer.style.display = "flex";
    this.gifContainer.style.alignItems = "left";
    this.gifContainer.style.justifyContent = "left";
    this.gifContainer.style.overflow = "hidden";

    this.gifEl = document.createElement("img");
    this.gifEl.src = gifUrl;
    this.gifEl.style.maxWidth = "100%";
    this.gifEl.style.maxHeight = "100%";
    // Hide image until it's actually loaded and has size, or just let it be broken if placeholder
    this.gifEl.onerror = () => {
      this.gifContainer.textContent =
        this.operation === "copy" ? "Copying Animation" : "Moving Animation";
    };
    this.gifContainer.appendChild(this.gifEl);
    content.appendChild(this.gifContainer);

    // 2. name of file
    this.fileNameEl = document.createElement("div");
    this.fileNameEl.style.whiteSpace = "nowrap";
    this.fileNameEl.style.overflow = "hidden";
    this.fileNameEl.style.textOverflow = "ellipsis";
    this.fileNameEl.textContent = "Preparing...";
    content.appendChild(this.fileNameEl);

    // 3. From 'source' to 'destination'
    this.fromToEl = document.createElement("div");
    this.fromToEl.style.marginBottom = "10px";
    this.fromToEl.style.fontSize = "11px";
    this.fromToEl.style.minHeight = "1.2em";
    this.fromToEl.textContent = " ";
    content.appendChild(this.fromToEl);

    // 4. Progress section
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
    this.progressBar.style.backgroundImage =
      "linear-gradient(90deg,var(--ActiveTitle) 6px,transparent 0 2px)";
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
      this.win.close();
    };
    progressSection.appendChild(cancelBtn);

    content.appendChild(progressSection);

    this.win = ShowDialogWindow({
      title: title,
      content: content,
      modal: false,
      buttons: [],
    });
  }

  update(currentItemPath, sourcePath, destPath, currentProcessedSizeInFile) {
    if (this.cancelled) return;

    const fileName = getDisplayName(currentItemPath);
    if (this.fileNameEl) this.fileNameEl.textContent = fileName;

    if (this.fromToEl) {
      let sourceName = sourcePath ? getDisplayName(sourcePath) : "";
      if (sourceName.length > 20) {
        sourceName = sourceName.substring(0, 17) + "...";
      }

      let destName = destPath ? getDisplayName(destPath) : "";
      if (destName.length > 20) {
        destName = destName.substring(0, 17) + "...";
      }

      if (this.operation === "delete") {
        this.fromToEl.textContent = `Deleting from '${sourceName}'`;
      } else if (this.operation === "recycle") {
        this.fromToEl.textContent = `From '${sourceName}' to Recycle Bin`;
      } else if (this.operation === "empty") {
        this.fromToEl.textContent = `Emptying Recycle Bin...`;
      } else if (this.operation === "restore") {
        this.fromToEl.textContent = `From Recycle Bin to '${destName}'`;
      } else {
        this.fromToEl.textContent = `From '${sourceName}' to '${destName}'`;
      }
    }

    const totalProcessed = this.processedSize + currentProcessedSizeInFile;
    const percent =
      this.totalSize > 0 ? (totalProcessed / this.totalSize) * 100 : 0;
    if (this.progressBar)
      this.progressBar.style.width = `${Math.min(100, percent)}%`;

    // Time remaining
    const now = Date.now();
    const elapsed = (now - this.startTime) / 1000; // seconds
    if (elapsed > 1 && totalProcessed > 0) {
      const speed = totalProcessed / elapsed; // bytes/sec
      const remaining = (this.totalSize - totalProcessed) / speed; // seconds
      if (this.timeRemainingEl)
        this.timeRemainingEl.textContent = this._formatTime(remaining);
    }
  }

  finishItem(itemSize) {
    this.processedSize += itemSize;
    this.processedItems++;
  }

  _formatTime(seconds) {
    if (seconds < 1) return "0 Seconds Remaining";
    if (seconds > 3600 * 24 * 7) return "Calculating...";

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (minutes > 0) {
      return `${minutes} Minutes Remaining`;
    }
    return `${secs} Seconds Remaining`;
  }

  close() {
    if (this.win && !this.win.closed) {
      this.win.close();
    }
  }
}
