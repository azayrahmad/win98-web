import splashBg from "../assets/img/splash.png";
import { initDesktop } from '../shell/desktop/desktop.js';
import { getItem, LOCAL_STORAGE_KEYS } from './local-storage.js';
import { registerCustomApp } from './custom-app-manager.js';
import { taskbar } from '../shell/taskbar/taskbar.js';
import { ShowDialogWindow } from '../shared/components/dialog-window.js';
import { playSound } from './sound-manager.js';
import { setTheme, getCurrentTheme, setColorScheme } from './theme-manager.js';
import { profiles } from '../config/profiles.js';
import {
  hideBootScreen,
  startBootProcessStep,
  finalizeBootProcessStep,
  promptToContinue,
  showSetupScreen,
} from './boot-screen.js';
import { preloadThemeAssets } from './asset-preloader.js';
import { launchApp } from './app-manager.js';
import { createMainUI } from '../shell/ui.js';
import { initColorModeManager } from './color-mode-manager.js';
import screensaver from './screensaver-utils.js';
import { initScreenManager } from './screen-manager.js';
import { fs, mounts } from "@zenfs/core";
import { initFileSystem } from './zenfs-init.js';
import { RecycleBinManager } from '../shell/explorer/file-operations/recycle-bin-manager.js';
import { appManager } from './app-manager.js';
import { WindowManager } from './window-manager.js';

export async function initializeOS() {
  // Initialize Window Management System
  window.System = new WindowManager();

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
      const testGamePath = "/C:/Games/PersistenceTest";
      if (!fs.existsSync(testGamePath)) {
        await fs.promises.mkdir(testGamePath, { recursive: true });
        const batContent = `@echo off\ncls\necho ==============================\necho    DOS PERSISTENCE TEST\necho ==============================\nif exist SAVE.TXT (\n    echo Welcome back! Your last save was:\n    type SAVE.TXT\n) else (\n    echo This is your first time playing.\n)\necho.\nset /p input="Type something to save: "\necho %input% > SAVE.TXT\necho Progress saved to SAVE.TXT!\necho.\npause\n`;
        await fs.promises.writeFile(`${testGamePath}/TEST.BAT`, batContent);
      }
    });

    await executeBootStep(async () => {
      const simCityPath = "/C:/Games/SimCity2000";
      if (!fs.existsSync(simCityPath)) {
        let logElement = startBootProcessStep("Installing SimCity 2000...");
        try {
          const response = await fetch("games/dos/simcity2000/sc2000bundle.jsdos");
          const buffer = await response.arrayBuffer();
          const { unzipSync } = await import("fflate");
          const unzipped = unzipSync(new Uint8Array(buffer));

          await fs.promises.mkdir(simCityPath, { recursive: true });
          for (const [path, data] of Object.entries(unzipped)) {
            if (path.endsWith("/")) continue;
            const fullPath = `${simCityPath}/${path}`;
            const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
            if (!fs.existsSync(dir)) {
              await fs.promises.mkdir(dir, { recursive: true });
            }
            await fs.promises.writeFile(fullPath, data);
          }
          finalizeBootProcessStep(logElement, "OK");
        } catch (e) {
          console.error("Failed to install SimCity 2000:", e);
          finalizeBootProcessStep(logElement, "FAILED");
        }
      }
    });

    await executeBootStep(async () => {
      let logElement = startBootProcessStep("Connecting to network...");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      finalizeBootProcessStep(logElement, navigator.onLine ? "OK" : "FAILED");
    });

    await executeBootStep(async () => {
      const baseMsg = "Initializing file system...";
      let logElement = startBootProcessStep(baseMsg);
      await initFileSystem((subStep) => {
        if (logElement && logElement.firstChild) {
          logElement.firstChild.nodeValue = `${baseMsg} ${subStep}`;
        }
      });
      if (logElement && logElement.firstChild) {
        logElement.firstChild.nodeValue = baseMsg;
      }
      finalizeBootProcessStep(logElement, "OK");
    });

    await executeBootStep(async () => {
      let logElement = startBootProcessStep("Initializing Recycle Bin...");
      await RecycleBinManager.init();
      finalizeBootProcessStep(logElement, "OK");
    });

    const createAssetLogCallbacks = (logElement, baseMessage) => {
      const onAssetLogStart = (name) => {
        if (logElement && logElement.firstChild) {
          logElement.firstChild.nodeValue = `${baseMessage} ${name}...`;
        }
        return logElement;
      };

      const onAssetLogFinish = (logEl, status) => {
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
      const doomFiles = ["doom1.wad", "default.cfg"];
      const baseRemotePath = "games/doom/";
      const baseLocalPath = "/C:/Program Files/Doom/";

      let needed = false;
      for (const file of doomFiles) {
        if (!fs.existsSync(baseLocalPath + file)) {
          needed = true;
          break;
        }
      }

      if (needed) {
        let logElement = startBootProcessStep("Loading Doom game data...");
        for (const file of doomFiles) {
          if (!fs.existsSync(baseLocalPath + file)) {
            if (logElement && logElement.firstChild) {
              logElement.firstChild.nodeValue = `Loading Doom game data: ${file}...`;
            }
            const response = await fetch(baseRemotePath + file);
            const buffer = await response.arrayBuffer();
            await fs.promises.writeFile(baseLocalPath + file, new Uint8Array(buffer));
          }
        }
        if (logElement && logElement.firstChild) {
          logElement.firstChild.nodeValue = "Loading Doom game data...";
        }
        finalizeBootProcessStep(logElement, "OK");
      }
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
    window.mounts = mounts;
    window.RecycleBinManager = RecycleBinManager;
    window.System.launchApp = launchApp;
    window.System.appManager = appManager;
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
    initScreenManager();
  } catch (error) {
    if (error.message !== "Setup interrupted") {
      console.error("An error occurred during boot:", error);
    }
  }
}
