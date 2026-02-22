import { get_new_menu_z_index } from '../../shared/utils/gui-utils.js';
import { MenuPopup } from './menu-popup.js';

export class ContextMenu {
  constructor(menuItems, event) {
    if (!(this instanceof ContextMenu)) {
        return new ContextMenu(menuItems, event);
    }

    // Remove existing context menus
    const existingMenus = document.querySelectorAll(".menu-popup-wrapper");
    existingMenus.forEach((menu) => {
        if (!menu.dataset.semanticParent) menu.remove();
    });

    this.menuItems = menuItems;
    this.event = event;

    this._initElement();

    if (typeof window.playSound === "function") {
      window.playSound("MenuPopup");
    }

    const x = event.pageX || event.clientX || event.left || 0;
    const y = event.pageY || event.clientY || event.top || 0;

    this._positionAt(x, y);
    this.menuPopup.element.dispatchEvent(new CustomEvent("update", {}));
    this.menuPopup.element.focus({ preventScroll: true });

    // Enable click-outside
    this._clickOutsideHandler = (e) => this._closeMenuOnClickOutside(e);
    setTimeout(() => {
      document.addEventListener("pointerdown", this._clickOutsideHandler);
    }, 0);
  }

  _initElement() {
    this.wrap = document.createElement("div");
    this.wrap.className = "menu-popup-wrapper open";
    this.wrap.style.position = "absolute";
    this.wrap.style.overflow = "hidden";
    this.wrap.style.zIndex = get_new_menu_z_index();

    this.menuPopup = new MenuPopup(this.menuItems, {
      closeMenus: () => this.close(),
      handleKeyDown: (e) => {
        if (e.key === "Escape") this.close();
      },
      setActiveMenuPopup: () => {},
      refocus_outside_menus: () => {},
      send_info_event: () => {},
      wrapperElement: this.wrap,
    });

    this.wrap.appendChild(this.menuPopup.element);

    const screen = document.getElementById("screen") || document.body;
    screen.appendChild(this.wrap);

    this.menuPopup.element.style.position = "absolute";
    this.menuPopup.element.style.left = "0";
    this.menuPopup.element.style.top = "0";
  }

  close() {
    if (this.wrap && this.wrap.parentNode) {
      this.menuPopup.close(false);
      this.wrap.remove();
    }
    document.removeEventListener("pointerdown", this._clickOutsideHandler);
  }

  _closeMenuOnClickOutside(e) {
    if (!this.wrap.contains(e.target) && !e.target.closest(".menu-popup")) {
      this.close();
    }
  }

  _positionAt(x, y) {
    const screen = document.getElementById("screen") || document.body;
    const menuRect = this.menuPopup.element.getBoundingClientRect();
    const screenRect = screen.getBoundingClientRect();

    let finalX = x - screenRect.left;
    let finalY = y - screenRect.top;

    if (finalX + menuRect.width > screenRect.width) {
      finalX -= menuRect.width;
    }
    if (finalY + menuRect.height > screenRect.height) {
      finalY -= menuRect.height;
    }

    this.wrap.style.left = `${Math.max(0, finalX)}px`;
    this.wrap.style.top = `${Math.max(0, finalY)}px`;
  }
}
