/**
 * BaseProcess represents a generic system process.
 * It provides the basic lifecycle hooks: launch, run, and cleanup.
 * It does NOT assume any UI or windowing.
 */
import { kernel } from './kernel.js';

export class BaseProcess {
  constructor(config) {
    this.kernel = kernel; // Could also be injected via constructor if we wanted full DI
    this.config = config;
    this.id = config.id;
    this.title = config.title;
    this.isSingleton = config.isSingleton !== false;
    this.instanceKey = null;
  }

  /**
   * Main entry point for the process.
   * @param {any} data
   */
  async launch(data = null) {
    await this._onLaunch(data);
  }

  /**
   * Lifecycle hook for process initialization.
   * @param {any} data
   */
  async _onLaunch(data) {
    // To be implemented by subclasses
  }

  /**
   * Lifecycle hook for process cleanup.
   */
  async _cleanup() {
    // To be implemented by subclasses
  }

  /**
   * Terminates the process.
   * This is called by the process manager.
   */
  async terminate() {
    await this._cleanup();

    document.dispatchEvent(
      new CustomEvent("process-terminated", {
        detail: { id: this.id, instanceKey: this.instanceKey },
      }),
    );
  }

  /**
   * Signal to the system that the process wants to exit.
   */
  exit() {
    this.kernel.use('appManager').closeApp(this.instanceKey);
  }

  // --- Convenience Getters for Services ---
  get ui() { return this.kernel.use('ui'); }
  get settings() { return this.kernel.use('settings'); }
  get theme() { return this.kernel.use('theme'); }
  get sound() { return this.kernel.use('sound'); }
  get busy() { return this.kernel.use('busy'); }
  get display() { return this.kernel.use('display'); }
  get assets() { return this.kernel.use('assets'); }
  get recycleBin() { return this.kernel.use('recycleBin'); }
  get clipboard() { return this.kernel.use('clipboard'); }
  get disks() { return this.kernel.use('disks'); }
  get file() { return this.kernel.use('file'); }
}
