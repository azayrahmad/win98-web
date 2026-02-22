import splashBg from "../assets/img/splash.png";
import { initDesktop } from "../shell/desktop/desktop.js";
import { getItem, LOCAL_STORAGE_KEYS } from "./local-storage.js";
import { registerCustomApp } from "./custom-app-manager.js";
import { taskbar } from "../shell/taskbar/taskbar.js";
import { ShowDialogWindow } from "../shared/components/dialog-window.js";
import { playSound } from "./sound-manager.js";
import { setTheme, getCurrentTheme, setColorScheme } from "./theme-manager.js";
import { profiles } from "../config/profiles.js";
import {
  hideBootScreen,
  promptToContinue,
  showSetupScreen,
  prepareBootScreen,
  getTerminal,
  writeBootError,
  startBootProcessStep,
} from "./boot-screen.js";
import { launchApp } from "./app-manager.js";
import screensaver from "./screensaver-utils.js";
import { DOSShell } from "./dos-shell.js";
import { fs, mounts } from "@zenfs/core";
import { appManager } from "./app-manager.js";
import { WindowManager } from "./window-manager.js";
import { kernel } from "./kernel.js";
import { UIService } from "./ui-service.js";
import { SettingsService } from "./settings-service.js";
import { SoundService } from "./sound-service.js";
import { ThemeService } from "./theme-service.js";
import { BusyService } from "./busy-service.js";
import { DisplayService } from "./display-service.js";
import { RecycleBinService } from "./recycle-bin-service.js";
import { AssetService } from "./asset-service.js";
import { ClipboardService } from "./clipboard-service.js";
import { DiskService } from "./disk-service.js";
import { ShellService } from "./shell-service.js";
import { FileService } from "./file-service.js";
import { BootManager } from "./boot-manager.js";
import * as Tasks from "./boot-tasks.js";

export async function initializeOS() {
  const isMSDOSMode = window.location.hash === "#msdos";

  // Initialize Kernel and System Services
  kernel.registerService("windowManager", new WindowManager(kernel));
  kernel.registerService("appManager", appManager);
  kernel.registerService("ui", new UIService());
  kernel.registerService("settings", new SettingsService());
  kernel.registerService("busy", new BusyService());
  kernel.registerService("theme", new ThemeService(kernel));
  kernel.registerService("sound", new SoundService(kernel));
  kernel.registerService("display", new DisplayService());
  kernel.registerService("recycleBin", new RecycleBinService());
  kernel.registerService("assets", new AssetService());
  kernel.registerService("clipboard", new ClipboardService());
  kernel.registerService("disks", new DiskService());
  kernel.registerService("shell", new ShellService());
  kernel.registerService("file", new FileService());

  // For backward compatibility and global access
  window.System = kernel.use("windowManager");
  window.System.kernel = kernel;
  window.System.launchApp = launchApp;
  window.System.appManager = appManager;

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
    if (setupEntered) return;
    try {
      await func();
    } catch (error) {
      if (error.message === "Setup interrupted") {
        setupEntered = true;
        return;
      }
      console.error("Boot step failed:", error);
      writeBootError(error.message);
    }
  };

  const bootErrorHandler = (event) => {
    const message = event.error ? event.error.message : event.message;
    writeBootError(message);
  };

  const bootRejectionHandler = (event) => {
    const message = event.reason
      ? event.reason.message || event.reason
      : "Unhandled Rejection";
    writeBootError(message);
  };

  window.addEventListener("error", bootErrorHandler);
  window.addEventListener("unhandledrejection", bootRejectionHandler);

  try {
    const splashScreen = document.getElementById("splash-screen");
    if (splashScreen) {
      splashScreen.style.backgroundImage = `url(${splashBg})`;
    }

    await executeBootStep(async () => {
      document.body.classList.add("booting");
      document.getElementById("screen").classList.add("boot-mode");
      document.getElementById("initial-boot-message").style.display = "none";
      document.getElementById("boot-screen-content").style.display = "flex";
      await prepareBootScreen();
    });

    const bootManager = new BootManager(kernel);
    bootManager.addTask(new Tasks.HardwareDetectionTask());
    bootManager.addTask(new Tasks.FileSystemInitTask());
    bootManager.addTask(new Tasks.RecycleBinInitTask());
    bootManager.addTask(new Tasks.AssetPreloadTask());
    bootManager.addTask(new Tasks.CustomAppsTask());

    await executeBootStep(async () => {
      await promptToContinue();
    });

    if (!isMSDOSMode) {
      bootManager.addTask(new Tasks.MainUIInitTask());
      bootManager.addTask(new Tasks.ShellLaunchTask());
    }

    bootManager.addTask(new Tasks.FinalizeBootTask());

    await executeBootStep(() => bootManager.run());

    window.removeEventListener("keydown", handleKeyDown);

    if (isMSDOSMode) {
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

    import("./boot-screen.js").then(m => {
        m.setBootProcessFinished(true);
        m.hideBootAndSplash().then(() => {
            kernel.use('sound').play("WindowsLogon");
        });
    });

    window.ShowDialogWindow = ShowDialogWindow;
    window.playSound = playSound;
    window.setTheme = setTheme;
    window.fs = fs;
    window.mounts = mounts;
    window.RecycleBinManager = RecycleBinManager;
    await kernel.boot();
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
  } catch (error) {
    if (error.message !== "Setup interrupted") {
      console.error("An error occurred during boot:", error);
      writeBootError(error.message);
    }
  } finally {
    window.removeEventListener("error", bootErrorHandler);
    window.removeEventListener("unhandledrejection", bootRejectionHandler);
  }
}
