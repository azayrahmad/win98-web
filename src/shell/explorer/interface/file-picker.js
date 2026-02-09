import { fs } from "@zenfs/core";
import { AddressBar } from '../../../shell/explorer/components/address-bar.js';
import { IconManager } from '../../../shell/desktop/icon-manager.js';
import { ShellManager } from '../extensions/shell-manager.js';
import { RecycleBinManager } from '../file-operations/recycle-bin-manager.js';
import {
  getDisplayName,
  formatPathForDisplay,
  joinPath,
  getParentPath,
} from '../navigation/path-utils.js';
import { renderFileIcon, getThemedIconObj } from './file-icon-renderer.js';
import { ICONS } from '../../../config/icons.js';
import { getAssociation } from '../../../system/directory.js';
import { sortFileInfos } from '../file-operations/sort-utils.js';
import { ShowDialogWindow } from '../../../shared/components/dialog-window.js';

export class FilePicker {
  constructor(options = {}) {
    this.options = {
      title: "Open",
      mode: "open", // 'open' or 'save'
      initialPath: "/C:/My Documents",
      fileTypes: [{ label: "All Files (*.*)", extensions: ["*"] }],
      suggestedName: "",
      ...options,
    };

    this.currentPath = this.options.initialPath;
    this.viewMode = "list"; // default to list for file picker
    this.selectedPath = null;
    this.onResolve = null;
    this.onReject = null;

    this.element = document.createElement("div");
    this.element.className = "file-picker";

    this._createUI();
  }

  _createUI() {
    // Top Row
    const topRow = document.createElement("div");
    topRow.className = "file-picker-top";

    const lookInLabel = document.createElement("label");
    lookInLabel.textContent = "Look in:";
    topRow.appendChild(lookInLabel);

    this.addressBar = new AddressBar({
      onEnter: (path) => this.navigateTo(path),
      getTreeItems: async (currentPath) => this._getTreeItems(currentPath),
    });
    // Override default label
    const abLabel = this.addressBar.element.querySelector(".address-bar-label");
    if (abLabel) abLabel.style.display = "none";

    topRow.appendChild(this.addressBar.element);

    const actions = document.createElement("div");
    actions.className = "file-picker-top-actions";

    const btnUp = this._createToolbarButton("up", "Up One Level", () =>
      this.goUp(),
    );
    const btnDesktop = this._createToolbarButton("desktop", "Desktop", () =>
      this.navigateTo("/Desktop"),
    );
    const btnNewFolder = this._createToolbarButton(
      "new-folder",
      "Create New Folder",
      () => this.createNewFolder(),
    );

    const viewGroup = document.createElement("div");
    viewGroup.className = "view-mode-group";

    const btnList = this._createToolbarButton("view-list", "List", () =>
      this.setViewMode("list"),
    );
    btnList.classList.add("toggle");
    const btnDetails = this._createToolbarButton(
      "view-details",
      "Details",
      () => this.setViewMode("details"),
    );
    btnDetails.classList.add("toggle");

    this.viewButtons = { list: btnList, details: btnDetails };
    this._updateViewButtons();

    viewGroup.append(btnList, btnDetails);
    actions.append(btnUp, btnDesktop, btnNewFolder, viewGroup);
    topRow.appendChild(actions);

    this.element.appendChild(topRow);

    // Middle Content
    this.content = document.createElement("div");
    this.content.className = "file-picker-content sunken-panel";

    this.iconContainer = document.createElement("ul");
    this.iconContainer.className = "explorer-icon-view list-icons";
    this.content.appendChild(this.iconContainer);

    this.element.appendChild(this.content);

    // Bottom Row
    const bottomRow = document.createElement("div");
    bottomRow.className = "file-picker-bottom";

    const form = document.createElement("div");
    form.className = "file-picker-form";

    // File name
    const nameRow = document.createElement("div");
    nameRow.className = "file-picker-row";
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "File name:";
    this.nameInput = document.createElement("input");
    this.nameInput.type = "text";
    this.nameInput.value = this.options.suggestedName || "";
    nameRow.append(nameLabel, this.nameInput);

    // File type
    const typeRow = document.createElement("div");
    typeRow.className = "file-picker-row";
    const typeLabel = document.createElement("label");
    typeLabel.textContent = "Files of type:";
    this.typeSelect = document.createElement("select");
    this.options.fileTypes.forEach((ft, index) => {
      const opt = document.createElement("option");
      opt.value = index;
      opt.textContent = ft.label;
      this.typeSelect.appendChild(opt);
    });
    this.typeSelect.onchange = () => this.renderDirectoryContents();
    typeRow.append(typeLabel, this.typeSelect);

    form.append(nameRow, typeRow);
    bottomRow.appendChild(form);

    const buttons = document.createElement("div");
    buttons.className = "file-picker-buttons";

    this.actionBtn = document.createElement("button");
    this.actionBtn.textContent = this.options.mode === "save" ? "Save" : "Open";
    this.actionBtn.onclick = () => this._handleAction();

    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.onclick = () => this._handleCancel();

    buttons.append(this.actionBtn, cancelBtn);
    bottomRow.appendChild(buttons);

    this.element.appendChild(bottomRow);

    this.iconManager = new IconManager(this.iconContainer, {
      iconSelector: ".explorer-icon",
      onSelectionChange: () => this._handleSelectionChange(),
    });

    this._setupEventListeners();
  }

