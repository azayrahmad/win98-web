import splashBg from "../assets/img/splash.png";
import { initDesktop } from "../shell/desktop/desktop.js";
import { getItem, LOCAL_STORAGE_KEYS } from "./local-storage.js";
import { registerCustomApp } from "./custom-app-manager.js";
import { taskbar } from "../shell/taskbar/taskbar.js";
import { ShowDialogWindow } from "../shared/components/dialog-window.js";
import { playSound } from "./sound-manager.js";
import { setTheme, getCurrentTheme, setColorScheme, loadCustomTheme } from "./theme-manager.js";
import { profiles } from "../config/profiles.js";
import {
  hideBootScreen,
  startBootProcessStep,
  finalizeBootProcessStep,
  promptToContinue,
  showSetupScreen,
  prepareBootScreen,
} from "./boot-screen.js";
import { preloadThemeAssets } from "./asset-preloader.js";
import { launchApp } from "./app-manager.js";
import { createMainUI } from "../shell/ui.js";
import { initColorModeManager } from "./color-mode-manager.js";
import screensaver from "./screensaver-utils.js";
import { initScreenManager } from "./screen-manager.js";
import { fs, mounts } from "@zenfs/core";
import { initFileSystem } from "./zenfs-init.js";
import { existsAsync } from "./zenfs-utils.js";
import { RecycleBinManager } from "../shell/explorer/file-operations/recycle-bin-manager.js";
import { appManager } from "./app-manager.js";
import { WindowManager } from "./window-manager.js";

export async function initializeOS() {
  const isMSDOSMode = window.location.hash === "#msdos";

  // Initialize Window Management System
  window.System = new WindowManager();

  const path = window.location.pathname;
  const profileName = path.startsWith("/win98-web/")
    ? path.substring("/win98-web/".length).split("/")[0]
    : "";

  window.activeProfile = null;
  const ignoredProfiles = ["", "index.html", "404.html"];
  if (profileName && !ignoredProfiles.includes(profileName)) {
    if (profiles[profileName]) {
      window.activeProfile = profiles[profileName];
      await setTheme(window.activeProfile.theme);
      await setColorScheme(window.activeProfile.colorScheme);
    } else {
      window.location.href =
        (import.meta.env.BASE_URL || "/win98-web/") + "404.html";
      return;
    }
  }

  let setupEntered = false;

  const handleKeyDown = (e) => {
    if (e.key === "F8" || e.key === "Delete") {
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
      if (isMSDOSMode) return;
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

    await executeBootStep(async () => {
      document.body.classList.add("booting");
      document.getElementById("screen").classList.add("boot-mode");
      document.getElementById("initial-boot-message").style.display = "none";
      document.getElementById("boot-screen-content").style.display = "flex";

      await prepareBootScreen();
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

    await loadCustomTheme();

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
      const { onAssetStart, onAssetFinish } = createAssetLogCallbacks(
        logElement,
        baseMsg,
      );

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
        const { onAssetStart, onAssetFinish } = createAssetLogCallbacks(
          logElement,
          baseMsg,
        );

        await preloadThemeAssets(currentTheme, onAssetStart, onAssetFinish);

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

    if (!isMSDOSMode) {
      await executeBootStep(async () => {
        let logElement = startBootProcessStep("Creating main UI...");
        showSplashScreen();
        await new Promise((resolve) => setTimeout(resolve, 50));
        createMainUI();
        initColorModeManager(document.body);
        finalizeBootProcessStep(logElement, "OK");
      });
    }

    if (!isMSDOSMode) {
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
    }

    await executeBootStep(async () => {
      startBootProcessStep("azOS Ready!");
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    window.removeEventListener("keydown", handleKeyDown);

    if (isMSDOSMode) {
      const { DOSShell } = await import("./dos-shell.js");
      const { getTerminal } = await import("./boot-screen.js");
      const term = getTerminal();
      if (term) {
        term.write("\x1b[r"); // Reset scrolling region
        term.write("\x1b[2J\x1b[H"); // Clear screen and home
        const shell = new DOSShell(term, { isMSDOSMode: true });
        shell.init();
      }
      window.fs = fs;
      window.mounts = mounts;
      return;
    }

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
