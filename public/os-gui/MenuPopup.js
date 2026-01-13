((exports) => {
  const { E, uid, get_new_menu_z_index, get_direction, is_disabled } =
    window.os_gui_utils;

  const MENU_DIVIDER = "MENU_DIVIDER";

  /**
   * A floating menu popup.
   * @param {OSGUIMenuFragment[]} menu_items
   * @param {{ parentMenuPopup?: MenuPopup, handleKeyDown: (e: KeyboardEvent) => void, closeMenus: () => void, refocus_outside_menus: () => void, send_info_event: (item?: OSGUIMenuItem) => void, setActiveMenuPopup: (menu: MenuPopup) => void }} options
   */
  function MenuPopup(menu_items, options) {
    this.parentMenuPopup = options.parentMenuPopup;
    this.wrapperElement = options.wrapperElement; // Store the wrapper element
    this.menuItems = menu_items;
    this.itemElements = [];

    const menu_popup_el = E("div", {
      class: "menu-popup",
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
    let submenus = [];

    menu_popup_el.addEventListener("keydown", options.handleKeyDown);

    menu_popup_el.addEventListener("pointerleave", () => {
      for (const submenu of submenus) {
        if (submenu.submenu_popup_el.style.display !== "none") {
          this.highlight(submenu.item_el);
          return;
        }
      }
      this.highlight(-1);
    });

    menu_popup_el.addEventListener("focusin", () => {
      menu_popup_el.focus({ preventScroll: true });
    });

    menu_popup_el.addEventListener("focusout", (event) => {
      if (event.relatedTarget && !menu_popup_el.contains(event.relatedTarget)) {
        if (
          !event.relatedTarget.closest || // for documentElement, etc.
          !event.relatedTarget.closest(".menu-popup, .menus")
        ) {
          options.closeMenus();
        }
      }
    });

    let last_item_el;
    this.highlight = (index_or_element) => {
      let item_el;
      if (typeof index_or_element === "number") {
        item_el = this.itemElements[index_or_element];
      } else {
        item_el = index_or_element;
      }
      if (last_item_el && last_item_el !== item_el) {
        last_item_el.classList.remove("highlight");
      }
      if (item_el) {
        item_el.classList.add("highlight");
        menu_popup_el.setAttribute("aria-activedescendant", item_el.id);
        last_item_el = item_el;
      } else {
        menu_popup_el.removeAttribute("aria-activedescendant");
        last_item_el = null;
      }
    };

    this.close = (focus_parent_menu_popup = true) => {
      for (const submenu of submenus) {
        submenu.submenu_popup.close(false);
      }
      if (focus_parent_menu_popup) {
        this.parentMenuPopup?.element.focus({ preventScroll: true });
      }
      if (this.wrapperElement) {
        this.wrapperElement.style.display = "none";
      } else {
        menu_popup_el.style.display = "none";
      }
      this.highlight(-1);
      options.setActiveMenuPopup(this.parentMenuPopup);
    };

    const add_menu_item = (parent_element, item, item_index) => {
      const row_el = E("tr", { class: "menu-row" });
      this.itemElements.push(row_el);
      parent_element.appendChild(row_el);
      if (item === MENU_DIVIDER) {
        const td_el = E("td", { colspan: "4" });
        const hr_el = E("hr", { class: "menu-hr" });
        td_el.appendChild(hr_el);
        row_el.appendChild(td_el);
        hr_el.addEventListener("pointerenter", () => {
          this.highlight(-1);
        });
      } else {
        const item_el = row_el;
        item_el.classList.add("menu-item");
        item_el.id = `menu-item-${uid()}`;
        item_el.tabIndex = -1;
        item_el.setAttribute(
          "role",
          item.checkbox
            ? item.checkbox.type === "radio"
              ? "menuitemradio"
              : "menuitemcheckbox"
            : "menuitem",
        );
        if (item.label || item.item) {
          item_el.setAttribute(
            "aria-label",
            AccessKeys.toText(item.label || item.item),
          );
        }
        item_el.setAttribute("aria-keyshortcuts", item.ariaKeyShortcuts || "");
        if (item.description) {
          item_el.setAttribute("aria-description", item.description);
        }
        const checkbox_area_el = E("td", { class: "menu-item-checkbox-area" });
        const label_el = E("td", { class: "menu-item-label" });
        const shortcut_el = E("td", { class: "menu-item-shortcut" });
        const submenu_area_el = E("td", { class: "menu-item-submenu-area" });

        if (item.icon) {
          const icon_el = E("img", {
            src: item.icon,
            width: 16,
            height: 16,
            style: "margin-right: 4px; margin-left: 2px;",
          });
          item_el.appendChild(icon_el);
        } else {
          item_el.appendChild(checkbox_area_el);
        }
        item_el.appendChild(label_el);
        item_el.appendChild(shortcut_el);
        item_el.appendChild(submenu_area_el);
        if (item.label) {
          label_el.appendChild(AccessKeys.toFragment(item.label));
        } else if (item.item) {
          label_el.appendChild(AccessKeys.toFragment(item.item));
        }
        if (item.default) {
          label_el.classList.add("menu-item-default");
        }
        if (item.shortcutLabel) {
          shortcut_el.textContent = item.shortcutLabel;
        } else if (item.shortcut) {
          shortcut_el.textContent = item.shortcut;
        }
        menu_popup_el.addEventListener("update", () => {
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
          options.send_info_event(item);
        });
        item_el.addEventListener("pointerleave", (event) => {
          if (
            menu_popup_el.style.display !== "none" &&
            event.pointerType !== "touch"
          ) {
            options.send_info_event();
          }
        });
        if (item.checkbox?.type === "radio") {
          checkbox_area_el.classList.add("radio");
        } else if (item.checkbox) {
          checkbox_area_el.classList.add("checkbox");
        }
        let open_submenu;
        let submenu_popup_el;
        if (item.submenu) {
          item_el.classList.add("has-submenu");
          submenu_area_el.classList.toggle(
            "point-right",
            get_direction() === "rtl",
          );
          submenu_popup_el = E("div", { class: "menu-popup-wrapper" });
          const submenu_popup = new MenuPopup(item.submenu, {
            ...options,
            parentMenuPopup: this,
            wrapperElement: submenu_popup_el,
          });
          const submenu_popup_el_actual = submenu_popup.element;
          submenu_popup_el.appendChild(submenu_popup_el_actual);

          document.body?.appendChild(submenu_popup_el);
          submenu_popup_el.style.display = "none";
          item_el.setAttribute("aria-haspopup", "true");
          item_el.setAttribute("aria-expanded", "false");
          item_el.setAttribute("aria-controls", submenu_popup_el.id);

          submenu_popup_el.dataset.semanticParent = menu_popup_el.id;
          menu_popup_el.setAttribute(
            "aria-owns",
            `${menu_popup_el.getAttribute("aria-owns") || ""} ${submenu_popup_el.id}`,
          );
          submenu_popup_el.setAttribute("aria-labelledby", item_el.id);
          open_submenu = (highlight_first = true) => {
            if (typeof window.playSound === "function") {
              window.playSound("MenuPopup");
            }
            if (submenu_popup_el.style.display !== "none") {
              return;
            }
            if (item_el.getAttribute("aria-disabled") === "true") {
              return;
            }
            close_submenus_at_this_level();
            item_el.setAttribute("aria-expanded", "true");

            // Make visible off-screen to measure
            submenu_popup_el.style.display = "";
            submenu_popup_el.style.zIndex = `${get_new_menu_z_index()}`;
            submenu_popup_el.style.position = "absolute";
            submenu_popup_el.style.left = "-9999px";
            submenu_popup_el.style.top = "-9999px";
            submenu_popup_el.setAttribute("dir", get_direction());
            if (window.inheritTheme) {
              window.inheritTheme(submenu_popup_el, menu_popup_el);
            }
            if (!submenu_popup_el.parentElement) {
              document.body.appendChild(submenu_popup_el);
            }
            submenu_popup_el.dispatchEvent(new CustomEvent("update", {}));

            // Temporarily make the actual menu content (submenu_popup.element) visible and unconstrained for measurement
            const actualMenuElement = submenu_popup.element; // This is the div.menu-popup

            // Save original styles of the actual menu element (div.menu-popup)
            const actualOriginalParent = actualMenuElement.parentNode;
            const actualOriginalDisplay = actualMenuElement.style.display;
            const actualOriginalVisibility = actualMenuElement.style.visibility;
            const actualOriginalPosition = actualMenuElement.style.position;
            const actualOriginalLeft = actualMenuElement.style.left;
            const actualOriginalTop = actualMenuElement.style.top;
            const actualOriginalZIndex = actualMenuElement.style.zIndex;

            // Detach actual menu content and append to body for accurate measurement
            if (actualOriginalParent) {
              actualOriginalParent.removeChild(actualMenuElement);
            }
            document.body.appendChild(actualMenuElement);

            // Set temporary styles for measurement
            actualMenuElement.style.display = "block";
            actualMenuElement.style.visibility = "hidden";
            actualMenuElement.style.position = "absolute";
            actualMenuElement.style.left = "-9999px";
            actualMenuElement.style.top = "-9999px";
            // Assign a high z-index to ensure it's on top and fully rendered if needed
            actualMenuElement.style.zIndex = `${get_new_menu_z_index() + 100}`;

            // Force reflow to ensure layout calculation
            actualMenuElement.offsetHeight;

            const rect = item_el.getBoundingClientRect(); // Still need parent item's rect for positioning calculations
            const submenu_popup_rect =
              actualMenuElement.getBoundingClientRect();

            // Re-attach to original parent (the wrapper) and restore original styles
            if (actualOriginalParent) {
              actualOriginalParent.appendChild(actualMenuElement);
            }
            actualMenuElement.style.display = actualOriginalDisplay;
            actualMenuElement.style.visibility = actualOriginalVisibility;
            actualMenuElement.style.position = actualOriginalPosition;
            actualMenuElement.style.left = actualOriginalLeft;
            actualMenuElement.style.top = actualOriginalTop;
            actualMenuElement.style.zIndex = actualOriginalZIndex;
            // The wrapper (submenu_popup_el) itself will then get its initial 0px width/height from CSS variables
            // and the setTimeout will correctly apply the measured dimensions.

            // Position and animate
            let final_x =
              (get_direction() === "rtl"
                ? rect.left - submenu_popup_rect.width
                : rect.right) + window.scrollX;
            let final_y = rect.top + window.scrollY;
            let from_left = false;

            if (get_direction() === "rtl") {
              if (final_x < 0) {
                final_x = rect.right;
                from_left = true;
              }
            } else {
              if (final_x + submenu_popup_rect.width > innerWidth) {
                final_x = rect.left - submenu_popup_rect.width;
                from_left = true;
              }
            }
            if (final_y + submenu_popup_rect.height > innerHeight) {
              final_y = Math.max(0, innerHeight - submenu_popup_rect.height);
            }

            submenu_popup_el.style.left = `${final_x}px`;
            submenu_popup_el.style.top = `${final_y}px`;
            // Initial width/height are handled by CSS variables with default 0px,
            // and will be updated asynchronously.

            setTimeout(() => {
              // Ensure both the wrapper and the content are set to display: block
              submenu_popup_el.style.display = "block";
              actualMenuElement.style.display = "block";

              submenu_popup_el.style.setProperty(
                "--width",
                `${submenu_popup_rect.width}px`,
              );
              submenu_popup_el.style.setProperty(
                "--height",
                `${submenu_popup_rect.height}px`,
              );
              submenu_popup_el.style.width = "var(--width)";
              submenu_popup_el.style.height = "var(--height)";

              if (from_left) {
                submenu_popup_el.classList.add("to-left");
              } else {
                submenu_popup_el.classList.add("to-right");
              }
            }, 0);

            if (highlight_first) {
              submenu_popup.highlight(0);
              options.send_info_event(submenu_popup.menuItems[0]);
            } else {
              submenu_popup.highlight(-1);
            }

            submenu_popup_el_actual.focus({ preventScroll: true });
            options.setActiveMenuPopup(submenu_popup);
          };
          submenus.push({
            item_el,
            submenu_popup_el,
            submenu_popup,
          });
          function close_submenus_at_this_level() {
            for (const {
              submenu_popup,
              submenu_popup_el,
              item_el,
            } of submenus) {
              submenu_popup.close(false);
              submenu_popup_el.style.display = "none"; // Explicitly hide the wrapper
              item_el.setAttribute("aria-expanded", "false");
            }
            menu_popup_el.focus({ preventScroll: true });
          }
          let open_tid;
          let close_tid;
          submenu_popup_el.addEventListener("pointerenter", () => {
            if (open_tid) {
              clearTimeout(open_tid);
              open_tid = null;
            }
            if (close_tid) {
              clearTimeout(close_tid);
              close_tid = null;
            }
          });
          item_el.addEventListener("pointerenter", () => {
            if (open_tid) {
              clearTimeout(open_tid);
              open_tid = null;
            }
            if (close_tid) {
              clearTimeout(close_tid);
              close_tid = null;
            }
            open_tid = setTimeout(() => {
              open_submenu(false);
            }, 501);
          });
          item_el.addEventListener("pointerleave", () => {
            if (open_tid) {
              clearTimeout(open_tid);
              open_tid = null;
            }
          });
          menu_popup_el.addEventListener("pointerenter", (event) => {
            if (event.target.closest(".menu-item") === item_el) {
              return;
            }
            if (!close_tid) {
              if (submenu_popup_el.style.display !== "none") {
                close_tid = setTimeout(() => {
                  if (!window.debugKeepMenusOpen) {
                    close_submenus_at_this_level();
                  }
                }, 500);
              }
            }
          });
          menu_popup_el.addEventListener("pointerleave", () => {
            if (close_tid) {
              clearTimeout(close_tid);
              close_tid = null;
            }
          });
          item_el.addEventListener("pointerdown", () => {
            open_submenu(false);
          });
        }
        let just_activated = false;
        const item_action = () => {
          if (just_activated) {
            return;
          }
          just_activated = true;
          setTimeout(() => {
            just_activated = false;
          }, 10);
          if (typeof window.playSound === "function") {
            window.playSound("MenuCommand");
          }
          if (item.checkbox) {
            if (item.checkbox.toggle) {
              item.checkbox.toggle();
              // Fire an update event to immediately reflect the new state.
              const parent_menu_el =
                item_el.closest(".menu-popup-table").parentElement;
              parent_menu_el.dispatchEvent(new CustomEvent("update", {}));
            }
            // Radio buttons should close the menu, but checkboxes shouldn't.
            if (item.checkbox.type === "radio") {
              options.closeMenus();
              options.refocus_outside_menus();
            }
          } else if (item.action) {
            options.closeMenus();
            options.refocus_outside_menus();
            item.action();
          }
        };
        item_el.addEventListener("pointerup", (e) => {
          if (e.pointerType === "mouse" && e.button !== 0) {
            return;
          }
          if (e.pointerType === "touch") {
            return;
          }
          item_el.click();
        });
        item_el.addEventListener("click", (e) => {
          if (item.submenu) {
            open_submenu(true);
          } else {
            item_action();
          }
        });
      }
    };

    if (menu_items.length === 0) {
      menu_items = [
        {
          label: "(Empty)",
          enabled: false,
        },
      ];
    }
    let init_index = 0;
    for (const item of menu_items) {
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
              menu_popup_el.dispatchEvent(new CustomEvent("update", {}));
            },
          };
          add_menu_item(tbody, radio_item, init_index++);
        }
        menu_popup_table_el.appendChild(tbody);
      } else {
        add_menu_item(menu_popup_table_el, item, init_index++);
      }
    }
    menu_popup_el.dispatchEvent(new CustomEvent("update", {}));
  }

  exports.MenuPopup = MenuPopup;
  exports.MENU_DIVIDER = MENU_DIVIDER;
})(typeof module !== "undefined" ? module.exports : window);
