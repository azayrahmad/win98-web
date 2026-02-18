import { Application } from "../../system/application.js";
import { ICONS } from "../../config/icons.js";

export class TransportTycoonApp extends Application {
  static config = {
    id: "transporttycoon",
    title: "Transport Tycoon Deluxe",
    description: "An open-source simulation game.",
    icon: ICONS.transportTycoon,
    category: "",
    width: 800,
    height: 600,
    resizable: true,
    maximizable: true,
    allowFullscreen: true,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
  }
  _createWindow() {
    const win = new $Window({
      title: this.config.title,
      icons: this.config.icon,
      outerWidth: this.config.width,
      outerHeight: this.config.height,
      id: this.config.id,
      resizable: true,
      maximizable: true,
      minimizable: true,
      allowFullscreen: this.config.allowFullscreen,
      startFullscreen: this.config.startFullscreen,
      closable: true,
    });

    const iframe = document.createElement("iframe");
    iframe.src = "https://atalbayrak.github.io/openttd/";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";

    win.$content.append(iframe);

    return win;
  }
}
