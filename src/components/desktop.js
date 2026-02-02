import { launchApp } from "../utils/appManager.js";

/**
 * Legacy desktop initialization wrapper.
 * Now delegates to the 'desktop' application.
 */
export async function initDesktop() {
  console.log("Initializing Desktop via legacy wrapper...");
  // Launch the desktop app.
  // We pass window.activeProfile as data.
  await launchApp("desktop", window.activeProfile);

  // Signal that the desktop has refreshed
  document.dispatchEvent(new CustomEvent("desktop-refresh"));
}

/**
 * Signal to refresh desktop icons.
 */
export function setupIcons() {
    document.dispatchEvent(new CustomEvent("desktop-refresh"));
}
