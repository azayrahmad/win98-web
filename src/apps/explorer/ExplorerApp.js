import { Application } from "../Application.js";
import directory from "../../config/directory.js";
import { apps } from "../../config/apps.js";
import { fileAssociations } from "../../config/fileAssociations.js";
import { ICONS, SHORTCUT_OVERLAY } from "../../config/icons.js";
import { launchApp } from "../../utils/appManager.js";
import {
  getAssociation,
  findItemByPath,
  getDesktopContents,
} from "../../utils/directory.js";
import {
  convertInternalPathToWindows,
  convertWindowsPathToInternal,
} from "../../utils/path.js";
import { AddressBar } from "../../components/AddressBar.js";
import { IconManager } from "../../components/IconManager.js";
import {
  getRecycleBinItems,
  removeFromRecycleBin,
  addToRecycleBin,
} from "../../utils/recycleBinManager.js";
import {
  setItem,
  getItem,
  LOCAL_STORAGE_KEYS,
} from "../../utils/localStorage.js";
import { floppyManager } from "../../utils/floppyManager.js";
import { networkNeighborhood } from "../../config/networkNeighborhood.js";
import { ShowDialogWindow } from "../../components/DialogWindow.js";
import { AnimatedLogo } from "../../components/AnimatedLogo.js";
import browseUiIcons from "../../assets/icons/browse-ui-icons.png";
import browseUiIconsGrayscale from "../../assets/icons/browse-ui-icons-grayscale.png";
import { SPECIAL_FOLDER_PATHS } from "../../config/special-folders.js";
import {
  handleDroppedFiles,
  createDragGhost,
} from "../../utils/dragDropManager.js";
import clipboardManager from "../../utils/clipboardManager.js";
import { pasteItems } from "../../utils/fileOperations.js";
import { getItemFromIcon as getItemFromIconUtil } from "../../utils/iconUtils.js";
import { StatusBar } from "../../components/StatusBar.js";
import { downloadFile } from "../../utils/fileDownloader.js";
import { truncateName } from "../../utils/stringUtils.js";
import "./explorer.css";

function isAutoArrangeEnabled() {
  const autoArrange = getItem(LOCAL_STORAGE_KEYS.EXPLORER_AUTO_ARRANGE);
  return autoArrange === null ? false : !!autoArrange;
}

function setAutoArrange(enabled) {
  setItem(LOCAL_STORAGE_KEYS.EXPLORER_AUTO_ARRANGE, enabled);
}

const specialFolderIcons = {
  "/": "my-computer",
  "//recycle-bin": "recycle-bin",
  "//network-neighborhood": "network-neighborhood",
  [SPECIAL_FOLDER_PATHS["my-documents"]]: "my-documents",
};

function getIconForPath(path) {
  const appId = specialFolderIcons[path];
  if (appId) {
    const app = apps.find((a) => a.id === appId);
    if (app) {
      return app.icon;
    }
  }

  const item = findItemByPath(path);
  if (item) {
    if (item.type === "drive") {
      return ICONS.drive;
    }
    if (item.type === "folder") {
      return ICONS.folderOpen;
    }
    if (item.type === "briefcase") {
      return ICONS.briefcase;
    }
  }

  // Default icon if no specific icon is found
  return ICONS.folder;
}

function isFileDropEnabled(path) {
  let currentPath = path;
  while (currentPath && currentPath !== "/") {
    const item = findItemByPath(currentPath);
    if (item && item.enableFileDrop) {
      return true;
    }
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    currentPath = "/" + parts.join("/");
  }
  return false;
}

export class ExplorerApp extends Application {
  static config = {
    id: "explorer",
    title: "Explorer",
    description: "Browse files and folders.",
    icon: ICONS.computer,
    width: 640,
    height: 480,
    resizable: true,
    isSingleton: false,
  };

  constructor(config) {
    super(config);
    this.initialPath = "/";
    this.history = [];
    this.historyIndex = -1;
    this.resizeObserver = null;
    this.currentFolderItems = [];
  }

