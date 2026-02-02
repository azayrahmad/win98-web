import { fs } from "@zenfs/core";
import {
  requestBusyState,
  releaseBusyState,
} from "../../../utils/busyStateManager.js";
import { renderFileIcon } from "./FileIconRenderer.js";
import { ICONS } from "../../../config/icons.js";
import { getAssociation } from "../../../utils/directory.js";
import { RecycleBinManager } from "../fileoperations/RecycleBinManager.js";
import UndoManager from "../fileoperations/UndoManager.js";
import ClipboardManager from "../fileoperations/ClipboardManager.js";
import { ShellManager } from "../extensions/ShellManager.js";
import {
  getDisplayName,
  formatPathForDisplay,
  joinPath,
  getParentPath,
} from "../navigation/PathUtils.js";
import LayoutManager from "./LayoutManager.js";
import { sortFileInfos } from "../fileoperations/SortUtils.js";

export class DirectoryView {
  constructor(app) {
    this.app = app;
    this._isRenaming = false;
    this.lastSelectedIcon = null;
    this.selectionTimestamp = 0;
  }

  async updateUIForPath(path) {
    const name = getDisplayName(path);
    let icon =
      path === "/"
        ? ICONS.computer
        : path.match(/^\/[A-Z]:\/?$/i)
          ? ICONS.drive
          : ICONS.folderOpen;

    const shellIcon = ShellManager.getIconObj(path);
    if (shellIcon) {
      icon = shellIcon;
    }

    if (path === "/A:") {
      icon = ICONS.disketteDrive;
    }
    if (path === "/E:") {
      icon = ICONS.disketteDrive;
    }
    if (RecycleBinManager.isRecycleBinPath(path)) {
      const isEmpty = await RecycleBinManager.isEmpty(path);
      icon = isEmpty ? ICONS.recycleBinEmpty : ICONS.recycleBinFull;
    }

    if (this.app.addressBar) {
      this.app.addressBar.setValue(formatPathForDisplay(path));
    }
    if (this.app.win && typeof this.app.win.title === "function") {
      this.app.win.title(name);
    }
    if (this.app.sidebar) {
      this.app.sidebar.update(name, icon[32]);
    }
    if (this.app.win && typeof this.app.win.setIcons === "function") {
      this.app.win.setIcons(icon);
    }
  }

