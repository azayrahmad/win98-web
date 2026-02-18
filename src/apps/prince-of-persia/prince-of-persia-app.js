import { Application } from '../../system/application.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import { ICONS } from '../../config/icons.js';

// The $Window and MenuBar classes are loaded globally via <script> tags in index.html,
// so they are available here without explicit imports.

export class PrinceOfPersiaApp extends Application {
  static config = {
    id: "prince-of-persia",
    title: "Prince of Persia",
    icon: ICONS.princeofpersia, category: "",
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

    setTimeout(() => this.showStartDialog(), 0);

    return win;
  }

  async _onLaunch(data) {
    // No specific launch data handling needed for this app
  }

  showStartDialog() {
    const content = document.createElement("div");
    content.className = "pop-start-dialog";

    const createDropdown = (label, options, currentValue, onChange) => {
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "space-between";
      row.style.alignItems = "center";
      row.style.marginBottom = "8px";

      const id = `pop-select-${label.replace(/\s+/g, "-").toLowerCase().replace(":", "")}`;

      const labelEl = document.createElement("label");
      labelEl.textContent = label;
      labelEl.style.marginRight = "10px";
      labelEl.htmlFor = id;

      const select = document.createElement("select");
      select.id = id;
      select.style.width = "120px";
      options.forEach((opt) => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        if (opt.value === currentValue) option.selected = true;
        select.appendChild(option);
      });
      select.onchange = (e) => onChange(e.target.value);

      row.appendChild(labelEl);
      row.appendChild(select);
      content.appendChild(row);
    };

    const levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(
      (l) => ({ label: `Level ${l}`, value: l }),
    );
    const healths = [3, 4, 5, 6, 7, 8, 9, 10].map((h) => ({
      label: `${h} Health`,
      value: h,
    }));
    const times = [15, 30, 60, 90, 120].map((t) => ({
      label: `${t} Minutes`,
      value: t,
    }));
    const difficulties = [
      { label: "Easy", value: 50 },
      { label: "Normal", value: 100 },
      { label: "Hard", value: 150 },
    ];

    const pendingState = { ...this.gameState };

    createDropdown("Level:", levels, pendingState.level, (v) => {
      pendingState.level = parseInt(v);
    });
    createDropdown("Max Health:", healths, pendingState.health, (v) => {
      pendingState.health = parseInt(v);
    });
    createDropdown("Time Limit:", times, pendingState.time, (v) => {
      pendingState.time = parseInt(v);
    });
    createDropdown("Difficulty:", difficulties, pendingState.strength, (v) => {
      pendingState.strength = parseInt(v);
    });

    ShowDialogWindow({
      title: "Prince of Persia - New Game",
      content: content,
      modal: true,
      parentWindow: this.win,
      buttons: [
        {
          label: "Start",
          isDefault: true,
          action: () => {
            this.gameState = pendingState;
            this.updateGameUrl();
          },
        },
        {
          label: "Cancel",
          action: () => {},
        },
      ],
    });
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
            this.showStartDialog();
          },
        },
        {
          label: "&Restart Level",
          action: () => {
            this.updateGameUrl();
          },
        },
        {
          label: "E&xit",
          action: () => {
            this.win.close();
          },
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
