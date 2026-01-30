import { fs } from "@zenfs/core";
import { renderFileIcon } from "./FileIconRenderer.js";
import { ICONS } from "../../../config/icons.js";
import { getAssociation } from "../../../utils/directory.js";
import { RecycleBinManager } from "../utils/RecycleBinManager.js";
import ZenUndoManager from "../utils/ZenUndoManager.js";
import ZenClipboardManager from "../utils/ZenClipboardManager.js";
import { ZenShellManager } from "../utils/ZenShellManager.js";
import {
  getDisplayName,
  formatPathForDisplay,
  joinPath,
  getParentPath,
} from "../utils/PathUtils.js";
import ZenLayoutManager from "../utils/ZenLayoutManager.js";

export class ZenDirectoryView {
  constructor(app) {
    this.app = app;
    this._isRenaming = false;
    this.lastSelectedIcon = null;
    this.selectionTimestamp = 0;
  }

  /**
   * Update UI elements for current path
   */
  async updateUIForPath(path) {
    const name = getDisplayName(path);
    let icon =
      path === "/"
        ? ICONS.computer
        : path.match(/^\/[A-Z]:\/?$/i)
          ? ICONS.drive
          : ICONS.folderOpen;

    // Try shell extension icon
    const shellIcon = await ZenShellManager.getIconObj(path);
    if (shellIcon) {
      icon = shellIcon;
    }

    // Handle Floppy icon
    if (path === "/A:") {
      icon = ICONS.disketteDrive;
    }
    // Handle CD icon
    if (path === "/E:") {
      icon = ICONS.disketteDrive;
    }
    if (RecycleBinManager.isRecycleBinPath(path)) {
      const isEmpty = await RecycleBinManager.isEmpty();
      icon = isEmpty ? ICONS.recycleBinEmpty : ICONS.recycleBinFull;
    }

    this.app.addressBar.setValue(formatPathForDisplay(path));
    this.app.win.title(name);
    this.app.sidebar.update(name, icon[32]);
    this.app.win.setIcons(icon);
  }

