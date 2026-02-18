import { ShowDialogWindow } from "../shared/components/dialog-window.js";
import { ICONS } from "../config/icons.js";
import { playSound } from "./sound-manager.js";
import { refreshPrograms } from "../shell/start-menu/start-menu-utils.js";

/**
 * Handles the Windows Update logic
 */
export async function showUpdateConfirmation() {
  ShowDialogWindow({
    title: "Windows Update",
    text: "Are you sure you want to update the web app? This will clear all cached files and restart the system. Your personal data and settings will be preserved.",
    modal: true,
    showOverlay: true,
    get contentIconUrl() {
      return ICONS.windowsUpdate[32];
    },
    buttons: [
      {
        label: "Yes",
        isDefault: true,
        action: async () => {
          playSound("SystemExit");

          // Clear Service Workers
          if ("serviceWorker" in navigator) {
            try {
              const registrations = await navigator.serviceWorker.getRegistrations();
              for (const registration of registrations) {
                await registration.unregister();
              }
            } catch (error) {
              console.error("Failed to unregister service workers:", error);
            }
          }

          // Clear Cache API
          if ("caches" in window) {
            try {
              const cacheNames = await caches.keys();
              for (const name of cacheNames) {
                await caches.delete(name);
              }
            } catch (error) {
              console.error("Failed to clear caches:", error);
            }
          }

          // Refresh start menu items
          try {
            await refreshPrograms();
          } catch (error) {
            console.error("Failed to refresh programs:", error);
          }

          // Reload the page
          window.location.reload();
        },
      },
      {
        label: "No",
        action: () => {},
      },
    ],
    soundEvent: "SystemQuestion",
  });
}
