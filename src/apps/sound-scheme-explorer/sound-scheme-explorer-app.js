import { Application } from '../../system/application.js';
import { soundSchemes } from '../../config/sound-schemes.js';
import {
  getSoundSchemeName,
  setSoundScheme,
} from '../../system/theme-manager.js';
import { ICONS } from '../../config/icons.js';

export class SoundSchemeExplorerApp extends Application {
  static config = {
    id: "sound-scheme-explorer",
    title: "Sound Scheme Explorer",
    description: "Explore and listen to sound schemes.",
    icon: ICONS.soundschemeexplorer,
    width: 400,
    height: 300,
    resizable: true,
    isSingleton: true,
  };

  constructor(options) {
    super(options);
    this.initialSchemeName = getSoundSchemeName();
  }

  _createWindow() {
    const win = new $Window({
      title: this.title,
      width: this.width,
      height: this.height,
      resizable: this.resizable,
      id: this.id,
    });

    this._onOpen(win);

    win.on("close", () => {
      setSoundScheme(this.initialSchemeName);
    });

    this.win = win;
    return win;
  }

  _onOpen(win) {
    const content = `
      <div class="sound-scheme-explorer">
        <div class="toolbar">
          <label for="sound-scheme-select">Sound Scheme:</label>
          <select id="sound-scheme-select"></select>
        </div>
        <div class="sound-list" style="flex: 1; overflow-y: auto;"></div>
      </div>
    `;
    win.$content.append(content);
    win.$content.addClass("sound-scheme-explorer-content");
    win.$content.find(".sound-scheme-explorer").css({
      display: "flex",
      flexDirection: "column",
      height: "100%",
    });

    this.select = win.$content.find("#sound-scheme-select")[0];
    this.soundList = win.$content.find(".sound-list")[0];

    this._populateSchemes();
    this.select.value = this.initialSchemeName;
    this._updateSoundList(this.initialSchemeName);

    this.select.addEventListener("change", () => {
      const newScheme = this.select.value;
      setSoundScheme(newScheme);
      this._updateSoundList(newScheme);
    });

    // Add buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "flex-end";
    buttonContainer.style.padding = "10px";
    buttonContainer.style.borderTop = "1px solid var(--border-color)";

    const okButton = document.createElement("button");
    okButton.textContent = "OK";
    okButton.style.marginRight = "5px";
    okButton.addEventListener("click", () => {
      this.initialSchemeName = this.select.value;
      this.win.close();
    });

    const applyButton = document.createElement("button");
    applyButton.textContent = "Apply";
    applyButton.style.marginRight = "5px";
    applyButton.addEventListener("click", () => {
      this.initialSchemeName = this.select.value;
    });

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      this.win.close();
    });

    buttonContainer.appendChild(okButton);
    buttonContainer.appendChild(applyButton);
    buttonContainer.appendChild(cancelButton);
    win.$content.find(".sound-scheme-explorer").append(buttonContainer);
  }

  _populateSchemes() {
    const schemeNames = Object.keys(soundSchemes);
    schemeNames.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      this.select.appendChild(option);
    });
  }

  _updateSoundList(schemeName) {
    this.soundList.innerHTML = "";
    const scheme = soundSchemes[schemeName];
    if (!scheme || !scheme.sounds) return;

    for (const [eventName, soundItem] of Object.entries(scheme.sounds)) {
      const soundElement = document.createElement("div");
      soundElement.className = "sound-item";

      const playButtonHtml = soundItem.path
        ? `<button class="play-btn" data-sound-event="${eventName}">
            <span class="play-icon"></span>
          </button>`
        : `<div class="play-btn-placeholder" style="width: 20px; height: 20px; margin-right: 10px;"></div>`;

      soundElement.innerHTML = `
        ${playButtonHtml}
        <span>${eventName}</span>
      `;
      this.soundList.appendChild(soundElement);
    }

    this.soundList.querySelectorAll(".play-btn").forEach((button) => {
      button.addEventListener("click", () => {
        const eventName = button.dataset.soundEvent;
        const scheme = soundSchemes[this.select.value];
        const soundToPlay = scheme?.getSound(eventName);
        if (soundToPlay) {
          const audio = new Audio(soundToPlay);
          audio.play();
        }
      });
    });
  }
}
