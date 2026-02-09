/**
 * Taskbar - Handles taskbar, system tray, and taskbar buttons
 * Refactored to use separate StartMenu class
 */

// Vite handles these imports automatically and will optimize them
import { ICONS } from "../../config/icons.js";
import StartMenu from "../start-menu/start-menu.js";
import { showClippyContextMenu } from "../../apps/clippy/clippy.js";
import { launchApp } from "../../system/app-manager.js";

// Constants for better maintainability
const SELECTORS = {
  START_BUTTON: ".start-button",
  TASKBAR: ".taskbar",
  TASKBAR_APP_AREA: ".taskbar-app-area",
  SHOW_DESKTOP: ".show-desktop",
  TASKBAR_CLOCK: ".taskbar-clock",
  CLOCK: "#clock",
  TASKBAR_BUTTON: ".taskbar-button",
  APP_WINDOW: ".app-window",
  SYSTEM_TRAY: ".system-tray",
};

const CLASSES = {
  HIDDEN: "hidden",
  ACTIVE: "active",
  TASKBAR_BUTTON: "toggle selected taskbar-button",
};

/**
 * Main Taskbar class - handles taskbar functionality
 */
class Taskbar {
  constructor() {
    this.clockInterval = null;
    this.isInitialized = false;
    this.eventListeners = new Map(); // Track event listeners for cleanup
    this.startMenu = new StartMenu(); // Create StartMenu instance
  }

