import { E, get_direction, uid } from '../../shared/utils/gui-utils.js';
import { kernel } from '../kernel.js';

/**
 * OSWindow represents a window in the azOS system.
 * Modernized ES6 class with full feature parity with legacy $Window.js
 */
export class OSWindow {
  static Z_INDEX = 100;
  static DEBUG_FOCUS = false;
  static minimize_slots = [];

  constructor(options = {}) {
    this.options = {
      closable: true,
      minimizable: true,
      maximizable: true,
      allowFullscreen: false,
      startFullscreen: false,
      resizable: false,
      ...options
    };

    this.id = this.options.id || `os-window-${uid()}`;
    const tagName = this.options.tagName || (this.options.modal ? "dialog" : "article");

    this.element = E(tagName);
    this.element.id = this.id;
    this.$window = $(this.element);
    this.$window.addClass("window os-window").appendTo("#screen");
    this.$window.css({
        position: "absolute",
        zIndex: OSWindow.Z_INDEX++
    });

    if (tagName === "article") {
      this.$window.attr("role", "window");
    }

    // State management
    this.closed = false;
    this.child_$windows = [];
    this.animating_titlebar = false;
    this.when_done_animating_titlebar = [];
    this.last_focus_by_container = new Map();
    this.focus_update_handlers_by_container = new Map();

    // Circular reference for compatibility
    this.element.$window = this.$window;
    this.$window.element = this.element;
    this.$window.options = this.options;
    this.$window.child_$windows = this.child_$windows;
    this.$window.closed = false;

    this._initUI();
    this._setupMethods();
    this._setupFocusTracking();
    this._setupKeyboardHandling();
    this._setupDragging();

    if (this.options.resizable) {
      this._setupResizing();
    }

    if (this.options.title) {
      this.$window.title(this.options.title);
    }

    this._setInitialDimensions();

    if (!this.options.$component) {
      this.$window.center();
    }

    if (this.options.startFullscreen && this.options.allowFullscreen) {
      requestAnimationFrame(() => {
        this.$window.toggleFullscreen();
      });
    }

    this._setupResizeObserver();
    this._observeIframes(this.element);
    this._setupFullscreenListener();

    return this.$window;
  }

  _initUI() {
    const $w = this.$window;
    const options = this.options;

    $w.$titlebar = $(E("header")).addClass("window-titlebar").appendTo($w);
    $w.$title_area = $(E("div")).addClass("window-title-area").appendTo($w.$titlebar);
    $w.$title = $(E("span")).addClass("window-title").appendTo($w.$title_area);

    if (options.toolWindow) {
      options.minimizeButton = false;
      options.maximizeButton = false;
      $w.addClass("tool-window");
    }

    if (options.minimizeButton !== false) {
      $w.$minimize = $(E("button"))
        .addClass("window-minimize-button window-action-minimize window-button")
        .appendTo($w.$titlebar)
        .attr("aria-label", "Minimize window")
        .append("<span class='window-button-icon'></span>");
      if (!options.minimizable) $w.$minimize.prop("disabled", true);
    }

    if (options.maximizeButton !== false) {
      $w.$maximize = $(E("button"))
        .addClass("window-maximize-button window-action-maximize window-button")
        .appendTo($w.$titlebar)
        .attr("aria-label", "Maximize or restore window")
        .append("<span class='window-button-icon'></span>");
      if (!options.resizable || !options.maximizable) $w.$maximize.prop("disabled", true);
    }

    if (options.closeButton !== false) {
      $w.$x = $(E("button"))
        .addClass("window-close-button window-action-close window-button")
        .appendTo($w.$titlebar)
        .attr("aria-label", "Close window")
        .append("<span class='window-button-icon'></span>");
      if (!options.closable) $w.$x.prop("disabled", true);
    }

    $w.$content = $(E("section")).addClass("window-content").appendTo($w);
    $w.$content.attr("tabIndex", "-1").css({
        outline: "none",
        flexGrow: 1
    });

    if (options.parentWindow) {
      options.parentWindow.addChildWindow($w);
      if (options.toolWindow) {
        $w[0].dataset.semanticParent = options.parentWindow[0].id;
      }
    }

    this._setupIcons();
  }

