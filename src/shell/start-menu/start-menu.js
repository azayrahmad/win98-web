/**
 * StartMenu - Handles start menu functionality
 * Separated from Taskbar for better code organization
 */

// Import icons
import { launchApp } from '../../system/app-manager.js';
import { getStartupApps } from '../../system/startup-manager.js';
import { apps } from '../../config/apps.js';
import { findItemByPath, getAssociation } from '../../system/directory.js';
import windowsStartMenuBar from "../../assets/img/win98start.png";
import { ICONS } from '../../config/icons.js';
import startMenuConfig from '../../config/start-menu.js';
import { getMenuFromZenFS, getPinnedItemsFromZenFS, PINNED_PATH, START_MENU_PATH, FAVORITES_PATH } from './start-menu-utils.js';
import { playSound } from '../../system/sound-manager.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import { createShutdownDialogContent } from '../shutdown-dialog.js';
import { showShutdownScreen } from '../shutdown-screen.js';

// Constants
const SELECTORS = {
  START_MENU: "#start-menu",
  START_MENU_ITEM: ".start-menu-item",
  START_BUTTON: ".start-button",
};

const CLASSES = {
  HIDDEN: "hidden",
  ACTIVE: "active",
};

/**
 * StartMenu class - encapsulates all start menu functionality
 */
class StartMenu {
  constructor() {
    this.isVisible = false;
    this.eventListeners = new Map();
    this.openSubmenus = [];
    this.submenuCloseTimeout = null;
  }

  /**
   * Initialize the start menu
   */
  init() {
    try {
      console.log("Initializing StartMenu...");
      this.render();
      this.bindEvents();
    } catch (error) {
      console.error("Failed to initialize StartMenu:", error);
      throw error;
    }
  }

