import {
  getItem,
  setItem,
  LOCAL_STORAGE_KEYS,
} from '../../system/local-storage.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import { findItemByPath } from './directory.js';

/**
 * Handles files dropped onto a target element.
 * @param {FileList} files - The files that were dropped.
 * @param {string} targetPath - The virtual path where files are being dropped.
 * @param {function} onDropComplete - Callback function to execute after processing files.
 */
export function handleDroppedFiles(files, targetPath, onDropComplete) {
  const existingFiles = getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) || [];
  const validFiles = [];
  const oversizedFiles = [];

  Array.from(files).forEach((file) => {
    // 5MB size limit
    if (file.size > 5 * 1024 * 1024) {
      oversizedFiles.push(file.name);
    } else {
      validFiles.push(file);
    }
  });

  if (oversizedFiles.length > 0) {
    ShowDialogWindow({
      title: "File(s) Too Large",
      text: `The following files exceed the 5MB size limit and were not added:\n\n${oversizedFiles.join(
        "\n",
      )}`,
      buttons: [{ label: "OK", isDefault: true }],
    });
  }

  if (validFiles.length === 0) {
    return; // No files to process
  }

  const fileReadPromises = validFiles.map((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          id: `dropped-${Date.now()}-${Math.random()}`,
          name: file.name,
          content: e.target.result,
          type: file.type,
          path: targetPath, // Assign the path to the file
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  });

  Promise.all(fileReadPromises).then((newFiles) => {
    const allFiles = [...existingFiles, ...newFiles];
    setItem(LOCAL_STORAGE_KEYS.DROPPED_FILES, allFiles);
    if (onDropComplete) {
      onDropComplete(newFiles);
    }
  });
}

export function createDragGhost(icon, e) {
    const dragImage = icon.cloneNode(true);
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    dragImage.style.opacity = "0.5";
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    return dragImage;
}
