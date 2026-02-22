import { E, get_direction, get_new_menu_z_index, uid } from '../../shared/utils/gui-utils.js';
import { AccessKeys } from '../../shared/utils/access-keys.js';
import { MenuPopup } from './menu-popup.js';

export class MenuBar {
  constructor(menus) {
    this.menus = menus;
    this.top_level_menus = [];
    this.top_level_menu_index = -1;
    this.active_menu_popup = null;
    this.selecting_menus = false;
    this.keyboard_scope_elements = [];

    this._initElement();
    this._renderMenus();
    this.setKeyboardScope(window);
  }

  _initElement() {
    this.element = E("menu", {
      class: "menus",
      role: "menubar",
      "aria-label": "Application Menu",
    });
    this.element.style.touchAction = "none";

    this.element.addEventListener("keydown", (e) => this._handleKeyDown(e));
    this.element.addEventListener("pointerleave", () => {
      if (this.top_level_menu_index !== -1 && !this.top_level_menus[this.top_level_menu_index].menu_popup_el.classList.contains("open")) {
        this._topLevelHighlight(-1);
      }
    });

    window.addEventListener("pointerdown", (e) => this._onClickOutside(e));
    window.addEventListener("blur", (e) => {
        if (!e.isTrusted) return;
        this.closeMenus();
    });
  }

  _renderMenus() {
    for (const menuKey in this.menus) {
      this._makeMenuButton(menuKey, this.menus[menuKey]);
    }
  }

  _makeMenuButton(menuKey, menuItems) {
    const menu_button_el = E("li", {
      class: "menu-button",
      "aria-expanded": "false",
      "aria-haspopup": "true",
      role: "menuitem",
    });
    this.element.appendChild(menu_button_el);

    const menu_popup_el = E("div", { class: "menu-popup-wrapper to-down" });
    document.body.appendChild(menu_popup_el);

    const menu_popup = new MenuPopup(menuItems, {
      handleKeyDown: (e) => this._handleKeyDown(e),
      closeMenus: () => this.closeMenus(),
      refocus_outside_menus: () => this._refocusOutsideMenus(),
      send_info_event: (item) => this._sendInfoEvent(item),
      setActiveMenuPopup: (menu) => { this.active_menu_popup = menu; },
      wrapperElement: menu_popup_el,
    });

    menu_popup_el.appendChild(menu_popup.element);
    menu_button_el.innerHTML = `<span>${AccessKeys.toHTML(menuKey)}</span>`;
    menu_button_el.tabIndex = -1;

    menu_button_el.addEventListener("pointerdown", (e) => {
      if (menu_button_el.classList.contains("active")) {
        this.closeMenus();
        this._refocusOutsideMenus();
        e.preventDefault();
      } else {
        this._openTopLevelMenu(menuKey, e.type);
      }
    });

    menu_button_el.addEventListener("pointermove", (e) => {
        this._topLevelHighlight(this.top_level_menus.findIndex(m => m.menuKey === menuKey));
        if (e.pointerType !== "touch" && this.selecting_menus) {
            this._openTopLevelMenu(menuKey, e.type);
        }
    });

    this.top_level_menus.push({
      menu_button_el,
      menu_popup_el,
      menu_popup,
      menuKey,
      access_key: AccessKeys.get(menuKey),
    });
  }

  _openTopLevelMenu(menuKey, type = "other") {
    const index = this.top_level_menus.findIndex(m => m.menuKey === menuKey);
    if (index === -1) return;

    if (index === this.top_level_menu_index && this.top_level_menus[index].menu_button_el.getAttribute("aria-expanded") === "true") return;

    if (typeof window.playSound === "function") window.playSound("MenuPopup");

    this.closeMenus();
    const menu = this.top_level_menus[index];
    menu.menu_button_el.classList.add("active");
    menu.menu_button_el.setAttribute("aria-expanded", "true");

    menu.menu_popup_el.classList.add("open");
    menu.menu_popup_el.style.zIndex = get_new_menu_z_index();

    this.top_level_menu_index = index;
    this.selecting_menus = true;
    this.active_menu_popup = menu.menu_popup;

    if (type === "keydown") {
      menu.menu_popup.highlight(0);
      this._sendInfoEvent(menu.menu_popup.menuItems[0]);
    } else {
      this._sendInfoEvent();
    }
  }

  closeMenus() {
    this.selecting_menus = false;
    for (const menu of this.top_level_menus) {
      menu.menu_button_el.classList.remove("active");
      menu.menu_button_el.setAttribute("aria-expanded", "false");
      menu.menu_popup_el.classList.remove("open");
      menu.menu_popup.highlight(-1);
    }
    this.active_menu_popup = null;
  }

  _topLevelHighlight(index) {
    if (this.top_level_menu_index !== -1 && this.top_level_menu_index !== index) {
      this.top_level_menus[this.top_level_menu_index].menu_button_el.classList.remove("highlight");
    }
    if (index !== -1) {
      this.top_level_menus[index].menu_button_el.classList.add("highlight");
    }
    this.top_level_menu_index = index;
  }

  _handleKeyDown(e) {
    if (e.defaultPrevented) return;

    const menuPopup = this.active_menu_popup;
    const topLevelMenu = this.top_level_menus[this.top_level_menu_index];

    switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight":
            const isRight = e.key === "ArrowRight";
            const dir = (get_direction() === "ltr" === isRight) ? 1 : -1;
            let nextIndex = (this.top_level_menu_index + dir + this.top_level_menus.length) % this.top_level_menus.length;
            this._openTopLevelMenu(this.top_level_menus[nextIndex].menuKey, "keydown");
            e.preventDefault();
            break;
        case "Escape":
            this.closeMenus();
            this._refocusOutsideMenus();
            e.preventDefault();
            break;
        case "Alt":
            this.closeMenus();
            this._refocusOutsideMenus();
            e.preventDefault();
            break;
    }
  }

  _refocusOutsideMenus() {
    const window_el = this.element.closest(".window");
    if (window_el) {
      window_el.dispatchEvent(new CustomEvent("refocus-window"));
    }
  }

  _sendInfoEvent(item) {
    const description = item?.description || "";
    this.element.dispatchEvent(new CustomEvent("info", { detail: { description } }));
  }

  _onClickOutside(e) {
    if (e.target.closest(".menus") === this.element || e.target.closest(".menu-popup")) return;
    this.closeMenus();
    this._topLevelHighlight(-1);
  }

  setKeyboardScope(...elements) {
    this.keyboard_scope_elements.forEach(el => el.removeEventListener("keydown", this._onKeyboardScopeKeyDown.bind(this)));
    this.keyboard_scope_elements = elements;
    this.keyboard_scope_elements.forEach(el => el.addEventListener("keydown", this._onKeyboardScopeKeyDown.bind(this)));
  }

  _onKeyboardScopeKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key !== "Control" && e.key !== "Meta") {
        this.closeMenus();
        return;
    }
    if (e.defaultPrevented) return;
    if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const menu = this.top_level_menus.find(m => m.access_key?.toLowerCase() === e.key.toLowerCase());
        if (menu) {
            e.preventDefault();
            this._openTopLevelMenu(menu.menuKey, "keydown");
        }
    }
  }
}
