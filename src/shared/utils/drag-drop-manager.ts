import {
  getItem,
  setItem,
  LOCAL_STORAGE_KEYS,
} from '../../system/local-storage.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';

/**
 * Handles files dropped onto a target element.
 * @param {FileList} files - The files that were dropped.
 * @param {string} targetPath - The virtual path where files are being dropped.
 * @param {function} onDropComplete - Callback function to execute after processing files.
 */
export function handleDroppedFiles(
  files: FileList,
  targetPath: string,
  onDropComplete?: (newFiles: any[]) => void
): void {
  const existingFiles = (getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) as any[]) || [];
  const validFiles: File[] = [];
  const oversizedFiles: string[] = [];

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
    return new Promise<any>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          id: `dropped-${Date.now()}-${Math.random()}`,
          name: file.name,
          content: e.target?.result,
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

export function createDragGhost(icon: HTMLElement, e: DragEvent): HTMLElement {
    const dragImage = icon.cloneNode(true) as HTMLElement;
    dragImage.style.position = "absolute";
    dragImage.style.top = "-1000px";
    dragImage.style.opacity = "0.5";
    document.body.appendChild(dragImage);
    if (e.dataTransfer) {
        e.dataTransfer.setDragImage(dragImage, 0, 0);
    }
    return dragImage;
}