  /**
   * Clean up resources and event listeners
   */
  destroy() {
    // Remove all tracked event listeners
    this.eventListeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.eventListeners.clear();
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

  render() {
    const startMenuWrapper = document.querySelector(".start-menu-wrapper");
    if (!startMenuWrapper) {
      throw new Error("Start menu wrapper not found");
    }

    startMenuWrapper.innerHTML = this.getStartMenuHTML();
  }

  getStartMenuHTML() {
    const dynamicItemsHTML = startMenuConfig
      .map((item) => {
        const hasSubmenu = (item.submenu && item.submenu.length >= 0) || item.isDynamic;
        return `
        <li class="start-menu-item ${hasSubmenu ? "has-submenu" : ""}" role="menuitem" tabindex="0" data-id="${this.escapeHtml(item.label)}" style="--icon-url: url('${item.icon}')">
          <div class="start-menu-icon-wrapper">
            <img src="${item.icon}" alt="${this.escapeHtml(item.label)}">
          </div>
          <span>${this.escapeHtml(item.label)}</span>
          ${hasSubmenu ? '<span class="submenu-arrow"></span>' : ""}
        </li>
      `;
      })
      .join("");

    return `
      <nav id="start-menu" class="start-menu ${CLASSES.HIDDEN}" aria-label="Start Menu">
        <div class="blue-rectangle">
          <img src="${windowsStartMenuBar}" alt="Start Menu Bar" loading="lazy" />
        </div>
        <menu class="start-menu-list">
          <li class="pinned-items-container" style="display: contents;"></li>
          <div class="start-menu-divider" role="separator"></div>
          ${dynamicItemsHTML}
          <div class="start-menu-divider" role="separator"></div>
          <li class="logoff-menu-item" role="menuitem" tabindex="0" style="--icon-url: url('${ICONS.logoff[32]}')">
            <div class="start-menu-icon-wrapper">
              <img src="${ICONS.logoff[32]}" alt="Log off" loading="lazy">
            </div>
            <span id="logofftext">Log Off Guest...</span>
          </li>
          <li role="menuitem" tabindex="0" data-action="shutdown" style="--icon-url: url('${ICONS.shutdown[32]}')">
            <div class="start-menu-icon-wrapper">
              <img src="${ICONS.shutdown[32]}" alt="Shutdown" loading="lazy">
            </div>
            <span>Shut Down...</span>
          </li>
        </menu>
      </nav>`;
  }

  bindEvents() {
    this.bindSpecialActionEvents();
    this.bindKeyboardEvents();
    this.bindOutsideClickEvents();
    this.bindMenuItems();
    this.bindHoverDelay();
  }

  bindHoverDelay() {
    const startMenu = document.querySelector(SELECTORS.START_MENU);
    if (!startMenu) return;

    this.addTrackedEventListener(startMenu, "pointerover", (e) => {
      const menuItem = e.target.closest(".start-menu-item");
      const hasSubmenu = menuItem?.classList.contains("has-submenu");

      if (!menuItem || !hasSubmenu) {
        // Trigger delayed close if there are open submenus
        if (this.openSubmenus.length > 0 && !this.submenuCloseTimeout) {
          this.submenuCloseTimeout = setTimeout(() => {
            this.closeAllSubmenus();
            this.submenuCloseTimeout = null;
          }, 1000);
        }
      } else {
        // We are hovering an item with a submenu.
        // The item's own pointerenter will handle opening/clearing.
        if (this.submenuCloseTimeout) {
          clearTimeout(this.submenuCloseTimeout);
          this.submenuCloseTimeout = null;
        }
      }
    });

    this.addTrackedEventListener(startMenu, "pointerleave", () => {
      if (this.submenuCloseTimeout) {
        clearTimeout(this.submenuCloseTimeout);
        this.submenuCloseTimeout = null;
      }
    });
  }

  closeAllSubmenus() {
    this.openSubmenus.forEach((menu) => {
      menu.close();
      if (menu.wrapperElement && menu.wrapperElement.parentElement) {
        menu.wrapperElement.remove();
      }
    });
    this.openSubmenus = [];
  }

  attachSubmenu(menuItem, submenuItems) {
    let activeMenu = null;

    const closeAndCleanup = () => {
      if (!activeMenu) return;
      const menuToClose = activeMenu;
      activeMenu = null;

      this.openSubmenus = this.openSubmenus.filter((m) => m !== menuToClose);
      menuToClose.close(false); // Close sub-sub-menus etc.
      if (
        menuToClose.wrapperElement &&
        menuToClose.wrapperElement.parentElement
      ) {
        menuToClose.wrapperElement.remove();
      }
    };

    const openMenu = () => {
      if (this.submenuCloseTimeout) {
        clearTimeout(this.submenuCloseTimeout);
        this.submenuCloseTimeout = null;
      }
      if (activeMenu) return;

      // Close any other open submenus immediately
      this.closeAllSubmenus();

      const menuWrapper = document.createElement("div");
      menuWrapper.className = "menu-popup-wrapper start-menu-popup";

      activeMenu = new window.MenuPopup(submenuItems, {
        className: "start-menu-popup",
        parentMenuPopup: null,
        handleKeyDown: (e) => e.key === "Escape" && closeAndCleanup(),
        closeMenus: () => {
          closeAndCleanup();
          this.hide();
        },
        setActiveMenuPopup: (menu) => {
          activeMenu = menu;
        },
        send_info_event: () => {},
        refocus_outside_menus: () => {},
      });
      activeMenu.wrapperElement = menuWrapper; // Attach wrapper to instance

      menuWrapper.appendChild(activeMenu.element);
      const screen = document.getElementById("screen");
      screen.appendChild(menuWrapper);

      menuWrapper.style.zIndex = window.os_gui_utils.get_new_menu_z_index();

      const rect = menuItem.getBoundingClientRect();
      const screenRect = screen.getBoundingClientRect();

      // Measure without showing
      menuWrapper.classList.add("measuring");
      const menuRect = activeMenu.element.getBoundingClientRect();
      menuWrapper.classList.remove("measuring");

      let finalX = rect.right - screenRect.left;
      let finalY = rect.top - screenRect.top;
      if (finalY + menuRect.height > screenRect.height) {
        finalY = Math.max(0, screenRect.height - menuRect.height);
      }
      if (finalX + menuRect.width > screenRect.width) {
        finalX = rect.left - menuRect.width - screenRect.left;
      }
      menuWrapper.style.left = `${finalX}px`;
      menuWrapper.style.top = `${finalY}px`;

      menuWrapper.classList.add("to-right");
      menuWrapper.classList.add("open");

      if (typeof window.playSound === "function") window.playSound("MenuPopup");
      this.openSubmenus.push(activeMenu);
      this.addTrackedEventListener(menuWrapper, "pointerenter", () => {
        if (this.submenuCloseTimeout) {
          clearTimeout(this.submenuCloseTimeout);
          this.submenuCloseTimeout = null;
        }
      });
    };

    this.addTrackedEventListener(menuItem, "pointerenter", openMenu);
  }

  attachDynamicSubmenu(menuItem, getSubmenuItems) {
    let activeMenu = null;
    let isLoading = false;

    const closeAndCleanup = () => {
      if (!activeMenu) return;
      const menuToClose = activeMenu;
      activeMenu = null;

      this.openSubmenus = this.openSubmenus.filter((m) => m !== menuToClose);
      menuToClose.close(false);
      if (
        menuToClose.wrapperElement &&
        menuToClose.wrapperElement.parentElement
      ) {
        menuToClose.wrapperElement.remove();
      }
    };

    const openMenu = async () => {
      if (this.submenuCloseTimeout) {
        clearTimeout(this.submenuCloseTimeout);
        this.submenuCloseTimeout = null;
      }
      if (isLoading || activeMenu) return;

      isLoading = true;
      this.closeAllSubmenus();

      let submenuItems;
      try {
        submenuItems = await getSubmenuItems(); // Generate items dynamically
      } catch (e) {
        console.error("Failed to get dynamic submenu items", e);
        isLoading = false;
        return;
      }

      const menuWrapper = document.createElement("div");
      menuWrapper.className = "menu-popup-wrapper start-menu-popup";

      activeMenu = new window.MenuPopup(submenuItems, {
        className: "start-menu-popup",
        parentMenuPopup: null,
        handleKeyDown: (e) => e.key === "Escape" && closeAndCleanup(),
        closeMenus: () => {
          closeAndCleanup();
          this.hide();
        },
        setActiveMenuPopup: (menu) => {
          activeMenu = menu;
        },
        send_info_event: () => {},
        refocus_outside_menus: () => {},
      });
      activeMenu.wrapperElement = menuWrapper;

      menuWrapper.appendChild(activeMenu.element);
      const screen = document.getElementById("screen");
      screen.appendChild(menuWrapper);

      menuWrapper.style.zIndex = window.os_gui_utils.get_new_menu_z_index();

      const rect = menuItem.getBoundingClientRect();
      const screenRect = screen.getBoundingClientRect();

      // Measure without showing
      menuWrapper.classList.add("measuring");
      const menuRect = activeMenu.element.getBoundingClientRect();
      menuWrapper.classList.remove("measuring");

      let finalX = rect.right - screenRect.left;
      let finalY = rect.top - screenRect.top;
      if (finalY + menuRect.height > screenRect.height) {
        finalY = Math.max(0, screenRect.height - menuRect.height);
      }
      if (finalX + menuRect.width > screenRect.width) {
        finalX = rect.left - menuRect.width - screenRect.left;
      }
      menuWrapper.style.left = `${finalX}px`;
      menuWrapper.style.top = `${finalY}px`;

      menuWrapper.classList.add("to-right");
      menuWrapper.classList.add("open");

      if (typeof window.playSound === "function") window.playSound("MenuPopup");
      this.openSubmenus.push(activeMenu);
      isLoading = false;
      this.addTrackedEventListener(menuWrapper, "pointerenter", () => {
        if (this.submenuCloseTimeout) {
          clearTimeout(this.submenuCloseTimeout);
          this.submenuCloseTimeout = null;
        }
      });
    };

    this.addTrackedEventListener(menuItem, "pointerenter", openMenu);
  }

  bindMenuItems() {
    startMenuConfig.forEach((itemConfig) => {
      const menuItem = document.querySelector(
        `.start-menu-item[data-id="${this.escapeHtml(itemConfig.label)}"]`,
      );
      if (!menuItem) return;

      if (itemConfig.isDynamic) {
        this.attachDynamicSubmenu(menuItem, async () => {
          const menu = await getMenuFromZenFS(itemConfig.path);
          return menu.length > 0 ? menu : [{ label: "(Empty)", enabled: false }];
        });
      } else if (itemConfig.id === "startup-folder") {
        this.attachDynamicSubmenu(menuItem, async () => {
          const startupAppsList = await getStartupApps();
          if (startupAppsList.length === 0) {
            return [{ label: "(Empty)", enabled: false }];
          }
          return startupAppsList
            .map((appId) => {
              const app = apps.find((a) => a.id === appId);
              if (app) {
                return {
                  label: app.title,
                  icon: app.icon[16],
                  action: () => launchApp(app.id),
                };
              }
              const file = findItemByPath(appId);
              if (file) {
                const app = apps.find(app => app.id === getAssociation(file.name).appId);
                return {
                  label: file.name,
                  icon: app.icon[16],
                  action: () => launchApp(app.id, appId),
                };
              }
              return null;
            })
            .filter(Boolean);
        });
      } else if (itemConfig.submenu) {
        this.attachSubmenu(menuItem, itemConfig.submenu);
      } else if (itemConfig.action) {
        this.addTrackedEventListener(menuItem, "click", () => {
          itemConfig.action();
          this.hide();
        });
      }
    });
  }

  /**
   * Bind special action events (shutdown, home, etc.)
   */
  bindSpecialActionEvents() {
    const shutdownItem = document.querySelector('[data-action="shutdown"]');
    this.addTrackedEventListener(shutdownItem, "click", () =>
      this.handleShutdown(),
    );

    const homeItem = document.querySelector('[data-action="home"]');
    this.addTrackedEventListener(homeItem, "click", () => this.handleHome());
  }

  /**
   * Bind keyboard events for accessibility
   */
  bindKeyboardEvents() {
    const menuItems = document.querySelectorAll('[role="menuitem"]');
    menuItems.forEach((item) => {
      this.addTrackedEventListener(item, "keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          item.click();
        }
      });
    });

