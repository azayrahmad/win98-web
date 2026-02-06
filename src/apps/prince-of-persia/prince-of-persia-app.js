import { Application } from '../../system/application.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import { ICONS } from '../../config/icons.js';

// The $Window and MenuBar classes are loaded globally via <script> tags in index.html,
// so they are available here without explicit imports.

export class PrinceOfPersiaApp extends Application {
  static config = {
    id: "prince-of-persia",
    title: "Prince of Persia",
    icon: ICONS.princeofpersia,
    width: 640,
    height: 420,
    resizable: true,
  };

  _createWindow() {
    const win = new $Window({
      title: this.title,
      innerWidth: this.width,
      innerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
    });
    this.win = win;

    this.gameState = {
      level: 1,
      health: 3,
      time: 60,
      strength: 100, // Normal difficulty
    };

    this.iframe = document.createElement("iframe");
    this.iframe.style.width = "100%";
    this.iframe.style.height = "100%";
    this.iframe.style.border = "none";
    this.updateGameUrl();
    win.$content.append(this.iframe);

    const menuItems = this.createMenuBar();
    this.menuBar = new MenuBar(menuItems);
    win.setMenuBar(this.menuBar);

    return win;
  }

  async _onLaunch(data) {
    // No specific launch data handling needed for this app
  }

  updateGameUrl() {
    const params = new URLSearchParams({
      l: this.gameState.level,
      h: this.gameState.health,
      t: this.gameState.time,
      s: this.gameState.strength,
      _: true,
    });
    this.iframe.src = `https://princejs.com/?${params.toString()}`;
  }

  createMenuBar() {
    return {
      "&Game": [
        {
          label: "&New Game",
          action: () => {
            this.gameState = {
              level: 1,
              health: 3,
              time: 60,
              strength: 100, // Reset to normal
            };
            this.updateGameUrl();
            this.menuBar.element.dispatchEvent(new CustomEvent("update"));
          },
        },
        {
          label: "&Restart Level",
          action: () => {
            this.updateGameUrl();
          },
        },
      ],
      "&Difficulty": [
        {
          radioItems: [
            { label: "Easy", value: 50 },
            { label: "Normal", value: 100 },
            { label: "Hard", value: 150 },
          ],
          getValue: () => this.gameState.strength,
          setValue: (value) => {
            this.gameState.strength = value;
            this.updateGameUrl();
            this.menuBar.element.dispatchEvent(new CustomEvent("update"));
          },
        },
      ],
      "&Cheats": [
        {
          label: "Level",
          submenu: [
            {
              radioItems: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(
                (level) => ({
                  label: `Level ${level}`,
                  value: level,
                }),
              ),
              getValue: () => this.gameState.level,
              setValue: (value) => {
                this.gameState.level = value;
                this.updateGameUrl();
                this.menuBar.element.dispatchEvent(new CustomEvent("update"));
              },
            },
          ],
        },
        {
          label: "Max &Health",
          submenu: [
            {
              radioItems: [3, 4, 5, 6, 7, 8, 9, 10].map((hp) => ({
                label: `${hp} Health`,
                value: hp,
              })),
              getValue: () => this.gameState.health,
              setValue: (value) => {
                this.gameState.health = value;
                this.updateGameUrl();
                this.menuBar.element.dispatchEvent(new CustomEvent("update"));
              },
            },
          ],
        },
        {
          label: "&Time",
          submenu: [
            {
              radioItems: [15, 30, 60, 90, 120].map((time) => ({
                label: `${time} Minutes`,
                value: time,
              })),
              getValue: () => this.gameState.time,
              setValue: (value) => {
                this.gameState.time = value;
                this.updateGameUrl();
                this.menuBar.element.dispatchEvent(new CustomEvent("update"));
              },
            },
          ],
        },
      ],
      "&Help": [
        {
          label: "&Controls",
          action: () => {
            this.showControls();
          },
        },
      ],
    };
  }

  showControls() {
    const controlsText = `
      <b>Keyboard:</b><br>
      - <b>Cursor keys:</b> Movement<br>
      - <b>SHIFT:</b> Action (Drink Potion, Grab Edge, Strike)<br>
      - <b>SPACE:</b> Show Remaining Time<br>
      - <b>ENTER:</b> Continue<br>
      <br>
      <b>Gamepad:</b><br>
      - <b>DPad/Stick:</b> Movement<br>
      - <b>A / R / ZR:</b> Jump/Block<br>
      - <b>B / Y / L / ZL:</b> Action<br>
      - <b>X:</b> Show Time / Restart Level (2x)<br>
    `;
    ShowDialogWindow({
      title: "Prince of Persia Controls",
      text: controlsText,
      buttons: [{ label: "OK", isDefault: true }],
    });
  }
}
