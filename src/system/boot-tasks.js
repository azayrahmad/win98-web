import { BootTask } from './boot-manager.js';
import {
  startBootProcessStep,
  finalizeBootProcessStep,
  writeBootError,
  promptToContinue,
  showSplashScreen,
  hideBootAndSplash,
} from './boot-screen.js';
import { initFileSystem } from './zenfs-init.js';
import { createMainUI } from '../shell/ui.js';
import { getItem, LOCAL_STORAGE_KEYS } from './local-storage.js';
import { registerCustomApp } from './custom-app-manager.js';

export class HardwareDetectionTask extends BootTask {
  constructor() { super("Detecting hardware..."); }

  async execute(kernel) {
    await this._detect("Detecting mouse...", () => window.matchMedia("(any-pointer: fine)").matches);
    await this._detect("Detecting touch support...", () =>
      window.matchMedia("(any-pointer: coarse)").matches || navigator.maxTouchPoints > 0
    );
    await this._detect("Connecting to network...", () => navigator.onLine);
  }

  async _detect(message, checkFn) {
    let logElement = startBootProcessStep(message);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const result = await checkFn();
      finalizeBootProcessStep(logElement, result ? "OK" : "FAILED");
    } catch (e) {
      finalizeBootProcessStep(logElement, "FAILED", e);
    }
  }
}

export class FileSystemInitTask extends BootTask {
  constructor() { super("Initializing file system..."); }

  async execute(kernel) {
    const baseMsg = "Initializing file system...";
    let logElement = startBootProcessStep(baseMsg);
    try {
      await initFileSystem((subStep) => {
        if (logElement?.firstChild) logElement.firstChild.nodeValue = `${baseMsg} ${subStep}`;
      });
      if (logElement?.firstChild) logElement.firstChild.nodeValue = baseMsg;
      finalizeBootProcessStep(logElement, "OK");
    } catch (e) {
      finalizeBootProcessStep(logElement, "FAILED", e);
      throw e;
    }
  }
}

export class RecycleBinInitTask extends BootTask {
  constructor() { super("Initializing Recycle Bin..."); }

  async execute(kernel) {
    let logElement = startBootProcessStep("Initializing Recycle Bin...");
    try {
      await kernel.use('recycleBin').init();
      finalizeBootProcessStep(logElement, "OK");
    } catch (e) {
      finalizeBootProcessStep(logElement, "FAILED", e);
    }
  }
}

export class AssetPreloadTask extends BootTask {
  constructor() { super("Preloading theme assets..."); }

  async execute(kernel) {
    const themeService = kernel.use('theme');
    const assetService = kernel.use('assets');
    const currentThemeId = themeService.getActiveThemeId();

    await this._preload(assetService, "default");
    if (currentThemeId !== "default") {
      await this._preload(assetService, currentThemeId);
    }
  }

  async _preload(assetService, themeId) {
    const baseMsg = `Preloading ${themeId} theme assets...`;
    let logElement = startBootProcessStep(baseMsg);

    const onAssetStart = (name) => {
      if (logElement?.firstChild) logElement.firstChild.nodeValue = `${baseMsg} ${name}...`;
      return logElement;
    };

    const onAssetFinish = (logEl, status) => {
      if (status === "FAILED" && logElement?.firstChild) {
        logElement.firstChild.nodeValue += " (FAILED)";
      }
    };

    try {
      await assetService.preloadThemeAssets(themeId, onAssetStart, onAssetFinish);
      if (logElement?.firstChild) logElement.firstChild.nodeValue = baseMsg;
      finalizeBootProcessStep(logElement, "OK");
    } catch (e) {
      finalizeBootProcessStep(logElement, "FAILED", e);
    }
  }
}

export class CustomAppsTask extends BootTask {
  constructor() { super("Loading custom applications..."); }

  async execute(kernel) {
    let logElement = startBootProcessStep(this.name);
    try {
      const savedApps = getItem(LOCAL_STORAGE_KEYS.CUSTOM_APPS) || [];
      savedApps.forEach(appInfo => registerCustomApp(appInfo));
      finalizeBootProcessStep(logElement, "OK");
    } catch (e) {
      finalizeBootProcessStep(logElement, "FAILED", e);
    }
  }
}

export class MainUIInitTask extends BootTask {
  constructor() { super("Creating main UI..."); }

  async execute(kernel) {
    let logElement = startBootProcessStep(this.name);
    try {
      showSplashScreen();
      await new Promise(resolve => setTimeout(resolve, 50));
      createMainUI();
      kernel.use('display').init(document.body);
      finalizeBootProcessStep(logElement, "OK");
    } catch (e) {
      finalizeBootProcessStep(logElement, "FAILED", e);
    }
  }
}

export class ShellLaunchTask extends BootTask {
  constructor() { super("Initializing shell..."); }

  async execute(kernel) {
    let logElement = startBootProcessStep(this.name);
    try {
      await new Promise(resolve => setTimeout(resolve, 50));
      await kernel.use('appManager').launchApp('explorer');
      finalizeBootProcessStep(logElement, "OK");
    } catch (e) {
      finalizeBootProcessStep(logElement, "FAILED", e);
    }
  }
}

export class FinalizeBootTask extends BootTask {
  constructor() { super("azOS Ready!"); }
  async execute(kernel) {
    startBootProcessStep(this.name);
    await new Promise(resolve => setTimeout(resolve, 50));
  }
}
