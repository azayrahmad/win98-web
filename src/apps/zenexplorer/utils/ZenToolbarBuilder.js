import ZenClipboardManager from "./ZenClipboardManager.js";
import ZenUndoManager from "./ZenUndoManager.js";
import { getParentPath, getDisplayName } from "./PathUtils.js";
import { PropertiesManager } from "./PropertiesManager.js";

/**
 * ZenToolbarBuilder - Constructs toolbar items for ZenExplorer
 */

export function getToolbarItems(app) {
  const getSelectedPaths = () => {
    const selectedIcons = app.iconManager?.selectedIcons || new Set();
    return [...selectedIcons].map((icon) => icon.getAttribute("data-path"));
  };

  const isRoot = () => app.currentPath === "/";

  const getBackSubmenu = () => {
    const history = app.navHistory.history;
    const index = app.navHistory.historyIndex;
    return history.slice(0, index).reverse().map((path, i) => ({
      label: getDisplayName(path),
      action: () => {
        const steps = i + 1;
        for (let s = 0; s < steps; s++) {
          app.goBack();
        }
      },
    }));
  };

  const getForwardSubmenu = () => {
    const history = app.navHistory.history;
    const index = app.navHistory.historyIndex;
    return history.slice(index + 1).map((path, i) => ({
      label: getDisplayName(path),
      action: () => {
        const steps = i + 1;
        for (let s = 0; s < steps; s++) {
          app.goForward();
        }
      },
    }));
  };

  const cycleViewMode = () => {
    const modes = ["large", "small", "list", "details"];
    const currentIndex = modes.indexOf(app.viewMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    app.setViewMode(modes[nextIndex]);
  };

  const getViewIcon = () => {
    const iconMap = {
      large: "view_large_icons",
      small: "view_small_icons",
      list: "view_list",
      details: "view_details",
    };
    return iconMap[app.viewMode] || "view_large_icons";
  };

  return [
    {
      label: "Back",
      iconName: "back_explorer",
      action: () => app.goBack(),
      enabled: () => app.navHistory.canGoBack(),
      submenu: getBackSubmenu,
    },
    {
      label: "Forward",
      iconName: "forward_explorer",
      action: () => app.goForward(),
      enabled: () => app.navHistory.canGoForward(),
      submenu: getForwardSubmenu,
    },
    {
      label: "Up",
      iconName: "up",
      action: () => app.goUp(),
      enabled: () => !isRoot(),
    },
    "divider",
    {
      label: "Cut",
      iconName: "cut",
      action: () => {
        app.fileOps.cutItems(getSelectedPaths());
      },
      enabled: () => {
        const paths = getSelectedPaths();
        return paths.length > 0 && !paths.some((p) => getParentPath(p) === "/");
      },
    },
    {
      label: "Copy",
      iconName: "copy",
      action: () => {
        app.fileOps.copyItems(getSelectedPaths());
      },
      enabled: () => getSelectedPaths().length > 0,
    },
    {
      label: "Paste",
      iconName: "paste",
      action: () => app.fileOps.pasteItems(app.currentPath),
      enabled: () => !ZenClipboardManager.isEmpty() && !isRoot(),
    },
    "divider",
    {
      label: "Undo",
      iconName: "undo",
      action: () => app.fileOps.undo(),
      enabled: () => ZenUndoManager.canUndo(),
    },
    "divider",
    {
      label: "Delete",
      iconName: "delete",
      action: () => {
        app.fileOps.deleteItems(getSelectedPaths());
      },
      enabled: () => {
        const paths = getSelectedPaths();
        return paths.length > 0 && !paths.some((p) => getParentPath(p) === "/");
      },
    },
    {
      label: "Properties",
      iconName: "properties",
      action: () => {
        const paths = getSelectedPaths();
        if (paths.length > 0) {
          PropertiesManager.show(paths);
        } else {
          PropertiesManager.show([app.currentPath]);
        }
      },
    },
    "divider",
    {
      label: "Views",
      iconName: getViewIcon,
      action: cycleViewMode,
      submenu: [
        {
          radioItems: [
            { label: "Large Icons", value: "large" },
            { label: "Small Icons", value: "small" },
            { label: "List", value: "list" },
            { label: "Details", value: "details" },
          ],
          getValue: () => app.viewMode,
          setValue: (value) => app.setViewMode(value),
        },
      ],
    },
  ];
}