  /**
   * Render directory contents
   */
  async renderDirectoryContents(path) {
    const layout = await ZenLayoutManager.getLayout(path);
    let files = await ZenShellManager.readdir(path);

   
    
    // Hide metadata file in recycle bin and layout file
    files = files.filter((f) => f !== ".zen_layout.json");
    if (RecycleBinManager.isRecycleBinPath(path)) {
      files = files.filter((f) => f !== ".metadata.json");
    }

    // Apply layout logic only for icon views (large/small)
    const isIconView =
      this.app.viewMode === "large" || this.app.viewMode === "small";

    if (isIconView) {
      if (layout.autoArrange) {
        this.app.iconContainer.classList.remove("has-absolute-icons");

        const order = layout.order || [];
        const getOrderIndex = (name) => {
          const index = order.indexOf(name);
          return index === -1 ? Infinity : index;
        };

        // Split into folders and files
        const folderFiles = [];
        const normalFiles = [];

        for (const file of files) {
          const fullPath = joinPath(path, file);
          try {
            const stat = await fs.promises.stat(fullPath);
            if (stat.isDirectory()) folderFiles.push(file);
            else normalFiles.push(file);
          } catch (e) {
            normalFiles.push(file);
          }
        }

        // Sort each group by custom order, then alphabetically
        const sortByOrder = (a, b) => {
          const orderA = getOrderIndex(a);
          const orderB = getOrderIndex(b);
          if (orderA !== orderB) return orderA - orderB;
          return a.localeCompare(b);
        };

        folderFiles.sort(sortByOrder);
        normalFiles.sort(sortByOrder);

        files = [...folderFiles, ...normalFiles];
      } else {
        this.app.iconContainer.classList.add("has-absolute-icons");
        // Alphabetical sort as baseline for free-form
        files.sort((a, b) => a.localeCompare(b));
      }
    } else {
      this.app.iconContainer.classList.remove("has-absolute-icons");
      // Sort files alphabetically
      files.sort((a, b) => {
        // Special sort for root: Drives before shell extensions
        if (path === "/") {
          const isDriveA = a.match(/^[A-Z]:$/i);
          const isDriveB = b.match(/^[A-Z]:$/i);
          if (isDriveA && !isDriveB) return -1;
          if (!isDriveA && isDriveB) return 1;
        }
        return a.localeCompare(b);
      });
    }

    // Clear view
    this.app.iconContainer.innerHTML = "";
    this.app.iconManager.clearSelection();

    const isRecycleBin = RecycleBinManager.isRecycleBinPath(path);
    const metadata = isRecycleBin
      ? await RecycleBinManager.getMetadata()
      : null;
    const recycleBinEmpty = await RecycleBinManager.isEmpty();

    // Details view rendering
    if (this.app.viewMode === "details") {
      const columns = ZenShellManager.getColumns(path);
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

      for (const file of files) {
        const fullPath = joinPath(path, file);
        try {
          const fileStat = await ZenShellManager.stat(fullPath);
          const isDir = fileStat.isDirectory();

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
              // First column is always the name with icon
              td.className = "name-cell";

              // Re-use renderFileIcon parts or just icons
              const iconObj = await renderFileIcon(file, fullPath, isDir, {
                metadata,
                recycleBinEmpty,
              });
              // Extract icon and label
              const iconPart = iconObj.querySelector(".icon");
              const labelPart = iconObj.querySelector(".icon-label");

              if (iconPart) td.appendChild(iconPart);
              if (labelPart) td.appendChild(labelPart);
            } else {
              // Try shell manager for value
              let value = await ZenShellManager.getColumnValue(
                fullPath,
                col.key,
                fileStat,
              );

              // Fallback to defaults if not provided by extension
              if (value === null) {
                if (col.key === "size") {
                  value = isDir ? "" : this._formatSize(fileStat.size);
                } else if (col.key === "type") {
                  value = isDir
                    ? "Folder"
                    : getAssociation(file).name || "File";
                } else if (col.key === "modified") {
                  value = this._formatDate(fileStat.mtime);
                } else {
                  value = "";
                }
              }
              td.textContent = value;
            }
            tr.appendChild(td);
          }

          this.app.iconManager.configureIcon(tr);

          // Rename listener
          tr.addEventListener("click", (e) => {
            if (this._isRenaming) return;
            if (
              this.lastSelectedIcon === tr &&
              Date.now() - this.selectionTimestamp > 500
            ) {
              this.enterRenameMode(tr);
              e.stopPropagation();
            }
          });

          tbody.appendChild(tr);
        } catch (e) {
          console.warn("Could not stat", fullPath);
        }
      }
      this.app.iconContainer.appendChild(table);
      this.app.statusBar.setText(`${tbody.children.length} object(s)`);
      return;
    }

    // Build icons first (async operations here)
    const icons = [];
    for (const file of files) {
      const fullPath = joinPath(path, file);
      try {
        const fileStat = await ZenShellManager.stat(fullPath);
        const isDir = fileStat.isDirectory();
        const iconDiv = await renderFileIcon(file, fullPath, isDir, {
          metadata,
          recycleBinEmpty,
        });
        this.app.iconManager.configureIcon(iconDiv);

        // Add click listener for inline rename
        iconDiv.addEventListener("click", (e) => {
          if (this._isRenaming) return;
          if (
            this.lastSelectedIcon === iconDiv &&
            Date.now() - this.selectionTimestamp > 500
          ) {
            this.enterRenameMode(iconDiv);
            e.stopPropagation();
          }
        });

        // Apply absolute position if auto-arrange is off
        if (isIconView && !layout.autoArrange) {
          iconDiv.style.position = "absolute";
          if (layout.positions && layout.positions[file]) {
            iconDiv.style.left = `${layout.positions[file].x}px`;
            iconDiv.style.top = `${layout.positions[file].y}px`;
          } else {
            // Fallback placement for items without saved positions
            const gridX = 75;
            const gridY = 85;
            const cols =
              Math.floor(this.app.iconContainer.clientWidth / gridX) || 1;
            const index = icons.length;
            const x = (index % cols) * gridX + 10;
            const y = Math.floor(index / cols) * gridY + 10;
            iconDiv.style.left = `${x}px`;
            iconDiv.style.top = `${y}px`;
          }
        }

        icons.push(iconDiv);
      } catch (e) {
        console.warn("Could not stat", fullPath);
      }
    }

    // Only clear and update DOM once all icons are ready to avoid duplication during concurrent renders
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

    // Add spacer for absolute layout to enable scrollbars
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

  /**
   * Update icon styles based on clipboard state
   */
  updateCutIcons() {
    const { items, operation } = ZenClipboardManager.get();
    const cutPaths = operation === "cut" ? new Set(items) : new Set();

    const icons = this.app.iconContainer.querySelectorAll(".explorer-icon");
    icons.forEach((icon) => {
      const path = icon.getAttribute("data-path");
      if (cutPaths.has(path)) {
        icon.classList.add("cut");
      } else {
        icon.classList.remove("cut");
      }
    });
  }

  /**
   * Enter inline rename mode for an icon
   * @param {HTMLElement} icon - The icon element
   */
  async enterRenameMode(icon) {
    if (this._isRenaming) return;

    const path = icon.getAttribute("data-path");
    const isRootItem = getParentPath(path) === "/";
    const isRecycleBin = RecycleBinManager.isRecycleBinPath(path);
    const isShellItem = ZenShellManager.getExtensionForPath(path);

    if (isRootItem || isRecycleBin || isShellItem) return;

    this._isRenaming = true;

    const label = icon.querySelector(".icon-label");
    const fullPath = icon.getAttribute("data-path");
    const oldName = fullPath.split("/").pop();

    const textarea = document.createElement("textarea");
    textarea.className = "icon-label-input";
    textarea.value = oldName;
    textarea.spellcheck = false; // Disable spell check for file names

    label.innerHTML = "";
    label.appendChild(textarea);

    const adjustTextareaHeight = (ta) => {
      ta.style.height = "auto"; // Reset height to recalculate
      ta.style.height = `${ta.scrollHeight}px`;
    };

    // Initial adjustment
    adjustTextareaHeight(textarea);

    // Select filename without extension
    const dotIndex = oldName.lastIndexOf(".");
    if (dotIndex > 0 && icon.getAttribute("data-type") !== "directory") {
      textarea.setSelectionRange(0, dotIndex);
    } else {
      textarea.select();
    }
    textarea.focus();

    // Adjust height on input
    textarea.addEventListener("input", () => adjustTextareaHeight(textarea));

    const finishRename = async (save) => {
      if (!this._isRenaming) return;
      this._isRenaming = false;

      const newName = textarea.value.trim();
      if (save && newName && newName !== oldName) {
        try {
          const parentPath = getParentPath(fullPath);
          const newPath = joinPath(parentPath, newName);
          await fs.promises.rename(fullPath, newPath);
          ZenUndoManager.push({
            type: "rename",
            data: { from: fullPath, to: newPath },
          });
        } catch (e) {
          alert(`Error renaming: ${e.message}`);
          label.textContent = getDisplayName(fullPath);
        }
      } else {
        label.textContent = getDisplayName(fullPath);
      }

      await this.app.navigateTo(this.app.currentPath, true, true);
      document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
    };

    textarea.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        // Prevent new line on Enter
        e.preventDefault();
        finishRename(true);
      } else if (e.key === "Escape") {
        finishRename(false);
      }
    };

    textarea.onblur = () => {
      finishRename(true);
    };

    // Prevent click propagation to avoid re-triggering rename
    textarea.onclick = (e) => e.stopPropagation();
    textarea.ondblclick = (e) => e.stopPropagation();
  }

  /**
   * Enter rename mode finding icon by path
   * @param {string} path
   */
  enterRenameModeByPath(path) {
    const icon = this.app.iconContainer.querySelector(
      `.explorer-icon[data-path="${path}"]`,
    );
    if (icon) {
      this.app.iconManager.setSelection(new Set([icon]));
      this.enterRenameMode(icon);
    }
  }

  /**
   * Format file size for display
   * @private
   */
  _formatSize(bytes) {
    if (bytes === 0) return "0 KB";
    const k = 1024;
    return Math.ceil(bytes / k).toLocaleString() + " KB";
  }

  /**
   * Format date for display
   * @private
   */
  _formatDate(date) {
    const d = new Date(date);
    return (
      d.toLocaleDateString() +
      " " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }

  /**
   * Handle selection change to track last selected icon for rename
   */
  handleSelectionChange() {
    const selectedIcons = this.app.iconManager.selectedIcons;
    const count = selectedIcons.size;

    if (count === 1) {
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
