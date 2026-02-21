/**
 * The Kernel is the central hub of the OS.
 * It manages system services and provides a unified interface for service discovery.
 */
export class Kernel {
  constructor() {
    this.services = new Map();
    this.isBooted = false;
  }

  /**
   * Registers a service with the kernel.
   * @param {string} name
   * @param {object} service
   */
  registerService(name, service) {
    if (this.services.has(name)) {
      console.warn(`Service "${name}" is already registered. Overwriting.`);
    }
    this.services.set(name, service);

    // If the service has an 'init' method, we can call it here if the kernel is already booted,
    // but usually, services are registered during the boot sequence.
    return service;
  }

  /**
   * Retrieves a service by name.
   * @param {string} name
   * @returns {object}
   */
  getService(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service "${name}" not found in Kernel.`);
    }
    return service;
  }

  /**
   * Syntactic sugar for getService
   */
  use(name) {
    return this.getService(name);
  }

  /**
   * Boot sequence for the kernel.
   */
  async boot() {
    console.log("Kernel: Booting...");
    this.isBooted = true;
    console.log("Kernel: System services initialized.");
  }
}

// Global instance (singleton)
export const kernel = new Kernel();
