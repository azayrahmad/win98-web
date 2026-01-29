import "./styles/cursors.css";
import "./style.css";
import "./styles/splash.css";
import "./styles/shutdown-screen.css";

import splashBg from "./assets/img/splash.png";
import { themes } from "./config/themes.js";
import { colorSchemes } from "./config/colorSchemes.js";
import { setupCounter } from "./counter.js";
import { initDesktop } from "./components/desktop.js";
import { getItem, LOCAL_STORAGE_KEYS } from "./utils/localStorage.js";
import { apps, appClasses } from "./config/apps.js";
import { ICONS } from "./config/icons.js";
import { Application } from "./apps/Application.js";
import { registerCustomApp } from "./utils/customAppManager.js";
import { taskbar } from "./components/taskbar.js";
import { ShowDialogWindow } from "./components/DialogWindow.js";
import { playSound } from "./utils/soundManager.js";
import { setTheme, getCurrentTheme, setColorScheme } from "./utils/themeManager.js";
import { profiles } from "./config/profiles.js";
import {
  hideBootScreen,
  startBootProcessStep,
  finalizeBootProcessStep,
  showBlinkingCursor,
  promptToContinue,
  showSetupScreen,
} from "./components/bootScreen.js";
import { preloadThemeAssets } from "./utils/assetPreloader.js";
import { launchApp } from "./utils/appManager.js";
import { createMainUI } from "./components/ui.js";
import { initColorModeManager } from "./utils/colorModeManager.js";
import screensaver from "./utils/screensaverUtils.js";
import { initScreenManager } from "./utils/screenManager.js";
import { fs } from "@zenfs/core";

// Window Management System
class WindowManagerSystem {
  constructor() {
    this._zIndex = 1000;
    this.minimizedWindows = new Map();
  }

  incrementZIndex() {
    return ++this._zIndex;
  }

  getHighestZIndex() {
    return this._zIndex;
  }

  minimizeWindow(win, skipTaskbarUpdate = false) {
    if (!win?.id) return;

    // Access the $window jQuery object from the DOM element
    const $window = win.$window || $(win).closest(".window").data("$window");
    if ($window && typeof $window.minimize === "function") {
      $window.minimize();
    } else {
      console.warn("Window element does not have minimize method:", win);
      win.style.display = "none";
      win.isMinimized = true;
    }

    // Update taskbar button if needed
    if (!skipTaskbarUpdate) {
      taskbar.updateTaskbarButton(win.id, false, true);
    }
  }

  restoreWindow(win) {
    if (!win?.id) return;

    // Access the $window jQuery object from the DOM element
    const $window = win.$window || $(win).closest(".window").data("$window");

    if ($window && typeof $window.unminimize === "function") {
      $window.unminimize();
      $window.bringToFront();
    } else {
      console.warn("Window element does not have unminimize method:", win);
      win.style.display = "";
      win.isMinimized = false;
    }

    // Update taskbar button
    taskbar.updateTaskbarButton(win.id, true, false);
  }

  updateTitleBarClasses(win) {
    if (!win) return;

    // Remove active class from all windows
    document.querySelectorAll(".app-window").forEach((w) => {
      w.querySelector(".title-bar")?.classList.remove("active");
    });

    // Add active class to current window
    win.querySelector(".title-bar")?.classList.add("active");
  }
}

// Initialize the systems
window.System = new WindowManagerSystem();

