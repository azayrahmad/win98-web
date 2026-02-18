((exports) => {
    /**
     * @template {keyof HTMLElementTagNameMap} K
     * @param {K} tagName
     * @param {Record<string, string>} [attrs]
     * @returns {HTMLElementTagNameMap[K]}
     */
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

    let uid_counter = 0;
    function uid() {
        return (uid_counter++).toString(36) + Math.random().toString(36).slice(2);
    }

    let internal_z_counter = 1;
    const MAX_MENU_NESTING = 1000;
    function get_new_menu_z_index() {
        if (typeof $Window !== "undefined") {
            return ($Window.Z_INDEX++) + MAX_MENU_NESTING;
        }
        return (++internal_z_counter) + MAX_MENU_NESTING;
    }

    function get_direction() {
        return window.get_direction ? window.get_direction() : "ltr";
    }

    /**
     * @param {OSGUIMenuItem} item
     * @returns {boolean}
     */
    function is_disabled(item) {
        if (typeof item.enabled === "function") {
            return !item.enabled();
        } else if (typeof item.enabled === "boolean") {
            return !item.enabled;
        } else {
            return false;
        }
    }

    function get_os_scale() {
        return (
            parseFloat(
                getComputedStyle(document.documentElement).getPropertyValue(
                    "--os-scale",
                ),
            ) || 1
        );
    }

    function is_os_zoom() {
        return (
            getComputedStyle(document.documentElement)
                .getPropertyValue("--os-is-zoom")
                .trim() === "1"
        );
    }

    /**
     * @param {MouseEvent | Touch | PointerEvent} e
     * @returns {{x: number, y: number}}
     */
    function get_mouse_pos(e) {
        if (is_os_zoom()) {
            return { x: e.clientX, y: e.clientY };
        }
        const scale = get_os_scale();
        return { x: e.clientX / scale, y: e.clientY / scale };
    }

    /**
     * @param {Element} el
     * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
     */
    function get_rect(el) {
        const rect = el.getBoundingClientRect();
        if (is_os_zoom()) {
            return rect;
        }
        const scale = get_os_scale();
        return {
            left: rect.left / scale,
            top: rect.top / scale,
            right: rect.right / scale,
            bottom: rect.bottom / scale,
            width: rect.width / scale,
            height: rect.height / scale,
        };
    }

    exports.E = E;
    exports.uid = uid;
    exports.get_new_menu_z_index = get_new_menu_z_index;
    exports.get_direction = get_direction;
    exports.is_disabled = is_disabled;
    exports.get_os_scale = get_os_scale;
    exports.is_os_zoom = is_os_zoom;
    exports.get_mouse_pos = get_mouse_pos;
    exports.get_rect = get_rect;
})(typeof module !== "undefined" ? module.exports : (window.os_gui_utils = {}));
