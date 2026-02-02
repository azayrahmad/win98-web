/**
 * VirtualStats - Mock fs.Stats for shell extensions
 */
export class VirtualStats {
  constructor(options = {}) {
    this._isDirectory = !!options.isDirectory;
    this.isVirtual = !!options.isVirtual;
    this.size = options.size || 0;
    this.atime = options.atime || new Date();
    this.mtime = options.mtime || new Date();
    this.ctime = options.ctime || new Date();
    this.birthtime = options.birthtime || new Date();
  }

  isDirectory() {
    return this._isDirectory;
  }

  isFile() {
    return !this._isDirectory;
  }

  isBlockDevice() { return false; }
  isCharacterDevice() { return false; }
  isSymbolicLink() { return false; }
  isFIFO() { return false; }
  isSocket() { return false; }
}
