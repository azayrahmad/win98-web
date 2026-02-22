/**
 * ShellService provides a central API for communicating with shell components
 * (Desktop, Taskbar, Start Menu).
 */
export class ShellService {
  constructor() {
    this.desktop = null;
    this.taskbar = null;
  }

  registerDesktop(desktop) {
    this.desktop = desktop;
  }

  registerTaskbar(taskbar) {
    this.taskbar = taskbar;
  }

  refreshDesktop() {
    document.dispatchEvent(new CustomEvent("desktop-refresh"));
  }

  updateTaskbarButton(instanceKey, isActive, isMinimized) {
    if (this.taskbar) {
      this.taskbar.updateTaskbarButton(instanceKey, isActive, isMinimized);
    }
  }

  createTaskbarButton(instanceKey, icon, title) {
    if (this.taskbar) {
      return this.taskbar.createTaskbarButton(instanceKey, icon, title);
    }
    return null;
  }

  removeTaskbarButton(instanceKey) {
    if (this.taskbar) {
      this.taskbar.removeTaskbarButton(instanceKey);
    }
  }

  createTrayIcon(app) {
    if (this.taskbar) {
      // Logic for creating tray icon via taskbar
      import('../shell/taskbar/taskbar.js').then(({ createTrayIcon }) => {
          createTrayIcon(app);
      });
    }
  }

  async refreshStartMenu() {
    const { refreshPrograms } = await import('../shell/start-menu/start-menu-utils.js');
    await refreshPrograms();
  }
}
