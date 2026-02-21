import { getItem, setItem } from './local-storage.js';

/**
 * SettingsService provides an abstraction over user settings and system configuration.
 * It currently wraps localStorage but can be extended to use ZenFS or remote sync.
 */
export class SettingsService {
  /**
   * Retrieves a setting value.
   * @param {string} key
   * @param {any} defaultValue
   * @returns {any}
   */
  get(key, defaultValue = null) {
    const value = getItem(key);
    return value !== null ? value : defaultValue;
  }

  /**
   * Saves a setting value.
   * @param {string} key
   * @param {any} value
   */
  set(key, value) {
    setItem(key, value);
  }

  /**
   * Removes a setting.
   * @param {string} key
   */
  remove(key) {
    localStorage.removeItem(key);
  }
}
