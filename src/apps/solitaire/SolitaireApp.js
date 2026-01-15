import { Application } from "../Application.js";
import { ICONS } from "../../config/icons.js";
import { MenuBar } from "/public/os-gui/MenuBar.js";

export class SolitaireApp extends Application {
  static config = {
    id: "solitaire",
    title: "Solitaire",
    icon: ICONS.solitaire,
    width: 740,
    height: 700,
    resizable: false,
  };

  async _createWindow() {
    // Create a new window using the $Window component
    const win = new $Window({
      title: this.constructor.config.title,
      innerWidth: this.constructor.config.width,
      innerHeight: this.constructor.config.height,
      resizable: this.constructor.config.resizable,
      icons: this.constructor.config.icon,
    });

    // Create a menu bar
    const menuBar = new MenuBar({
      "Game": [
        {
          label: "New Game",
          action: () => {
            win.gameStart();
          },
        },
      ],
    });
    win.setMenuBar(menuBar);

    // Load CSS
    const cssLink = document.createElement("link");
    cssLink.rel = "stylesheet";
    cssLink.href = "apps/solitaire/solitaire.css";
    win.$content[0].appendChild(cssLink);

    // Load card deck script
    const cardDeckScript = document.createElement("script");
    cardDeckScript.src = "apps/solitaire/carddeck.js";
    win.$content[0].appendChild(cardDeckScript);

    // Load app script and initialize the game
    const appScript = document.createElement("script");
    appScript.src = "apps/solitaire/app.js";
    appScript.onload = () => {
      initSolitaire(win.$content[0]);
      win.gameStart = window.gameStart;
    };
    win.$content[0].appendChild(appScript);

    return win;
  }
}
