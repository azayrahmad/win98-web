import { fs } from "@zenfs/core";

/**
 * FileService provides a high-level API for file system operations,
 * wrapping ZenFS and providing common utilities.
 */
export class FileService {
  constructor() {
    this.fs = fs.promises;
  }

  async exists(path) {
    try {
      await this.fs.stat(path);
      return true;
    } catch {
      return false;
    }
  }

  async readText(path) {
    return this.fs.readFile(path, 'utf8');
  }

  async writeText(path, content) {
    return this.fs.writeFile(path, content);
  }

  async readBinary(path) {
    return this.fs.readFile(path);
  }

  async writeBinary(path, data) {
    return this.fs.writeFile(path, data);
  }

  async deleteFile(path) {
    return this.fs.unlink(path);
  }

  async makeDirectory(path) {
    return this.fs.mkdir(path, { recursive: true });
  }

  async listDirectory(path) {
    return this.fs.readdir(path);
  }

  async getStats(path) {
    return this.fs.stat(path);
  }

  async rename(oldPath, newPath) {
    return this.fs.rename(oldPath, newPath);
  }

  async deleteDirectory(path) {
    return this.fs.rm(path, { recursive: true, force: true });
  }

  async getFileUrl(path) {
    const { getZenFSFileUrl } = await import('./zenfs-utils.js');
    return getZenFSFileUrl(path);
  }
}