  _createWindow() {
    const win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      minimizeButton: this.minimizeButton,
      maximizeButton: this.maximizeButton,
      id: this.id, // This is the crucial part
    });
    this.win = win;

    const menuItems = {
      Go: [
        {
          label: "Up",
          action: () => this.goUp(),
          id: "go-up",
        },
        {
          label: "Back",
          action: () => this.goBack(),
          id: "go-back",
        },
        {
          label: "Forward",
          action: () => this.goForward(),
          id: "go-forward",
        },
      ],
    };
    this.menuBar = new MenuBar(menuItems);
    win.setMenuBar(this.menuBar);

    const logo = new AnimatedLogo();
    const menuBarContainer = document.createElement("div");
    menuBarContainer.style.display = "flex";
    menuBarContainer.style.alignItems = "center";
    menuBarContainer.style.width = "100%";
    menuBarContainer.style.justifyContent = "space-between";

    // Wrap the existing menu bar element
    const menuBarElement = this.menuBar.element;
    menuBarElement.parentNode.insertBefore(menuBarContainer, menuBarElement);
    menuBarContainer.appendChild(menuBarElement);
    menuBarContainer.appendChild(logo);

    // Create the main content area and icon manager first, so the toolbar can reference it
    const content = document.createElement("div");
    content.className = "explorer-content sunken-panel";
    this.content = content;

    const sidebar = document.createElement("div");
    sidebar.className = "explorer-sidebar";
    sidebar.style.backgroundImage = `url(${new URL("../../assets/img/wvleft.bmp", import.meta.url).href})`;
    sidebar.style.backgroundRepeat = "no-repeat";
    content.appendChild(sidebar);
    this.sidebarElement = sidebar;

    const iconContainer = document.createElement("div");
    iconContainer.className = "explorer-icon-view has-absolute-icons";
    content.appendChild(iconContainer);
    this.iconContainer = iconContainer;

    this.iconManager = new IconManager(this.iconContainer, {
      iconSelector: ".explorer-icon",
      onItemContext: (e, icon) => this.showItemContextMenu(e, icon),
      onBackgroundContext: (e) => this.showBackgroundContextMenu(e),
      onSelectionChange: () => {
        this.updateMenuState();
        const selectionCount = this.iconManager.selectedIcons.size;
        if (selectionCount > 0) {
          this.statusBar.setText(`${selectionCount} object(s) selected`);
        } else {
          this.statusBar.setText("");
        }
      },
    });

    // Now that iconManager exists, we can define and create the toolbar
    const toolbarItems = [
      {
        label: "Back",
        iconName: "back_explorer",
        action: () => this.goBack(),
        enabled: () => this.historyIndex > 0,
        submenu: () =>
          this.history
            .slice(0, this.historyIndex)
            .reverse()
            .map((path, i) => {
              const item = findItemByPath(path);
              const label = item ? item.name : path;
              const targetIndex = this.historyIndex - (i + 1);
              return {
                label: label,
                action: () => {
                  this.historyIndex = targetIndex;
                  this.navigateTo(this.history[this.historyIndex], true);
                },
              };
            }),
      },
      {
        label: "Forward",
        iconName: "forward_explorer",
        action: () => this.goForward(),
        enabled: () => this.historyIndex < this.history.length - 1,
        submenu: () =>
          this.history.slice(this.historyIndex + 1).map((path, i) => {
            const item = findItemByPath(path);
            const label = item ? item.name : path;
            const targetIndex = this.historyIndex + (i + 1);
            return {
              label: label,
              action: () => {
                this.historyIndex = targetIndex;
                this.navigateTo(this.history[this.historyIndex], true);
              },
            };
          }),
      },
      {
        label: "Up",
        iconName: "up",
        action: () => this.goUp(),
        enabled: () => this.currentPath !== "/",
      },
      "divider",
      {
        label: "Cut",
        iconName: "cut",
        action: () => {
          const itemsToOperateOn = [...this.iconManager.selectedIcons]
            .map((selectedIcon) => this.getItemFromIcon(selectedIcon))
            .filter(Boolean);
          clipboardManager.set(itemsToOperateOn, "cut");
        },
        enabled: () => {
          const selectedIcons = this.iconManager.selectedIcons;
          if (selectedIcons.size === 0) return false;

          const itemsToOperateOn = [...selectedIcons]
            .map((selectedIcon) => this.getItemFromIcon(selectedIcon))
            .filter(Boolean);

          return !itemsToOperateOn.some((item) => item.isStatic);
        },
      },
      {
        label: "Copy",
        iconName: "copy",
        action: () => {
          const itemsToOperateOn = [...this.iconManager.selectedIcons]
            .map((selectedIcon) => this.getItemFromIcon(selectedIcon))
            .filter(Boolean);
          clipboardManager.set(itemsToOperateOn, "copy");
        },
        enabled: () => this.iconManager.selectedIcons.size > 0,
      },
      {
        label: "Paste",
        iconName: "paste",
        action: () => {
          const { items, operation } = clipboardManager.get();
          pasteItems(this.currentPath, items, operation);
          this.render(this.currentPath);
          if (operation === "cut") {
            clipboardManager.clear();
          }
        },
        enabled: () =>
          !clipboardManager.isEmpty() &&
          this.currentPath !== "/" &&
          this.currentPath !== "//network-neighborhood",
      },
      "divider",
      {
        label: "Undo",
        iconName: "undo",
        enabled: false,
      },
      "divider",
      {
        label: "Delete",
        iconName: "delete",
        action: () => {
          const itemsToOperateOn = [...this.iconManager.selectedIcons]
            .map((selectedIcon) => this.getItemFromIcon(selectedIcon))
            .filter((item) => item && !item.isStatic);

          if (itemsToOperateOn.length === 0) return;

          const message =
            itemsToOperateOn.length === 1
              ? `Are you sure you want to send '${itemsToOperateOn[0].name}' to the Recycle Bin?`
              : `Are you sure you want to send these ${itemsToOperateOn.length} items to the Recycle Bin?`;

          ShowDialogWindow({
            title: "Confirm File Delete",
            text: message,
            buttons: [
              {
                label: "Yes",
                action: () => {
                  itemsToOperateOn.forEach((item) => this.deleteFile(item));
                },
              },
              { label: "No", isDefault: true },
            ],
          });
        },
        enabled: () => this.iconManager.selectedIcons.size > 0,
      },
      {
        label: "Properties",
        iconName: "properties",
        action: () => {
          const selectedIcon = this.iconManager.selectedIcons
            .values()
            .next().value;
          const item = this.getItemFromIcon(selectedIcon);
          if (item) {
            this.showProperties(item);
          }
        },
        enabled: () => this.iconManager.selectedIcons.size === 1,
      },
    ];

    this.toolbar = new window.Toolbar(toolbarItems, {
      icons: browseUiIcons,
      iconsGrayscale: browseUiIconsGrayscale,
    });
    win.$content.append(this.toolbar.element);

    this.addressBar = new AddressBar({
      onEnter: (path) => {
        const internalPath = convertWindowsPathToInternal(path);
        if (internalPath && findItemByPath(internalPath)) {
          this.navigateTo(internalPath);
        } else {
          ShowDialogWindow({
            title: "Path not found",
            text: "The system cannot find the path specified.",
            buttons: [{ label: "OK", isDefault: true }],
          });
        }
      },
    });
    win.$content.append(this.addressBar.element);

    const mainContainer = document.createElement("div");
    mainContainer.style.display = "flex";
    mainContainer.style.flexDirection = "column";
    mainContainer.style.height = "100%";

    mainContainer.append(content);

    this.statusBar = new StatusBar();
    mainContainer.append(this.statusBar.element);

    win.$content.append(mainContainer);

    const sidebarIcon = document.createElement("img");
    sidebarIcon.className = "sidebar-icon";
    sidebar.appendChild(sidebarIcon);
    this.sidebarIcon = sidebarIcon;

    const sidebarTitle = document.createElement("h1");
    sidebarTitle.className = "sidebar-title";
    sidebar.appendChild(sidebarTitle);
    this.sidebarTitle = sidebarTitle;

    const sidebarLine = document.createElement("img");
    sidebarLine.src = new URL(
      "../../assets/img/wvline.gif",
      import.meta.url,
    ).href;
    sidebarLine.style.width = "100%";
    sidebarLine.style.height = "auto";
    sidebar.appendChild(sidebarLine);

    const titleElement = document.createElement("h1");
    titleElement.className = "explorer-title";
    titleElement.style.fontFamily = "Verdana, sans-serif";
    content.appendChild(titleElement);
    this.titleElement = $(titleElement); // Use jQuery for easier text manipulation

    this.resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        if (entry.contentRect.width <= 400) {
          this.content.classList.add("small-width");
          this.content.classList.remove("with-sidebar");
        } else {
          this.content.classList.remove("small-width");
          this.content.classList.add("with-sidebar");
        }
      }
    });
    this.resizeObserver.observe(this.content);

    this.navigateTo(this.initialPath);

    this.sortIcons = (sortBy) => {
      const allPositions = getExplorerIconPositions();
      if (allPositions[this.currentPath]) {
        delete allPositions[this.currentPath];
        setExplorerIconPositions(allPositions);
      }

      if (sortBy === "name") {
        this.currentFolderItems.sort((a, b) => {
          const nameA = a.name || a.title || a.filename || "";
          const nameB = b.name || b.title || b.filename || "";
          return nameA.localeCompare(nameB);
        });
      } else if (sortBy === "type") {
        this.currentFolderItems.sort((a, b) => {
          const typeA = a.type || "file";
          const typeB = b.type || "file";
          if (typeA < typeB) return -1;
          if (typeA > typeB) return 1;
          const nameA = a.name || a.title || a.filename || "";
          const nameB = b.name || b.title || b.filename || "";
          return nameA.localeCompare(nameB);
        });
      }

      this.render(this.currentPath, false);
    };

    this.captureIconPositions = () => {
      const iconContainerRect = this.iconContainer.getBoundingClientRect();
      const allIcons = Array.from(
        this.iconContainer.querySelectorAll(".explorer-icon"),
      );
      const allPositions = getExplorerIconPositions();
      if (!allPositions[this.currentPath]) {
        allPositions[this.currentPath] = {};
      }

      this.iconContainer.offsetHeight;

      allIcons.forEach((icon) => {
        const id = icon.getAttribute("data-id");
        const rect = icon.getBoundingClientRect();
        const x = `${rect.left - iconContainerRect.left}px`;
        const y = `${rect.top - iconContainerRect.top}px`;
        allPositions[this.currentPath][id] = { x, y };
      });

      setExplorerIconPositions(allPositions);
    };

    this.lineUpIcons = () => {
      if (isAutoArrangeEnabled()) {
        return;
      }

      const iconWidth = 75;
      const iconHeight = 75;
      const paddingTop = 5;
      const paddingLeft = 5;

      const allPositions = getExplorerIconPositions();
      const pathPositions = allPositions[this.currentPath] || {};
      const allIcons = Array.from(
        this.iconContainer.querySelectorAll(".explorer-icon"),
      );

      allIcons.forEach((icon) => {
        const id = icon.getAttribute("data-id");
        const currentX = parseInt(icon.style.left, 10);
        const currentY = parseInt(icon.style.top, 10);

        const newX =
          Math.round((currentX - paddingLeft) / iconWidth) * iconWidth +
          paddingLeft;
        const newY =
          Math.round((currentY - paddingTop) / iconHeight) * iconHeight +
          paddingTop;

        pathPositions[id] = { x: `${newX}px`, y: `${newY}px` };
      });

      setExplorerIconPositions(allPositions);
      this.render(this.currentPath, false);
    };

    this.refreshHandler = () => {
      if (this.win.element.style.display !== "none") {
        this.render(this.currentPath);
      }
    };
    document.addEventListener("explorer-refresh", this.refreshHandler);

    this.floppyChangeHandler = () => {
      if (this.currentPath === "/" || this.currentPath === "/drive-a") {
        this.render(this.currentPath);
      }
    };
    document.addEventListener("floppy-inserted", this.floppyChangeHandler);
    document.addEventListener("floppy-ejected", this.floppyChangeHandler);

    this.clipboardHandler = () => {
      this.updateCutIcons();
      this.updateMenuState();
    };
    document.addEventListener("clipboard-change", this.clipboardHandler);

    this.win.onClosed(() => {
      document.removeEventListener("explorer-refresh", this.refreshHandler);
      document.removeEventListener("clipboard-change", this.clipboardHandler);
      document.removeEventListener("floppy-inserted", this.floppyChangeHandler);
      document.removeEventListener("floppy-ejected", this.floppyChangeHandler);
    });

    // Drag and drop functionality
    this.iconContainer.addEventListener("dragover", (e) => {
      e.preventDefault(); // Allow drop
    });

    this.iconContainer.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent drop event from bubbling up to the content div

      // Handle files dragged from within the app
      const jsonData = e.dataTransfer.getData("application/json");
      if (jsonData) {
        const data = JSON.parse(jsonData);
        if (data.sourcePath === this.currentPath) {
          const { cursorOffsetX, cursorOffsetY, dragOffsets } = data;
          const iconContainerRect = this.iconContainer.getBoundingClientRect();
          let primaryIconX = e.clientX - iconContainerRect.left - cursorOffsetX;
          let primaryIconY = e.clientY - iconContainerRect.top - cursorOffsetY;

          const iconWidth = 75;
          const iconHeight = 75;
          const margin = 5;

          primaryIconX = Math.max(
            margin,
            Math.min(
              primaryIconX,
              iconContainerRect.width - iconWidth - margin,
            ),
          );
          primaryIconY = Math.max(
            margin,
            Math.min(
              primaryIconY,
              iconContainerRect.height - iconHeight - margin,
            ),
          );

          const allPositions = getExplorerIconPositions();
          if (!allPositions[this.currentPath]) {
            allPositions[this.currentPath] = {};
          }

          dragOffsets.forEach((offset) => {
            allPositions[this.currentPath][offset.id] = {
              x: `${primaryIconX + offset.offsetX}px`,
              y: `${primaryIconY + offset.offsetY}px`,
            };
          });

          setExplorerIconPositions(allPositions);
          this.render(this.currentPath);
          return;
        }
        pasteItems(this.currentPath, data.items, "cut");
        return; // Stop processing
      }

      // Handle files dragged from the user's OS
      if (isFileDropEnabled(this.currentPath)) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          handleDroppedFiles(files, this.currentPath, () => {
            this.render(this.currentPath);
            if (this.currentPath === SPECIAL_FOLDER_PATHS.desktop) {
              document.dispatchEvent(new CustomEvent("desktop-refresh"));
            }
          });
        }
      }
    });

    this.iconContainer.addEventListener("click", (e) => {
      if (this.iconManager.wasLassoing || e.target.closest(".explorer-icon")) {
        return;
      }
      // this.iconManager.clearSelection(); // Keeping this commented for now as per previous instruction. If the user wants to revert, they can.
      // if (clipboardManager.operation === "cut") {
      //   clipboardManager.clear();
      // }
    });

    this.handleMouseUp = () => {
      this.statusBar.setText("");
    };
    document.addEventListener("mouseup", this.handleMouseUp);

    return win;
  }

  _onClose() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    document.removeEventListener("explorer-refresh", this.refreshHandler);
    document.removeEventListener("clipboard-change", this.clipboardHandler);
    document.removeEventListener("mouseup", this.handleMouseUp);
    document.removeEventListener("floppy-inserted", this.floppyChangeHandler);
    document.removeEventListener("floppy-ejected", this.floppyChangeHandler);
  }

  async _onLaunch(filePath) {
    if (filePath) {
      this.navigateTo(filePath);
    }
  }

  navigateTo(path, isHistoryNav = false) {
    if (!isHistoryNav) {
      // If we are at some point in history and not at the end, nuke forward history
      if (this.historyIndex < this.history.length - 1) {
        this.history.splice(this.historyIndex + 1);
      }
      this.history.push(path);
      this.historyIndex = this.history.length - 1;
    }

    this.render(path, true);
    this.updateMenuState();
    this.addressBar.setValue(convertInternalPathToWindows(path));
  }

  render(path, isNewNavigation = true) {
    this.currentPath = path;
    const item = findItemByPath(path);

    if (!item) {
      this.content.innerHTML = "Folder not found.";
      this.win.title("Error");
      return;
    }

    const name = item.type === "drive" ? `(${item.name})` : item.name;
    this.win.title(name);
    this.titleElement.text(name);
    const icon = getIconForPath(path);
    if (icon) {
      this.win.setIcons(icon);
      this.sidebarIcon.src = icon[32];
    }
    this.sidebarTitle.textContent = name;
    this.iconContainer.innerHTML = ""; // Clear previous content
    this.iconManager.clearSelection();

    if (isAutoArrangeEnabled()) {
      this.iconContainer.classList.remove("has-absolute-icons");
    } else {
      this.iconContainer.classList.add("has-absolute-icons");
    }

    let children = [];
    if (isNewNavigation) {
      if (path === SPECIAL_FOLDER_PATHS.desktop) {
        const desktopContents = getDesktopContents();
        const desktopApps = desktopContents.apps.map((appId) => {
          const app = apps.find((a) => a.id === appId);
          return { ...app, appId: app.id, isStatic: true };
        });
        const allDroppedFiles = getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) || [];
        const desktopFiles = allDroppedFiles.filter(
          (file) => file.path === SPECIAL_FOLDER_PATHS.desktop,
        );
        const staticFiles = desktopContents.files.map((file) => ({
          ...file,
          isStatic: true,
        }));
        children = [...desktopApps, ...staticFiles, ...desktopFiles];
      } else {
        const staticChildren = (item.children || []).map((child) => ({
          ...child,
          isStatic: true,
        }));
        const allDroppedFiles = getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) || [];
        const droppedFilesInThisFolder = allDroppedFiles.filter(
          (file) => file.path === path,
        );
        children = [...staticChildren, ...droppedFilesInThisFolder];
      }

      // Sort children alphabetically by name, but only for subfolders
      if (path !== "/") {
        children.sort((a, b) => {
          const nameA = a.name || a.title || a.filename || "";
          const nameB = b.name || b.title || b.filename || "";
          return nameA.localeCompare(nameB);
        });
      }

      this.currentFolderItems = children;
    }

    this.currentFolderItems.forEach((child) => {
      let iconData = { ...child };

      // Resolve shortcuts
      if (child.type === "shortcut") {
        const target = this.findItemInDirectory(child.targetId);
        if (target) {
          iconData = { ...target, name: child.name };
        }
      }

      const app = apps.find((a) => a.id === iconData.appId);
      if (app) {
        iconData.icon = app.icon;
        iconData.title = app.title;
      }

      const icon = this.createExplorerIcon(iconData);
      this._configureDraggableIcon(icon, child);

      const allPositions = getExplorerIconPositions();
      const pathPositions = allPositions[this.currentPath] || {};
      const uniqueId = this._getUniqueItemId(child);

      if (pathPositions[uniqueId]) {
        icon.style.position = "absolute";
        icon.style.left = pathPositions[uniqueId].x;
        icon.style.top = pathPositions[uniqueId].y;
      }

      this.iconContainer.appendChild(icon);
    });
  }

  _getUniqueItemId(item) {
    return item.id;
  }

  createExplorerIcon(item) {
    const app = apps.find((a) => a.id === item.appId) || {};
    const originalName = item.name || item.filename || item.title || app.title;
    let displayName =
      item.type === "drive" ? `(${originalName})` : originalName;

    if (item.type === "floppy") {
      const folderName = floppyManager.getFolderName();
      displayName = folderName
        ? `(${originalName}) ${folderName}`
        : `(${originalName})`;
    }

    const iconDiv = document.createElement("div");
    iconDiv.className = "explorer-icon";
    iconDiv.setAttribute("title", displayName);
    iconDiv.setAttribute("data-id", item.id);

    const iconInner = document.createElement("div");
    iconInner.className = "icon";

    const iconWrapper = document.createElement("div");
    iconWrapper.className = "icon-wrapper";

    const iconImg = document.createElement("img");
    if (item.icon) {
      iconImg.src = item.icon[32];
    } else if (item.id === "folder-control-panel") {
      iconImg.src = ICONS.controlPanel[32];
    } else if (item.type === "floppy") {
      iconImg.src = ICONS.disketteDrive[32];
    } else if (item.type === "drive") {
      iconImg.src = ICONS.drive[32];
    } else if (item.type === "folder") {
      iconImg.src = ICONS.folderClosed[32];
    } else if (item.type === "network") {
      iconImg.src = ICONS.networkComputer[32];
    } else if (item.type === "briefcase") {
      iconImg.src = ICONS.briefcase[32];
    } else {
      // Default to file association for any other type
      const association = getAssociation(displayName);
      iconImg.src = association.icon[32];
    }
    iconImg.draggable = false;
    iconWrapper.appendChild(iconImg);

    if (item.type === "shortcut") {
      const overlayImg = document.createElement("img");
      overlayImg.className = "shortcut-overlay shortcut-overlay-32";
      overlayImg.src = SHORTCUT_OVERLAY[32];
      iconWrapper.appendChild(overlayImg);
    }
    iconInner.appendChild(iconWrapper);

    const iconLabel = document.createElement("div");
    iconLabel.className = "icon-label";
    iconLabel.textContent = truncateName(displayName);

    iconDiv.appendChild(iconInner);
    iconDiv.appendChild(iconLabel);

    if (this.currentPath !== "//recycle-bin") {
      iconDiv.addEventListener("dblclick", () => {
        this._launchItem(item);
      });
    }

    return iconDiv;
  }

  _configureDraggableIcon(icon, item) {
    let dragGhost = null;
    // Standard icon manager setup for selection
    this.iconManager.configureIcon(icon);

    // Only allow non-static files to be dragged
    if (!item.isStatic) {
      icon.draggable = true;
    }

    icon.addEventListener("dragstart", (e) => {
      e.stopPropagation();

      // If the dragged icon is not selected, select it exclusively
      if (!this.iconManager.selectedIcons.has(icon)) {
        this.iconManager.clearSelection();
        this.iconManager.selectIcon(icon);
      }

      const selectedItems = [...this.iconManager.selectedIcons]
        .map((selectedIcon) => {
          const itemId = selectedIcon.getAttribute("data-id");
          // Find the full item object from the current folder's items
          return this.currentFolderItems.find((it) => it.id === itemId);
        })
        .filter(Boolean); // Filter out any nulls

      // Store the data
      const primaryIconRect = icon.getBoundingClientRect();
      const cursorOffsetX = e.clientX - primaryIconRect.left;
      const cursorOffsetY = e.clientY - primaryIconRect.top;

      const dragOffsets = [...this.iconManager.selectedIcons].map(
        (selectedIcon) => {
          const rect = selectedIcon.getBoundingClientRect();
          return {
            id: selectedIcon.getAttribute("data-id"),
            offsetX: rect.left - primaryIconRect.left,
            offsetY: rect.top - primaryIconRect.top,
          };
        },
      );

      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          items: selectedItems,
          sourcePath: this.currentPath,
          cursorOffsetX,
          cursorOffsetY,
          dragOffsets,
        }),
      );
      e.dataTransfer.effectAllowed = "move";
      dragGhost = createDragGhost(icon, e);
    });

    icon.addEventListener("dragend", () => {
      if (dragGhost && dragGhost.parentElement) {
        dragGhost.parentElement.removeChild(dragGhost);
      }
      dragGhost = null;
    });
  }

  findItemInDirectory(id, dir = directory) {
    for (const item of dir) {
      if (item.id === id) return item;
      if (item.children) {
        const found = this.findItemInDirectory(id, item.children);
        if (found) return found;
      }
    }
    return null;
  }

  async _launchItem(item) {
    // Handle floppy files
    if (typeof item.getHandle === "function" && item.type === "file") {
      const handle = item.getHandle();
      const file = await handle.getFile();
      const reader = new FileReader();
      reader.onload = (e) => {
        const appId = getAssociation(item.name).appId;
        if (appId) {
          launchApp(appId, {
            ...item,
            contentUrl: e.target.result,
          });
        }
      };
      reader.readAsDataURL(file);
      return;
    }

    // 1. Handle navigation for folders/drives
    if (item.type === "floppy") {
      if (floppyManager.isInserted()) {
        const newPath =
          this.currentPath === "/"
            ? `/${item.id}`
            : `${this.currentPath}/${item.id}`;
        this.navigateTo(newPath);
      } else {
        ShowDialogWindow({
          title: "No disk",
          text: "There is no disk in the drive.",
          buttons: [{ label: "OK", isDefault: true }],
        });
      }
      return;
    }

    if (item.type === "folder" || item.type === "drive") {
      const newPath =
        this.currentPath === "/"
          ? `/${item.id}`
          : `${this.currentPath}/${item.id}`;
      this.navigateTo(newPath);
      return;
    }

    // 2. Handle external URLs
    if (item.url) {
      window.open(item.url, "_blank", "width=800,height=600");
      return;
    }

    // 3. Handle applications/shortcuts
    if (item.appId) {
      launchApp(item.appId);
      return;
    }

    // 4. Handle files (static, dropped, desktop)
    const fileName = item.name || item.filename;
    if (fileName) {
      const appId = item.app || getAssociation(fileName).appId;
      if (appId) {
        const launchData = item.contentUrl ? item.contentUrl : item;
        launchApp(appId, launchData);
      }
    }
  }

  goUp() {
    if (this.currentPath === "/") return;
    const parts = this.currentPath.split("/").filter(Boolean);
    parts.pop();
    const newPath = "/" + parts.join("/");
    this.navigateTo(newPath);
  }

  goBack() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.navigateTo(this.history[this.historyIndex], true);
    }
  }

  goForward() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.navigateTo(this.history[this.historyIndex], true);
    }
  }

  updateMenuState() {
    this.menuBar.element.dispatchEvent(new Event("update"));

    if (this.toolbar) {
      this.toolbar.element.dispatchEvent(new Event("update"));
    }
  }

  updateCutIcons() {
    const { items, operation } = clipboardManager.get();
    const cutIds =
      operation === "cut" ? new Set(items.map((item) => item.id)) : new Set();

    this.iconContainer.querySelectorAll(".explorer-icon").forEach((icon) => {
      const itemId = icon.getAttribute("data-id");
      if (cutIds.has(itemId)) {
        icon.classList.add("cut");
      } else {
        icon.classList.remove("cut");
      }
    });
  }

  getItemFromIcon(icon) {
    const itemId = icon.getAttribute("data-id");
    const item = this.currentFolderItems.find((child) => child.id === itemId);
    if (item) {
      return { ...item, source: "explorer", path: this.currentPath };
    }
    // Fallback for desktop items, which have a different structure
    return getItemFromIconUtil(icon);
  }

  showItemContextMenu(event, icon) {
    if (icon && !this.iconManager.selectedIcons.has(icon)) {
      this.iconManager.clearSelection();
      this.iconManager.selectIcon(icon);
    }

    const clickedItem = this.getItemFromIcon(icon);

    if (!clickedItem) {
      console.warn("Clicked item not found for icon:", icon);
      return;
    }

    const itemsToOperateOn = [...this.iconManager.selectedIcons]
      .map((selectedIcon) => this.getItemFromIcon(selectedIcon))
      .filter(Boolean);

    let menuItems = [];

    if (this.currentPath === "//recycle-bin") {
      menuItems = [
        {
          label: "Restore",
          default: true,
          action: () => {
            const itemToRestore = getRecycleBinItems().find(
              (i) => i.id === clickedItem.id,
            );
            if (itemToRestore) {
              const restoredItemWithName = {
                ...itemToRestore,
                name: itemToRestore.name || itemToRestore.title,
              };
              const droppedFiles =
                getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) || [];
              droppedFiles.push(restoredItemWithName);
              setItem(LOCAL_STORAGE_KEYS.DROPPED_FILES, droppedFiles);
              removeFromRecycleBin(clickedItem.id);
              this.render(this.currentPath);
              document.dispatchEvent(new CustomEvent("desktop-refresh"));
            }
          },
        },
        "MENU_DIVIDER",
        {
          label: "Delete",
          action: () => {
            ShowDialogWindow({
              title: "Delete Item",
              text: `Are you sure you want to permanently delete "${clickedItem.name}"?`,
              buttons: [
                {
                  label: "Yes",
                  action: () => {
                    removeFromRecycleBin(clickedItem.id);
                    this.render(this.currentPath);
                  },
                },
                { label: "No", isDefault: true },
              ],
            });
          },
        },
      ];
    } else {
      menuItems.push({
        label: "Open",
        default: true,
        action: () => this._launchItem(clickedItem),
      });

      const association = getAssociation(clickedItem.name || clickedItem.filename);
      if (association.appId === 'media-player') {
        menuItems.push({
          label: 'Play in Winamp',
          action: () => launchApp('webamp', clickedItem),
        });
      }

      const copyItem = {
        label: "Copy",
        action: () => clipboardManager.set(itemsToOperateOn, "copy"),
      };
      const cutItem = {
        label: "Cut",
        action: () => clipboardManager.set(itemsToOperateOn, "cut"),
        enabled: !itemsToOperateOn.some((item) => item.isStatic),
      };

      const downloadItem = {
        label: "Download",
        action: () => {
          itemsToOperateOn.forEach((item) => {
            if (item.isStatic || item.type === "folder" || item.type === "drive")
              return;

            const filename = item.name || item.filename;
            const content = item.contentUrl || item.content;

            if (content) {
              downloadFile(filename, content);
            }
          });
        },
        enabled:
          itemsToOperateOn.length > 0 &&
          itemsToOperateOn.every(
            (item) =>
              !item.isStatic &&
              item.type !== "folder" &&
              item.type !== "drive" &&
              item.type !== "app",
          ),
      };

      if (
        this.currentPath === "/" ||
        this.currentPath === "//network-neighborhood" ||
        clickedItem.isRoot
      ) {
        copyItem.enabled = false;
        cutItem.enabled = false;
      }

      if (clickedItem.type === "folder") {
        const isPasteDisabled =
          clipboardManager.isEmpty() ||
          this.currentPath === "/" ||
          this.currentPath === "//network-neighborhood";

        menuItems.push({
          label: "Paste",
          action: () => {
            const { items, operation } = clipboardManager.get();
            const destinationPath = `${this.currentPath}/${clickedItem.id}`;
            pasteItems(destinationPath, items, operation);
            this.navigateTo(destinationPath);
            clipboardManager.clear();
          },
          enabled: !isPasteDisabled,
        });
      }

      menuItems.push(copyItem, cutItem, "MENU_DIVIDER", downloadItem);

      if (clickedItem.type === "drive") {
        menuItems.push({ label: "Format...", enabled: false });
      } else if (clickedItem.type !== "network") {
        menuItems.push({
          label: "Delete",
          action: () => this.deleteFile(clickedItem),
        });
        menuItems.push({ label: "Rename", enabled: false });
      }

      menuItems.push("MENU_DIVIDER", {
        label: "Properties",
        action: () => this.showProperties(clickedItem),
      });
    }

    if (clickedItem.type === "floppy") {
      if (floppyManager.isInserted()) {
        menuItems.unshift({
          label: "Eject",
          action: () => floppyManager.eject(),
        });
      } else {
        menuItems.unshift({
          label: "Insert",
          action: () => floppyManager.insert(),
        });
      }
    }

    new window.ContextMenu(menuItems, event);
  }

  showBackgroundContextMenu(event) {
    const isPasteDisabled =
      clipboardManager.isEmpty() ||
      this.currentPath === "/" ||
      this.currentPath === "//network-neighborhood";

    const toggleAutoArrange = () => {
      const newSetting = !isAutoArrangeEnabled();
      setAutoArrange(newSetting);

      if (!newSetting) {
        this.captureIconPositions();
      }
      this.render(this.currentPath, false);
    };

    const menuItems = [
      {
        label: "Arrange Icons",
        submenu: [
          {
            label: "by Name",
            action: () => this.sortIcons("name"),
          },
          {
            label: "by Type",
            action: () => this.sortIcons("type"),
          },
          "MENU_DIVIDER",
          {
            label: "Auto Arrange",
            checkbox: {
              check: isAutoArrangeEnabled,
              toggle: toggleAutoArrange,
            },
          },
        ],
      },
      {
        label: "Line up Icons",
        action: () => this.lineUpIcons(),
        enabled: !isAutoArrangeEnabled(),
      },
      "MENU_DIVIDER",
      {
        label: "View",
        submenu: [
          { label: "Large Icons", enabled: false },
          { label: "Small Icons", enabled: false },
          { label: "List", enabled: false },
          { label: "Details", enabled: false },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "New",
        submenu: [
          { label: "Folder", enabled: false },
          { label: "Text Document", enabled: false },
        ],
      },
      "MENU_DIVIDER",
      {
        label: "Paste",
        action: () => {
          const { items, operation } = clipboardManager.get();
          pasteItems(this.currentPath, items, operation);
          this.render(this.currentPath);
          clipboardManager.clear();
        },
        enabled: !isPasteDisabled,
      },
      { label: "Properties", enabled: false },
    ];
    new window.ContextMenu(menuItems, event);
  }

  deleteFile(item) {
    const allDroppedFiles = getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) || [];
    const updatedFiles = allDroppedFiles.filter((file) => file.id !== item.id);
    addToRecycleBin(item);
    setItem(LOCAL_STORAGE_KEYS.DROPPED_FILES, updatedFiles);
    this.render(this.currentPath);
    document.dispatchEvent(new CustomEvent("desktop-refresh"));
  }

  showProperties(item) {
    // Check if the item is an app from the main configuration
    if (item.appId && item.isStatic) {
      const appConfig = apps.find((app) => app.id === item.appId);
      if (appConfig && appConfig.appClass) {
        const tempAppInstance = new appConfig.appClass(appConfig);
        tempAppInstance.showProperties();
        return;
      }
    }

    // Fallback for files, folders, and other items
    const displayName = item.name || item.filename || item.title;
    const itemType = item.type || "File";
    let iconUrl;

    if (item.icon) {
      iconUrl = item.icon[32];
    } else if (item.type === "drive") {
      iconUrl = ICONS.drive[32];
    } else if (item.type === "folder") {
      iconUrl = ICONS.folderClosed[32];
    } else if (item.type === "briefcase") {
      iconUrl = ICONS.briefcase[32];
    } else {
      const association = getAssociation(displayName);
      iconUrl = association.icon[32];
    }

    ShowDialogWindow({
      title: `${displayName} Properties`,
      contentIconUrl: iconUrl,
      text: `<b>${displayName}</b><br>Type: ${itemType}`,
      buttons: [{ label: "OK", isDefault: true }],
    });
  }
}

function getExplorerIconPositions() {
  return getItem(LOCAL_STORAGE_KEYS.EXPLORER_ICON_POSITIONS) || {};
}

function setExplorerIconPositions(positions) {
  setItem(LOCAL_STORAGE_KEYS.EXPLORER_ICON_POSITIONS, positions);
}