  async renderDirectoryContents(path) {
    const layout = await LayoutManager.getLayout(path);
    let rawFiles = await ShellManager.readdir(path);

    rawFiles = rawFiles.filter((f) => f !== ".zen_layout.json");
    if (RecycleBinManager.isRecycleBinPath(path)) {
      rawFiles = rawFiles.filter((f) => f !== ".metadata.json");
    }

    const fileInfos = [];
    for (const file of rawFiles) {
      const fullPath = joinPath(path, file);
      try {
        const fileStat = await ShellManager.stat(fullPath);
        fileInfos.push({
          name: file,
          fullPath,
          stat: fileStat,
          isDirectory: fileStat.isDirectory(),
        });
      } catch (e) {
        fileInfos.push({
          name: file,
          fullPath,
          stat: { size: 0, mtime: new Date(0) },
          isDirectory: false,
        });
      }
    }

    const sortBy = layout.sortBy || "name";
    const order = layout.order || [];
    const sortedInfos = sortFileInfos(fileInfos, sortBy, path, order);

    const isIconView = this.app.viewMode === "large" || this.app.viewMode === "small";
    const iconContainer = this.app.iconContainer;
    const iconManager = this.app.iconManager;

    if (isIconView) {
      if (layout.autoArrange) {
        iconContainer.classList.remove("has-absolute-icons");
      } else {
        iconContainer.classList.add("has-absolute-icons");
      }
      if (this.app.isColumnLayout) {
        iconContainer.classList.add("column-layout");
      } else {
        iconContainer.classList.remove("column-layout");
      }
    } else {
      iconContainer.classList.remove("has-absolute-icons");
      iconContainer.classList.remove("column-layout");
    }

    iconContainer.innerHTML = "";
    iconManager.clearSelection();

    const isRecycleBin = RecycleBinManager.isRecycleBinPath(path);
    const metadata = isRecycleBin ? await RecycleBinManager.getMetadata(path) : null;
    const recycleBinEmpty = isRecycleBin ? await RecycleBinManager.isEmpty(path) : true;

    if (this.app.viewMode === "details") {
      const columns = ShellManager.getColumns(path);
      const table = document.createElement("table");
      table.className = "interactive";
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      columns.forEach((col) => {
        const th = document.createElement("th");
        th.textContent = col.label;
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      table.appendChild(tbody);

      for (const info of sortedInfos) {
        const { name: file, fullPath, stat: fileStat, isDirectory: isDir } = info;
        try {
          const tr = document.createElement("tr");
          tr.className = "explorer-icon";
          tr.setAttribute("tabindex", "0");
          tr.setAttribute("data-path", fullPath);
          tr.setAttribute("data-type", isDir ? "directory" : "file");
          tr.setAttribute("data-name", file);

          for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            const td = document.createElement("td");
            if (i === 0) {
              td.className = "name-cell";
              const iconObj = await renderFileIcon(file, fullPath, isDir, { metadata, recycleBinEmpty, stat: fileStat });
              const iconPart = iconObj.querySelector(".icon");
              const labelPart = iconObj.querySelector(".icon-label");
              if (iconPart) td.appendChild(iconPart);
              if (labelPart) td.appendChild(labelPart);
            } else {
              let value = await ShellManager.getColumnValue(fullPath, col.key, fileStat);
              if (value === null) {
                if (col.key === "size") value = isDir ? "" : this._formatSize(fileStat.size);
                else if (col.key === "type") value = isDir ? "Folder" : getAssociation(file).name || "File";
                else if (col.key === "modified") value = this._formatDate(fileStat.mtime);
                else value = "";
              }
              td.textContent = value;
            }
            tr.appendChild(td);
          }
          this.app.iconManager.configureIcon(tr);
          tr.addEventListener("click", (e) => {
            if (this._isRenaming) return;
            if (this.lastSelectedIcon === tr && Date.now() - this.selectionTimestamp > 500) {
              this.enterRenameMode(tr);
              e.stopPropagation();
            }
          });
          tbody.appendChild(tr);
        } catch (e) {}
      }
      iconContainer.appendChild(table);
      if (this.app.statusBar) {
        this.app.statusBar.setText(`${tbody.children.length} object(s)`);
      }
      return;
    }

    const icons = [];
    for (const info of sortedInfos) {
      const { name: file, fullPath, stat: fileStat, isDirectory: isDir } = info;
      try {
        const iconDiv = await renderFileIcon(file, fullPath, isDir, { metadata, recycleBinEmpty, stat: fileStat });
        this.app.iconManager.configureIcon(iconDiv);
        iconDiv.addEventListener("click", (e) => {
          if (this._isRenaming) return;
          if (this.lastSelectedIcon === iconDiv && Date.now() - this.selectionTimestamp > 500) {
            this.enterRenameMode(iconDiv);
            e.stopPropagation();
          }
        });

        if (isIconView && !layout.autoArrange) {
          iconDiv.style.position = "absolute";
          if (layout.positions && layout.positions[file]) {
            iconDiv.style.left = `${layout.positions[file].x}px`;
            iconDiv.style.top = `${layout.positions[file].y}px`;
          } else {
            const gridX = 75;
            const gridY = 85;
            const index = icons.length;
            let x, y;

            if (this.app.isColumnLayout) {
              const rows = Math.floor(iconContainer.clientHeight / gridY) || 1;
              x = Math.floor(index / rows) * gridX + 10;
              y = (index % rows) * gridY + 10;
            } else {
              const cols = Math.floor(iconContainer.clientWidth / gridX) || 1;
              x = (index % cols) * gridX + 10;
              y = Math.floor(index / cols) * gridY + 10;
            }

            iconDiv.style.left = `${x}px`;
            iconDiv.style.top = `${y}px`;
          }
        }
        icons.push(iconDiv);
      } catch (e) {}
    }

    iconContainer.innerHTML = "";
    iconManager.clearSelection();
    const fragment = document.createDocumentFragment();
    let maxRight = 0;
    let maxBottom = 0;
    icons.forEach((icon) => {
      fragment.appendChild(icon);
      if (isIconView && !layout.autoArrange) {
        const left = parseInt(icon.style.left) || 0;
        const top = parseInt(icon.style.top) || 0;
        maxRight = Math.max(maxRight, left + 75);
        maxBottom = Math.max(maxBottom, top + 90);
      }
    });
    if (isIconView && !layout.autoArrange) {
      const spacer = document.createElement("div");
      spacer.style.position = "absolute";
      spacer.style.left = `${maxRight}px`;
      spacer.style.top = `${maxBottom}px`;
      spacer.style.width = "1px";
      spacer.style.height = "1px";
      spacer.style.visibility = "hidden";
      fragment.appendChild(spacer);
    }
    iconContainer.appendChild(fragment);
    if (this.app.statusBar) {
      this.app.statusBar.setText(`${icons.length} object(s)`);
    }
  }

  updateCutIcons() {
    const { items, operation } = ClipboardManager.get();
    const cutPaths = operation === "cut" ? new Set(items) : new Set();
    const icons = this.app.iconContainer.querySelectorAll(".explorer-icon");
    icons.forEach((icon) => {
      const path = icon.getAttribute("data-path");
      if (cutPaths.has(path)) icon.classList.add("cut");
      else icon.classList.remove("cut");
    });
  }

  async enterRenameMode(icon) {
    if (this._isRenaming) return;
    const path = icon.getAttribute("data-path");
    const isRootItem = getParentPath(path) === "/";
    const isRecycleBin = RecycleBinManager.isRecycleBinPath(path);
    const isVirtual = icon.getAttribute("data-is-virtual") === "true";
    if (isRootItem || isRecycleBin || isVirtual) return;
    this._isRenaming = true;
    const label = icon.querySelector(".icon-label");
    const fullPath = icon.getAttribute("data-path");
    const oldName = fullPath.split("/").pop();
    const textarea = document.createElement("textarea");
    textarea.className = "icon-label-input";
    textarea.value = oldName;
    textarea.spellcheck = false;
    label.innerHTML = "";
    label.appendChild(textarea);
    const adjustTextareaHeight = (ta) => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    };
    adjustTextareaHeight(textarea);
    const dotIndex = oldName.lastIndexOf(".");
    if (dotIndex > 0 && icon.getAttribute("data-type") !== "directory") textarea.setSelectionRange(0, dotIndex);
    else textarea.select();
    textarea.focus();
    textarea.addEventListener("input", () => adjustTextareaHeight(textarea));
    const finishRename = async (save) => {
      if (!this._isRenaming) return;
      this._isRenaming = false;
      const newName = textarea.value.trim();
      const busyId = `rename-${Math.random()}`;
      if (save && newName && newName !== oldName) {
        requestBusyState(busyId, this.app.win.element);
        try {
          const parentPath = getParentPath(fullPath);
          const newPath = joinPath(parentPath, newName);
          await fs.promises.rename(ShellManager.getRealPath(fullPath), ShellManager.getRealPath(newPath));
          UndoManager.push({ type: "rename", data: { from: fullPath, to: newPath } });
        } catch (e) {
          alert(`Error renaming: ${e.message}`);
        } finally {
          await this.app.navigateTo(this.app.currentPath, true, true);
          document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
          releaseBusyState(busyId, this.app.win.element);
        }
      } else {
        await this.app.navigateTo(this.app.currentPath, true, true);
        document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
      }
    };
    textarea.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); finishRename(true); }
      else if (e.key === "Escape") finishRename(false);
    };
    textarea.onblur = () => finishRename(true);
    textarea.onclick = (e) => e.stopPropagation();
    textarea.ondblclick = (e) => e.stopPropagation();
  }

  enterRenameModeByPath(path) {
    const icon = this.app.iconContainer.querySelector(`.explorer-icon[data-path="${path}"]`);
    if (icon) {
      this.app.iconManager.setSelection(new Set([icon]));
      this.enterRenameMode(icon);
    }
  }

  _formatSize(bytes) {
    if (bytes === 0) return "0 KB";
    return Math.ceil(bytes / 1024).toLocaleString() + " KB";
  }

  _formatDate(date) {
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  handleSelectionChange() {
    const selectedIcons = this.app.iconManager.selectedIcons;
    if (selectedIcons.size === 1) {
      const icon = [...selectedIcons][0];
      if (this.lastSelectedIcon !== icon) {
        this.lastSelectedIcon = icon;
        this.selectionTimestamp = Date.now();
      }
    } else {
      this.lastSelectedIcon = null;
      this.selectionTimestamp = 0;
    }
  }
}
