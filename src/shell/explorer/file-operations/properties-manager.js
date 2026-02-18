import { fs } from "@zenfs/core";
import { getAssociation } from '../../../system/directory.js';
import { ICONS } from '../../../config/icons.js';
import { ShowDialogWindow } from '../../../shared/components/dialog-window.js';
import {
  formatPathForDisplay,
  getDisplayName,
  joinPath,
  getPathName,
} from '../navigation/path-utils.js';
import { getIconForFile } from '../interface/file-icon-renderer.js';
import { RecycleBinManager } from './recycle-bin-manager.js';
import { ShellManager } from '../extensions/shell-manager.js';

/**
 * PropertiesManager - Handles showing properties for files and folders in ZenExplorer
 */
export class PropertiesManager {
  /**
   * Show properties for one or more paths
   * @param {string[]} paths - Array of paths to show properties for
   */
  static async show(paths) {
    if (!paths || paths.length === 0) return;

    try {
      const items = await Promise.all(
        paths.map(async (path) => {
          const stats = await ShellManager.stat(path);
          return { path, stats };
        }),
      );

      if (items.length === 1) {
        await this._showSingleProperties(items[0]);
      } else {
        await this._showMultipleProperties(items);
      }
    } catch (error) {
      console.error("Failed to show properties:", error);
    }
  }

