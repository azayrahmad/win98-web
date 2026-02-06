import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';
import { SCREENSAVERS } from '../config/screensavers.js';

class Screensaver {
  public element: HTMLIFrameElement | null = null;
  public previewElement: HTMLIFrameElement | null = null;
  public active: boolean = false;
  public currentScreensaver: string;

  constructor() {
    this.currentScreensaver = this.getCurrentScreensaver();
  }

  getCurrentScreensaver(): string {
    return (getItem(LOCAL_STORAGE_KEYS.SCREENSAVER) as string) || "flowerbox";
  }

  setCurrentScreensaver(id: string): void {
    this.currentScreensaver = id;
    setItem(LOCAL_STORAGE_KEYS.SCREENSAVER, id);
  }

  show(): void {
    const screensaver = (SCREENSAVERS as any)[this.currentScreensaver];
    if (!screensaver || !screensaver.path) {
      return;
    }

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
        if (this.element?.contentWindow) {
          const iframeDoc = this.element.contentWindow.document;
          iframeDoc.addEventListener("mousemove", () =>
            window.System.resetInactivityTimer(),
          );
          iframeDoc.addEventListener("mousedown", () =>
            window.System.resetInactivityTimer(),
          );
          iframeDoc.addEventListener("keydown", () =>
            window.System.resetInactivityTimer(),
          );
        }
      };

      document.body.appendChild(this.element);
    }
    this.element.style.display = "block";
    this.active = true;
  }

  hide(): void {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.active = false;
  }

  showPreview(id: string): void {
    this.hidePreview();

    const screensaver = (SCREENSAVERS as any)[id];
    if (!screensaver || !screensaver.path) {
      return;
    }

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
      if (this.previewElement?.contentWindow) {
        const iframeDoc = this.previewElement.contentWindow.document;
        const hidePreviewCallback = () => this.hidePreview();
        iframeDoc.addEventListener("mousemove", hidePreviewCallback);
        iframeDoc.addEventListener("mousedown", hidePreviewCallback);
        iframeDoc.addEventListener("keydown", hidePreviewCallback);
      }
    };

    document.body.appendChild(this.previewElement);
  }

  hidePreview(): void {
    if (this.previewElement) {
      this.previewElement.remove();
      this.previewElement = null;
    }
  }
}

export default new Screensaver();
