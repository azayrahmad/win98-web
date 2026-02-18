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
     * @param {MouseEvent | Touch | PointerEvent | {clientX?: number, clientY?: number, pageX?: number, pageY?: number}} e
     * @returns {{x: number, y: number}}
     */
    function get_mouse_pos(e) {
        const clientX = e.clientX ?? e.pageX ?? 0;
        const clientY = e.clientY ?? e.pageY ?? 0;
        const scale = get_os_scale();
        const screen_el = document.getElementById("screen") || document.body;
        const screen_rect = screen_el.getBoundingClientRect();
        return {
            x: (clientX - screen_rect.left) / scale,
            y: (clientY - screen_rect.top) / scale,
        };
    }

    /**
     * @param {Element} el
     * @returns {{left: number, top: number, right: number, bottom: number, width: number, height: number}}
     */
    function get_rect(el) {
        const rect = el.getBoundingClientRect();
        const scale = get_os_scale();
        const screen_el = document.getElementById("screen") || document.body;
        const screen_rect = screen_el.getBoundingClientRect();
        return {
            left: (rect.left - screen_rect.left) / scale,
            top: (rect.top - screen_rect.top) / scale,
            right: (rect.right - screen_rect.left) / scale,
            bottom: (rect.bottom - screen_rect.top) / scale,
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
