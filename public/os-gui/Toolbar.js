((exports) => {
  const ICON_MAP = {
    back: 0,
    forward: 1,
    stop: 2,
    refresh: 3,
    home: 4,
    search: 5,
    favorites: 6,
    print: 7,
    history: 12,
    back_explorer: 16,
    forward_explorer: 17,
    favorites_explorer: 18,
    cut: 21,
    copy: 22,
    paste: 23,
    undo: 24,
    redo: 25,
    delete: 26,
    new: 27,
    open: 28,
    save: 29,
    properties: 31,
    help: 32,
    print_explorer: 35,
    view_large_icons: 36,
    view_small_icons: 37,
    view_list: 38,
    view_details: 39,
    up: 44,
    // Add more icon mappings as needed, e.g.:
    // "save": 8,
    // "print": 9,
    // "undo": 10,
    // "redo": 11,
    // ... up to 62
  };

  function E(tagName, attrs) {
    const el = document.createElement(tagName);
    if (attrs) {
      for (const key in attrs) {
        if (key === "class") {
          el.className = attrs[key];
        } else {
          el.setAttribute(key, attrs[key]);
        }
      }
    }
    return el;
  }

  class Toolbar {
    constructor(items, options = {}) {
      this.element = E("div", { class: "toolbar" });
      this.items = items;
      this.options = options;
      this.itemElements = [];
      this.activeMenu = null;

      if (this.options.icons) {
        this.element.style.setProperty(
          "--toolbar-icons",
          `url(${this.options.icons})`,
        );
      }
      if (this.options.iconsGrayscale) {
        this.element.style.setProperty(
          "--toolbar-icons-grayscale",
          `url(${this.options.iconsGrayscale})`,
        );
      }

      this.buildToolbar();
      this.setupResizeObserver();
    }

    buildToolbar() {
      this.items.forEach((item) => {
        const itemEl = this.createToolbarItem(item);
        this.element.appendChild(itemEl);
        this.itemElements.push(itemEl);
      });

      // Add the "More" button for overflow
      this.moreButtonGroup = this.createMoreButton();
      this.element.appendChild(this.moreButtonGroup);
    }

    createToolbarItem(item) {
      if (item === "divider") {
        return E("div", { class: "toolbar-divider" });
      }

      if (item === "handler") {
        return E("div", { class: "toolbar-handler" });
      }
      const groupEl = E("div", { class: "toolbar-button-group" });

      const mainButtonEl = E("button", { class: "toolbar-button lightweight" });
      mainButtonEl.disabled = this.isDisabled(item);
      if (item.label) {
        mainButtonEl.setAttribute("aria-label", item.label);
      }

      const iconEl = E("div", { class: "toolbar-icon" });
      let iconToUseId;

      if (item.iconName && typeof ICON_MAP[item.iconName] !== "undefined") {
        iconToUseId = ICON_MAP[item.iconName];
      } else if (typeof item.iconId !== "undefined") {
        iconToUseId = item.iconId;
      }

      if (typeof iconToUseId !== "undefined") {
        iconEl.setAttribute("data-icon-id", iconToUseId);
        iconEl.style.backgroundPosition = `-${iconToUseId * 20}px 0`;
      }

      const labelEl = E("div", { class: "toolbar-label" });
      labelEl.textContent = item.label;

      mainButtonEl.appendChild(iconEl);
      mainButtonEl.appendChild(labelEl);
      groupEl.appendChild(mainButtonEl);

      if (item.action) {
        mainButtonEl.addEventListener("click", () => {
          if (!this.isDisabled(item)) {
            item.action();
          }
        });
      }

      if (item.submenu) {
        mainButtonEl.classList.add("has-submenu-main");

        const arrowButtonEl = E("button", {
          class: "toolbar-arrow-button lightweight",
        });
        arrowButtonEl.disabled = this.isDisabled(item);
        arrowButtonEl.innerHTML = "&#9662;"; // Down arrow
        groupEl.appendChild(arrowButtonEl);

        arrowButtonEl.addEventListener("click", (e) => {
          e.stopPropagation();
          if (this.activeMenu) {
            this.closeActiveMenu();
          } else {
            // Pass the group element for positioning
            this.openSubmenu(item, groupEl);
          }
        });

        // If there's no primary action, the main button can also open the menu
        if (!item.action) {
          mainButtonEl.addEventListener("click", (e) => {
            e.stopPropagation();
            if (this.activeMenu) {
              this.closeActiveMenu();
            } else {
              this.openSubmenu(item, groupEl);
            }
          });
        }
      }

      // Add update listener for dynamic state changes
      this.element.addEventListener("update", () => {
        mainButtonEl.disabled = this.isDisabled(item);
        const arrowButtonEl = groupEl.querySelector(".toolbar-arrow-button");
        if (arrowButtonEl) {
          arrowButtonEl.disabled = this.isDisabled(item);
        }

        // Support dynamic icons
        const iconName =
          typeof item.iconName === "function" ? item.iconName() : item.iconName;
        const iconId =
          typeof item.iconId === "function" ? item.iconId() : item.iconId;
        let iconToUseId;

        if (iconName && typeof ICON_MAP[iconName] !== "undefined") {
          iconToUseId = ICON_MAP[iconName];
        } else if (typeof iconId !== "undefined") {
          iconToUseId = iconId;
        }

        if (typeof iconToUseId !== "undefined") {
          iconEl.setAttribute("data-icon-id", iconToUseId);
          iconEl.style.backgroundPosition = `-${iconToUseId * 20}px 0`;
        }
      });

      return groupEl;
    }

    isDisabled(item) {
      if (typeof item.enabled === "function") {
        return !item.enabled();
      }
      return typeof item.enabled === "boolean" && !item.enabled;
    }

    openSubmenu(item, parentEl) {
      if (this.activeMenu) {
        this.closeActiveMenu();
      }

      const submenuItems =
        typeof item.submenu === "function" ? item.submenu() : item.submenu;

      const parentRect = parentEl.getBoundingClientRect();
      const event = { pageX: parentRect.left, pageY: parentRect.bottom };
      this.activeMenu = new window.ContextMenu(submenuItems, event);
    }

    closeActiveMenu() {
      if (this.activeMenu) {
        this.activeMenu.close();
        this.activeMenu = null;
      }
    }

    createMoreButton() {
      const groupEl = E("div", {
        class: "toolbar-button-group more-button",
        style: "display: none;",
      });
      const buttonEl = E("button", { class: "toolbar-button lightweight" });
      buttonEl.innerHTML = ">>";
      groupEl.appendChild(buttonEl);

      buttonEl.addEventListener("click", (e) => {
        e.stopPropagation();
        this.showOverflowMenu(groupEl);
      });

      return groupEl;
    }

    setupResizeObserver() {
      this.observer = new ResizeObserver(() => {
        this.handleResize();
      });
      this.observer.observe(this.element);
    }

    handleResize() {
      requestAnimationFrame(() => {
        // Make all items visible to measure them
        this.itemElements.forEach((itemEl) => {
          itemEl.style.display = "";
        });

        const toolbarWidth = this.element.getBoundingClientRect().width;

        // Read all item widths at once to avoid layout thrashing
        const itemWidths = this.itemElements.map(
          (el) => el.getBoundingClientRect().width,
        );
        const totalItemsWidth = itemWidths.reduce((sum, w) => sum + w, 0);

        let availableWidth = toolbarWidth;
        const hasOverflow = totalItemsWidth > availableWidth;

        this.moreButtonGroup.style.display = hasOverflow ? "" : "none";

        if (hasOverflow) {
          const moreButtonWidth =
            this.moreButtonGroup.getBoundingClientRect().width;
          availableWidth -= moreButtonWidth;
          let currentWidth = 0;

          this.itemElements.forEach((itemEl, index) => {
            const itemWidth = itemWidths[index];
            if (currentWidth + itemWidth > availableWidth) {
              itemEl.style.display = "none";
            } else {
              itemEl.style.display = "";
              currentWidth += itemWidth;
            }
          });
        }
      });
    }

    showOverflowMenu(parentEl) {
      if (this.overflowMenu) {
        this.overflowMenu.remove();
        this.overflowMenu = null;
        return;
      }

      this.overflowMenu = E("div", {
        class: "menu-popup toolbar-overflow-popup",
      });

      this.itemElements.forEach((itemEl, index) => {
        if (itemEl.style.display === "none") {
          const clone = itemEl.cloneNode(true);
          clone.style.display = "";
          clone.classList.add("overflow-item");

          // Re-attach event listeners
          const originalItem = this.items[index];
          if (originalItem.action) {
            clone
              .querySelector(".toolbar-button")
              .addEventListener("click", () => {
                originalItem.action();
                this.overflowMenu.remove();
                this.overflowMenu = null;
              });
          }

          if (originalItem.submenu) {
            clone
              .querySelector(".toolbar-arrow-button")
              .addEventListener("click", (e) => {
                e.stopPropagation();
                this.openSubmenu(originalItem, clone);
              });
          }

          this.overflowMenu.appendChild(clone);
        }
      });

      if (this.options.icons) {
        this.overflowMenu.style.setProperty(
          "--toolbar-icons",
          `url(${this.options.icons})`,
        );
      }
      if (this.options.iconsGrayscale) {
        this.overflowMenu.style.setProperty(
          "--toolbar-icons-grayscale",
          `url(${this.options.iconsGrayscale})`,
        );
      }

      document.body.appendChild(this.overflowMenu);

      const parentRect = parentEl.getBoundingClientRect();
      this.overflowMenu.style.left = `${parentRect.left}px`;
      this.overflowMenu.style.top = `${parentRect.bottom}px`;

      this.closeMenuOnClickOutside = (e) => {
        if (!this.overflowMenu.contains(e.target) && e.target !== parentEl) {
          this.overflowMenu.remove();
          this.overflowMenu = null;
          document.removeEventListener(
            "pointerdown",
            this.closeMenuOnClickOutside,
          );
          this.closeMenuOnClickOutside = null;
        }
      };

      document.addEventListener("pointerdown", this.closeMenuOnClickOutside);
    }
    destroy() {
      this.observer.disconnect();
      if (this.overflowMenu) {
        this.overflowMenu.remove();
      }
      if (this.closeMenuOnClickOutside) {
        document.removeEventListener(
          "pointerdown",
          this.closeMenuOnClickOutside,
        );
      }
    }
  }

  exports.Toolbar = Toolbar;
})(typeof exports !== "undefined" ? exports : window);
