import { LOCAL_STORAGE_KEYS } from './local-storage.js';
import { SCREENSAVERS } from '../config/screensavers.js';

/**
 * ScreensaverService manages the OS screensaver lifecycle, including
 * displaying the full screensaver and showing previews.
 */
export class ScreensaverService {
  constructor(kernel) {
    this.kernel = kernel;
    this.element = null;
    this.previewElement = null;
    this.active = false;
  }

  get settings() { return this.kernel.use('settings'); }

  getCurrentScreensaver() {
    return this.settings.get(LOCAL_STORAGE_KEYS.SCREENSAVER, "flowerbox");
  }

  setCurrentScreensaver(id) {
    this.settings.set(LOCAL_STORAGE_KEYS.SCREENSAVER, id);
  }

  show() {
    const currentId = this.getCurrentScreensaver();
    const screensaver = SCREENSAVERS[currentId];
    if (!screensaver || !screensaver.path) return;

    if (!this.element) {
      this.element = document.createElement("iframe");
      this.element.src = `${import.meta.env.BASE_URL}${screensaver.path}`;
      this.element.style.position = "fixed";
      this.element.style.top = "0";
      this.element.style.left = "0";
      this.element.style.width = "100%";
      this.element.style.height = "100%";
      this.element.style.border = "none";
      this.element.style.zIndex = "9999";

      this.element.onload = () => {
        const iframeDoc = this.element.contentWindow.document;
        const resetTimer = () => window.System?.resetInactivityTimer?.();
        iframeDoc.addEventListener("mousemove", resetTimer);
        iframeDoc.addEventListener("mousedown", resetTimer);
        iframeDoc.addEventListener("keydown", resetTimer);
      };

      document.body.appendChild(this.element);
    }
    this.element.style.display = "block";
    this.active = true;
  }

  hide() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.active = false;
  }

  showPreview(id) {
    this.hidePreview();

    const screensaver = SCREENSAVERS[id];
    if (!screensaver || !screensaver.path) return;

    this.previewElement = document.createElement("iframe");
    this.previewElement.src = `${import.meta.env.BASE_URL}${screensaver.path}`;
    this.previewElement.style.position = "fixed";
    this.previewElement.style.top = "0";
    this.previewElement.style.left = "0";
    this.previewElement.style.width = "100%";
    this.previewElement.style.height = "100%";
    this.previewElement.style.border = "none";
    this.previewElement.style.zIndex = "9999";

    this.previewElement.onload = () => {
      const iframeDoc = this.previewElement.contentWindow.document;
      const hidePreviewCallback = () => this.hidePreview();
      iframeDoc.addEventListener("mousemove", hidePreviewCallback);
      iframeDoc.addEventListener("mousedown", hidePreviewCallback);
      iframeDoc.addEventListener("keydown", hidePreviewCallback);
    };

    document.body.appendChild(this.previewElement);
  }

  hidePreview() {
    if (this.previewElement) {
      this.previewElement.remove();
      this.previewElement = null;
    }
  }
}
