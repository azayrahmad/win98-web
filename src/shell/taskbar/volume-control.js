import { kernel } from "../../system/kernel.js";
import { createTaskbarButton, removeTaskbarButton } from "./taskbar.js";
import { ICONS } from "../../config/icons.js";

class VolumeControl {
  constructor() {
    this.element = null;
    this.isVisible = false;
    this.taskbarButton = null;
    this._handleOutsideClick = this._handleOutsideClick.bind(this);
    this._handleKeyDown = this._handleKeyDown.bind(this);
  }

  show(x, y) {
    if (this.isVisible) {
      this.hide();
      return;
    }

    this.render();
    this.isVisible = true;

    // Position the element
    // "at the bottom of the screen, to the left of the pointer"
    // We need to wait for it to be in the DOM to get its size
    const rect = this.element.getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    const taskbarHeight = 28; // Approximate taskbar height

    let left = x - rect.width;
    let top = screenHeight - taskbarHeight - rect.height - 2;

    // Ensure it's within screen bounds
    if (left < 0) left = 0;

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;

    // Create taskbar button
    // We need a fake window-like object for createTaskbarButton
    this.fakeWin = {
      id: "volume-control-popup",
      $window: {
        title: () => "Volume Control",
        close: () => this.hide(),
        onFocus: (cb) => {
          this._onFocus = cb;
        },
        onBlur: (cb) => {
          this._onBlur = cb;
        },
        onClosed: (cb) => {
          this._onClosed = cb;
        },
        bringToFront: () => {
          this.element.style.zIndex = window.System
            ? window.System.incrementZIndex()
            : 10000;
        },
      },
      element: this.element,
      // Taskbar expects a jQuery-like object or at least something that can have events
      on: () => {},
      off: () => {},
    };

    // Note: taskbar.createTaskbarButton expects a real DOM element with id
    this.element.id = this.fakeWin.id;
    this.element.$window = this.fakeWin.$window;
    // Add classes that taskbar might look for
    this.element.classList.add("app-window");

    this.taskbarButton = createTaskbarButton(
      this.fakeWin.id,
      ICONS.systray,
      "Volume Control",
    );

    // Add event listeners for closing
    setTimeout(() => {
      document.addEventListener("mousedown", this._handleOutsideClick);
      document.addEventListener("keydown", this._handleKeyDown);
    }, 0);

    this.element.focus();
  }

  hide() {
    if (!this.isVisible) return;

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    if (this.fakeWin) {
      if (this._onClosed) this._onClosed();
      removeTaskbarButton(this.fakeWin.id);
      this.fakeWin = null;
    }

    document.removeEventListener("mousedown", this._handleOutsideClick);
    document.removeEventListener("keydown", this._handleKeyDown);
    this.isVisible = false;
  }

  render() {
    const container = document.createElement("div");
    container.className = "volume-control-popup outset-deep";
    container.style.position = "fixed";
    container.style.padding = "5px 5px";
    container.style.zIndex = "9999";
    container.style.width = "70px";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.alignItems = "center";
    container.tabIndex = -1; // Make it focusable

    const soundService = kernel.use('sound');
    const currentVolume = soundService.getVolume();
    const isMuted = soundService.getMuted();

    // Use standard 98.css structure as much as possible
    container.innerHTML = `
      <div style="text-align: center; width: 100%;">Volume</div>
      <div class="field-row" style="justify-content: center; width: 100%;">
        <div class="is-vertical" style="height: 100px;">
          <input id="volume-slider" class="has-box-indicator" type="range" min="0" max="100" step="1" value="${Math.round(currentVolume * 100)}" aria-label="Volume" style="margin: 0; width: 90px" />
        </div>
      </div>
      <div class="field-row" style="width: 100%; justify-content: center;">
        <input type="checkbox" id="mute-checkbox" ${isMuted ? "checked" : ""}>
        <label for="mute-checkbox"><u>M</u>ute</label>
      </div>
    `;

    document.body.appendChild(container);
    this.element = container;

    const slider = container.querySelector("#volume-slider");
    slider.addEventListener("input", (e) => {
      soundService.setVolume(e.target.value / 100);
    });

    const muteCheckbox = container.querySelector("#mute-checkbox");
    muteCheckbox.addEventListener("change", (e) => {
      soundService.setMuted(e.target.checked);
    });
  }

  _handleOutsideClick(e) {
    if (this.element && !this.element.contains(e.target)) {
      // Check if we clicked the volume icon in the tray to avoid immediate toggle back
      const trayIcon = e.target.closest('img[alt="Volume"]');
      if (!trayIcon) {
        this.hide();
      }
    }
  }

  _handleKeyDown(e) {
    if (e.key === "Escape") {
      this.hide();
    }
  }
}

export const volumeControl = new VolumeControl();
