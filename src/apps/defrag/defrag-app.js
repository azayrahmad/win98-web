import { Application } from '../../system/application.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import defragSound from "./assets/mtrk_internal-hard-drive-defrag_clicks-clanks_1_fsp4824-35843.mp3";
import "./defrag.css";
import { ICONS } from '../../config/icons.js';

export class DefragApp extends Application {
  static config = {
    id: "defrag",
    title: "Disk Defragmenter",
    description: "Defragments your disk for optimal performance.",
    icon: ICONS.defrag, category: "Accessories/System Tools",
    width: 400,
    height: 300,
    resizable: true,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.data = [];
    this.gridContainer = null;
    this.startButton = null;
    this.pauseButton = null;
    this.legendButton = null;
    this.isDefragging = false;
    this.isPaused = false;
    this.isComplete = false;
    this.animationFrameId = null;
    this.win = null;
    this.progressInfo = null;
    this.progressText = null;
    this.progressBar = null;
    this.progressPercent = null;
    this.audio = null;
  }

  async _onLaunch() {
    this._startDefrag();
  }

  _createWindow() {
    const win = new $Window({
      title: "Disk Defragmenter",
      outerWidth: 500,
      outerHeight: 350,
      resizable: true,
      icons: this.icon,
      id: "defrag",
    });

    const initialContent = `
      <div class="defrag-container">
        <div class="defrag-grid"></div>
        <div class="defrag-controls">
          <div class="progress-info-container">
            <div class="progress-info">
              <div class="progress-text" style="visibility: hidden;"></div>
              <div class="progress-indicator segmented">
                <span class="progress-indicator-bar" style="width: 0%;"></span>
              </div>
              <div class="progress-percent" style="visibility: hidden;"></div>
            </div>
          </div>
          <div class="buttons-container">
            <button class="start-defrag-button">Stop</button>
            <button class="pause-defrag-button">Pause</button>
            <button class="legend-button">Legend</button>
            <button class="hide-details-button" disabled>Hide Details</button>
          </div>
        </div>
      </div>
    `;
    win.$content.append(initialContent);

    this.gridContainer = win.$content.find(".defrag-grid")[0];
    this.startButton = win.$content.find(".start-defrag-button")[0];
    this.pauseButton = win.$content.find(".pause-defrag-button")[0];
    this.legendButton = win.$content.find(".legend-button")[0];
    this.progressInfo = win.$content.find(".progress-info")[0];
    this.progressText = win.$content.find(".progress-text")[0];
    this.progressBar = win.$content.find(".progress-indicator-bar")[0];
    this.progressPercent = win.$content.find(".progress-percent")[0];

    this.startButton.addEventListener("click", () => this._handleStopClick());
    this.pauseButton.addEventListener("click", () => this._handlePauseClick());
    this.legendButton.addEventListener("click", () => this._showLegend());

    win.on("close", () => {
      this._stopDefrag();
      if (this.audio) {
        this.audio.pause();
        this.audio = null;
      }
    });

    return win;
  }

  _showLegend() {
    ShowDialogWindow({
      title: "Defrag Legend",
      text: `
        <div class="legend-item"><div class="legend-color unoptimized"></div> Unoptimized data</div>
        <div class="legend-item"><div class="legend-color optimized"></div> Optimized (defragmented) data</div>
        <div class="legend-item"><div class="legend-color free"></div> Free space</div>
        <div class="legend-item"><div class="legend-color source"></div> Data that's currently being read</div>
        <div class="legend-item"><div class="legend-color destination"></div> Data that's currently being written</div>
        <div class="legend-item">Each box represents one disk cluster.</div>
      `,
    });
  }

  _updateProgress(text, percentage) {
    this.progressText.textContent = text;
    this.progressBar.style.width = `${percentage}%`;
    this.progressPercent.textContent = `${Math.floor(percentage)}% Complete`;
  }

  _showProgress() {
    this.progressText.style.visibility = "visible";
    this.progressPercent.style.visibility = "visible";
  }

  _hideProgress() {
    this.progressText.style.visibility = "hidden";
    this.progressPercent.style.visibility = "hidden";
  }

