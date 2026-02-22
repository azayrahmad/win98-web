import { E } from '../../shared/utils/gui-utils.js';
import { ContextMenu } from './context-menu.js';

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
};

/**
 * Toolbar modernized ES6 class.
 * Ported from public/os-gui/Toolbar.js
 */
export class Toolbar {
    constructor(items, options = {}) {
        this.items = items;
        this.options = options;
        this.itemElements = [];
        this.activeMenu = null;
        this.overflowMenu = null;

        this._initElement();
        this._buildToolbar();
        this._setupResizeObserver();
    }

    _initElement() {
        this.element = E("nav", { class: "toolbar", role: "toolbar" });
        if (this.options.icons) {
            this.element.style.setProperty("--toolbar-icons", `url(${this.options.icons})`);
        }
        if (this.options.iconsGrayscale) {
            this.element.style.setProperty("--toolbar-icons-grayscale", `url(${this.options.iconsGrayscale})`);
        }
    }

    _buildToolbar() {
        this.items.forEach((item) => {
            const itemEl = this._createToolbarItem(item);
            this.element.appendChild(itemEl);
            this.itemElements.push(itemEl);
        });

        // Add the "More" button for overflow
        this.moreButtonGroup = this._createMoreButton();
        this.element.appendChild(this.moreButtonGroup);
    }

    _createToolbarItem(item) {
        if (item === "divider") {
            return E("div", { class: "toolbar-divider" });
        }
        if (item === "handler") {
            return E("div", { class: "toolbar-handler" });
        }

        const groupEl = E("div", { class: "toolbar-button-group" });
        const mainButtonEl = E("button", { class: "toolbar-button lightweight" });
        mainButtonEl.disabled = this._isDisabled(item);
        if (item.label) {
            mainButtonEl.setAttribute("aria-label", item.label);
        }

        const iconEl = E("div", { class: "toolbar-icon" });
        this._updateIcon(item, iconEl);

        const labelEl = E("div", { class: "toolbar-label" });
        labelEl.textContent = item.label;

        mainButtonEl.appendChild(iconEl);
        mainButtonEl.appendChild(labelEl);
        groupEl.appendChild(mainButtonEl);

        if (item.action) {
            mainButtonEl.addEventListener("click", () => {
                if (!this._isDisabled(item)) {
                    item.action();
                }
            });
        }

        if (item.submenu) {
            mainButtonEl.classList.add("has-submenu-main");

            const arrowButtonEl = E("button", {
                class: "toolbar-arrow-button lightweight",
            });
            arrowButtonEl.disabled = this._isDisabled(item);
            arrowButtonEl.innerHTML = "&#9662;"; // Down arrow
            groupEl.appendChild(arrowButtonEl);

            arrowButtonEl.addEventListener("click", (e) => {
                e.stopPropagation();
                if (this.activeMenu) {
                    this.closeActiveMenu();
                } else {
                    this.openSubmenu(item, groupEl);
                }
            });

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
            mainButtonEl.disabled = this._isDisabled(item);
            const arrowButtonEl = groupEl.querySelector(".toolbar-arrow-button");
            if (arrowButtonEl) {
                arrowButtonEl.disabled = this._isDisabled(item);
            }
            this._updateIcon(item, iconEl);
        });

        return groupEl;
    }

    _updateIcon(item, iconEl) {
        const iconName = typeof item.iconName === "function" ? item.iconName() : item.iconName;
        const iconId = typeof item.iconId === "function" ? item.iconId() : item.iconId;
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
    }

    _isDisabled(item) {
        if (typeof item.enabled === "function") {
            return !item.enabled();
        }
        return typeof item.enabled === "boolean" && !item.enabled;
    }

    openSubmenu(item, parentEl) {
        this.closeActiveMenu();
        const submenuItems = typeof item.submenu === "function" ? item.submenu() : item.submenu;
        const parentRect = parentEl.getBoundingClientRect();
        const event = { pageX: parentRect.left, pageY: parentRect.bottom };
        this.activeMenu = new ContextMenu(submenuItems, event);
    }

    closeActiveMenu() {
        if (this.activeMenu) {
            this.activeMenu.close();
            this.activeMenu = null;
        }
    }

    _createMoreButton() {
        const groupEl = E("div", {
            class: "toolbar-button-group more-button",
            style: "display: none;",
        });
        const buttonEl = E("button", { class: "toolbar-button lightweight" });
        buttonEl.innerHTML = ">>";
        groupEl.appendChild(buttonEl);

        buttonEl.addEventListener("click", (e) => {
            e.stopPropagation();
            this._showOverflowMenu(groupEl);
        });

        return groupEl;
    }

    _setupResizeObserver() {
        this.observer = new ResizeObserver(() => {
            this.handleResize();
        });
        this.observer.observe(this.element);
    }

    handleResize() {
        requestAnimationFrame(() => {
            this.itemElements.forEach((itemEl) => {
                itemEl.style.display = "";
            });

            const toolbarRect = this.element.getBoundingClientRect();
            if (toolbarRect.width === 0) return;

            const itemWidths = this.itemElements.map(el => el.getBoundingClientRect().width);
            const totalItemsWidth = itemWidths.reduce((sum, w) => sum + w, 0);

            let availableWidth = toolbarRect.width;
            const hasOverflow = totalItemsWidth > availableWidth;

            this.moreButtonGroup.style.display = hasOverflow ? "" : "none";

            if (hasOverflow) {
                const moreButtonWidth = this.moreButtonGroup.getBoundingClientRect().width;
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

    _showOverflowMenu(parentEl) {
        if (this.overflowMenu) {
            this._hideOverflowMenu();
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

                const originalItem = this.items[index];
                if (originalItem.action) {
                    clone.querySelector(".toolbar-button").addEventListener("click", () => {
                        originalItem.action();
                        this._hideOverflowMenu();
                    });
                }

                if (originalItem.submenu) {
                    clone.querySelector(".toolbar-arrow-button")?.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this.openSubmenu(originalItem, clone);
                    });
                }

                this.overflowMenu.appendChild(clone);
            }
        });

        if (this.options.icons) {
            this.overflowMenu.style.setProperty("--toolbar-icons", `url(${this.options.icons})`);
        }
        if (this.options.iconsGrayscale) {
            this.overflowMenu.style.setProperty("--toolbar-icons-grayscale", `url(${this.options.iconsGrayscale})`);
        }

        document.body.appendChild(this.overflowMenu);

        const parentRect = parentEl.getBoundingClientRect();
        this.overflowMenu.style.left = `${parentRect.left}px`;
        this.overflowMenu.style.top = `${parentRect.bottom}px`;
        this.overflowMenu.style.zIndex = "1000000";

        this._closeMenuOnClickOutside = (e) => {
            if (!this.overflowMenu.contains(e.target) && e.target !== parentEl) {
                this._hideOverflowMenu();
            }
        };

        document.addEventListener("pointerdown", this._closeMenuOnClickOutside);
    }

    _hideOverflowMenu() {
        if (this.overflowMenu) {
            this.overflowMenu.remove();
            this.overflowMenu = null;
        }
        if (this._closeMenuOnClickOutside) {
            document.removeEventListener("pointerdown", this._closeMenuOnClickOutside);
            this._closeMenuOnClickOutside = null;
        }
    }

    destroy() {
        this.observer?.disconnect();
        this._hideOverflowMenu();
        this.closeActiveMenu();
    }
}
