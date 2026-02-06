import { taskbar } from '../shell/taskbar/taskbar.js';

export class WindowManager {
  constructor() {
    this._zIndex = 1000;
    this.minimizedWindows = new Map();
  }

  incrementZIndex() {
    return ++this._zIndex;
  }

  getHighestZIndex() {
    return this._zIndex;
  }

  minimizeWindow(win, skipTaskbarUpdate = false) {
    if (!win?.id) return;

    // Access the $window jQuery object from the DOM element
    const $window = win.$window || $(win).closest(".window").data("$window");
    if ($window && typeof $window.minimize === "function") {
      $window.minimize();
    } else {
      console.warn("Window element does not have minimize method:", win);
      win.style.display = "none";
      win.isMinimized = true;
    }

    // Update taskbar button if needed
    if (!skipTaskbarUpdate) {
      taskbar.updateTaskbarButton(win.id, false, true);
    }
  }

  restoreWindow(win) {
    if (!win?.id) return;

    // Access the $window jQuery object from the DOM element
    const $window = win.$window || $(win).closest(".window").data("$window");

    if ($window && typeof $window.unminimize === "function") {
      $window.unminimize();
      $window.bringToFront();
    } else {
      console.warn("Window element does not have unminimize method:", win);
      win.style.display = "";
      win.isMinimized = false;
    }

    // Update taskbar button
    taskbar.updateTaskbarButton(win.id, true, false);
  }

  updateTitleBarClasses(win) {
    if (!win) return;

    // Remove active class from all windows
    document.querySelectorAll(".app-window").forEach((w) => {
      w.querySelector(".title-bar")?.classList.remove("active");
    });

    // Add active class to current window
    win.querySelector(".title-bar")?.classList.add("active");
  }
}
