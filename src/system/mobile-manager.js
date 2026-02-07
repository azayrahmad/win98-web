/**
 * MobileManager - Handles detection and state for mobile/touch devices
 */
export class MobileManager {
  static isMobile() {
    return (
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      (navigator.maxTouchPoints > 0) ||
      (window.innerWidth <= 800 && window.innerHeight <= 600)
    );
  }

  static init() {
    if (this.isMobile()) {
      document.body.classList.add("is-mobile");
      console.log("Mobile device detected, applying mobile optimizations.");

      // Prevent zooming on double-tap for touch devices if we want to handle double-clicks ourselves
      document.addEventListener('touchstart', (e) => {
        if (e.touches.length > 1) {
           // allow multi-touch zoom if they really want to?
           // but maybe we want to disable it to feel more like an OS
        }
      }, { passive: true });
    }
  }
}

export default MobileManager;
