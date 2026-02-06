import { IFrameApplication } from '../../system/iframe-application.js';
import { ICONS } from '../../config/icons.js';

export class BuyMeACoffeeApp extends IFrameApplication {
  static config = {
    id: "buy-me-a-coffee",
    title: "Buy me a coffee",
    description: "Support the developer.",
    icon: ICONS["buy-me-a-coffee"],
    width: 300,
    height: 650,
    resizable: false,
    maximizable: false,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
  }

  _createWindow(gameConfig) {
    const win = new $Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.maximizable,
      icons: this.icon,
    });

    const iframe = document.createElement("iframe");
    iframe.src = "https://ko-fi.com/azayrahmad/?hidefeed=true&widget=true&embed=true&preview=true";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    // Instead of appending, set the inner HTML to allow $Window.js to observe
    win.$content.html(iframe.outerHTML);

    // Get the actual iframe element that was added to the DOM
    this.iframe = win.$content.find("iframe")[0];
    this._setupIframeForInactivity(this.iframe);

    return win;
  }

  _onLaunch() {
    this.win.focus();
  }
}
