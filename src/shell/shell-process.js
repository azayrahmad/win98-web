import { BaseProcess } from '../system/base-process.js';
import { initDesktop } from './desktop/desktop.js';
import { taskbar } from './taskbar/taskbar.js';

/**
 * ShellProcess is the main process responsible for the OS user interface.
 * It initializes the Desktop and Taskbar and manages their lifecycle.
 */
export class ShellProcess extends BaseProcess {
  static config = {
    id: "explorer", // Historically explorer.exe handles the shell in Windows
    title: "Windows Explorer",
    isSingleton: true,
  };

  async _onLaunch() {
    console.log("ShellProcess: Launching OS Shell...");

    const shellService = this.kernel.use('shell');

    // Initialize Taskbar
    taskbar.init();
    shellService.registerTaskbar(taskbar);

    // Initialize Desktop
    await initDesktop(window.activeProfile);
    shellService.registerDesktop(null); // Desktop doesn't have a class instance yet, but we trigger refresh via event

    document.dispatchEvent(new CustomEvent("desktop-refresh"));

    console.log("ShellProcess: Shell initialized.");
  }

  async _cleanup() {
    taskbar.destroy();
  }
}