  /**
   * Initialize the taskbar manager
   */
  init() {
    if (this.isInitialized) {
      console.warn("Taskbar already initialized");
      return;
    }

    try {
      console.log("Initializing Taskbar...");
      this.renderTaskbar();
      this.startMenu.init(); // Initialize start menu
      this.bindEvents();
      this.initializeClock();
      this.setupExistingTaskbarButtons();
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize Taskbar:", error);
      throw error;
    }
  }

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }

    // Clean up start menu
    this.startMenu.destroy();

    // Remove all tracked event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners.clear();

    this.isInitialized = false;
  }

  /**
   * Add event listener and track it for cleanup
   */
  addTrackedEventListener(element, event, handler) {
    if (!element) return;

    element.addEventListener(event, handler);
    this.eventListeners.set(`${element.id || element.className}-${event}`, {
      element,
      event,
      handler,
    });
  }

  /**
   * Render the taskbar HTML structure
   */
  renderTaskbar() {
    const taskbar = document.querySelector(SELECTORS.TASKBAR);
    if (!taskbar) {
      throw new Error("Taskbar element not found");
    }

    taskbar.innerHTML = this.getTaskbarHTML();
  }

  /**
   * Generate taskbar HTML template
   */
  getTaskbarHTML() {
    return `
      <button class="start-button toggle">
        <img src="${ICONS.windows[16]}" alt="Windows Logo" loading="lazy">
        <span class="start-button-text">Start</span>
      </button>
      <div class="start-menu-wrapper">
        <!-- StartMenu content will be rendered here -->
      </div>
      <div class="taskbar-divider"></div>
      <div class="taskbar-divider-handler"></div>
      <nav class="taskbar-icon-area" aria-label="Quick Launch">
        <button class="taskbar-icon lightweight show-desktop" title="Show Desktop" aria-label="Show Desktop">
          <img src="${ICONS.desktop_old[16]}" alt="Show Desktop" loading="lazy">
        </button>
        <button class="taskbar-icon lightweight"
                title="LinkedIn Profile"
                aria-label="Open LinkedIn Profile"
                data-url="https://www.linkedin.com/in/aziz-rahmad">
          <img src="https://www.google.com/s2/favicons?domain=linkedin.com"
               alt="LinkedIn" loading="lazy">
        </button>
        <button class="taskbar-icon lightweight"
                title="GitHub Profile"
                aria-label="Open GitHub Profile"
                data-url="https://www.github.com/azayrahmad">
          <img src="https://www.google.com/s2/favicons?domain=github.com"
               alt="GitHub" loading="lazy">
        </button>
      </nav>
      <div class="taskbar-divider"></div>
      <div class="taskbar-divider-handler"></div>
      <nav class="taskbar-app-area" aria-label="Running Applications">
      </nav>
      <div class="taskbar-divider"></div>
      <div class="system-tray-wrapper">
        <section class="system-tray" aria-label="System Tray">
          <img src="${ICONS.systray[16]}" alt="Volume" loading="lazy">
          <div class="taskbar-clock" title="" role="timer" aria-live="polite">
            <span id="clock" aria-label="Current time"></span>
          </div>
        </section>
      </div>`;
  }

  /**
   * Bind all event listeners
   */
  bindEvents() {
    this.bindStartButtonEvents();
    this.bindDesktopEvents();
    this.bindExternalLinkEvents();
    this.bindTaskbarAppAreaEvents();
  }

  /**
   * Bind taskbar app area events
   */
  bindTaskbarAppAreaEvents() {
    const taskbarAppArea = document.querySelector(SELECTORS.TASKBAR);
    this.addTrackedEventListener(taskbarAppArea, "contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const contextMenuItems = [
        {
          label: "Task Manager",
          action: () => {
            launchApp("task-manager");
          },
        },
      ];

      new window.ContextMenu(contextMenuItems, e);
    });
  }

  /**
   * Bind start button events
   */
  bindStartButtonEvents() {
    const startButton = document.querySelector(SELECTORS.START_BUTTON);
    this.addTrackedEventListener(startButton, "click", () => {
      this.startMenu.toggle();
    });
  }

  /**
   * Bind desktop and taskbar events
   */
  bindDesktopEvents() {
    const showDesktopButton = document.querySelector(SELECTORS.SHOW_DESKTOP);
    this.addTrackedEventListener(showDesktopButton, "click", () =>
      this.showDesktop(),
    );
  }

  /**
   * Bind external link events
   */
  bindExternalLinkEvents() {
    const externalButtons = document.querySelectorAll("[data-url]");
    externalButtons.forEach((button) => {
      this.addTrackedEventListener(button, "click", (event) => {
        const url = event.currentTarget.dataset.url;
        if (url) {
          this.openExternalLink(url);
        }
      });
    });
  }

  /**
   * Utility methods
   */
  openExternalLink(url) {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to open external link:", error);
    }
  }

  /**
   * Taskbar button management
   */
  createTaskbarButton(windowId, iconSrc, title) {
    const taskbarAppArea = document.querySelector(SELECTORS.TASKBAR_APP_AREA);
    if (!taskbarAppArea || !windowId || !title) {
      console.warn("Invalid parameters for taskbar button creation");
      return null;
    }

    // Prevent duplicate buttons
    const existingButton = taskbarAppArea.querySelector(`[for="${windowId}"]`);
    if (existingButton) {
      return existingButton;
    }

    const taskbarButton = document.createElement("button");
    taskbarButton.className = CLASSES.TASKBAR_BUTTON;
    taskbarButton.setAttribute("for", windowId);
    taskbarButton.setAttribute("aria-label", `Switch to ${title}`);
    taskbarButton.title = title;

    // Safely handle missing icon
    const iconHTML = iconSrc
      ? `<img src="${iconSrc[16]}" alt="App Icon" loading="lazy">`
      : "";
    // Wrap icon and text inside a span
    taskbarButton.innerHTML = `
      <span class="taskbar-button-content">
        ${iconHTML}
        <span class="taskbar-button-text">${this.escapeHtml(title)}</span>
      </span>
    `;

    // Prevent mousedown from unfocusing the window
    this.addTrackedEventListener(taskbarButton, "mousedown", (event) => {
      event.preventDefault();
    });

    // Add click handler
    this.addTrackedEventListener(taskbarButton, "click", (event) => {
      this.handleTaskbarButtonClick(event);
    });

    // Add context menu handler
    this.addTrackedEventListener(taskbarButton, "contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();

      const windowId = e.currentTarget.getAttribute("for");
      const win = document.getElementById(windowId);
      if (!win || !win.$window) return;

      const isMinimized = !$(win).is(":visible");
      const contextMenuItems = [
        {
          label: "Restore",
          enabled: isMinimized,
          action: () => {
            if (typeof System !== "undefined" && isMinimized) {
              System.restoreWindow(win);
            }
          },
        },
        MENU_DIVIDER,
        {
          label: "Close",
          default: true,
          action: () => {
            win.$window.close();
          },
        },
      ];

      new window.ContextMenu(contextMenuItems, e);
    });

    taskbarAppArea.appendChild(taskbarButton);

    // Add window focus/blur and close listeners
    const win = document.getElementById(windowId);
    if (win && win.$window) {
      win.$window.onFocus(() => {
        this.updateTaskbarButton(windowId, true, false);
      });
      win.$window.onBlur(() => {
        this.updateTaskbarButton(windowId, false, false);
      });
      win.$window.onClosed(() => {
        this.removeTaskbarButton(windowId);
      });

      // Listen for title changes to update the taskbar button
      $(win).on("title-change", () => {
        const newTitle = win.$window.title();
        const button = document.querySelector(
          `${SELECTORS.TASKBAR_BUTTON}[for="${windowId}"]`,
        );
        if (button) {
          button.title = newTitle;
          const iconImg = button.querySelector("img");
          button.innerHTML = `
            <span class="taskbar-button-content">
              ${iconImg ? iconImg.outerHTML : ""}
              <span class="taskbar-button-text">${this.escapeHtml(newTitle)}</span>
            </span>
          `;
        }
      });

      $(win).on("icon-change", () => {
        const newIcons = win.$window.icons;
        const button = document.querySelector(
          `${SELECTORS.TASKBAR_BUTTON}[for="${windowId}"]`,
        );
        if (button && newIcons) {
          const iconImg = button.querySelector("img");
          if (iconImg) {
            iconImg.src = newIcons[16];
          }
        }
      });
    }
    return taskbarButton;
  }

  /**
   * Remove taskbar button
   */
  removeTaskbarButton(windowId) {
    const taskbarAppArea = document.querySelector(SELECTORS.TASKBAR_APP_AREA);
    if (!taskbarAppArea) return;

    const button = taskbarAppArea.querySelector(`[for="${windowId}"]`);
    if (button) {
      button.remove();
    }
  }

  /**
   * Update taskbar button state
   */
  updateTaskbarButton(windowId, isActive = false, isMinimized = false) {
    const button = document.querySelector(
      `${SELECTORS.TASKBAR_BUTTON}[for="${windowId}"]`,
    );
    if (!button) return;

    // Add/remove selected class based on window focus state
    if (isActive) {
      button.classList.add("selected");
    } else {
      button.classList.remove("selected");
    }
  }

  handleTaskbarButtonClick(event) {
    const windowId = event.currentTarget.getAttribute("for");
    const win = document.getElementById(windowId);

    if (!win) {
      console.warn(`Window with id ${windowId} not found`);
      return;
    }

    try {
      if (typeof System !== "undefined") {
        const $win = $(win);
        if ($win.is(":visible")) {
          // If window is visible, either minimize or focus based on current state
          const isActive = $win.hasClass("focused");

          if (isActive) {
            // Window is focused, so minimize it
            System.minimizeWindow(win);
            this.updateTaskbarButton(windowId, false, true);
          } else {
            // Window is not focused, so bring it to front and focus it
            $win.trigger("refocus-window");
            win.style.zIndex = System.incrementZIndex();
            System.updateTitleBarClasses(win);
            this.updateTaskbarButton(windowId, true, false);
          }
        } else {
          // Window is hidden/minimized, restore it and focus
          win.style.zIndex = System.incrementZIndex();
          System.restoreWindow(win);
          // Focus the window after restoration
          setTimeout(() => {
            $win.trigger("refocus-window");
            this.updateTaskbarButton(windowId, true, false);
          }, 0);
        }
      } else {
        console.warn("System not available");
      }
    } catch (error) {
      console.error("Failed to handle taskbar button click:", error);
    }
  }

  /**
   * Show/hide desktop functionality
   */
  showDesktop() {
    const windows = document.querySelectorAll(SELECTORS.APP_WINDOW);
    if (windows.length === 0) return;

    const allMinimized = Array.from(windows).every((win) => win.isMinimized);

    try {
      if (typeof System !== "undefined") {
        if (allMinimized) {
          // Restore all windows
          windows.forEach((win) => {
            System.restoreWindow(win);
          });
        } else {
          // Minimize all windows
          windows.forEach((win) => {
            System.minimizeWindow(win, true);
          });
        }
      } else {
        console.warn("System not available");
      }
    } catch (error) {
      console.error("Failed to toggle desktop:", error);
    }
  }

  /**
   * Clock functionality
   */
  initializeClock() {
    this.updateClock();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
  }

  updateClock() {
    try {
      const now = new Date();
      const timeString = now
        .toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
        .toUpperCase();

      const dateString = now.toDateString();

      const clockElement = document.querySelector(SELECTORS.CLOCK);
      const clockContainer = document.querySelector(SELECTORS.TASKBAR_CLOCK);

      if (clockElement) {
        clockElement.textContent = timeString;
      }

      if (clockContainer) {
        clockContainer.title = dateString;
      }
    } catch (error) {
      console.error("Failed to update clock:", error);
    }
  }

  /**
   * Setup existing taskbar buttons
   */
  setupExistingTaskbarButtons() {
    const existingButtons = document.querySelectorAll(SELECTORS.TASKBAR_BUTTON);
    existingButtons.forEach((button) => {
      this.addTrackedEventListener(button, "click", (event) => {
        this.handleTaskbarButtonClick(event);
      });
    });
  }

  /**
   * Get start menu instance for external access
   */
  getStartMenu() {
    return this.startMenu;
  }

  /**
   * Utility function to escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Create singleton instance
const taskbar = new Taskbar();

// Export functions for backwards compatibility
export function showStartMenu() {
  taskbar.getStartMenu().show();
}

export function hideStartMenu() {
  taskbar.getStartMenu().hide();
}

export function toggleStartMenu() {
  taskbar.getStartMenu().toggle();
}

export function showDesktop() {
  taskbar.showDesktop();
}

export function updateClock() {
  taskbar.updateClock();
}

export function init() {
  taskbar.init();
}

export function destroy() {
  taskbar.destroy();
}

export function createTaskbarButton(windowId, iconSrc, title) {
  return taskbar.createTaskbarButton(windowId, iconSrc, title);
}

export function removeTaskbarButton(windowId) {
  return taskbar.removeTaskbarButton(windowId);
}

export function updateTaskbarButton(windowId, isActive, isMinimized) {
  return taskbar.updateTaskbarButton(windowId, isActive, isMinimized);
}

export function createTrayIcon(app) {
  const trayArea = document.querySelector(SELECTORS.SYSTEM_TRAY);
  if (!trayArea) {
    console.warn("System tray area not found");
    return;
  }

  const existingIcon = trayArea.querySelector(`#tray-icon-${app.id}`);
  if (existingIcon) {
    return; // Icon already exists
  }

  const trayIcon = document.createElement("div");
  trayIcon.id = `tray-icon-${app.id}`;
  trayIcon.className = "tray-icon";
  trayIcon.title = app.title;
  trayIcon.setAttribute("data-app-id", app.id);
  trayIcon.innerHTML = `<img src="${app.icon[16]}" alt="${app.title}" loading="lazy">`;

  trayIcon.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (app.tray?.contextMenu) {
      // Use centralized function for clippy context menu
      if (app.id === "clippy") {
        showClippyContextMenu(e);
      } else {
        // Handle other tray icons normally
        const menuItems =
          typeof app.tray.contextMenu === "function"
            ? app.tray.contextMenu()
            : app.tray.contextMenu;

        new window.ContextMenu(menuItems, e);
      }
    }
  });

  const volumeIcon = trayArea.querySelector('img[alt="Volume"]');
  if (volumeIcon) {
    trayArea.insertBefore(trayIcon, volumeIcon);
  } else {
    trayArea.appendChild(trayIcon);
  }
}

// Export the manager instance for advanced usage
export { taskbar };

export default taskbar;
