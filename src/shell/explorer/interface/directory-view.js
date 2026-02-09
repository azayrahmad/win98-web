import { fs } from "@zenfs/core";
import {
  requestBusyState,
  releaseBusyState,
} from '../../../system/busy-state-manager.js';
import { renderFileIcon, getThemedIconObj } from './file-icon-renderer.js';
import { ICONS } from '../../../config/icons.js';
import { getAssociation } from '../../../system/directory.js';
import { RecycleBinManager } from '../file-operations/recycle-bin-manager.js';
import UndoManager from '../file-operations/undo-manager.js';
import ClipboardManager from '../file-operations/clipboard-manager.js';
import { ShellManager } from '../extensions/shell-manager.js';
import {
  getDisplayName,
  formatPathForDisplay,
  joinPath,
  getParentPath,
} from '../navigation/path-utils.js';
import LayoutManager from './layout-manager.js';
import { sortFileInfos } from '../file-operations/sort-utils.js';

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
        ? getThemedIconObj("computer")
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

    if (path === "/Network Neighborhood" || path === "/Desktop/Network Neighborhood") {
      icon = getThemedIconObj("network");
    }

    if (RecycleBinManager.isRecycleBinPath(path)) {
      const isEmpty = await RecycleBinManager.isEmpty(path);
      icon = getThemedIconObj("recycle", isEmpty);
    }

    const isWeb = this.app.isInWebMode;
    const displayPath = isWeb ? path : formatPathForDisplay(path);
    const displayTitle = isWeb ? `${name} - Internet Explorer` : name;

    this.app.addressBar.setValue(displayPath);
    this.app.addressBar.setIcon(icon[16]);
    this.app.addressBar.setCurrentPath(path);
    this.app.win.title(displayTitle);
    this.app.sidebar.update(name, icon[32]);
    this.app.titleElement.textContent = name;
    this.app.win.setIcons(icon);
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

    if (isIconView) {
      if (layout.autoArrange) {
        this.app.iconContainer.classList.remove("has-absolute-icons");
      } else {
        this.app.iconContainer.classList.add("has-absolute-icons");
      }
    } else {
      this.app.iconContainer.classList.remove("has-absolute-icons");
    }

    this.app.iconContainer.innerHTML = "";
    this.app.iconManager.clearSelection();

    const isGlobalRecycleBin = path === "/Recycle Bin" || path === "/Desktop/Recycle Bin";
    const isRecycleBin = RecycleBinManager.isRecycleBinPath(path);
    const isDriveRecycleBin = isRecycleBin && !isGlobalRecycleBin;
    const metadata = isDriveRecycleBin ? await RecycleBinManager.getMetadata(path) : null;
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
              const iconObj = await renderFileIcon(file, fullPath, isDir, {
                metadata,
                recycleBinEmpty,
                stat: fileStat,
              });

              // Copy CSS variables from the rendered icon to the table row
              // This ensures selection highlight URLs are available in details view
              [
                "--icon-url-32",
                "--icon-url-16",
                "--overlay-url-32",
                "--overlay-url-16",
              ].forEach((prop) => {
                tr.style.setProperty(
                  prop,
                  iconObj.style.getPropertyValue(prop),
                );
              });

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
      this.app.iconContainer.appendChild(table);
      this.app.statusBar.setText(`${tbody.children.length} object(s)`);
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
            const cols = Math.floor(this.app.iconContainer.clientWidth / gridX) || 1;
            const index = icons.length;
            const x = (index % cols) * gridX + 10;
            const y = Math.floor(index / cols) * gridY + 10;
            iconDiv.style.left = `${x}px`;
            iconDiv.style.top = `${y}px`;
          }
        }
        icons.push(iconDiv);
      } catch (e) {}
    }

    this.app.iconContainer.innerHTML = "";
    this.app.iconManager.clearSelection();
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
    this.app.iconContainer.appendChild(fragment);
    this.app.statusBar.setText(`${icons.length} object(s)`);
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
    const isRecycledItem = RecycleBinManager.isRecycledItemPath(path);
    const isVirtual = icon.getAttribute("data-is-virtual") === "true";
    if (isRootItem || isRecycleBin || isRecycledItem || isVirtual) return;
    this._isRenaming = true;
    const label = icon.querySelector(".icon-label");
    const fullPath = icon.getAttribute("data-path");
    const oldName = fullPath.split("/").pop();
    const isShortcut = oldName.endsWith(".lnk.json") || oldName.endsWith(".lnk");
    const textarea = document.createElement("textarea");
    textarea.className = "icon-label-input";
    textarea.value = isShortcut ? oldName.replace(".lnk.json", "").replace(".lnk", "") : oldName;
    textarea.spellcheck = false;

    // Hide label and add textarea as sibling
    label.style.display = "none";
    icon.appendChild(textarea);

    const adjustTextareaHeight = (ta) => {
      ta.style.height = "auto";
      ta.style.height = `${ta.scrollHeight}px`;
    };
    adjustTextareaHeight(textarea);

    textarea.scrollIntoView({ block: "nearest" });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!this._isRenaming) return;
        const dotIndex = oldName.lastIndexOf(".");
        if (dotIndex > 0 && icon.getAttribute("data-type") !== "directory")
          textarea.setSelectionRange(0, dotIndex);
        else textarea.select();
        textarea.focus();
      });
    });

    textarea.addEventListener("input", () => adjustTextareaHeight(textarea));

    const finishRename = async (save) => {
      if (!this._isRenaming) return;
      this._isRenaming = false;
      let newName = textarea.value.trim();
      if (isShortcut && newName && !newName.endsWith(".lnk.json") && !newName.endsWith(".lnk")) {
        newName += ".lnk.json";
      }
      const busyId = `rename-${Math.random()}`;

      // Clean up UI immediately
      textarea.remove();
      label.style.display = "";

      if (save && newName && newName !== oldName) {
        // Optimistic update
        label.textContent = newName;

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
        // Already reverted by label.style.display = "" above
      }
    };
    textarea.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === "Enter") { e.preventDefault(); finishRename(true); }
      else if (e.key === "Escape") { e.preventDefault(); finishRename(false); }
    };
    textarea.onblur = () => finishRename(true);
    textarea.onmousedown = (e) => e.stopPropagation();
    textarea.onclick = (e) => e.stopPropagation();
    textarea.ondblclick = (e) => e.stopPropagation();
  }

  async enterRenameModeByPath(path) {
    let icon = this.app.iconContainer.querySelector(
      `.explorer-icon[data-path="${path}"]`,
    );

    // Retry a few times if not found, as rendering might be async
    if (!icon) {
      for (let i = 0; i < 10; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        icon = this.app.iconContainer.querySelector(
          `.explorer-icon[data-path="${path}"]`,
        );
        if (icon) break;
      }
    }

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
