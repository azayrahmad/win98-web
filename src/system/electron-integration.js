import { fs, resolveMountConfig } from "@zenfs/core";
import { WebAccess } from "@zenfs/dom";
import { Zip } from "@zenfs/archives";
import { FloppyManager } from "../shell/explorer/drives/floppy-manager.js";
import { CDManager } from "../shell/explorer/drives/cd-manager.js";
import { RemovableDiskManager } from "../shell/explorer/drives/removable-disk-manager.js";
import { existsAsync } from "./zenfs-utils.js";

export function initElectronIntegration() {
  if (!window.electronAPI) return;

  window.electronAPI.onDeviceInserted(async (data) => {
    console.log("Device inserted:", data);
    const { type, handle, name } = data;

    try {
      if (type === 'floppy') {
        await mountFloppy(handle, name);
      } else if (type === 'cd') {
        await mountCD(handle, name);
      } else if (type === 'removable') {
        await mountRemovable(handle, name);
      }
    } catch (error) {
      console.error(`Failed to mount ${type}:`, error);
      alert(`Failed to mount ${type}: ${error.message}`);
    }
  });
}

async function mountFloppy(handle, name) {
  const mountPoint = "/A:";
  if (!(await existsAsync(mountPoint))) {
    await fs.promises.mkdir(mountPoint);
  }

  let backend = WebAccess;
  if (name.toLowerCase().endsWith('.zip')) {
      // For ZIP, we might need to read it into memory first if using WebAccess directly is hard
      // But ZenFS Zip backend might support a file.
      // Actually, let's use a simpler approach for now: mount as WebAccess if it's a folder,
      // but here it's a file.
      // ZenFS Zip backend takes a 'data' option (Uint8Array).
      const file = await handle.getFile();
      const buffer = await file.arrayBuffer();
      const zipFs = await resolveMountConfig({ backend: Zip, data: new Uint8Array(buffer) });
      fs.mount(mountPoint, zipFs);
  } else {
      const floppyFs = await resolveMountConfig({ backend: WebAccess, handle });
      fs.mount(mountPoint, floppyFs);
  }

  FloppyManager.setLabel(name);
  document.dispatchEvent(new CustomEvent("floppy-change"));
}

async function mountCD(handle, name) {
  const mountPoint = "/D:";
  if (!(await existsAsync(mountPoint))) {
    await fs.promises.mkdir(mountPoint);
  }

  // Similar logic to Floppy
  if (name.toLowerCase().endsWith('.zip')) {
      const file = await handle.getFile();
      const buffer = await file.arrayBuffer();
      const zipFs = await resolveMountConfig({ backend: Zip, data: new Uint8Array(buffer) });
      fs.mount(mountPoint, zipFs);
  } else {
      const cdFs = await resolveMountConfig({ backend: WebAccess, handle });
      fs.mount(mountPoint, cdFs);
  }

  CDManager.setLabel(name);
  document.dispatchEvent(new CustomEvent("cd-change"));
}

async function mountRemovable(handle, name) {
  const letter = RemovableDiskManager.getAvailableLetter();
  if (!letter) {
    alert("No available drive letters to mount removable disk.");
    return;
  }

  const mountPoint = `/${letter}:`;
  if (!(await existsAsync(mountPoint))) {
    await fs.promises.mkdir(mountPoint);
  }

  const diskFs = await resolveMountConfig({ backend: WebAccess, handle });
  fs.mount(mountPoint, diskFs);

  RemovableDiskManager.mount(letter, name);
  document.dispatchEvent(new CustomEvent("removable-disk-change"));
}
