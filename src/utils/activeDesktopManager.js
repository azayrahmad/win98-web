import { fs } from "@zenfs/core";
import { existsAsync } from "./zenfs-utils.js";
import { DeskMover } from "../components/DeskMover.js";
import { getWebUrl } from "./urlUtils.js";

const SETTINGS_PATH = "/C:/WINDOWS/activedesktop.json";

const DEFAULT_SETTINGS = {
  enabled: false,
  wallpaper: "",
  items: [
    {
      id: "channel-bar",
      url: "activedesktop/ChannelBar.html",
      x: "calc(100% - 90px)",
      y: "50px",
      width: "84px",
      height: "471px",
      visible: true,
      style: "ad"
    }
  ]
};

class ActiveDesktopManager {
  constructor() {
    this.settings = { ...DEFAULT_SETTINGS };
    this.layer = null;
    this.initialized = false;
  }

  async loadSettings() {
    if (await existsAsync(SETTINGS_PATH)) {
      try {
        const content = await fs.promises.readFile(SETTINGS_PATH, "utf8");
        this.settings = JSON.parse(content);
      } catch (e) {
        console.error("Failed to load Active Desktop settings:", e);
        this.settings = { ...DEFAULT_SETTINGS };
      }
    } else {
      this.settings = { ...DEFAULT_SETTINGS };
      await this.saveSettings();
    }
    return this.settings;
  }

  async saveSettings() {
    try {
      await fs.promises.writeFile(SETTINGS_PATH, JSON.stringify(this.settings, null, 2));
      document.dispatchEvent(new CustomEvent("active-desktop-changed"));
    } catch (e) {
      console.error("Failed to save Active Desktop settings:", e);
    }
  }

  async init() {
    if (this.initialized) return;
    await this.loadSettings();
    this.createLayer();
    this.render();
    this.initialized = true;

    document.addEventListener("active-desktop-refresh", () => this.render());
  }

  createLayer() {
    const desktop = document.querySelector(".desktop");
    if (!desktop) return;

    if (!document.getElementById("active-desktop-layer")) {
      this.layer = document.createElement("div");
      this.layer.id = "active-desktop-layer";
      this.layer.className = "active-desktop-layer";

      // Inject as first child of .desktop
      desktop.insertBefore(this.layer, desktop.firstChild);
    } else {
      this.layer = document.getElementById("active-desktop-layer");
    }
  }

  async render() {
    if (!this.layer) this.createLayer();
    if (!this.layer) return;

    const { enabled, wallpaper, items } = this.settings;

    if (!enabled) {
      this.layer.style.display = "none";
      this.layer.innerHTML = "";
      document.body.classList.remove("active-desktop-enabled");
      return;
    }

    this.layer.style.display = "block";
    document.body.classList.add("active-desktop-enabled");

    let wallpaperHtml = "";
    if (wallpaper && (wallpaper.endsWith(".html") || wallpaper.endsWith(".htm") || wallpaper.startsWith("http"))) {
        wallpaperHtml = `<iframe src="${wallpaper}" class="active-desktop-wallpaper-iframe"></iframe>`;
    }

    this.layer.innerHTML = `
      <div class="active-desktop-wallpaper">${wallpaperHtml}</div>
      <div id="active-desktop-items"></div>
    `;

    const itemsContainer = this.layer.querySelector("#active-desktop-items");
    for (const item of items) {
      if (item.visible) {
        this.renderItem(item, itemsContainer);
      }
    }
  }

  async renderItem(item, container) {
    new DeskMover(item, container, {
        onUpdate: (id, changes) => this.updateItem(id, changes),
        onClose: (id) => this.removeItem(id)
    });
  }

  async setEnabled(enabled) {
    this.settings.enabled = enabled;
    await this.saveSettings();
    this.render();
  }

  async setWallpaper(url) {
    this.settings.wallpaper = url;
    await this.saveSettings();
    this.render();
  }

  async addItem(item) {
    if (item.url) {
        item.url = getWebUrl(item.url);
    }
    this.settings.items.push(item);
    await this.saveSettings();
    this.render();
  }

  async removeItem(id) {
    this.settings.items = this.settings.items.filter(i => i.id !== id);
    await this.saveSettings();
    this.render();
  }

  async updateItem(id, changes, skipRender = false) {
    const item = this.settings.items.find(i => i.id === id);
    if (item) {
      Object.assign(item, changes);
      await this.saveSettings();
      if (!skipRender) {
        this.render();
      }
    }
  }
}

export const activeDesktopManager = new ActiveDesktopManager();