  _setupIcons() {
    const $w = this.$window;
    const options = this.options;

    $w.icons = options.icons || {};
    if (typeof options.icon === "object" && "tagName" in options.icon) {
        $w.icons = { any: options.icon };
    }

    let iconSize = 16;

    $w.getIconAtSize = (target_size) => {
        let icon = null;
        let icon_size = target_size;

        if ($w.icons[target_size]) {
            icon = $w.icons[target_size];
        } else if ($w.icons["any"]) {
            icon = $w.icons["any"];
            icon_size = "any";
        } else {
            const sizes = Object.keys($w.icons).filter(s => !isNaN(parseFloat(s)) && isFinite(s));
            sizes.sort((a, b) => Math.abs(parseFloat(a) - target_size) - Math.abs(parseFloat(b) - target_size));
            if (sizes.length) {
                icon_size = sizes[0];
                icon = $w.icons[icon_size];
            }
        }

        if (icon) {
            if (typeof icon === "object" && icon.cloneNode) return icon.cloneNode(true);
            const img = E("img", { draggable: "false" });
            if (typeof icon === "string") img.src = icon;
            else if (icon.src) img.src = icon.src;

            const sizeValue = isNaN(parseFloat(icon_size)) ? target_size : parseFloat(icon_size);
            img.width = sizeValue;
            img.height = sizeValue;
            img.style.width = `${target_size}px`;
            img.style.height = `${target_size}px`;
            return img;
        }
        return null;
    };

    $w.setTitlebarIconSize = (size) => {
        $w.$icon?.remove();
        const iconNode = $w.getIconAtSize(size);
        if (iconNode) {
            $w.$icon = $(iconNode).addClass("window-icon").css({ marginRight: 4 }).prependTo($w.$titlebar);
        }
        iconSize = size;
        $w.trigger("icon-change");
    };

    $w.setTitlebarIconSize(iconSize);

    $w.setIcons = (icons) => {
        $w.icons = icons;
        $w.setTitlebarIconSize(iconSize);
    };
  }

