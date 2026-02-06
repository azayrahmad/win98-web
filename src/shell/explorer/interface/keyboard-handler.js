import { getParentPath } from '../navigation/path-utils.js';
import { RecycleBinManager } from '../file-operations/recycle-bin-manager.js';
import { PropertiesManager } from '../file-operations/properties-manager.js';
import { launchApp } from '../../../system/app-manager.js';

export class KeyboardHandler {
  constructor(app) {
    this.app = app;
  }

  handleKeyDown(e) {
    const tag = e.target.tagName;
    if (
      tag === "INPUT" ||
      tag === "TEXTAREA" ||
      tag === "SELECT" ||
      tag === "BUTTON"
    ) {
      return;
    }

    const selectedIcons = [...this.app.iconManager.selectedIcons];
    const selectedPaths = selectedIcons.map((icon) =>
      icon.getAttribute("data-path"),
    );

    if (e.ctrlKey) {
      switch (e.key.toLowerCase()) {
        case "x":
          this.app.fileOps.cutItems(selectedPaths);
          e.preventDefault();
          break;
        case "c":
          this.app.fileOps.copyItems(selectedPaths);
          e.preventDefault();
          break;
        case "v":
          this.app.fileOps.pasteItems(this.app.currentPath);
          e.preventDefault();
          break;
        case "z":
          this.app.fileOps.undo();
          e.preventDefault();
          break;
      }
    } else {
      if (e.key === "F2" && selectedIcons.length === 1) {
        this.app.enterRenameMode(selectedIcons[0]);
        e.preventDefault();
      } else if (e.key === "Enter" && selectedIcons.length > 0) {
        selectedIcons.forEach((icon) => {
          const type = icon.getAttribute("data-type");
          const path = icon.getAttribute("data-path");

          if (RecycleBinManager.isRecycledItemPath(path)) {
            PropertiesManager.show([path]);
            return;
          }

          if (type === "directory") {
            if (selectedIcons.length === 1) {
              this.app.navController.navigateTo(path);
            } else {
              launchApp("explorer", { filePath: path });
            }
          } else {
            this.app.openFile(icon);
          }
        });
        e.preventDefault();
      } else if (e.key === "Delete" && selectedIcons.length > 0) {
        const isRootItem = selectedPaths.some((p) => getParentPath(p) === "/");
        const containsRecycleBin = selectedPaths.some((p) =>
          RecycleBinManager.isRecycleBinPath(p),
        );
        if (!isRootItem && !containsRecycleBin) {
          this.app.fileOps.deleteItems(selectedPaths, e.shiftKey);
        }
        e.preventDefault();
      }
    }
  }
}
