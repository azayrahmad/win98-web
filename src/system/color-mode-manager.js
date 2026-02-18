import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';

function generateHighColorFilter() {
  const rLevels = [];
  for (let i = 0; i < 32; i++) {
    rLevels.push(((i * 255) / 31 / 255).toFixed(3));
  }

  const gLevels = [];
  for (let i = 0; i < 64; i++) {
    gLevels.push(((i * 255) / 63 / 255).toFixed(3));
  }

  const bLevels = rLevels;

  return `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="high"><feComponentTransfer><feFuncR type="discrete" tableValues="${rLevels.join(" ")}"/><feFuncG type="discrete" tableValues="${gLevels.join(" ")}"/><feFuncB type="discrete" tableValues="${bLevels.join(" ")}"/></feComponentTransfer></filter></svg>#high')`;
}

const COLOR_MODES = {
  true: {
    name: "True Color (32 bit)",
    filter: "",
  },
  high: {
    name: "High Color (16 bit)",
    filter: generateHighColorFilter(),
  },
  256: {
    name: "256 Colors",
    filter: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="c256"><feComponentTransfer><feFuncR type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/><feFuncG type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/><feFuncB type="discrete" tableValues="0 0.2 0.4 0.6 0.8 1"/></feComponentTransfer></filter></svg>#c256')`,
  },
  16: {
    name: "16 Colors",
    filter: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><filter id="c16"><feComponentTransfer><feFuncR type="discrete" tableValues="0 0.5 1"/><feFuncG type="discrete" tableValues="0 0.5 1"/><feFuncB type="discrete" tableValues="0 0.5 1"/></feComponentTransfer></filter></svg>#c16')`,
  },
};

let targetElement;

function applyColorMode(mode) {
  if (!targetElement || !COLOR_MODES[mode]) return;
  targetElement.style.filter = COLOR_MODES[mode].filter;
}

export function setColorMode(mode) {
  if (COLOR_MODES[mode]) {
    setItem(LOCAL_STORAGE_KEYS.COLOR_MODE, mode);
    applyColorMode(mode);
    document.dispatchEvent(
      new CustomEvent("color-mode-changed", { detail: { mode } }),
    );
  }
}

export function getCurrentColorMode() {
  return getItem(LOCAL_STORAGE_KEYS.COLOR_MODE) || "true";
}

export function getColorModes() {
  return COLOR_MODES;
}

export function initColorModeManager(element) {
  targetElement = element;
  const savedMode = getCurrentColorMode();
  applyColorMode(savedMode);
}