  /**
   * Show properties for a single item
   * @private
   */
  static async _showSingleProperties(item) {
    let { path, stats } = item;
    const isDir = stats.isDirectory();
    const isRecycled = RecycleBinManager.isRecycledItemPath(path);
    let name = getPathName(path);
    let displayPath = formatPathForDisplay(path);
    let locationLabel = "Location";
    let iconUrl = getIconForFile(name, isDir);

    if (isRecycled) {
      const entry = stats.isVirtual ? {
          originalName: stats.originalName,
          originalPath: stats.originalPath
      } : await RecycleBinManager.getRecycledItemInfo(path);

      if (entry) {
        name = entry.originalName;
        displayPath = formatPathForDisplay(entry.originalPath);
        locationLabel = "Origin";
        // For recycled items, use the original icon if possible
        iconUrl = getIconForFile(name, isDir);
      }
    }

    let type = "File Folder";
    if (!isDir) {
      const association = getAssociation(name);
      type = association.name || "File";
    }

    const isUserDrive = path.startsWith("/C:");
    const formatDate = (date) => {
      if (!isUserDrive || !date) return "(unknown)";
      return this._formatDateTime(date);
    };

    const created = formatDate(stats.birthtime);
    const modified = formatDate(stats.mtime);
    const accessed = formatDate(stats.atime);

    let shortcutData = null;
    const isShortcutFile = !isDir && (name.endsWith(".lnk.json") || name.endsWith(".lnk"));
    if (isShortcutFile) {
      try {
        const content = await fs.promises.readFile(ShellManager.getRealPath(path), "utf8");
        shortcutData = JSON.parse(content);
      } catch (e) {
        console.error("Failed to read shortcut data", e);
      }
    }

    const { container, sizeEl, containsEl, nameInput, shortcutInputs } = this._createPropertiesUI({
      iconUrl,
      name,
      type,
      location: displayPath,
      locationLabel,
      size: isDir ? "Calculating..." : this._formatSize(stats.size),
      contains: isDir ? "Calculating..." : null,
      created,
      modified,
      accessed,
    }, shortcutData);

    const handleSave = async () => {
      let currentPath = path;
      let currentName = name;

      // 1. Handle Rename
      const newNameBase = nameInput.value.trim();
      if (newNameBase && newNameBase !== (isShortcutFile ? name.replace(".lnk.json", "").replace(".lnk", "") : name)) {
        let newName = newNameBase;
        if (isShortcutFile && !newName.endsWith(".lnk.json") && !newName.endsWith(".lnk")) {
          newName += ".lnk.json";
        }

        const parentPath = path.substring(0, path.lastIndexOf("/")) || "/";
        const newPath = joinPath(parentPath, newName);

        try {
          await fs.promises.rename(ShellManager.getRealPath(path), ShellManager.getRealPath(newPath));
          currentPath = newPath;
          currentName = newName;
          path = currentPath;
          name = currentName;
        } catch (e) {
          console.error("Failed to rename file:", e);
          alert("Failed to rename file: " + e.message);
          return false;
        }
      }

      // 2. Handle Shortcut Content Update
      if (isShortcutFile && shortcutInputs) {
        const updatedShortcutData = {
          ...shortcutData,
          type: "shortcut",
          targetPath: shortcutInputs.targetInput.value.trim(),
          appId: shortcutInputs.appIdInput.value.trim(),
          args: shortcutInputs.argsInput.value.trim(),
        };

        try {
          await fs.promises.writeFile(ShellManager.getRealPath(currentPath), JSON.stringify(updatedShortcutData, null, 2));
        } catch (e) {
          console.error("Failed to update shortcut:", e);
          alert("Failed to update shortcut: " + e.message);
          return false;
        }
      }

      document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: "properties-manager" } }));
      return true;
    };

    const win = ShowDialogWindow({
      title: `${name} Properties`,
      content: container,
      buttons: [
        {
          label: "OK",
          isDefault: true,
          action: async () => {
            return await handleSave();
          }
        },
        { label: "Cancel" },
        {
          label: "Apply",
          disabled: true,
          action: async () => {
            const success = await handleSave();
            if (success) {
              win.$content.find(".apply-button").prop("disabled", true);
              // Update title if renamed
              win.title(`${nameInput.value.trim()} Properties`);
            }
            return false; // Keep open
          }
        }
      ],
      modal: true,
    });

    const $applyBtn = win.$content.find("button").filter(function() {
      return $(this).text() === "Apply";
    });

    const enableApply = () => {
      $applyBtn.prop("disabled", false);
    };

    nameInput.addEventListener("input", enableApply);
    if (shortcutInputs) {
      shortcutInputs.targetInput.addEventListener("input", enableApply);
      shortcutInputs.appIdInput.addEventListener("input", enableApply);
      shortcutInputs.argsInput.addEventListener("input", enableApply);
    }

    if (isDir) {
      const controller = new AbortController();
      win.onClosed(() => controller.abort());

      // Async size and contains calculation
      (async () => {
        try {
          const size = await this._getRecursiveSize(path, controller.signal);
          if (controller.signal.aborted) return;
          sizeEl.textContent = this._formatSize(size);

          const children = await ShellManager.readdir(path);
          let filesCount = 0;
          let foldersCount = 0;
          for (const child of children) {
            if (controller.signal.aborted) return;
            try {
              const childPath = joinPath(path, child);
              const childStats = await ShellManager.stat(childPath);
              if (childStats.isDirectory()) foldersCount++;
              else filesCount++;
            } catch (e) {}
          }
          const filesStr = filesCount === 1 ? "File" : "Files";
          const foldersStr = foldersCount === 1 ? "Folder" : "Folders";
          containsEl.textContent = `${filesCount} ${filesStr}, ${foldersCount} ${foldersStr}`;
        } catch (e) {
          if (e.name !== "AbortError") console.error(e);
        }
      })();
    }
  }

  /**
   * Show summary properties for multiple items
   * @private
   */
  static async _showMultipleProperties(items) {
    let filesCount = 0;
    let foldersCount = 0;
    const types = new Set();

    for (const item of items) {
      const isDir = item.stats.isDirectory();
      const name = getPathName(item.path);
      if (isDir) {
        foldersCount++;
        types.add("File Folder");
      } else {
        filesCount++;
        const association = getAssociation(name);
        types.add(association.name || "File");
      }
    }

    const filesStr = filesCount === 1 ? "File" : "Files";
    const foldersStr = foldersCount === 1 ? "Folder" : "Folders";
    const name = `${filesCount} ${filesStr}, ${foldersCount} ${foldersStr}`;
    const type = types.size === 1 ? [...types][0] : "Multiple Types";

    const lastSlashIndex = items[0].path.lastIndexOf("/");
    const parentPathInternal =
      items[0].path.substring(0, lastSlashIndex) || "/";
    const location = `All in ${formatPathForDisplay(parentPathInternal)}`;

    const { container, sizeEl } = this._createPropertiesUI({
      iconUrl: ICONS.fileSet[32],
      name,
      type,
      location,
      size: "Calculating...",
    });

    const win = ShowDialogWindow({
      title: `Properties`,
      content: container,
      buttons: [
        { label: "OK", isDefault: true },
        { label: "Cancel" },
        { label: "Apply" },
      ],
      modal: true,
    });

    const controller = new AbortController();
    win.onClosed(() => controller.abort());

    (async () => {
      try {
        let totalSize = 0;
        for (const item of items) {
          if (controller.signal.aborted) return;
          if (item.stats.isDirectory()) {
            totalSize += await this._getRecursiveSize(
              item.path,
              controller.signal,
            );
          } else {
            totalSize += item.stats.size;
          }
        }
        if (controller.signal.aborted) return;
        sizeEl.textContent = this._formatSize(totalSize);
      } catch (e) {
        if (e.name !== "AbortError") console.error(e);
      }
    })();
  }

  /**
   * Calculate recursive size of a directory
   * @private
   */
  static async _getRecursiveSize(path, signal) {
    let size = 0;
    try {
      const files = await ShellManager.readdir(path);
      for (const file of files) {
        if (signal?.aborted) return 0;
        const fullPath = joinPath(path, file);
        const stats = await ShellManager.stat(fullPath);
        if (stats.isDirectory()) {
          size += await this._getRecursiveSize(fullPath, signal);
        } else {
          size += stats.size;
        }
      }
    } catch (e) {
      console.error("Error calculating recursive size", e);
    }
    return size;
  }

  /**
   * Format size in KB and bytes
   * @private
   */
  static _formatSize(bytes) {
    const kb = Math.ceil(bytes / 1024);
    return `${kb.toLocaleString()}KB (${bytes.toLocaleString()} bytes)`;
  }

  /**
   * Format date and time according to spec
   * @private
   */
  static _formatDateTime(date) {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: true,
    };
    // Using en-US to match the requested format
    let formatted = new Intl.DateTimeFormat("en-US", options).format(date);
    // Ensure comma after the year if it's missing (locales vary)
    // Expected: Tuesday, February 2, 2026, 11:45:30 PM
    // Intl might return "Tuesday, February 2, 2026 at 11:45:30 PM"
    return formatted.replace(" at ", ", ");
  }

  /**
   * Create the DOM structure for properties dialog
   * @private
   */
  static _createPropertiesUI(data, shortcutData = null) {
    const isShortcut = !!shortcutData;
    const container = document.createElement("div");
    container.className = "properties-tabs";
    container.style.minWidth = "320px";

    const menu = document.createElement("menu");
    menu.setAttribute("role", "tablist");
    menu.style.margin = "0 0 -1px 0";

    const generalTab = document.createElement("li");
    generalTab.setAttribute("role", "tab");
    generalTab.setAttribute("aria-selected", "true");
    generalTab.innerHTML = `<a href="#">General</a>`;
    menu.appendChild(generalTab);

    let shortcutTab = null;
    if (isShortcut) {
      shortcutTab = document.createElement("li");
      shortcutTab.setAttribute("role", "tab");
      shortcutTab.innerHTML = `<a href="#">Shortcut</a>`;
      menu.appendChild(shortcutTab);
    }

    container.appendChild(menu);

    const tabWindow = document.createElement("div");
    tabWindow.className = "tab-window outset-deep";
    tabWindow.setAttribute("role", "tabpanel");
    tabWindow.style.backgroundColor = "var(--ButtonFace)";

    const tabWindowBody = document.createElement("div");
    tabWindowBody.className = "tab-window-body";
    tabWindowBody.style.padding = "10px";
    tabWindow.appendChild(tabWindowBody);

    container.appendChild(tabWindow);

    const generalContent = document.createElement("div");
    generalContent.className = "tab-content";
    tabWindowBody.appendChild(generalContent);

    let shortcutContent = null;
    if (isShortcut) {
      shortcutContent = document.createElement("div");
      shortcutContent.className = "tab-content";
      shortcutContent.style.display = "none";
      tabWindowBody.appendChild(shortcutContent);
    }

    // Fill General Tab
    const { nameInput, sizeEl, containsEl } = this._fillGeneralTab(generalContent, data, isShortcut);

    // Fill Shortcut Tab
    let shortcutInputs = null;
    if (isShortcut) {
      shortcutInputs = this._fillShortcutTab(shortcutContent, data, shortcutData);
    }

    // Tab switching logic
    if (shortcutTab) {
      const tabs = [generalTab, shortcutTab];
      const contents = [generalContent, shortcutContent];
      tabs.forEach((tab, index) => {
        tab.addEventListener("click", (e) => {
          e.preventDefault();
          tabs.forEach((t) => t.setAttribute("aria-selected", "false"));
          tab.setAttribute("aria-selected", "true");
          contents.forEach((c) => (c.style.display = "none"));
          contents[index].style.display = "block";
        });
      });
    }

    return { container, nameInput, sizeEl, containsEl, shortcutInputs };
  }

  /**
   * Fill the General tab content
   * @private
   */
  static _fillGeneralTab(container, data, isShortcut) {
    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.alignItems = "center";
    header.style.marginBottom = "15px";
    header.style.borderBottom = "1px solid #808080";
    header.style.paddingBottom = "10px";

    const icon = document.createElement("img");
    icon.src = data.iconUrl;
    icon.style.width = "32px";
    icon.style.height = "32px";
    icon.style.marginRight = "15px";
    header.appendChild(icon);

    const nameIsEditable = !data.name.includes("Items") && !data.name.includes("Files");
    let nameInput;
    if (nameIsEditable) {
        nameInput = document.createElement("input");
        nameInput.type = "text";
        nameInput.value = isShortcut ? data.name.replace(".lnk.json", "").replace(".lnk", "") : data.name;
        nameInput.style.flex = "1";
    } else {
        nameInput = document.createElement("label");
        nameInput.textContent = data.name;
    }
    header.appendChild(nameInput);

    container.appendChild(header);

    const details = document.createElement("div");
    details.style.display = "grid";
    details.style.gridTemplateColumns = "max-content 1fr";
    details.style.gap = "8px 15px";
    details.style.fontSize = "11px";

    let sizeEl, containsEl;

    const addRow = (label, value) => {
      if (value === undefined || value === null) return null;
      const labelEl = document.createElement("div");
      labelEl.textContent = label + ":";
      const valueEl = document.createElement("div");
      valueEl.textContent = value;
      details.appendChild(labelEl);
      details.appendChild(valueEl);
      return valueEl;
    };

    addRow("Type", data.type);
    addRow(data.locationLabel || "Location", data.location);
    sizeEl = addRow("Size", data.size);

    if (data.contains) {
      containsEl = addRow("Contains", data.contains);
    }

    if (data.created || data.modified || data.accessed) {
      const separator = document.createElement("div");
      separator.style.gridColumn = "span 2";
      separator.style.borderBottom = "1px solid #808080";
      separator.style.margin = "10px 0";
      details.appendChild(separator);

      addRow("Created", data.created);
      addRow("Modified", data.modified);
      addRow("Accessed", data.accessed);
    }

    container.appendChild(details);
    return { nameInput, sizeEl, containsEl };
  }

  /**
   * Fill the Shortcut tab content
   * @private
   */
  static _fillShortcutTab(container, data, shortcutData) {
    const details = document.createElement("div");
    details.style.display = "grid";
    details.style.gridTemplateColumns = "max-content 1fr";
    details.style.gap = "8px 15px";
    details.style.fontSize = "11px";

    const targetInput = document.createElement("input");
    targetInput.type = "text";
    targetInput.value = shortcutData.targetPath || "";

    const appIdInput = document.createElement("input");
    appIdInput.type = "text";
    appIdInput.value = shortcutData.appId || "";

    const argsInput = document.createElement("input");
    argsInput.type = "text";
    argsInput.value = shortcutData.args || "";

    const addInputRow = (label, input) => {
      const labelEl = document.createElement("label");
      labelEl.textContent = label + ":";
      details.appendChild(labelEl);
      details.appendChild(input);
    };

    addInputRow("Target", targetInput);
    addInputRow("App ID", appIdInput);
    addInputRow("Arguments", argsInput);

    container.appendChild(details);

    return { targetInput, appIdInput, argsInput };
  }
}
