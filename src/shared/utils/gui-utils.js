/**
 * Creates a DOM element with the given tag name and attributes.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tagName
 * @param {Record<string, string>} [attrs]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function E(tagName, attrs) {
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
/**
 * Generates a unique ID.
 * @returns {string}
 */
export function uid() {
  return (uid_counter++).toString(36) + Math.random().toString(36).slice(2);
}

let internal_z_counter = 1;
const MAX_MENU_NESTING = 1000;
/**
 * Gets a new z-index for menus.
 * @returns {number}
 */
export function get_new_menu_z_index() {
  // We'll use a better way to track Z_INDEX later, but for now, keep it compatible.
  if (window.$Window && window.$Window.Z_INDEX) {
    return (window.$Window.Z_INDEX++) + MAX_MENU_NESTING;
  }
  return (++internal_z_counter) + MAX_MENU_NESTING;
}

/**
 * Returns the current layout direction.
 * @returns {"ltr" | "rtl"}
 */
export function get_direction() {
  return window.get_direction ? window.get_direction() : "ltr";
}

/**
 * Checks if a menu item is disabled.
 * @param {object} item
 * @returns {boolean}
 */
export function is_disabled(item) {
  if (typeof item.enabled === "function") {
    return !item.enabled();
  } else if (typeof item.enabled === "boolean") {
    return !item.enabled;
  } else {
    return false;
  }
}