  async _generateData() {
    this.data = [];
    this._showProgress();
    const totalSteps = 2000;

    for (let i = 0; i < totalSteps; i++) {
      const percentage = (i / totalSteps) * 5;
      this._updateProgress("Reading drive information...", percentage);

      var diskStatus = Math.round(Math.random() * 2) > 0 ? 1 : 0;
      for (let j = 0; j < 10; j++) {
        this.data.push(diskStatus);
      }

      if (i % 100 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    this._updateProgress("Reading drive information...", 5);
  }

  _renderGrid() {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = "";
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < this.data.length; i++) {
      const cell = this._createCell(i);
      fragment.appendChild(cell);
    }
    this.gridContainer.appendChild(fragment);
  }

  _createCell(index) {
    const value = this.data[index];
    const cell = document.createElement("div");
    cell.className = "defrag-cell";
    cell.dataset.index = index;
    this._updateCellClass(cell, value);
    return cell;
  }

  _updateCellClass(cell, value) {
    cell.classList.remove(
      "free",
      "unoptimized",
      "optimized",
      "source",
      "destination",
    );
    if (value === 0) cell.classList.add("free");
    else if (value === 1) cell.classList.add("unoptimized");
    else if (value === 2) cell.classList.add("optimized");
  }

  _handleStopClick() {
    if (this.isComplete) return;

    this._stopDefrag();

    ShowDialogWindow({
      title: "Are you sure?",
      text: "Windows has not finished defragmenting drive C.",
      buttons: [
        {
          label: "Resume",
          action: () => this._startDefrag(),
        },
        {
          label: "Exit",
          action: () => this.win.close(),
        },
      ],
    });
  }

  _handlePauseClick() {
    if (this.isComplete) return;

    if (this.isDefragging) {
      this._stopDefrag();
      this.pauseButton.textContent = "Resume";
    } else {
      this._startDefrag();
      this.pauseButton.textContent = "Pause";
    }
  }

  async _startDefrag() {
    if (this.isDefragging && !this.isPaused) return;

    this.pauseButton.disabled = false;

    if (this.data.length === 0) {
      this.win.title("Defragmenting Drive C");
      await this._generateData();
      this._renderGrid();
      this._optimizeInitialBlock();
      this._renderGrid();
    }

    this.win.title("Defragmenting Drive C");
    this.isDefragging = true;
    this.isPaused = false;
    this.animationFrameId = requestAnimationFrame(() => this._defragStep());

    if (!this.audio) {
      this.audio = new Audio(defragSound);
      this.audio.loop = true;
    }
    this.audio.play();
  }

  _stopDefrag() {
    this.isDefragging = false;
    this.isPaused = true;
    this.win.title("Defragmentation Paused");
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.pauseButton.disabled = false;
    if (this.audio) {
      this.audio.pause();
    }
  }

  _defragStep() {
    if (!this.isDefragging) return;

    const move = this._analyzeDiskForNextMove();

    if (!move) {
      this._completeDefrag();
      return;
    }

    const freeStart = this.data.indexOf(0);
    const progress = 5 + (freeStart / this.data.length) * 95;
    this._updateProgress("Defragmenting file system...", progress);

    this._highlightAndMove(move.source, move.destination).then(() => {
      this.animationFrameId = requestAnimationFrame(() => this._defragStep());
    });
  }

  _completeDefrag() {
    this.isDefragging = false;
    this.isComplete = true;
    this.startButton.textContent = "Finished";
    this.startButton.disabled = true;
    this.pauseButton.disabled = true;
    this._updateProgress("Defragmentation complete.", 100);
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
  }

  async _highlightAndMove(sourceBlock, destinationBlock) {
    const cells = this.gridContainer.children;

    // Highlight source cells in green
    for (let i = 0; i < sourceBlock.length; i++) {
      if (!this.isDefragging) return;
      const sourceIndex = sourceBlock.start + i;
      cells[sourceIndex].classList.add("source");
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
    if (!this.isDefragging) return;

    // Make the source empty first, all at once.
    for (let i = 0; i < sourceBlock.length; i++) {
      if (!this.isDefragging) return;
      const sourceIndex = sourceBlock.start + i;
      this.data[sourceIndex] = 0;
      this._updateCellClass(cells[sourceIndex], 0);
    }

    // After that, move to the destination cells one by one.
    for (let i = 0; i < destinationBlock.length; i++) {
      if (!this.isDefragging) return;
      const destIndex = destinationBlock.start + i;
      const cell = cells[destIndex];

      // 1. make it red
      cell.classList.add("destination");
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!this.isDefragging) return;

      // 2. make it cyan first (unoptimized)
      this.data[destIndex] = 1;
      this._updateCellClass(cell, 1);
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (!this.isDefragging) return;
    }

    for (let i = 0; i < destinationBlock.length; i++) {
      // 3. mark as blue (optimized)
      const destIndex = destinationBlock.start + i;
      const cell = cells[destIndex];
      this.data[destIndex] = 2;
      this._updateCellClass(cell, 2);
    }
  }

  _optimizeInitialBlock() {
    const firstFree = this.data.indexOf(0);
    const limit = firstFree === -1 ? this.data.length : firstFree;

    for (let i = 0; i < limit; i++) {
      if (this.data[i] === 1) {
        this.data[i] = 2;
      }
    }
  }

  _analyzeDiskForNextMove() {
    // Find the first contiguous block of free space.
    const freeStart = this.data.indexOf(0);
    if (freeStart === -1) return null; // No free space, defrag is done.

    let freeEnd = freeStart;
    while (freeEnd + 1 < this.data.length && this.data[freeEnd + 1] === 0) {
      freeEnd++;
    }
    const freeLength = freeEnd - freeStart + 1;

    // Find the first contiguous block of unoptimized data *after* the free space.
    let unoptimizedStart = -1;
    for (let i = freeEnd + 1; i < this.data.length; i++) {
      if (this.data[i] === 1) {
        unoptimizedStart = i;
        break;
      }
    }
    if (unoptimizedStart === -1) return null; // No more unoptimized blocks to move.

    let unoptimizedEnd = unoptimizedStart;
    while (
      unoptimizedEnd + 1 < this.data.length &&
      this.data[unoptimizedEnd + 1] === 1
    ) {
      unoptimizedEnd++;
    }
    const unoptimizedLength = unoptimizedEnd - unoptimizedStart + 1;

    // Determine the number of cells to move.
    const moveLength = Math.min(freeLength, unoptimizedLength);

    return {
      source: { start: unoptimizedStart, length: moveLength },
      destination: { start: freeStart, length: moveLength },
    };
  }
}
