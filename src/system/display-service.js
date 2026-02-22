import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';

const RESOLUTIONS = {
  "640 by 480": { width: 640, height: 480 },
  "800 by 600": { width: 800, height: 600 },
  "1024 by 768": { width: 1024, height: 768 },
  fit: { width: "100vw", height: "100vh" },
};

function generateHighColorFilter() {
  const rLevels = Array.from({ length: 32 }, (_, i) => ((i * 255) / 31 / 255).toFixed(3));
  const gLevels = Array.from({ length: 64 }, (_, i) => ((i * 255) / 63 / 255).toFixed(3));
  return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="high"><feComponentTransfer><feFuncR type="discrete" tableValues="${rLevels.join(" ")}"/><feFuncG type="discrete" tableValues="${gLevels.join(" ")}"/><feFuncB type="discrete" tableValues="${rLevels.join(" ")}"/></feComponentTransfer></filter></svg>#high')`;
}

const COLOR_MODES = {
  true: { name: "True Color (32 bit)", filter: "" },
  high: { name: "High Color (16 bit)", filter: generateHighColorFilter() },
  256: { name: "256 Colors", filter: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="c256"><feComponentTransfer><feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/><feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/><feFuncB type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/></feComponentTransfer></filter></svg>#c256')` },
  16: { name: "16 Colors", filter: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="c16"><feComponentTransfer><feFuncR type="discrete" tableValues="0 0.5 1"/><feFuncG type="discrete" tableValues="0 0.5 1"/><feFuncB type="discrete" tableValues="0 0.5 1"/></feComponentTransfer></filter></svg>#c16')` },
};

/**
 * DisplayService manages screen resolution and color depth.
 */
export class DisplayService {
  constructor() {
    this.currentResolutionId = getItem(LOCAL_STORAGE_KEYS.SCREEN_RESOLUTION) || "fit";
    this.currentColorMode = getItem(LOCAL_STORAGE_KEYS.COLOR_MODE) || "true";
    this.targetElement = null;
  }

  init(targetElement) {
    this.targetElement = targetElement;
    this.setResolution(this.currentResolutionId);
    this.setColorMode(this.currentColorMode);

    window.addEventListener("resize", () => {
      if (this.currentResolutionId === "fit") {
        document.body.style.height = `${window.innerHeight}px`;
        document.body.style.minHeight = "0";
      }
    });
  }

  getAvailableResolutions() {
    return Object.keys(RESOLUTIONS);
  }

  getCurrentResolutionId() {
    return this.currentResolutionId;
  }

  setResolution(resolutionId) {
    if (!RESOLUTIONS[resolutionId]) return;

    const screen = document.getElementById("screen");
    if (!screen) return;

    if (resolutionId === "fit") {
      document.body.style.height = `${window.innerHeight}px`;
      document.body.style.minHeight = "0";
      screen.style.width = "100%";
      screen.style.height = "100%";
    } else {
      document.body.style.height = "";
      document.body.style.minHeight = "";
      const res = RESOLUTIONS[resolutionId];
      screen.style.width = typeof res.width === "number" ? `${res.width}px` : res.width;
      screen.style.height = typeof res.height === "number" ? `${res.height}px` : res.height;
    }

    this.currentResolutionId = resolutionId;
    setItem(LOCAL_STORAGE_KEYS.SCREEN_RESOLUTION, resolutionId);
    window.dispatchEvent(new Event("resize"));
  }

  getColorModes() {
    return COLOR_MODES;
  }

  getCurrentColorMode() {
    return this.currentColorMode;
  }

  setColorMode(mode) {
    if (!COLOR_MODES[mode]) return;

    this.currentColorMode = mode;
    setItem(LOCAL_STORAGE_KEYS.COLOR_MODE, mode);

    if (this.targetElement) {
      this.targetElement.style.filter = COLOR_MODES[mode].filter;
    }

    document.dispatchEvent(new CustomEvent("color-mode-changed", { detail: { mode } }));
  }
}