  _setupMethods() {
    const $w = this.$window;
    const options = this.options;
    const $event_target = $({});

    $w.onFocus = (cb) => { $event_target.on("focus", cb); return () => $event_target.off("focus", cb); };
    $w.onBlur = (cb) => { $event_target.on("blur", cb); return () => $event_target.off("blur", cb); };
    $w.onClosed = (cb) => { $event_target.on("closed", cb); return () => $event_target.off("closed", cb); };

    $w.title = (title) => {
      if (typeof title !== "undefined") {
        $w.$title.text(title);
        $w.trigger("title-change");
        return $w;
      }
      return $w.$title.text();
    };

    $w.close = (force) => {
      if (!force && !options.closable) return;
      const e = $.Event("close");
      $w.trigger(e);
      if (!force && e.isDefaultPrevented()) return;

      this.closed = true;
      $w.closed = true;
      OSWindow.minimize_slots[this._minimize_slot_index] = null;

      this.child_$windows?.forEach(cw => cw.close(true));

      $w.trigger("closed");
      $event_target.triggerHandler("closed");

      $w.remove();
      this.resizeObserver?.disconnect();
      this.desktopResizeObserver?.disconnect();
      $(window).off("resize", this._onResize);
      document.removeEventListener("fullscreenchange", this._handleFullscreenChange);

      // Focus next topmost
      const $next = $(".window:visible").toArray()
        .sort((a, b) => (parseInt(b.style.zIndex) || 0) - (parseInt(a.style.zIndex) || 0))[0];
      if ($next) $($next).triggerHandler("refocus-window");
    };

    $w.focus = () => {
      this._showAsFocused();
      $w.bringToFront();
      this._refocus();
    };

    $w.blur = () => {
        this._stopShowingAsFocused();
        if (document.activeElement && document.activeElement.closest(".window") === $w[0]) {
            document.activeElement.blur();
        }
    };

    $w.bringToFront = () => {
      $w.css("z-index", OSWindow.Z_INDEX++);
      this.child_$windows?.forEach(cw => cw.bringToFront());
    };

    $w.center = () => {
      const screen = document.getElementById("screen");
      if (!screen) return;
      $w.css({
        left: Math.max(0, (screen.clientWidth - $w.outerWidth()) / 2),
        top: Math.max(0, (screen.clientHeight - $w.outerHeight()) / 2),
      });
      $w.applyBounds();
    };

    $w.bringTitleBarInBounds = () => {
      const screen = document.getElementById("screen");
      const rect = screen.getBoundingClientRect();
      const min_h = 40;
      $w.css({
        left: Math.max(min_h - $w.outerWidth(), Math.min(rect.width - min_h, $w.position().left)),
        top: Math.max(0, Math.min(rect.height - $w.$titlebar.outerHeight() - 5, $w.position().top)),
      });
    };

    $w.applyBounds = () => {
      const screen = document.getElementById("screen");
      const rect = screen.getBoundingClientRect();
      $w.css({
        left: Math.max(0, Math.min(rect.width - $w.outerWidth(), $w.position().left)),
        top: Math.max(0, Math.min(rect.height - $w.outerHeight(), $w.position().top)),
      });
    };

    $w.setMenuBar = (menuBar) => {
        $w.find(".menus").remove();
        if (menuBar) {
            $w.$titlebar.after(menuBar.element);
            menuBar.setKeyboardScope?.($w[0]);
        }
    };

    $w.setDimensions = (dims) => {
        if (dims.outerWidth) $w.outerWidth(dims.outerWidth);
        if (dims.outerHeight) $w.outerHeight(dims.outerHeight);
        if (dims.innerWidth) {
            const frameWidth = $w.outerWidth() - $w.$content.outerWidth();
            $w.outerWidth(dims.innerWidth + frameWidth);
        }
        if (dims.innerHeight) {
            const frameHeight = $w.outerHeight() - $w.$content.outerHeight();
            const $menu_bar = $w.find(".menus");
            let menuHeight = 0;
            if ($menu_bar.length) menuHeight = $menu_bar.outerHeight();
            $w.outerHeight(dims.innerHeight + frameHeight + menuHeight);
        }
    };

    $w.setMinimizeTarget = (el) => {
        $w._minimizeTarget = el;
    };

    $w.addChildWindow = ($child) => {
        this.child_$windows.push($child);
    };

    $w.animateTitlebar = (from, to, callback = () => {}) => {
        this.animating_titlebar = true;
        const $eye_leader = $w.$titlebar.clone(true);
        $eye_leader.find("button").remove();
        $eye_leader.appendTo("body").css({
            transition: "all 200ms linear",
            position: "fixed",
            zIndex: 10000000,
            pointerEvents: "none",
            left: from.left, top: from.top, width: from.width, height: from.height
        });
        setTimeout(() => {
            $eye_leader.css({ left: to.left, top: to.top, width: to.width, height: to.height });
        }, 5);

        const done = () => {
            $eye_leader.remove();
            this.animating_titlebar = false;
            callback();
            this.when_done_animating_titlebar.shift()?.();
        };
        $eye_leader.on("transitionend", done);
        setTimeout(done, 250);
    };

    $w.minimize = () => {
        if (!options.minimizable) return;
        if (this.animating_titlebar) {
            this.when_done_animating_titlebar.push(() => $w.minimize());
            return;
        }

        const target = $w._minimizeTarget || document.querySelector(`.taskbar-button[for="${this.id}"]`);

        if (target) {
            window.playSound?.("Minimize");
            const before_rect = $w.$titlebar[0].getBoundingClientRect();
            const after_rect = target.getBoundingClientRect();
            $w.trigger("minimize");
            $w.animateTitlebar(before_rect, after_rect, () => {
                $w.hide();
                $w.blur();
            });
            kernel.use('events').emit('window:minimize', { id: this.id, win: $w });
        } else {
            // Minimize without taskbar (to desktop bottom)
            this._minimizeWithoutTaskbar();
        }
    };

    $w.unminimize = () => {
        if (this.animating_titlebar) {
            this.when_done_animating_titlebar.push(() => $w.unminimize());
            return;
        }
        if ($w.hasClass("minimized-without-taskbar")) {
            this._minimizeWithoutTaskbar(); // Toggle
            return;
        }

        $w.show();
        const target = $w._minimizeTarget || document.querySelector(`.taskbar-button[for="${this.id}"]`);
        if (target) {
            window.playSound?.("RestoreUp");
            const before_rect = target.getBoundingClientRect();
            const after_rect = $w.$titlebar[0].getBoundingClientRect();
            $w.hide();
            $w.animateTitlebar(before_rect, after_rect, () => {
                $w.show();
                $w.focus();
            });
        } else {
            $w.focus();
        }
        $w.trigger("restore");
        kernel.use('events').emit('window:restore', { id: this.id, win: $w });
    };

    $w.restore = () => {
        if ($w.is(":hidden") || $w.hasClass("minimized-without-taskbar")) $w.unminimize();
        else if ($w.hasClass("maximized")) $w.maximize();
    };

    $w.maximize = () => {
        if (!options.maximizable || !options.resizable) return;
        if (this.animating_titlebar) {
            this.when_done_animating_titlebar.push(() => $w.maximize());
            return;
        }

        const before_rect = $w.$titlebar[0].getBoundingClientRect();
        const desktop = document.getElementById("desktop-area") || document.getElementById("screen");
        const desktopRect = desktop.getBoundingClientRect();

        if ($w.hasClass("maximized")) {
            window.playSound?.("RestoreDown");
            $w.removeClass("maximized");
            $w.css(this._beforeMaximize || {});
            const after_rect = $w.$titlebar[0].getBoundingClientRect();
            $w.addClass("maximized"); // restore for animation
            $w.animateTitlebar(before_rect, after_rect, () => {
                $w.removeClass("maximized");
                $w.css(this._beforeMaximize || {});
                $w.$maximize.removeClass("window-action-restore").addClass("window-action-maximize");
            });
        } else {
            window.playSound?.("Maximize");
            this._beforeMaximize = {
                position: $w.css("position"),
                width: $w.css("width"),
                height: $w.css("height"),
                top: $w.css("top"),
                left: $w.css("left")
            };
            const after_rect = { left: 0, top: 0, width: desktopRect.width, height: $w.$titlebar.outerHeight() };
            $w.animateTitlebar(before_rect, after_rect, () => {
                $w.addClass("maximized");
                $w.css({ position: "absolute", top: 0, left: 0, width: desktopRect.width, height: desktopRect.height });
                $w.$maximize.removeClass("window-action-maximize").addClass("window-action-restore");
            });
        }
        $w.trigger("maximize");
    };

    $w.toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            $w[0].requestFullscreen?.().catch(console.error);
        } else {
            document.exitFullscreen?.().catch(console.error);
        }
    };

    // UI Click handlers
    $w.$minimize?.on("click", (e) => { e.stopPropagation(); $w.minimize(); });
    $w.$maximize?.on("click", (e) => { e.stopPropagation(); $w.maximize(); });
    $w.$x?.on("click", (e) => { e.stopPropagation(); $w.close(); });
    $w.$title_area.on("dblclick", () => $w.maximize());
  }

  _minimizeWithoutTaskbar() {
      const $w = this.$window;
      if ($w.hasClass("minimized-without-taskbar")) {
          window.playSound?.("RestoreUp");
          OSWindow.minimize_slots[this._minimize_slot_index] = null;
          $w.removeClass("minimized-without-taskbar");
          $w.css(this._beforeMinimizeNoTaskbar || {});
          $w.$minimize.removeClass("window-action-restore").addClass("window-action-minimize");
          $w.focus();
      } else {
          window.playSound?.("Minimize");
          this._beforeMinimizeNoTaskbar = {
              position: $w.css("position"),
              left: $w.css("left"),
              top: $w.css("top"),
              width: $w.css("width"),
              height: $w.css("height")
          };
          let slot = 0;
          while (OSWindow.minimize_slots[slot]) slot++;
          this._minimize_slot_index = slot;
          OSWindow.minimize_slots[slot] = $w;

          const titleHeight = $w.$titlebar.outerHeight();
          $w.addClass("minimized-without-taskbar");
          $w.css({
              position: "fixed",
              top: `calc(100% - ${titleHeight + 5}px)`,
              left: slot * 160 + 10,
              width: 150,
              height: titleHeight
          });
          $w.$minimize.removeClass("window-action-minimize").addClass("window-action-restore");
          $w.blur();
      }
  }

  _setInitialDimensions() {
      const $w = this.$window;
      const options = this.options;
      if (options.width || options.outerWidth) $w.outerWidth(options.outerWidth || options.width);
      if (options.height || options.outerHeight) $w.outerHeight(options.outerHeight || options.height);
  }

  _setupFocusTracking() {
    const $w = this.$window;
    if (this.options.modal) return;

    const updateHandler = (e) => {
        const newly_focused = e.type === "focusout" || e.type === "blur" ? e.relatedTarget : e.target;
        if (newly_focused && $w[0].contains(newly_focused)) {
            this.last_focus_by_container.set($w[0], newly_focused);
            this._showAsFocused();
        } else if (e.type === "focusin" && !newly_focused) {
            // iframe focus
            if (document.activeElement?.tagName === "IFRAME" && $w[0].contains(document.activeElement)) {
                 this._showAsFocused();
            }
        }
    };

    window.addEventListener("focusin", updateHandler);
    window.addEventListener("focusout", updateHandler);

    $w.on("pointerdown mousedown", (e) => {
        if (e.target.tagName === "SELECT") return;
        $w.bringToFront();
        requestAnimationFrame(() => {
            if (document.activeElement?.closest(".menus, .menu-popup")) return;
            this._refocus();
        });
    });
  }

  _showAsFocused() {
    if (this.$window.hasClass("focused")) return;
    $(".window").removeClass("focused");
    this.$window.addClass("focused");
    this.$window.triggerHandler("focus");
  }

  _stopShowingAsFocused() {
      this.$window.removeClass("focused");
      this.$window.triggerHandler("blur");
  }

  _refocus() {
    const $w = this.$window;
    const lastFocus = this.last_focus_by_container?.get($w[0]);
    if (lastFocus && $w[0].contains(lastFocus)) {
        lastFocus.focus({ preventScroll: true });
    } else {
        const $tabstops = this._findTabstops($w.$content[0]);
        if ($tabstops.length) $tabstops[0].focus({ preventScroll: true });
        else $w.$content.focus();
    }
  }

  _findTabstops(container) {
    return $(container).find("input:enabled, textarea:enabled, select:enabled, button:enabled, a[href], [tabIndex='0'], iframe, [contenteditable]:not([contenteditable='false'])").filter(":visible");
  }

  _setupKeyboardHandling() {
    const $w = this.$window;
    $w.on("keydown", (e) => {
        if (e.isDefaultPrevented()) return;
        if (e.ctrlKey || e.altKey || e.metaKey) return;

        switch (e.keyCode) {
            case 9: // Tab
                this._handleTabNavigation(e);
                break;
            case 27: // Escape
                $w.close();
                break;
            case 13: // Enter
                if (e.altKey && this.options.allowFullscreen) {
                    $w.toggleFullscreen();
                    e.preventDefault();
                }
                break;
        }
    });
  }

  _handleTabNavigation(e) {
      const $w = this.$window;
      const $controls = this._findTabstops($w.$content[0]);
      if ($controls.length > 0) {
          const $focused = $(document.activeElement);
          const index = $controls.index($focused);
          if (e.shiftKey) {
              if (index === 0) {
                  e.preventDefault();
                  $controls[$controls.length - 1].focus();
              }
          } else {
              if (index === $controls.length - 1) {
                  e.preventDefault();
                  $controls[0].focus();
              }
          }
      }
  }

  _setupDragging() {
    const $w = this.$window;
    $w.$titlebar.on("mousedown", (e) => {
        if ($(e.target).closest("button").length) return;
        $w.focus();
        if ($w.hasClass("maximized")) return;

        const screenRect = document.getElementById("screen").getBoundingClientRect();
        const startX = e.pageX - $w.offset().left;
        const startY = e.pageY - $w.offset().top;

        const onMouseMove = (e) => {
            $w.css({
                left: e.pageX - startX - screenRect.left,
                top: e.pageY - startY - screenRect.top,
            });
        };

        $(window).on("mousemove", onMouseMove);
        $(window).one("mouseup", () => {
            $(window).off("mousemove", onMouseMove);
            $w.bringTitleBarInBounds();
        });
    });
  }

  _setupResizing() {
      const $w = this.$window;
      const handles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
      handles.forEach(dir => {
          const $handle = $("<div>").addClass(`handle handle-${dir}`).appendTo($w);
          $handle.css({ position: "absolute", zIndex: 100 });

          $handle.on("mousedown", (e) => {
              e.preventDefault();
              $w.focus();
              const startX = e.pageX;
              const startY = e.pageY;
              const startWidth = $w.outerWidth();
              const startHeight = $w.outerHeight();
              const startLeft = $w.position().left;
              const startTop = $w.position().top;

              const pointerId = e.pointerId || 0;
              try { $handle[0].setPointerCapture(pointerId); } catch(e) {}

              const onMouseMove = (e) => {
                  let newWidth = startWidth, newHeight = startHeight, newLeft = startLeft, newTop = startTop;

                  if (dir.includes("e")) newWidth = startWidth + (e.pageX - startX);
                  if (dir.includes("w")) { newWidth = startWidth - (e.pageX - startX); newLeft = startLeft + (e.pageX - startX); }
                  if (dir.includes("s")) newHeight = startHeight + (e.pageY - startY);
                  if (dir.includes("n")) { newHeight = startHeight - (e.pageY - startY); newTop = startTop + (e.pageY - startY); }

                  if (this.options.constrainRect) {
                      const constrained = this.options.constrainRect({ x: newLeft, y: newTop, width: newWidth, height: newHeight }, dir.includes("w") ? -1 : dir.includes("e") ? 1 : 0, dir.includes("n") ? -1 : dir.includes("s") ? 1 : 0);
                      newLeft = constrained.x; newTop = constrained.y; newWidth = constrained.width; newHeight = constrained.height;
                  }

                  newWidth = Math.max(newWidth, this.options.minOuterWidth || 100);
                  newHeight = Math.max(newHeight, this.options.minOuterHeight || 50);

                  $w.css({ left: newLeft, top: newTop });
                  $w.outerWidth(newWidth);
                  $w.outerHeight(newHeight);
              };

              $(window).on("mousemove", onMouseMove);
              $(window).one("mouseup", () => {
                  $(window).off("mousemove", onMouseMove);
                  $w.bringTitleBarInBounds();
              });
          });
      });
  }

  _setupResizeObserver() {
      const desktopArea = document.getElementById("desktop-area");
      if (desktopArea) {
          this.desktopResizeObserver = new ResizeObserver(() => {
              if (this.$window.hasClass("maximized")) {
                  this.$window.css({ width: desktopArea.clientWidth, height: desktopArea.clientHeight });
              }
          });
          this.desktopResizeObserver.observe(desktopArea);
      }
  }

  _observeIframes(container) {
      const observer = new MutationObserver((mutations) => {
          mutations.forEach(m => m.addedNodes.forEach(node => {
              if (node.tagName === "IFRAME") this._setupIframe(node);
          }));
      });
      observer.observe(container, { childList: true, subtree: true });
      container.querySelectorAll("iframe").forEach(iframe => this._setupIframe(iframe));
  }

  _setupIframe(iframe) {
      try {
          iframe.addEventListener("load", () => {
              try {
                  iframe.contentWindow.addEventListener("focus", () => this.$window.focus());
                  iframe.contentWindow.addEventListener("pointerdown", () => this.$window.focus());
              } catch (e) {}
          });
      } catch (e) {}
  }

  _setupFullscreenListener() {
      this._handleFullscreenChange = () => {
          const isFullscreen = document.fullscreenElement === this.element;
          if (isFullscreen) this.$window.addClass("is-fullscreen");
          else this.$window.removeClass("is-fullscreen");
          this.$window.trigger("fullscreenchange", { isFullscreen });
      };
      document.addEventListener("fullscreenchange", this._handleFullscreenChange);
  }
}

export function $Window(options) {
  return new OSWindow(options);
}
