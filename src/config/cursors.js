// src/cursors/cursor.js
// Default theme
import defaultBusy from "../assets/cursor/HOURGLASS.ani";
import defaultWait from "../assets/cursor/APPSTARTS.ani";

export class CursorItem {
  constructor(data = "") {
    if (typeof data === "string") {
      this.path = data;
      this.animated = data.toLowerCase().endsWith(".ani");
    } else {
      this.path = data?.path || "";
      this.animated = data?.animated || this.path.toLowerCase().endsWith(".ani");
    }
  }
}

export class CursorScheme {
  static ALL_CURSORS = [
    "arrow",
    "beam",
    "busy",
    "wait",
    "help",
    "move",
    "no",
    "cross",
    "sizeNESW",
    "sizeNS",
    "sizeNWSE",
    "sizeWE",
    "pen",
    "up",
    "hand",
    "uparrow",
  ];

  constructor(id, cursorsData = {}) {
    this.id = id;
    this.cursors = {};

    for (const cursorKey of CursorScheme.ALL_CURSORS) {
      const data = cursorsData[cursorKey];
      this.cursors[cursorKey] = new CursorItem(data);
    }
  }

  /**
   * Gets the cursor URL for a given type, falling back to the default scheme if not found.
   * @param {string} type
   * @returns {string|null}
   */
  getCursor(type) {
    const cursor = this.cursors[type]?.path;
    if (cursor) return cursor;

    if (this.id !== "default") {
      return cursors.default?.getCursor(type);
    }
    return null;
  }

  /**
   * Creates a cursor theme configuration object for CSS custom properties.
   * If a cursor type is not provided in this scheme, it defaults to the corresponding
   * system cursor keyword (e.g., 'auto', 'text').
   * @returns {object} A theme configuration object.
   */
  getCSSVariables() {
    const cursorSet = this.cursors;

    const getUrl = (cursorItem) => {
      return cursorItem?.path ? `url(${cursorItem.path})` : null;
    };

    const baseCursors = {
      "--cursor-default": {
        value: getUrl(cursorSet.arrow)
          ? `${getUrl(cursorSet.arrow)}, auto`
          : "auto",
      },
      "--cursor-pointer": {
        value: getUrl(cursorSet.arrow)
          ? `${getUrl(cursorSet.arrow)}, pointer`
          : "pointer",
      },
      "--cursor-text": {
        value: getUrl(cursorSet.beam)
          ? `${getUrl(cursorSet.beam)}, text`
          : "text",
      },
      "--cursor-help": {
        value: getUrl(cursorSet.help)
          ? `${getUrl(cursorSet.help)}, help`
          : "help",
      },
      "--cursor-move": {
        value: getUrl(cursorSet.move)
          ? `${getUrl(cursorSet.move)}, move`
          : "move",
      },
      "--cursor-grab": {
        value: "grab",
      },
      "--cursor-grabbing": {
        value: "grabbing",
      },
      "--cursor-not-allowed": {
        value: getUrl(cursorSet.no)
          ? `${getUrl(cursorSet.no)}, not-allowed`
          : "not-allowed",
      },
      "--cursor-crosshair": {
        value: getUrl(cursorSet.cross)
          ? `${getUrl(cursorSet.cross)}, crosshair`
          : "crosshair",
      },
      "--cursor-nesw-resize": {
        value: getUrl(cursorSet.sizeNESW)
          ? `${getUrl(cursorSet.sizeNESW)}, nesw-resize`
          : "nesw-resize",
      },
      "--cursor-ns-resize": {
        value: getUrl(cursorSet.sizeNS)
          ? `${getUrl(cursorSet.sizeNS)}, ns-resize`
          : "ns-resize",
      },
      "--cursor-nwse-resize": {
        value: getUrl(cursorSet.sizeNWSE)
          ? `${getUrl(cursorSet.sizeNWSE)}, nwse-resize`
          : "nwse-resize",
      },
      "--cursor-we-resize": {
        value: getUrl(cursorSet.sizeWE)
          ? `${getUrl(cursorSet.sizeWE)}, ew-resize`
          : "ew-resize",
      },
    };

    const animatedCursors = {
      "--cursor-wait": getUrl(cursorSet.busy)
        ? {
            value: getUrl(cursorSet.busy),
            animated: cursorSet.busy.animated,
            type: "busy",
          }
        : { value: "wait", animated: true, type: "busy" },
      "--cursor-progress": getUrl(cursorSet.wait)
        ? {
            value: getUrl(cursorSet.wait),
            animated: cursorSet.wait.animated,
            type: "wait",
          }
        : { value: "progress", animated: true, type: "wait" },
    };

    return { ...baseCursors, ...animatedCursors };
  }
}

export const cursors = {
  default: new CursorScheme("default", {
    busy: defaultBusy,
    wait: defaultWait,
  }),
};

export const getCursorThemes = (themeId) =>
  (cursors[themeId] || cursors.default).getCSSVariables();
