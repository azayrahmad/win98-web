/**
 * TouchUtils - Utilities for handling touch interactions
 */
export class TouchUtils {
  /**
   * Adds long-press support to an element
   * @param {HTMLElement} element - The element to attach the listener to
   * @param {Function} callback - The function to call on long-press
   * @param {number} duration - Long-press duration in ms
   */
  static addLongPressListener(element, callback, duration = 500) {
    let timer = null;
    let startX = 0;
    let startY = 0;
    const moveThreshold = 10;

    const start = (e) => {
      // Only handle single touch or left mouse button
      if (e.type === 'mousedown' && e.button !== 0) return;

      const touch = e.touches ? e.touches[0] : e;
      startX = touch.clientX;
      startY = touch.clientY;

      timer = setTimeout(() => {
        callback(e);
        timer = null;
      }, duration);
    };

    const cancel = (e) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const move = (e) => {
      if (timer) {
        const touch = e.touches ? e.touches[0] : e;
        const dist = Math.sqrt(
          Math.pow(touch.clientX - startX, 2) +
          Math.pow(touch.clientY - startY, 2)
        );
        if (dist > moveThreshold) {
          cancel();
        }
      }
    };

    element.addEventListener('touchstart', start, { passive: true });
    element.addEventListener('touchend', cancel);
    element.addEventListener('touchmove', move, { passive: true });
    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', cancel);
    element.addEventListener('mousemove', move);
  }
}
