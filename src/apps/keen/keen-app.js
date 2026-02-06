import { IFrameApplication } from '../../system/iframe-application.js';
import { ICONS } from '../../config/icons.js';

export class KeenApp extends IFrameApplication {
  static config = {
    id: "keen",
    title: "Commander Keen",
    description: "Play the classic game Commander Keen.",
    icon: ICONS.keen,
    width: 640,
    height: 480,
    resizable: false,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
  }

  _createWindow() {
    const win = new $Window({
      title: this.title,
      innerWidth: 672,
      innerHeight: 414,
      resizable: false,
      icons: this.icon,
    });

    const iframe = document.createElement("iframe");
    iframe.src = "games/keen/index.html";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    win.$content.html(iframe.outerHTML);

    this.iframe = win.$content.find("iframe")[0];
    this._setupIframeForInactivity(this.iframe);

    win.on("close", () => {
      if (
        this.iframe &&
        this.iframe.contentWindow &&
        typeof this.iframe.contentWindow.saveKeenProgress === "function"
      ) {
        this.iframe.contentWindow.saveKeenProgress();
      }
    });
    return win;
  }

  _onLaunch() {
    this.win.focus();
  }
}
