/**
 * BootManager orchestrates the OS startup sequence by executing a series of BootTasks.
 */
export class BootManager {
  constructor(kernel) {
    this.kernel = kernel;
    this.tasks = [];
  }

  addTask(task) {
    this.tasks.push(task);
  }

  async run() {
    console.log("BootManager: Starting boot sequence...");
    for (const task of this.tasks) {
      await task.execute(this.kernel);
    }
    console.log("BootManager: Boot sequence complete.");
  }
}

/**
 * Abstract base class for boot tasks.
 */
export class BootTask {
  constructor(name) {
    this.name = name;
  }

  async execute(kernel) {
    throw new Error("BootTask must implement execute()");
  }
}
