import { IFrameApplication } from '../../system/iframe-application.js';
import { ICONS } from '../../config/icons.js';

export class SimCity2000App extends IFrameApplication {
  static config = {
    id: "sim-city-2000",
    title: "SimCity 2000 Demo",
    description: "Play the SimCity 2000 demo.",
    icon: ICONS.simcity2000,
    gameUrl: "games/dos/simcity2000/index.html",
    width: 640,
    height: 480,
    resizable: true,
    maximizable: true,
  };

  constructor(config) {
    super(config);
  }

  _createWindow() {
    const win = new $Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      maximizable: this.maximizable,
      icons: this.icon,
    });
    const iframe = document.createElement("iframe");
    iframe.src = this.config.gameUrl;
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    win.$content.html(iframe.outerHTML);

    this.iframe = win.$content.find("iframe")[0];
    this._setupIframeForInactivity(this.iframe);

    return win;
  }

  _onLaunch() {
    this.win.focus();
  }
}