  _createToolbarButton(iconName, title, action) {
    const btn = document.createElement("button");
    btn.className = "file-picker-toolbar-button";
    btn.title = title;

    const icon = document.createElement("div");
    icon.className = "toolbar-icon";

    // Map icons to the new filepicker.png sprite (horizontal, 16px each)
    const ICON_MAP = {
      "view-large": 0,
      "view-small": 1,
      "view-list": 2,
      "view-details": 3,
      "by-name": 4,
      "by-size": 5,
      "by-date": 6,
      "by-type": 7,
      up: 8,
      "new-file": 9,
      "cut-file": 10,
      "new-folder": 11,
    };

    if (iconName === "desktop") {
      icon.classList.add("desktop");
      icon.style.backgroundImage = `url(${ICONS.desktop_old[16]})`;
    } else {
      const iconId = ICON_MAP[iconName];
      if (iconId !== undefined) {
        icon.style.backgroundPosition = `-${iconId * 16}px 0`;
      }
    }

    btn.appendChild(icon);
    btn.onclick = action;
    return btn;
  }

  _updateViewButtons() {
    Object.entries(this.viewButtons).forEach(([mode, btn]) => {
      if (mode === this.viewMode) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.iconContainer.className = `explorer-icon-view ${mode}-icons`;
    this._updateViewButtons();
    this.renderDirectoryContents();
  }

  async navigateTo(path) {
    if (!path) return;
    let normalizedPath = path.replace(/\\/g, "/");
    if (!normalizedPath.startsWith("/")) normalizedPath = "/" + normalizedPath;

    try {
      await ShellManager.stat(normalizedPath);
      this.currentPath = normalizedPath;

      // Update Address Bar
      const name = getDisplayName(normalizedPath);
      const icon =
        ShellManager.getIconObj(normalizedPath) || ICONS.folderClosed;
      this.addressBar.setValue(formatPathForDisplay(normalizedPath));
      this.addressBar.setIcon(icon[16]);
      this.addressBar.setCurrentPath(normalizedPath);

      await this.renderDirectoryContents();
    } catch (e) {
      console.error("Navigation failed", e);
    }
  }

  goUp() {
    if (this.currentPath === "/") return;
    this.navigateTo(getParentPath(this.currentPath));
  }

  async renderDirectoryContents() {
    let rawFiles = await ShellManager.readdir(this.currentPath);
    rawFiles = rawFiles.filter((f) => f !== ".zen_layout.json");

    const selectedType = this.options.fileTypes[this.typeSelect.value];
    const extensions = selectedType ? selectedType.extensions : ["*"];

    const fileInfos = [];
    for (const file of rawFiles) {
      const fullPath = joinPath(this.currentPath, file);
      try {
        const fileStat = await ShellManager.stat(fullPath);
        const isDir = fileStat.isDirectory();

        // Filter files by extension if not All Files
        if (!isDir && extensions && !extensions.includes("*")) {
          const ext = file.split(".").pop().toLowerCase();
          if (!extensions.map((e) => e.toLowerCase()).includes(ext)) {
            continue;
          }
        }

        fileInfos.push({
          name: file,
          fullPath,
          stat: fileStat,
          isDirectory: isDir,
        });
      } catch (e) {
        // Handle broken stats if necessary
      }
    }

    const sortedInfos = sortFileInfos(fileInfos, "name", this.currentPath, []);

    this.iconContainer.innerHTML = "";
    this.iconManager.clearSelection();

    if (this.viewMode === "details") {
      const table = document.createElement("table");
      table.className = "interactive";
      const thead = document.createElement("thead");
      thead.innerHTML =
        "<tr><th>Name</th><th>Size</th><th>Type</th><th>Modified</th></tr>";
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      table.appendChild(tbody);

      for (const info of sortedInfos) {
        const {
          name: file,
          fullPath,
          stat: fileStat,
          isDirectory: isDir,
        } = info;
        const tr = document.createElement("tr");
        tr.className = "explorer-icon";
        tr.setAttribute("data-path", fullPath);
        tr.setAttribute("data-type", isDir ? "directory" : "file");
        tr.setAttribute("data-name", file);

        const tdName = document.createElement("td");
        tdName.className = "name-cell";
        const iconObj = await renderFileIcon(file, fullPath, isDir, {
          stat: fileStat,
        });
        tdName.appendChild(iconObj.querySelector(".icon"));
        tdName.appendChild(iconObj.querySelector(".icon-label"));
        tr.appendChild(tdName);

        const tdSize = document.createElement("td");
        tdSize.textContent = isDir ? "" : this._formatSize(fileStat.size);
        tr.appendChild(tdSize);

        const tdType = document.createElement("td");
        tdType.textContent = isDir
          ? "Folder"
          : getAssociation(file).name || "File";
        tr.appendChild(tdType);

        const tdMod = document.createElement("td");
        tdMod.textContent = this._formatDate(fileStat.mtime);
        tr.appendChild(tdMod);

        this.iconManager.configureIcon(tr);
        tbody.appendChild(tr);
      }
      this.iconContainer.appendChild(table);
    } else {
      for (const info of sortedInfos) {
        const {
          name: file,
          fullPath,
          stat: fileStat,
          isDirectory: isDir,
        } = info;
        const iconDiv = await renderFileIcon(file, fullPath, isDir, {
          stat: fileStat,
        });
        this.iconManager.configureIcon(iconDiv);
        this.iconContainer.appendChild(iconDiv);
      }
    }
  }

  _handleSelectionChange() {
    const selected = [...this.iconManager.selectedIcons];
    if (selected.length === 1) {
      const icon = selected[0];
      const type = icon.getAttribute("data-type");
      if (type === "file") {
        this.nameInput.value = icon.getAttribute("data-name");
      }
    }
  }

  _setupEventListeners() {
    this.iconContainer.addEventListener("dblclick", (e) => {
      const icon = e.target.closest(".explorer-icon");
      if (icon) {
        const path = icon.getAttribute("data-path");
        const type = icon.getAttribute("data-type");
        if (type === "directory") {
          this.navigateTo(path);
        } else {
          this.nameInput.value = icon.getAttribute("data-name");
          this._handleAction();
        }
      }
    });

    this.nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        this._handleAction();
      }
    });
  }

  async _handleAction() {
    let filename = this.nameInput.value.trim();
    if (!filename) return;

    const selectedType = this.options.fileTypes[this.typeSelect.value];

    // Auto-append extension if missing in save mode
    if (
      this.options.mode === "save" &&
      selectedType &&
      selectedType.extensions &&
      !selectedType.extensions.includes("*")
    ) {
      const hasExtension = filename.includes(".");
      if (!hasExtension) {
        filename += "." + selectedType.extensions[0];
      }
    }

    const fullPath = joinPath(this.currentPath, filename);

    if (this.options.mode === "open") {
      try {
        const stats = await ShellManager.stat(fullPath);
        if (stats.isDirectory()) {
          this.navigateTo(fullPath);
          return;
        }
        this._resolve(fullPath);
      } catch (e) {
        ShowDialogWindow({
          title: "Open",
          text: "File not found.",
          buttons: [{ label: "OK", isDefault: true }],
        });
      }
    } else {
      // Save mode
      try {
        const stats = await ShellManager.stat(fullPath);
        if (stats.isDirectory()) {
          this.navigateTo(fullPath);
          return;
        }
        // If file exists, confirm overwrite
        ShowDialogWindow({
          title: "Save As",
          text: `A file with the name ${filename} already exists. Do you want to replace it?`,
          buttons: [
            { label: "Yes", action: () => this._resolve(fullPath) },
            { label: "No", action: () => {} },
          ],
          modal: true,
        });
      } catch (e) {
        // File doesn't exist, which is fine for save
        this._resolve(fullPath);
      }
    }
  }

  _handleCancel() {
    this._resolve(null);
  }

  _resolve(result) {
    if (this.onResolve) {
      this.onResolve(result);
    }
    if (this.win) {
      this.win.close();
    }
  }

  async _getTreeItems(currentPath) {
    const items = [];
    const addItem = (name, path, iconObj, indent) => {
      items.push({ name, path, icon: iconObj[16], indent });
    };

    addItem("Desktop", "/Desktop", ICONS.desktop_old, 0);

    const desktopExt = ShellManager.getExtensionForPath("/Desktop");
    if (desktopExt) {
      for (const vItem of desktopExt.virtualItems) {
        const vPath =
          vItem.target && !vItem.target.startsWith("launch:")
            ? vItem.target
            : joinPath("/Desktop", vItem.name);
        let iconObj = vItem.icon;
        if (!iconObj) {
          if (vItem.name === "My Computer")
            iconObj = getThemedIconObj("computer");
          else if (vItem.name === "Recycle Bin")
            iconObj = getThemedIconObj(
              "recycle",
              await RecycleBinManager.isEmpty("/Recycle Bin"),
            );
          else if (vItem.name === "Network Neighborhood")
            iconObj = getThemedIconObj("network");
        }
        if (!iconObj) iconObj = ICONS.folder;
        addItem(vItem.name, vPath, iconObj, 1);

        if (vItem.name === "My Computer") {
          const drives = await ShellManager.readdir("/");
          for (const drive of drives) {
            const drivePath = joinPath("/", drive);
            const driveIcon =
              drive === "A:"
                ? ICONS.disketteDrive
                : drive === "E:"
                  ? ICONS.cdDrive
                  : ICONS.drive;
            addItem(getDisplayName(drivePath), drivePath, driveIcon, 2);
            if (currentPath.startsWith(drivePath)) {
              const relativePath = currentPath
                .substring(drivePath.length)
                .split("/")
                .filter(Boolean);
              let tempPath = drivePath;
              for (let i = 0; i < relativePath.length; i++) {
                tempPath = joinPath(tempPath, relativePath[i]);
                const icon =
                  ShellManager.getIconObj(tempPath) || ICONS.folderClosed;
                addItem(relativePath[i], tempPath, icon, 3 + i);
              }
            }
          }
        }
      }
    }
    return items;
  }

  async createNewFolder() {
    let name = "New Folder";
    let counter = 1;
    while (await this._exists(joinPath(this.currentPath, name))) {
      name = `New Folder (${counter++})`;
    }
    try {
      await fs.promises.mkdir(joinPath(this.currentPath, name));
      await this.renderDirectoryContents();
    } catch (e) {
      ShowDialogWindow({
        title: "Error",
        text: "Could not create folder.",
        buttons: [{ label: "OK", isDefault: true }],
      });
    }
  }

  async _exists(path) {
    try {
      await ShellManager.stat(path);
      return true;
    } catch (e) {
      return false;
    }
  }

  _formatSize(bytes) {
    if (bytes === 0) return "0 KB";
    return Math.ceil(bytes / 1024).toLocaleString() + " KB";
  }

  _formatDate(date) {
    const d = new Date(date);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }
}
