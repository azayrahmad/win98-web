import { E, uid, get_new_menu_z_index, get_direction, is_disabled } from '../../shared/utils/gui-utils.js';
import { AccessKeys } from '../../shared/utils/access-keys.js';

export const MENU_DIVIDER = "MENU_DIVIDER";

export class MenuPopup {
  /**
   * A floating menu popup.
   * @param {Array} menuItems
   * @param {Object} options
   */
  constructor(menuItems, options) {
    this.parentMenuPopup = options.parentMenuPopup;
    this.wrapperElement = options.wrapperElement;
    this.menuItems = menuItems;
    this.options = options;
    this.itemElements = [];
    this.submenus = [];
    this.close_tid = null;
    this.last_item_el = null;

    this._initElement();
    this._renderItems();
  }

  _initElement() {
    const menu_popup_el = E("menu", {
      class: `menu-popup ${this.options.className || ""}`,
      id: `menu-popup-${uid()}`,
      tabIndex: "-1",
      role: "menu",
    });
    menu_popup_el.style.touchAction = "pan-y";
    menu_popup_el.style.outline = "none";

    const menu_popup_table_el = E("table", {
      class: "menu-popup-table",
      role: "presentation",
    });
    menu_popup_el.appendChild(menu_popup_table_el);

    this.element = menu_popup_el;
    this.tableElement = menu_popup_table_el;

    this.element.addEventListener("keydown", this.options.handleKeyDown);
    this._setupPointerEvents();

    this.element.addEventListener("focusin", () => {
      this.element.focus({ preventScroll: true });
    });

    this.element.addEventListener("focusout", (event) => {
      if (event.relatedTarget && !this.element.contains(event.relatedTarget)) {
        if (!event.relatedTarget.closest || !event.relatedTarget.closest(".menu-popup, .menus")) {
          this.options.closeMenus();
        }
      }
    });
  }

  _setupPointerEvents() {
    this.element.addEventListener("pointerover", (event) => {
      const hovered_item_el = event.target.closest(".menu-item");
      if (hovered_item_el && hovered_item_el.classList.contains("has-submenu")) {
        if (this.close_tid) {
          clearTimeout(this.close_tid);
          this.close_tid = null;
        }
        return;
      }

      if (!this.close_tid) {
        const any_submenu_open = this.submenus.some((s) => s.submenu_popup_el.classList.contains("open"));
        if (any_submenu_open) {
          this.close_tid = setTimeout(() => {
            if (!window.debugKeepMenusOpen) {
              this.closeSubmenusAtThisLevel();
            }
            this.close_tid = null;
          }, 1000);
        }
      }
    });

    this.element.addEventListener("pointerleave", () => {
      if (this.close_tid) {
        clearTimeout(this.close_tid);
        this.close_tid = null;
      }
      for (const submenu of this.submenus) {
        if (submenu.submenu_popup_el.classList.contains("open")) {
          this.highlight(submenu.item_el);
          return;
        }
      }
      this.highlight(-1);
    });
  }

  closeSubmenusAtThisLevel() {
    for (const { submenu_popup, submenu_popup_el, item_el } of this.submenus) {
      submenu_popup.close(false);
      submenu_popup_el.classList.remove("open");
      item_el.setAttribute("aria-expanded", "false");
    }
    this.element.focus({ preventScroll: true });
  }

  highlight(index_or_element) {
    let item_el;
    if (typeof index_or_element === "number") {
      item_el = this.itemElements[index_or_element];
    } else {
      item_el = index_or_element;
    }

    if (this.last_item_el && this.last_item_el !== item_el) {
      this.last_item_el.classList.remove("highlight");
    }

    if (item_el) {
      item_el.classList.add("highlight");
      this.element.setAttribute("aria-activedescendant", item_el.id);
      this.last_item_el = item_el;
    } else {
      this.element.removeAttribute("aria-activedescendant");
      this.last_item_el = null;
    }
  }

  close(focus_parent_menu_popup = true) {
    for (const submenu of this.submenus) {
      submenu.submenu_popup.close(false);
    }
    if (focus_parent_menu_popup) {
      this.parentMenuPopup?.element.focus({ preventScroll: true });
    }
    (this.wrapperElement || this.element).classList.remove("open");
    this.highlight(-1);
    this.options.setActiveMenuPopup(this.parentMenuPopup);
  }

  _renderItems() {
    let items = this.menuItems;
    if (items.length === 0) {
      items = [{ label: "(Empty)", enabled: false }];
    }

    let init_index = 0;
    for (const item of items) {
      if (typeof item === "object" && "radioItems" in item) {
        const tbody = E("tbody", { role: "group" });
        if (item.ariaLabel) {
          tbody.setAttribute("aria-label", item.ariaLabel);
        }
        for (const radio_item of item.radioItems) {
          radio_item.checkbox = {
            type: "radio",
            check: () => radio_item.value === item.getValue(),
            toggle: () => {
              item.setValue(radio_item.value);
              this.element.dispatchEvent(new CustomEvent("update", {}));
            },
          };
          this._addMenuItem(tbody, radio_item, init_index++);
        }
        this.tableElement.appendChild(tbody);
      } else {
        this._addMenuItem(this.tableElement, item, init_index++);
      }
    }
    this.element.dispatchEvent(new CustomEvent("update", {}));
  }

