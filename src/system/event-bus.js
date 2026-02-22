/**
 * EventBus is a simple pub/sub service for system-wide communication.
 */
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string} eventName
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);

    return () => this.off(eventName, callback);
  }

  /**
   * Subscribe to an event once.
   * @param {string} eventName
   * @param {Function} callback
   */
  once(eventName, callback) {
    const wrapper = (data) => {
      callback(data);
      this.off(eventName, wrapper);
    };
    return this.on(eventName, wrapper);
  }

  /**
   * Unsubscribe from an event.
   * @param {string} eventName
   * @param {Function} callback
   */
  off(eventName, callback) {
    if (!this.listeners.has(eventName)) return;
    const callbacks = this.listeners.get(eventName);
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  /**
   * Emit an event.
   * @param {string} eventName
   * @param {any} data
   */
  emit(eventName, data) {
    if (!this.listeners.has(eventName)) return;
    this.listeners.get(eventName).forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in EventBus listener for "${eventName}":`, error);
      }
    });
  }
}