    // Handle Escape to close start menu
    this.addTrackedEventListener(document, "keydown", (event) => {
      if (event.key === "Escape") {
        this.hide();
      }
    });
  }

  /**
   * Bind outside click events to hide menu
   */
  bindOutsideClickEvents() {
    this.addTrackedEventListener(document, "click", (event) => {
      this.handleOutsideClick(event);
    });
  }

  /**
   * Render pinned items dynamically
   */
  async renderPinnedItems() {
    const pinnedContainer = this.startMenu.querySelector(".pinned-items-container");
    if (!pinnedContainer) return;

    try {
      const pinnedItems = await getPinnedItemsFromZenFS(PINNED_PATH);
      pinnedContainer.innerHTML = pinnedItems
        .map((item) => `
          <li class="start-menu-item pinned-item" role="menuitem" tabindex="0" style="--icon-url: url('${item.icon}')">
            <div class="start-menu-icon-wrapper">
              <img src="${item.icon}" alt="${this.escapeHtml(item.label)}">
            </div>
            <span>${this.escapeHtml(item.label)}</span>
          </li>
        `)
        .join("");

      // Bind events for pinned items
      pinnedContainer.querySelectorAll(".pinned-item").forEach((el, index) => {
        el.addEventListener("click", () => {
          pinnedItems[index].action();
          this.hide();
        });
        el.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            pinnedItems[index].action();
            this.hide();
          }
        });
      });
    } catch (error) {
      console.error("Failed to render pinned items:", error);
    }
  }

  /**
   * Show the start menu
   */
  async show() {
    const startMenu = document.querySelector(SELECTORS.START_MENU);
    this.startMenu = startMenu; // Ensure reference
    const startButton = document.querySelector(SELECTORS.START_BUTTON);
    const startMenuWrapper = document.querySelector(".start-menu-wrapper");

    if (!startMenu || !startButton || !startMenuWrapper) return;

    playSound("MenuPopup");

    // Load pinned items before showing
    await this.renderPinnedItems();

    startMenu.classList.remove(CLASSES.HIDDEN);
    startMenuWrapper.classList.add("open");

    startButton.classList.add("selected");
    startButton.setAttribute("aria-pressed", "true");
    startMenu.setAttribute("aria-hidden", "false");
    this.isVisible = true;

    const firstMenuItem = startMenu.querySelector('[role="menuitem"]');
    if (firstMenuItem) {
      setTimeout(() => firstMenuItem.focus(), 50);
    }
  }

  /**
   * Hide the start menu
   */
  hide() {
    const startMenu = document.querySelector(SELECTORS.START_MENU);
    const startButton = document.querySelector(SELECTORS.START_BUTTON);
    const startMenuWrapper = document.querySelector(".start-menu-wrapper");

    if (!startMenu || !startButton || !startMenuWrapper || !this.isVisible)
      return;

    startMenuWrapper.classList.remove("open");
    startMenu.classList.add(CLASSES.HIDDEN);
    startMenu.setAttribute("aria-hidden", "true");

    startButton.classList.remove("selected");
    startButton.setAttribute("aria-pressed", "false");
    this.isVisible = false;

    this.closeAllSubmenus();
  }

  /**
   * Toggle start menu visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Handle shutdown action
   */
  handleShutdown() {
    this.hide();
    const content = createShutdownDialogContent();

    ShowDialogWindow({
        title: 'Shut Down Windows',
        content: content, // Pass the DOM element directly
        modal: true,
        showOverlay: true,
        buttons: [
            {
                label: 'OK',
                action: () => {
                    const selectedOption = content.querySelector('input[name="shutdown-option"]:checked').value;
                    playSound("SystemExit");

                    if (selectedOption === 'shutdown') {
                        showShutdownScreen();
                    } else if (selectedOption === 'restart') {
                        showShutdownScreen(true);
                        setTimeout(() => location.reload(), 2000);
                    } else if (selectedOption === 'restart-msdos') {
                        showShutdownScreen(true);
                        setTimeout(() => {
                            window.location.hash = "#msdos";
                            location.reload();
                        }, 2000);
                    } else {
                        setTimeout(() => location.reload(), 500);
                    }
                },
                isDefault: true,
            },
            {
                label: 'Cancel',
                action: () => {}, // Just closes the dialog
            },
            {
                label: 'Help',
                action: () => {}, // Disabled button
                disabled: true,
            }
        ],
        soundEvent: 'SystemQuestion',
    });
}

  /**
   * Handle home action
   */
  async handleHome() {
    const { showUpdateConfirmation } = await import("../../system/update-manager.js");
    await showUpdateConfirmation();
    this.hide();
  }

  /**
   * Handle clicks outside the start menu
   */
  handleOutsideClick(event) {
    const startMenu = document.querySelector(SELECTORS.START_MENU);
    const startButton = document.querySelector(SELECTORS.START_BUTTON);

    if (!startMenu || !startButton) return;

    if (
      this.isVisible &&
      !startMenu.contains(event.target) &&
      !startButton.contains(event.target) &&
      !event.target.closest(".start-menu-popup")
    ) {
      this.hide();
    }
  }

  /**
   * Check if start menu is currently visible
   */
  getIsVisible() {
    return this.isVisible;
  }

  /**
   * Add custom menu item
   */
  addMenuItem(config) {
    const { icon, text, action, position = "before-divider" } = config;

    if (!icon || !text || !action) {
      console.warn("Invalid menu item configuration");
      return;
    }

    const startMenuList = document.querySelector(".start-menu-list");
    if (!startMenuList) return;

    const menuItem = document.createElement("li");
    menuItem.className = "start-menu-item";
    menuItem.setAttribute("role", "menuitem");
    menuItem.setAttribute("tabindex", "0");
    menuItem.innerHTML = `
      <img src="${icon}" alt="${text}" loading="lazy">
      <span>${this.escapeHtml(text)}</span>
    `;

    // Add click handler
    this.addTrackedEventListener(menuItem, "click", action);

    // Add keyboard handler
    this.addTrackedEventListener(menuItem, "keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        action();
      }
    });

    // Insert based on position
    const divider = startMenuList.querySelector(".start-menu-divider");
    if (position === "before-divider" && divider) {
      startMenuList.insertBefore(menuItem, divider);
    } else {
      startMenuList.appendChild(menuItem);
    }

    return menuItem;
  }

  /**
   * Remove menu item by text content
   */
  removeMenuItem(text) {
    const menuItems = document.querySelectorAll(".start-menu-item span");
    menuItems.forEach((span) => {
      if (span.textContent === text) {
        const menuItem = span.closest(".start-menu-item");
        if (menuItem) {
          menuItem.remove();
        }
      }
    });
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

export default StartMenu;
