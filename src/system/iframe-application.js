import { Application } from './application.js';

export class IFrameApplication extends Application {
  constructor(config) {
    super(config);
  }

  _setupIframeForInactivity(iframe) {
    if (!iframe) return;

    const resetTimer = () => window.System.resetInactivityTimer();

    const setupListeners = () => {
      try {
        const iframeDoc = iframe.contentWindow.document;
        iframeDoc.addEventListener("mousemove", resetTimer);
        iframeDoc.addEventListener("mousedown", resetTimer);
        iframeDoc.addEventListener("keydown", resetTimer);
      } catch (e) {
        console.warn(
          `Could not add inactivity listeners to iframe for app ${this.id}. This might be due to cross-origin restrictions.`,
          e,
        );
      }
    };

    iframe.addEventListener("load", setupListeners);

    // If the iframe is already loaded, setup listeners immediately
    if (
      iframe.contentWindow &&
      iframe.contentWindow.document.readyState === "complete"
    ) {
      setupListeners();
    }
  }
}
