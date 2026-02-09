((exports) => {
  function ContextMenu(menuItems, event) {
    // Remove existing menus
    const existingMenus = document.querySelectorAll(".menu-popup-wrapper");
    existingMenus.forEach((menu) => menu.remove());
    let menuPopup;

    // ──────────────────────────────────────────────
    // 1. Create wrapper for clipping + animation
    // ──────────────────────────────────────────────
    const wrap = document.createElement("div");
    wrap.className = "menu-popup-wrapper";
    wrap.style.position = "absolute";
    wrap.style.overflow = "hidden";

    // ──────────────────────────────────────────────
    // 2. Closing logic
    // ──────────────────────────────────────────────
    const closeMenu = () => {
      if (menuPopup && menuPopup.element.parentNode) {
        menuPopup.close(false);
        wrap.remove();
      }
      document.removeEventListener("pointerdown", closeMenuOnClickOutside);
    };

    const closeMenuOnClickOutside = (e) => {
      if (!wrap.contains(e.target) && !e.target.closest(".menu-popup")) {
        closeMenu();
      }
    };

    // ──────────────────────────────────────────────
    // 3. Create actual menu DOM using your MenuPopup
    // ──────────────────────────────────────────────
    menuPopup = new window.MenuPopup(menuItems, {
      closeMenus: closeMenu,
      handleKeyDown: (e) => {
        if (e.key === "Escape") closeMenu();
      },
      setActiveMenuPopup: () => {},
      refocus_outside_menus: () => {},
      send_info_event: () => {},
    });

    // Set z-index for the main context menu
    menuPopup.element.style.zIndex = window.os_gui_utils.get_new_menu_z_index();

    // Append menu into wrapper
    wrap.appendChild(menuPopup.element);

    // Add wrapper to screen
    const screen = document.getElementById("screen");
    screen.appendChild(wrap);

    // menuPopup.element.style.display = "block"; // Managed by .open class
    menuPopup.element.style.position = "absolute";
    menuPopup.element.style.left = "0";
    menuPopup.element.style.top = "0";
    menuPopup.element.style.transformOrigin = "top left";

    // Sound
    if (typeof window.playSound === "function") {
      window.playSound("MenuPopup");
    }

    // Position and animate
    const positionAt = (x, y) => {
      wrap.style.zIndex = window.os_gui_utils.get_new_menu_z_index();
      wrap.style.position = "absolute";

      // Measure without showing
      wrap.classList.add("measuring");
      const menuRect = menuPopup.element.getBoundingClientRect();
      wrap.classList.remove("measuring");

      const screenRect = screen.getBoundingClientRect();
      const relX = x - screenRect.left;
      const relY = y - screenRect.top;

      let finalX = relX;
      let finalY = relY;
      let fromX = -100; // default slide in down-right
      let fromY = -100;

      // Flip horizontally if needed
      if (relX + menuRect.width > screenRect.width) {
        finalX = relX - menuRect.width;
        fromX = 100; // slide in from right
      }

      // Flip vertically if needed
      if (relY + menuRect.height > screenRect.height) {
        finalY = relY - menuRect.height;
        fromY = 100; // slide in from bottom
      }

      finalX = Math.max(0, finalX);
      finalY = Math.max(0, finalY);

      wrap.style.left = `${finalX}px`;
      wrap.style.top = `${finalY}px`;

      wrap.classList.remove("to-diag-left-top", "to-diag-right-top", "to-diag-left-bottom", "to-diag-right-bottom");
      if (fromX === -100 && fromY === -100) {
        wrap.classList.add("to-diag-left-top");
      } else if (fromX === 100 && fromY === -100) {
        wrap.classList.add("to-diag-right-top");
      } else if (fromX === -100 && fromY === 100) {
        wrap.classList.add("to-diag-left-bottom");
      } else {
        wrap.classList.add("to-diag-right-bottom");
      }

      wrap.classList.add("open");
    };

    // Position at pointer
    positionAt(event.pageX, event.pageY);

    // After positioning, dispatch an update event to set initial checkbox states
    menuPopup.element.dispatchEvent(new CustomEvent("update", {}));

    menuPopup.element.focus({ preventScroll: true });

    // Enable click-outside
    setTimeout(() => {
      document.addEventListener("pointerdown", closeMenuOnClickOutside);
    }, 0);

    return menuPopup;
  }

  exports.ContextMenu = ContextMenu;
})(typeof exports !== "undefined" ? exports : window);
