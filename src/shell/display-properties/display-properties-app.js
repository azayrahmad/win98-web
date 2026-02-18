import { Application } from '../../system/application.js';
import { getItem, LOCAL_STORAGE_KEYS } from '../../system/local-storage.js';
import { backgroundTab } from './background/background.js';
import { screensaverTab } from './screensaver/screensaver.js';
import { settingsTab } from './settings/settings.js';
import { appearanceTab } from './appearance/appearance.js';

import "./displayproperties.css";
import "./color-spectrum.css";
import contentHtml from "./displayproperties.html?raw";
import backgroundHtml from "./background/background.html?raw";
import screensaverHtml from "./screensaver/screensaver.html?raw";
import settingsHtml from "./settings/settings.html?raw";
import appearanceHtml from "./appearance/appearance.html?raw";
import energystar from "../../assets/img/EnergyStarDisplay.png";
import { ICONS } from '../../config/icons.js';

class DisplayPropertiesApp extends Application {
  static config = {
    id: "display-properties",
    title: "Display",
    description: "Customize your display settings.",
    icon: ICONS.displayProperties,
    width: 404,
    height: 448,
    resizable: false,
    isSingleton: true,
  };

  constructor(data) {
    super(data);
  }

  _createWindow() {
    return new window.$Window({
      title: "Display Properties",
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
      id: this.id,
    });
  }

  async _onLaunch() {
    const { win } = this;
    win.$content.html(contentHtml);

    // Load tab content
    win.$content.find("#background").html(backgroundHtml);
    win.$content.find("#screensaver").html(screensaverHtml);
    win.$content.find("#settings").html(settingsHtml);
    win.$content.find("#appearance").html(appearanceHtml);

    // Set initial state from localStorage
    this.selectedWallpaper = getItem(LOCAL_STORAGE_KEYS.WALLPAPER);
    this.selectedWallpaperMode =
      getItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE) || "stretch";
    this.selectedScreensaver =
      getItem(LOCAL_STORAGE_KEYS.SCREENSAVER) || "none";
    this.screensaverTimeout =
      getItem(LOCAL_STORAGE_KEYS.SCREENSAVER_TIMEOUT) / 60000 || 1;
    this.selectedColorMode = null;
    this.selectedResolution = null;

    // Set the Energy Star logo src
    win.$content.find(".energy-star-logo").attr("src", energystar);

    this._setupTabs(win);
    this._setupButtons(win);

    // Initialize tabs
    await backgroundTab.init(win, this);
    screensaverTab.init(win, this);
    settingsTab.init(win, this);
    appearanceTab.init(win, this);
  }

  _setupTabs(win) {
    const $tabs = win.$content.find('[role="tab"]');
    $tabs.on("click", (e) => {
      e.preventDefault();
      const $clickedTab = $(e.currentTarget);
      $tabs.attr("aria-selected", "false");
      $clickedTab.attr("aria-selected", "true");

      win.$content.find(".tab-content").hide();
      const activePanelId = $clickedTab.find("a").attr("data-target");
      win.$content.find(activePanelId).show();

      if (activePanelId === "#screensaver") {
        screensaverTab.updatePreview(win, this);
      }
    });
  }

  _setupButtons(win) {
    const $okButton = win.$content.find(".ok-button");
    const $cancelButton = win.$content.find(".cancel-button");
    const $applyButton = win.$content.find(".apply-button");

    $applyButton.prop("disabled", true);

    $okButton.on("click", () => {
      this._applyChanges();
      this.win.close();
    });

    $cancelButton.on("click", () => {
      this.win.close();
    });

    $applyButton.on("click", () => {
      this._applyChanges();
      $applyButton.prop("disabled", true);
    });
  }

  _enableApplyButton(win) {
    win.$content.find(".apply-button").prop("disabled", false);
  }

  _applyChanges() {
    backgroundTab.applyChanges(this);
    screensaverTab.applyChanges(this);
    settingsTab.applyChanges(this);
    appearanceTab.applyChanges(this);
  }
}

export default DisplayPropertiesApp;