  _addMenuItem(parent_element, item, item_index) {
    const row_el = E("tr", { class: "menu-row" });
    this.itemElements.push(row_el);
    parent_element.appendChild(row_el);

    if (item === MENU_DIVIDER) {
      const td_el = E("td", { colspan: "4" });
      const hr_el = E("hr", { class: "menu-hr" });
      td_el.appendChild(hr_el);
      row_el.appendChild(td_el);
      hr_el.addEventListener("pointerenter", () => this.highlight(-1));
      return;
    }

    const item_el = row_el;
    item_el.classList.add("menu-item");
    item_el.id = `menu-item-${uid()}`;
    item_el.tabIndex = -1;
    item_el.setAttribute("role", item.checkbox ? (item.checkbox.type === "radio" ? "menuitemradio" : "menuitemcheckbox") : "menuitem");

    if (item.label || item.item) {
      item_el.setAttribute("aria-label", AccessKeys.toText(item.label || item.item));
    }

    const checkbox_area_el = E("td", { class: "menu-item-checkbox-area" });
    const label_el = E("td", { class: "menu-item-label" });
    const shortcut_el = E("td", { class: "menu-item-shortcut" });
    const submenu_area_el = E("td", { class: "menu-item-submenu-area" });

    if (item.icon) {
      const icon_area_el = E("td", { class: "menu-item-icon-area" });
      const icon_wrapper = E("div", { class: "menu-item-icon-wrapper" });
      const icon_el = E("img", { src: item.icon, width: 16, height: 16 });
      icon_wrapper.appendChild(icon_el);
      icon_area_el.appendChild(icon_wrapper);
      item_el.appendChild(icon_area_el);
    } else {
      item_el.appendChild(checkbox_area_el);
    }

    item_el.appendChild(label_el);
    item_el.appendChild(shortcut_el);
    item_el.appendChild(submenu_area_el);

    if (item.label) label_el.appendChild(AccessKeys.toFragment(item.label));
    else if (item.item) label_el.appendChild(AccessKeys.toFragment(item.item));

    if (item.shortcutLabel) shortcut_el.textContent = item.shortcutLabel;
    else if (item.shortcut) shortcut_el.textContent = item.shortcut;

    this.element.addEventListener("update", () => {
      if (is_disabled(item)) {
        item_el.setAttribute("disabled", "");
        item_el.setAttribute("aria-disabled", "true");
      } else {
        item_el.removeAttribute("disabled");
        item_el.removeAttribute("aria-disabled");
      }
      if (item.checkbox && item.checkbox.check) {
        const checked = item.checkbox.check();
        item_el.setAttribute("aria-checked", checked ? "true" : "false");
      }
    });

    item_el.addEventListener("pointerenter", () => {
      this.highlight(item_index);
      this.options.send_info_event(item);
    });

    if (item.submenu) {
      this._setupSubmenu(item_el, item, submenu_area_el);
    }

    item_el.addEventListener("click", () => {
      if (item.submenu) {
        this._openSubmenu(item_el, true);
      } else {
        this._itemAction(item, item_el);
      }
    });
  }

  _setupSubmenu(item_el, item, submenu_area_el) {
    item_el.classList.add("has-submenu");
    submenu_area_el.classList.toggle("point-right", get_direction() === "rtl");

    const submenu_popup_el = E("div", { class: `menu-popup-wrapper ${this.options.className || ""}` });
    const submenu_popup = new MenuPopup(item.submenu, {
      ...this.options,
      parentMenuPopup: this,
      wrapperElement: submenu_popup_el,
    });

    submenu_popup_el.appendChild(submenu_popup.element);
    document.body.appendChild(submenu_popup_el);

    item_el.setAttribute("aria-haspopup", "true");
    item_el.setAttribute("aria-expanded", "false");

    this.submenus.push({ item_el, submenu_popup_el, submenu_popup });

    item_el.addEventListener("pointerenter", () => {
      this._openSubmenu(item_el, false);
    });
  }

  _openSubmenu(item_el, highlight_first) {
    const submenu = this.submenus.find(s => s.item_el === item_el);
    if (!submenu || submenu.submenu_popup_el.classList.contains("open")) return;
    if (item_el.getAttribute("aria-disabled") === "true") return;

    if (typeof window.playSound === "function") window.playSound("MenuPopup");

    this.closeSubmenusAtThisLevel();
    item_el.setAttribute("aria-expanded", "true");

    const { submenu_popup_el, submenu_popup } = submenu;
    submenu_popup_el.style.zIndex = get_new_menu_z_index();
    submenu_popup_el.style.position = "absolute";
    submenu_popup_el.classList.add("open");

    const rect = item_el.getBoundingClientRect();
    submenu_popup_el.style.left = `${rect.right + window.scrollX}px`;
    submenu_popup_el.style.top = `${rect.top + window.scrollY}px`;

    if (highlight_first) submenu_popup.highlight(0);

    submenu_popup.element.focus({ preventScroll: true });
    this.options.setActiveMenuPopup(submenu_popup);
  }

  _itemAction(item, item_el) {
    if (typeof window.playSound === "function") window.playSound("MenuCommand");

    if (item.checkbox) {
      if (item.checkbox.toggle) {
        item.checkbox.toggle();
        this.element.dispatchEvent(new CustomEvent("update", {}));
      }
      if (item.checkbox.type === "radio") {
        this.options.closeMenus();
        this.options.refocus_outside_menus();
      }
    } else if (item.action) {
      this.options.closeMenus();
      this.options.refocus_outside_menus();
      item.action();
    }
  }
}