async function initializeOS() {
  const path = window.location.pathname;
  const profileName = path.startsWith('/win98-web/')
    ? path.substring('/win98-web/'.length).split('/')[0]
    : '';

  window.activeProfile = null;
  if (profileName && profiles[profileName]) {
    window.activeProfile = profiles[profileName];
    await setTheme(window.activeProfile.theme);
    await setColorScheme(window.activeProfile.colorScheme);
  }

  let setupEntered = false;

  const handleKeyDown = (e) => {
    if (e.key === "Delete") {
      setupEntered = true;
      showSetupScreen();
      window.removeEventListener("keydown", handleKeyDown);
    }
  };
  window.addEventListener("keydown", handleKeyDown);

  const executeBootStep = async (func) => {
    if (setupEntered) throw new Error("Setup interrupted");
    await func();
  };

  try {
    let splashScreenVisible = false;
    let bootProcessFinished = false;
    let splashScreenTimer = null;

    const splashScreen = document.getElementById("splash-screen");
    if (splashScreen) {
      splashScreen.style.backgroundImage = `url(${splashBg})`;
    }

    function showSplashScreen() {
      if (splashScreen) {
        splashScreen.style.display = "block";
        splashScreenVisible = true;
        splashScreenTimer = setTimeout(async () => {
          if (bootProcessFinished) {
            await hideBootAndSplash();
          } else {
            hideSplashScreenOnly();
          }
        }, 2000);
      }
    }

    function hideSplashScreenOnly() {
      if (splashScreen) {
        splashScreen.style.display = "none";
      }
      splashScreenVisible = false;
    }

    async function hideBootAndSplash() {
      hideSplashScreenOnly();
      hideBootScreen();
      document.body.classList.remove("booting");
      document.getElementById("screen").classList.remove("boot-mode");
      playSound("WindowsLogon");
      document.dispatchEvent(new CustomEvent("desktop-ready-to-launch-apps"));
    }

    async function handleBootCompletion() {
      bootProcessFinished = true;
      if (!splashScreenVisible) {
        await hideBootAndSplash();
      }
    }

    await executeBootStep(() => {
      document.body.classList.add("booting");
      document.getElementById("screen").classList.add("boot-mode");
      document.getElementById("initial-boot-message").style.display = "none";
      document.getElementById("boot-screen-content").style.display = "flex";

      const biosTextColumn = document.getElementById("bios-text-column");
      if (biosTextColumn) {
        biosTextColumn.innerHTML = `Award Modular BIOS v4.51PG, An Energy Star Ally<br/>Copyright (C) 1984-85, Award Software, Inc.`;
      }

      const browserInfoEl = document.getElementById("browser-info");
      if (browserInfoEl) {
        // browserInfoEl.textContent = `Client: ${navigator.userAgent}`;
      }
    });

    function loadCustomApps() {
      const savedApps = getItem(LOCAL_STORAGE_KEYS.CUSTOM_APPS) || [];
      savedApps.forEach((appInfo) => {
        registerCustomApp(appInfo);
      });
    }

    await executeBootStep(async () => {
      let logElement = startBootProcessStep("Detecting keyboard...");
      await new Promise((resolve) => setTimeout(resolve, 500));
      finalizeBootProcessStep(logElement, "OK");
    });

    await executeBootStep(async () => {
      let logElement = startBootProcessStep("Connecting to network...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      finalizeBootProcessStep(logElement, navigator.onLine ? "OK" : "FAILED");
    });

    const createAssetLogCallbacks = (logElement, baseMessage) => {
      const onAssetLogStart = (name) => {
        // Update the existing log element's text. 
        // We assume logElement has a text node and a cursor span.
        // We want to preserve the cursor if possible, or just reset content.
        // Simplest is to just set textContent, but we lose the blinking cursor if we aren't careful.
        // startBootProcessStep creates [div] -> [text][span.cursor].
        if (logElement && logElement.firstChild) {
          logElement.firstChild.nodeValue = `${baseMessage} ${name}...`;
        }
        return logElement;
      };

      const onAssetLogFinish = (logEl, status) => {
        // We don't append "OK" after every file, just let them finish.
        // But if we want to show failure?
        if (status === "FAILED") {
          if (logElement && logElement.firstChild) {
            logElement.firstChild.nodeValue += " (FAILED)";
          }
        }
      };

      return { onAssetStart: onAssetLogStart, onAssetFinish: onAssetLogFinish };
    };

    await executeBootStep(async () => {
      const baseMsg = "Preloading default theme assets...";
      let logElement = startBootProcessStep(baseMsg);
      const { onAssetStart, onAssetFinish } = createAssetLogCallbacks(logElement, baseMsg);

      await preloadThemeAssets("default", onAssetStart, onAssetFinish);

      // Reset text to clean state before final OK
      if (logElement && logElement.firstChild) {
        logElement.firstChild.nodeValue = baseMsg;
      }
      finalizeBootProcessStep(logElement, "OK");
    });

    await executeBootStep(async () => {
      const currentTheme = getCurrentTheme();
      if (currentTheme !== "default") {
        const baseMsg = `Preloading ${currentTheme} theme assets...`;
        let logElement = startBootProcessStep(baseMsg);
        const { onAssetStart, onAssetFinish } = createAssetLogCallbacks(logElement, baseMsg);

        await preloadThemeAssets(
          currentTheme,
          onAssetStart,
          onAssetFinish,
        );

        // Reset text
        if (logElement && logElement.firstChild) {
          logElement.firstChild.nodeValue = baseMsg;
        }
        finalizeBootProcessStep(logElement, "OK");
      }
    });

    await executeBootStep(async () => {
      let logElement = startBootProcessStep("Loading custom applications...");
      await new Promise((resolve) => setTimeout(resolve, 50));
      loadCustomApps();
      finalizeBootProcessStep(logElement, "OK");
    });

    await executeBootStep(async () => {
      await promptToContinue();
    });

    await executeBootStep(async () => {
      let logElement = startBootProcessStep("Creating main UI...");
      showSplashScreen();
      await new Promise((resolve) => setTimeout(resolve, 50));
      createMainUI();
      initColorModeManager(document.body);
      finalizeBootProcessStep(logElement, "OK");
    });

    await executeBootStep(async () => {
      let logElement = startBootProcessStep("Initializing taskbar...");
      await new Promise((resolve) => setTimeout(resolve, 50));
      taskbar.init();
      finalizeBootProcessStep(logElement, "OK");
    });

    await executeBootStep(async () => {
      let logElement = startBootProcessStep("Setting up desktop...");
      await new Promise((resolve) => setTimeout(resolve, 50));
      await initDesktop(window.activeProfile);
      document.dispatchEvent(new CustomEvent("desktop-refresh"));
      finalizeBootProcessStep(logElement, "OK");
    });

    await executeBootStep(async () => {
      const bootLogEl = document.getElementById("boot-log");
      if (bootLogEl) {
        const finalMessage = document.createElement("div");
        finalMessage.textContent = "azOS Ready!";
        bootLogEl.appendChild(finalMessage);
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    window.removeEventListener("keydown", handleKeyDown);
    await handleBootCompletion();

    window.ShowDialogWindow = ShowDialogWindow;
    window.playSound = playSound;
    window.setTheme = setTheme;
    window.fs = fs;
    window.System.launchApp = launchApp;
    console.log("azOS initialized");

    let inactivityTimer;

    function resetInactivityTimer() {
      clearTimeout(inactivityTimer);
      if (screensaver.active) {
        screensaver.hide();
      }

      const timeoutDuration =
        getItem(LOCAL_STORAGE_KEYS.SCREENSAVER_TIMEOUT) || 5 * 60 * 1000;

      inactivityTimer = setTimeout(() => {
        screensaver.show();
      }, timeoutDuration);
    }

    window.System.resetInactivityTimer = resetInactivityTimer;

    window.addEventListener("mousemove", resetInactivityTimer);
    window.addEventListener("mousedown", resetInactivityTimer);
    window.addEventListener("keydown", resetInactivityTimer);

    resetInactivityTimer();
    initScreenManager(); // Initialize the screen manager
  } catch (error) {
    if (error.message !== "Setup interrupted") {
      console.error("An error occurred during boot:", error);
    }
  }
}

initializeOS();
