import { ShowDialogWindow } from '../shared/components/dialog-window.js';
import { ShowFilePicker } from '../shared/utils/file-picker.js';
import { OSWindow } from './gui/window.js';

/**
 * UIService provides a decoupled way for applications to interact with the UI.
 * It abstracts away direct dependencies on jQuery, $Window, and specific dialog implementations.
 */
export class UIService {
  /**
   * Shows a standard dialog window.
   * @param {object} options
   * @returns {object} The window instance
   */
  showDialog(options) {
    return ShowDialogWindow(options);
  }

  /**
   * Creates a new application window.
   * @param {object} options
   * @returns {object} The $Window instance
   */
  createWindow(options) {
    // Returns an OSWindow instance (which is currently a decorated jQuery object for compatibility).
    return new OSWindow(options);
  }

  /**
   * Shows a 'Coming Soon' dialog.
   * @param {string} title
   */
  showComingSoon(title) {
    this.showDialog({
      title: title,
      text: "Coming soon.",
      modal: true,
    });
  }

  /**
   * Shows a file picker dialog.
   * @param {object} options
   * @returns {Promise<string>}
   */
  showFilePicker(options) {
    return ShowFilePicker(options);
  }
}
