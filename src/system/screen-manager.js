import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';

const RESOLUTIONS = {
  "640 by 480": { width: 640, height: 480 },
  "800 by 600": { width: 800, height: 600 },
  "1024 by 768": { width: 1024, height: 768 },
  fit: { width: "100vw", height: "100vh" },
};

const DEFAULT_RESOLUTION = "fit";
const DEFAULT_SCALE = 2;

let currentResolutionId = DEFAULT_RESOLUTION;
let currentScale = DEFAULT_SCALE;

function getScreenElement() {
  return document.getElementById("screen");
}

function getScaleWrapper() {
  return document.getElementById("os-scale-wrapper");
}

function getAvailableResolutions() {
  return Object.keys(RESOLUTIONS);
}

function getCurrentResolutionId() {
  return currentResolutionId;
}

function getScale() {
  return currentScale;
}

function setScale(scale) {
  currentScale = scale;
  setItem(LOCAL_STORAGE_KEYS.SCREEN_SCALE, scale);
  applyScale();
  // Trigger resize because scaling changes the available area
  window.dispatchEvent(new Event("resize"));
}

function loadScale() {
  const saved = getItem(LOCAL_STORAGE_KEYS.SCREEN_SCALE);
  return saved !== null && saved !== undefined ? parseFloat(saved) : DEFAULT_SCALE;
}

function applyScale() {
  const scale = currentScale;
  const screen = getScreenElement();
  const scaleWrapper = getScaleWrapper();
  if (!screen || !scaleWrapper) return;

  const isZoomSupported = 'zoom' in document.body.style;

  // Set CSS variables for coordinate adjustment
  document.documentElement.style.setProperty('--os-scale', scale);
  document.documentElement.style.setProperty('--os-is-zoom', isZoomSupported ? '1' : '0');

  if (isZoomSupported) {
    document.body.style.zoom = scale;
    scaleWrapper.style.transform = '';
    scaleWrapper.style.transformOrigin = '';
  } else {
    document.body.style.zoom = '';
    scaleWrapper.style.transform = `scale(${scale})`;
    scaleWrapper.style.transformOrigin = 'top left';
  }

  setResolution(currentResolutionId);
}

function setResolution(resolutionId) {
  if (!RESOLUTIONS[resolutionId]) {
    console.error(`Invalid resolution: ${resolutionId}`);
    return;
  }

  const screen = getScreenElement();
  if (!screen) {
    console.error("#screen element not found.");
    return;
  }

  const scale = currentScale;
  const isZoomSupported = 'zoom' in document.body.style;

  if (resolutionId === "fit") {
    // document.body.classList.add("fit-mode");
    if (isZoomSupported) {
      document.body.style.width = `${100 / scale}vw`;
      document.body.style.height = `${100 / scale}vh`;
      screen.style.width = "100%";
      screen.style.height = "100%";
    } else {
      document.body.style.width = "100vw";
      document.body.style.height = "100vh";
      screen.style.width = `${100 / scale}vw`;
      screen.style.height = `${100 / scale}vh`;
    }
    document.body.style.minHeight = "0";
  } else {
    // document.body.classList.remove("fit-mode");
    document.body.style.width = "";
    document.body.style.height = "";
    document.body.style.minHeight = "";
    const newResolution = RESOLUTIONS[resolutionId];
    screen.style.width =
      typeof newResolution.width === "number"
        ? `${newResolution.width}px`
        : newResolution.width;
    screen.style.height =
      typeof newResolution.height === "number"
        ? `${newResolution.height}px`
        : newResolution.height;
  }

  currentResolutionId = resolutionId;
  saveResolution(resolutionId);
  window.dispatchEvent(new Event("resize"));
}

function saveResolution(resolutionId) {
  setItem(LOCAL_STORAGE_KEYS.SCREEN_RESOLUTION, resolutionId);
}

function loadResolution() {
  return getItem(LOCAL_STORAGE_KEYS.SCREEN_RESOLUTION) || DEFAULT_RESOLUTION;
}

function initScreenManager() {
  currentScale = loadScale();
  const savedResolution = loadResolution();

  applyScale();
  setResolution(savedResolution);

  window.addEventListener("resize", () => {
    if (currentResolutionId === "fit") {
      const scale = currentScale;
      const isZoomSupported = 'zoom' in document.body.style;
      const screen = getScreenElement();
      if (isZoomSupported) {
        document.body.style.width = `${100 / scale}vw`;
        document.body.style.height = `${100 / scale}vh`;
        if (screen) {
          screen.style.width = "100%";
          screen.style.height = "100%";
        }
      } else {
        if (screen) {
          screen.style.width = `${100 / scale}vw`;
          screen.style.height = `${100 / scale}vh`;
        }
      }
      document.body.style.minHeight = "0";
    }
  });
}

export {
  initScreenManager,
  getAvailableResolutions,
  setResolution,
  getCurrentResolutionId,
  getScale,
  setScale,
};
