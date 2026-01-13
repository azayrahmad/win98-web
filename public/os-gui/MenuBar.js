((exports) => {
  const { E, uid, get_new_menu_z_index, get_direction } = window.os_gui_utils;

  // & defines access keys (contextual hotkeys) in menus and buttons and form labels, which get underlined in the UI.
  // & can be escaped by doubling it, e.g. "&Taskbar && Start Menu" for "Taskbar & Start Menu" with T as the access key.
  /** @type {AccessKeys} */
  const AccessKeys = {
    escape: function (label) {
      return label.replace(/&/g, "&&");
    },
    unescape: function (label) {
      return label.replace(/&&/g, "&");
    },
    indexOf: function (label) {
      return ` ${label}`.search(/[^&]&[^&\s]/);
    },
    has: function (label) {
      return this.indexOf(label) >= 0;
    },
    get: function (label) {
      const index = this.indexOf(label);
      if (index >= 0) {
        return label.charAt(index + 1).toUpperCase();
      }
      return null;
    },
    remove: function (label) {
      const parentheticalRegex = /\s?\(&[^&]\)/;
      if (parentheticalRegex.test(label)) {
        return this.unescape(label.replace(parentheticalRegex, ""));
      }
      return this.toText(label);
    },
    toText: function (label) {
      const index = this.indexOf(label);
      if (index >= 0) {
        return (
          this.unescape(label.substring(0, index)) +
          this.unescape(label.substring(index + 1))
        );
      }
      return this.unescape(label);
    },
    toHTML: function (label) {
      const fragment = this.toFragment(label);
      const dummy = document.createElement("div");
      dummy.appendChild(fragment);
      return dummy.innerHTML;
    },
    toFragment: function (label) {
      const fragment = document.createDocumentFragment();
      const index = this.indexOf(label);
      if (index >= 0) {
        fragment.appendChild(
          document.createTextNode(this.unescape(label.substring(0, index))),
        );
        const span = E("span", { class: "menu-hotkey" });
        span.appendChild(document.createTextNode(label.charAt(index + 1)));
        fragment.appendChild(span);
        fragment.appendChild(
          document.createTextNode(this.unescape(label.substring(index + 2))),
        );
      } else {
        fragment.appendChild(document.createTextNode(this.unescape(label)));
      }
      return fragment;
    },
  };

  /** @type {HTMLElement | null} */
  let last_focus_outside_menus = null;
  function track_focus() {
    if (
      document.activeElement &&
      document.activeElement.tagName !== "BODY" &&
      document.activeElement.tagName !== "HTML" &&
      !document.activeElement.closest(".menus, .menu-popup")
    ) {
      last_focus_outside_menus = /** @type {HTMLElement} */ (
        document.activeElement
      );
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("focusin", track_focus);
    window.addEventListener("focusout", track_focus);
  }

  /**
   * @param {OSGUITopLevelMenus} menus
   * @constructor
   */
  function MenuBar(menus) {
    if (!(this instanceof MenuBar)) {
      return new MenuBar(menus);
    }

    const menus_el = E("div", {
      class: "menus",
      role: "menubar",
      "aria-label": "Application Menu",
    });
    menus_el.style.touchAction = "none";

    let selecting_menus = false;

    const top_level_menus = [];
    let top_level_menu_index = -1;
    let active_menu_popup = undefined;

    const close_menus = () => {
      for (const { menu_button_el } of top_level_menus) {
        if (menu_button_el.getAttribute("aria-expanded") === "true") {
          menu_button_el.dispatchEvent(new CustomEvent("release", {}));
        }
      }
    };

    const refocus_outside_menus = () => {
      if (last_focus_outside_menus) {
        last_focus_outside_menus.focus();
        if (document.activeElement === last_focus_outside_menus) {
          return;
        }
      }
      const window_el = menus_el.closest(".window");
      if (window_el) {
        window_el.dispatchEvent(new CustomEvent("refocus-window"));
      }
    };

    const top_level_highlight = (new_index_or_menu_key) => {
      const new_index =
        typeof new_index_or_menu_key === "string"
          ? Object.keys(menus).indexOf(new_index_or_menu_key)
          : new_index_or_menu_key;
      if (top_level_menu_index !== -1 && top_level_menu_index !== new_index) {
        top_level_menus[top_level_menu_index].menu_button_el.classList.remove(
          "highlight",
        );
      }
      if (new_index !== -1) {
        top_level_menus[new_index].menu_button_el.classList.add("highlight");
      }
      top_level_menu_index = new_index;
    };

    menus_el.addEventListener("pointerleave", () => {
      if (
        top_level_menu_index !== -1 &&
        top_level_menus[top_level_menu_index].menu_popup_el.style.display ===
          "none"
      ) {
        top_level_highlight(-1);
      }
    });

    function send_info_event(item) {
      const description = item?.description || "";
      menus_el.dispatchEvent(
        new CustomEvent("info", { detail: { description } }),
      );
    }

    function setActiveMenuPopup(menu) {
      active_menu_popup = menu;
    }

    function handleKeyDown(e) {
      if (e.defaultPrevented) {
        return;
      }
      const active_menu_popup_el = active_menu_popup?.element;
      const top_level_menu = top_level_menus[top_level_menu_index];
      const { menu_button_el, open_top_level_menu } = top_level_menu || {};
      const menu_popup_el =
        active_menu_popup_el || top_level_menu?.menu_popup_el;
      const parent_item_el = active_menu_popup_el
        ? top_level_menus.find(
            (m) => m.menu_popup === active_menu_popup.parentMenuPopup,
          )?.menu_button_el
        : undefined;
      const highlighted_item_el = menu_popup_el?.querySelector(
        ".menu-item.highlight",
      );

      switch (e.key) {
        case "ArrowLeft":
        case "ArrowRight":
          const right = e.key === "ArrowRight";
          if (
            highlighted_item_el?.matches(
              ".has-submenu:not([aria-disabled='true'])",
            ) &&
            (get_direction() === "ltr") === right
          ) {
            highlighted_item_el.click();
            e.preventDefault();
          } else if (
            active_menu_popup &&
            active_menu_popup.parentMenuPopup &&
            (get_direction() === "ltr") !== right
          ) {
            active_menu_popup.close(true);
            parent_item_el.setAttribute("aria-expanded", "false");
            send_info_event(
              active_menu_popup.menuItems[
                active_menu_popup.itemElements.indexOf(parent_item_el)
              ],
            );
            e.preventDefault();
          } else if (
            highlighted_item_el ||
            !active_menu_popup ||
            !active_menu_popup.parentMenuPopup
          ) {
            const menu_was_open =
              menu_popup_el && menu_popup_el.style.display !== "none";
            const cycle_dir = (get_direction() === "ltr") === right ? 1 : -1;
            let new_index =
              top_level_menu_index === -1
                ? cycle_dir === 1
                  ? 0
                  : top_level_menus.length - 1
                : (top_level_menu_index + cycle_dir + top_level_menus.length) %
                  top_level_menus.length;
            const new_top_level_menu = top_level_menus[new_index];
            if (menu_was_open) {
              new_top_level_menu.open_top_level_menu("keydown");
            } else {
              menu_button_el?.dispatchEvent(new CustomEvent("release", {}));
              new_top_level_menu.menu_button_el.focus({ preventScroll: true });
              top_level_highlight(new_index);
            }
            e.preventDefault();
          }
          break;
        case "ArrowUp":
        case "ArrowDown":
          const down = e.key === "ArrowDown";
          if (active_menu_popup) {
            const cycle_dir = down ? 1 : -1;
            const item_els = [...menu_popup_el.querySelectorAll(".menu-item")];
            const from_index = item_els.indexOf(highlighted_item_el);
            let to_index =
              (from_index + cycle_dir + item_els.length) % item_els.length;
            if (from_index === -1) {
              to_index = down ? 0 : item_els.length - 1;
            }
            const to_item_el = item_els[to_index];
            active_menu_popup.highlight(to_item_el);
            send_info_event(
              active_menu_popup.menuItems[
                active_menu_popup.itemElements.indexOf(to_item_el)
              ],
            );
            e.preventDefault();
          } else {
            open_top_level_menu?.("keydown");
          }
          e.preventDefault();
          break;
        case "Escape":
          if (active_menu_popup) {
            if (parent_item_el && parent_item_el !== menu_button_el) {
              active_menu_popup.close(true);
              parent_item_el.setAttribute("aria-expanded", "false");
              send_info_event(
                active_menu_popup.menuItems[
                  active_menu_popup.itemElements.indexOf(parent_item_el)
                ],
              );
            } else {
              close_menus();
              menu_button_el.focus({ preventScroll: true });
            }
            e.preventDefault();
          } else {
            menus_el
              .closest(".window")
              ?.dispatchEvent(new CustomEvent("refocus-window"));
            e.preventDefault();
          }
          break;
        case "Alt":
          close_menus();
          refocus_outside_menus();
          e.preventDefault();
          break;
        case "Enter":
          if (menu_button_el === document.activeElement) {
            open_top_level_menu("keydown");
          } else {
            highlighted_item_el?.click();
          }
          e.preventDefault();
          break;
        default:
          if (e.ctrlKey || e.metaKey) break;
          const key = e.key.toLowerCase();
          const item_els = active_menu_popup
            ? [...menu_popup_el.querySelectorAll(".menu-item")]
            : top_level_menus.map((m) => m.menu_button_el);
          const item_els_by_access_key = {};
          for (const item_el of item_els) {
            const access_key_el = item_el.querySelector(".menu-hotkey");
            const access_key = (
              access_key_el
                ? access_key_el.textContent
                : (item_el.querySelector(".menu-item-label") ?? item_el)
                    .textContent[0]
            ).toLowerCase();
            item_els_by_access_key[access_key] =
              item_els_by_access_key[access_key] || [];
            item_els_by_access_key[access_key].push(item_el);
          }
          const matching_item_els = item_els_by_access_key[key] || [];
          if (matching_item_els.length) {
            if (matching_item_els.length === 1) {
              const menu_item_el = matching_item_els[0];
              const top_level_menu = top_level_menus.find(
                (m) => m.menu_button_el === menu_item_el,
              );
              if (top_level_menu) {
                top_level_menu.open_top_level_menu("keydown");
              } else {
                menu_item_el.click();
              }
            } else {
              let index = matching_item_els.indexOf(highlighted_item_el);
              index = index === -1 ? 0 : (index + 1) % matching_item_els.length;
              active_menu_popup.highlight(matching_item_els[index]);
            }
            e.preventDefault();
          }
          break;
      }
    }

    menus_el.addEventListener("keydown", handleKeyDown);

    const make_menu_button = (menus_key, menu_items) => {
      const menu_button_el = E("div", {
        class: "menu-button",
        "aria-expanded": "false",
        "aria-haspopup": "true",
        role: "menuitem",
      });
      menus_el.appendChild(menu_button_el);

      const menu_popup_el = E("div", { class: "menu-popup-wrapper to-down" });
      document.body?.appendChild(menu_popup_el);
      const menu_popup = new MenuPopup(menu_items, {
        handleKeyDown,
        closeMenus: close_menus,
        refocus_outside_menus,
        send_info_event,
        setActiveMenuPopup,
        wrapperElement: menu_popup_el,
      });
      const menu_popup_el_actual = menu_popup.element;
      menu_popup_el.appendChild(menu_popup_el_actual);

      menu_button_el.id = `menu-button-${menus_key}-${uid()}`;
      menu_popup_el.dataset.semanticParent = menu_button_el.id;
      menu_button_el.setAttribute("aria-controls", menu_popup_el.id);
      menu_popup_el.setAttribute("aria-labelledby", menu_button_el.id);
      menus_el.setAttribute(
        "aria-owns",
        `${menus_el.getAttribute("aria-owns") || ""} ${menu_popup_el.id}`,
      );

      const update_position = () => {
        const rect = menu_button_el.getBoundingClientRect();
        const popup_rect = menu_popup_el.getBoundingClientRect();
        menu_popup_el.style.position = "absolute";
        menu_popup_el.style.left = `${(get_direction() === "rtl" ? rect.right - popup_rect.width : rect.left) + window.scrollX}px`;
        menu_popup_el.style.top = `${rect.bottom + window.scrollY}px`;
        const uncorrected_rect = menu_popup_el.getBoundingClientRect();
        if (Math.floor(uncorrected_rect.right) > innerWidth) {
          menu_popup_el.style.left = `${innerWidth - uncorrected_rect.width}px`;
        }
        if (Math.ceil(uncorrected_rect.left) < 0) {
          menu_popup_el.style.left = "0px";
        }
      };
      window.addEventListener("resize", update_position);
      menu_popup_el.addEventListener("update", update_position);

      menu_popup_el.style.display = "none";
      menu_button_el.innerHTML = `<span>${AccessKeys.toHTML(menus_key)}</span>`;
      menu_button_el.tabIndex = -1;

      menu_button_el.addEventListener("focus", () =>
        top_level_highlight(menus_key),
      );
      menu_button_el.addEventListener("pointerdown", (e) => {
        if (menu_button_el.classList.contains("active")) {
          menu_button_el.dispatchEvent(new CustomEvent("release", {}));
          refocus_outside_menus();
          e.preventDefault();
        } else {
          open_top_level_menu(e.type);
        }
      });
      menu_button_el.addEventListener("pointermove", (e) => {
        top_level_highlight(menus_key);
        if (e.pointerType !== "touch" && selecting_menus) {
          open_top_level_menu(e.type);
        }
      });

      function open_top_level_menu(type = "other") {
        const new_index = Object.keys(menus).indexOf(menus_key);
        if (
          new_index === top_level_menu_index &&
          menu_button_el.getAttribute("aria-expanded") === "true"
        )
          return;
        if (typeof window.playSound === "function") {
          window.playSound("MenuPopup");
        }
        close_menus();
        menu_button_el.classList.add("active");
        menu_button_el.setAttribute("aria-expanded", "true");
        menu_popup_el.style.display = "";
        menu_popup_el.style.zIndex = `${get_new_menu_z_index()}`;
        // Make visible off-screen to measure
        menu_popup_el.style.left = "-9999px";
        menu_popup_el.style.top = "-9999px";
        const rect = menu_popup_el
          .querySelector(".menu-popup")
          .getBoundingClientRect();

        // Position and animate
        update_position();
        menu_popup_el.style.width = "0px";
        menu_popup_el.style.height = "0px";

        setTimeout(() => {
          menu_popup_el.style.setProperty("--width", `${rect.width}px`);
          menu_popup_el.style.setProperty("--height", `${rect.height}px`);
          menu_popup_el.style.width = "var(--width)";
          menu_popup_el.style.height = "var(--height)";
        }, 0);
        menu_popup_el.setAttribute("dir", get_direction());
        if (window.inheritTheme) window.inheritTheme(menu_popup_el, menus_el);
        if (!menu_popup_el.parentElement)
          document.body.appendChild(menu_popup_el);
        top_level_highlight(menus_key);
        menu_popup_el.dispatchEvent(new CustomEvent("update", {}));
        selecting_menus = true;
        menu_popup_el.focus({ preventScroll: true });
        setActiveMenuPopup(menu_popup);
        if (type === "keydown") {
          menu_popup.highlight(0);
          send_info_event(menu_popup.menuItems[0]);
        } else {
          send_info_event();
        }
      }

      menu_button_el.addEventListener("release", () => {
        selecting_menus = false;
        menu_button_el.classList.remove("active");
        if (!window.debugKeepMenusOpen) {
          menu_popup.close(true);
          menu_button_el.setAttribute("aria-expanded", "false");
        }
        menus_el.dispatchEvent(new CustomEvent("default-info", {}));
      });

      top_level_menus.push({
        menu_button_el,
        menu_popup_el,
        menu_popup,
        menus_key,
        access_key: AccessKeys.get(menus_key),
        open_top_level_menu,
      });
    };

    for (const menu_key in menus) {
      make_menu_button(menu_key, menus[menu_key]);
    }

    window.addEventListener("keydown", (e) => {
      if (!document.activeElement?.closest(".menus, .menu-popup")) {
        if (e.key === "Escape" && active_menu_popup) {
          close_menus();
          e.preventDefault();
        }
      }
    });

    window.addEventListener("blur", (event) => {
      if (!event.isTrusted) return;
      close_menus();
    });

    function close_menus_on_click_outside(event) {
      if (
        event.target?.closest?.(".menus") === menus_el ||
        event.target?.closest?.(".menu-popup")
      )
        return;
      close_menus();
      top_level_highlight(-1);
    }
    window.addEventListener("pointerdown", close_menus_on_click_outside);

    window.addEventListener("focusout", (event) => {
      if (
        event.relatedTarget?.closest?.(".menus") === menus_el ||
        event.relatedTarget?.closest?.(".menu-popup")
      )
        return;
      close_menus();
      top_level_highlight(
        top_level_menus.findIndex(({ menu_button_el }) =>
          menu_button_el.matches(":hover"),
        ),
      );
    });

    let keyboard_scope_elements = [];
    function set_keyboard_scope(...elements) {
      keyboard_scope_elements.forEach((el) =>
        el.removeEventListener("keydown", keyboard_scope_keydown),
      );
      keyboard_scope_elements = elements;
      keyboard_scope_elements.forEach((el) =>
        el.addEventListener("keydown", keyboard_scope_keydown),
      );
    }

    function keyboard_scope_keydown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key !== "Control" && e.key !== "Meta") {
        close_menus();
        return;
      }
      if (e.defaultPrevented) return;
      if (e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const menu = top_level_menus.find(
          (m) => m.access_key?.toLowerCase() === e.key.toLowerCase(),
        );
        if (menu) {
          e.preventDefault();
          menu.open_top_level_menu("keydown");
        }
      }
    }

    set_keyboard_scope(window);

    this.element = menus_el;
    this.closeMenus = close_menus;
    this.setKeyboardScope = set_keyboard_scope;
  }

  exports.MenuBar = MenuBar;
  exports.AccessKeys = AccessKeys;
  exports.MENU_DIVIDER = "MENU_DIVIDER";
})(typeof module !== "undefined" ? module.exports : window);
