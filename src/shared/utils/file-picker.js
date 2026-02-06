import { FilePicker } from '../../shell/explorer/interface/file-picker.js';
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';

export async function ShowFilePicker(options = {}) {
  return new Promise((resolve) => {
    const picker = new FilePicker({
      ...options,
    });

    const win = ShowDialogWindow({
      title: options.title || (options.mode === "save" ? "Save As" : "Open"),
      content: picker.element,
      width: 550,
      height: 400,
      buttons: [], // We use the buttons inside FilePicker
      modal: true,
    });

    picker.win = win;
    picker.onResolve = (result) => {
      resolve(result);
    };

    win.onClosed(() => {
      if (picker.onResolve) {
        picker.onResolve(null);
        picker.onResolve = null;
      }
    });

    // Initial navigation
    picker.navigateTo(picker.options.initialPath);
  });
}

// Add to window for global access if needed
window.ShowFilePicker = ShowFilePicker;
