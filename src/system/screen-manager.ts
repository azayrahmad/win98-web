import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';

interface Resolution {
  width: number | string;
  height: number | string;
}

const RESOLUTIONS: Record<string, Resolution> = {
  "640 by 480": { width: 640, height: 480 },
  "800 by 600": { width: 800, height: 600 },
  "1024 by 768": { width: 1024, height: 768 },
  fit: { width: "100vw", height: "100vh" },
};

const DEFAULT_RESOLUTION = "fit";

let currentResolutionId = DEFAULT_RESOLUTION;

function getScreenElement(): HTMLElement | null {
  return document.getElementById("screen");
}

function getAvailableResolutions(): string[] {
  return Object.keys(RESOLUTIONS);
}

function getCurrentResolutionId(): string {
  return currentResolutionId;
}

function setResolution(resolutionId: string): void {
  if (!RESOLUTIONS[resolutionId]) {
    console.error(`Invalid resolution: ${resolutionId}`);
    return;
  }

  const screen = getScreenElement();
  if (!screen) {
    console.error("#screen element not found.");
    return;
  }

  if (resolutionId === "fit") {
    // document.body.classList.add("fit-mode");
    document.body.style.height = `${window.innerHeight}px`;
    document.body.style.minHeight = "0";
    screen.style.width = "100%";
    screen.style.height = "100%";
  } else {
    // document.body.classList.remove("fit-mode");
    document.body.style.height = ""; // Revert to CSS default
    document.body.style.minHeight = ""; // Revert to CSS default
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
}

function saveResolution(resolutionId: string): void {
  setItem(LOCAL_STORAGE_KEYS.SCREEN_RESOLUTION, resolutionId);
}

function loadResolution(): string {
  return (getItem(LOCAL_STORAGE_KEYS.SCREEN_RESOLUTION) as string) || DEFAULT_RESOLUTION;
}

function initScreenManager(): void {
  const savedResolution = loadResolution();
  setResolution(savedResolution);

  window.addEventListener("resize", () => {
    if (currentResolutionId === "fit") {
      document.body.style.height = `${window.innerHeight}px`;
      document.body.style.minHeight = "0";
    }
  });
}

export {
  initScreenManager,
  getAvailableResolutions,
  setResolution,
  getCurrentResolutionId,
};
