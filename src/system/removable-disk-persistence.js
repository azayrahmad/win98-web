import { kernel } from './kernel.js';

/**
 * Legacy RemovableDiskPersistence proxying to DiskService in Kernel.
 * @deprecated Use kernel.use('disks') instead.
 */

export async function saveDiskHandle(letter, handle) {
  return kernel.use('disks').saveDiskHandle(letter, handle);
}

export async function removeDiskHandle(letter) {
  return kernel.use('disks').removeDiskHandle(letter);
}

export async function getAllDiskHandles() {
  return kernel.use('disks').getAllDiskHandles();
}
