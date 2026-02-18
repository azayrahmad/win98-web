import { Application } from '../../system/application.js';
import { fs } from "@zenfs/core";
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import { ShowFilePicker } from '../../shared/utils/file-picker.js';
import { getZenFSFileAsText } from '../../system/zenfs-utils.js';
import "./wordpad.css";
import { ICONS } from '../../config/icons.js';

export class WordPadApp extends Application {
  static config = {
    id: "wordpad",
    title: "WordPad",
    description: "A simple rich text editor.",
    icon: ICONS.wordpad, category: "Accessories",
    width: 600,
    height: 400,
    resizable: true,
    isSingleton: false,
  };

  constructor(config) {
    super(config);
    this.win = null;
    this.editor = null;
    this.colorPalette = null;
    this.zenfsPath = null;
    this.isDirty = false;
    this.fileName = "Untitled";
    this.findState = {
      term: "",
      caseSensitive: false,
      direction: "down",
    };
    this.savedSelectionRange = null;

    this.isToolbarVisible = true;
    this.isFormatBarVisible = true;
    this.isRulerVisible = true;
    this.isStatusBarVisible = true;
  }

  _createWindow() {
    this.win = new $Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
    });

    const menuBar = this._createMenuBar();
    this.win.setMenuBar(menuBar);

    this.win.$content.append(`
            <div class="wordpad-container">
                <div class="wordpad-toolbar" id="wordpad-main-toolbar">
                    <div class="toolbar-group">
                        <button id="wordpad-new"><div class="toolbar-icon-1 icon-new"></div></button>
                        <button id="wordpad-open"><div class="toolbar-icon-1 icon-open"></div></button>
                        <button id="wordpad-save"><div class="toolbar-icon-1 icon-save"></div></button>
                    </div>
                    <div class="toolbar-group">
                        <button id="wordpad-print"><div class="toolbar-icon-1 icon-print"></div></button>
                        <button id="wordpad-print-preview" disabled><div class="toolbar-icon-1 icon-print-preview"></div></button>
                    </div>
                    <div class="toolbar-group">
                        <button id="wordpad-find"><div class="toolbar-icon-1 icon-find"></div></button>
                    </div>
                    <div class="toolbar-group">
                        <button id="wordpad-cut"><div class="toolbar-icon-1 icon-cut"></div></button>
                        <button id="wordpad-copy"><div class="toolbar-icon-1 icon-copy"></div></button>
                        <button id="wordpad-paste"><div class="toolbar-icon-1 icon-paste"></div></button>
                        <button id="wordpad-undo"><div class="toolbar-icon-1 icon-undo"></div></button>
                    </div>
                    <div class="toolbar-group">
                        <button id="wordpad-insert-date" disabled><div class="toolbar-icon-1 icon-insert-date"></div></button>
                    </div>
                </div>
                <div class="wordpad-toolbar" id="wordpad-format-toolbar">
                    <div class="toolbar-group">
                        <select id="wordpad-font-family">
                            <option selected>Times New Roman</option>
                            <option>Calisto MT</option>
                            <option>Fixedsys Excelsior</option>
                            <option>MSW98UI</option>
                            <option>OCR A Extended</option>
                            <option>Westminster</option>
                        </select>
                        <select id="wordpad-font-size">
                            <option>8</option>
                            <option>9</option>
                            <option selected>10</option>
                            <option>11</option>
                            <option>12</option>
                            <option>14</option>
                            <option>16</option>
                            <option>18</option>
                            <option>20</option>
                            <option>24</option>
                            <option>36</option>
                            <option>48</option>
                            <option>72</option>
                        </select>
                    </div>
                    <div class="toolbar-group">
                        <button id="wordpad-bold" class="toggle"><div class="toolbar-icon-2 icon-bold"></div></button>
                        <button id="wordpad-italic" class="toggle"><div class="toolbar-icon-2 icon-italic"></div></button>
                        <button id="wordpad-underline" class="toggle"><div class="toolbar-icon-2 icon-underline"></div></button>
                    </div>
                    <div class="toolbar-group">
                        <div class="wordpad-color-picker">
                            <button id="wordpad-color"><div class="toolbar-icon-2 icon-color"></div></button>
                        </div>
                    </div>
                    <div class="toolbar-group">
                        <button id="wordpad-align-left" class="toggle selected"><div class="toolbar-icon-2 icon-align-left"></div></button>
                        <button id="wordpad-align-center" class="toggle"><div class="toolbar-icon-2 icon-align-center"></div></button>
                        <button id="wordpad-align-right" class="toggle"><div class="toolbar-icon-2 icon-align-right"></div></button>
                    </div>
                    <div class="toolbar-group">
                        <button id="wordpad-bullets" class="toggle"><div class="toolbar-icon-2 icon-bullets"></div></button>
                    </div>
                </div>
                <div class="wordpad-ruler inset-deep"></div>
                <div class="wordpad-editor inset-deep" contenteditable="true"></div>
                <div class="wordpad-statusbar status-bar">
                    <div class="wordpad-statusbar-panel status-bar-field">For Help, press F1</div>
                </div>
            </div>
        `);
    return this.win;
  }

  _createMenuBar() {
    return new MenuBar({
      "&File": [
        {
          label: "&New...",
          shortcutLabel: "Ctrl+N",
          action: () => this.clearContent(),
        },
        {
          label: "&Open...",
          shortcutLabel: "Ctrl+O",
          action: () => this.openFile(),
        },
        {
          label: "&Save",
          shortcutLabel: "Ctrl+S",
          action: () => this.saveFile(),
        },
        {
          label: "Save &As...",
          action: () => this.saveAs(),
        },
        "MENU_DIVIDER",
        {
          label: "&Print...",
          shortcutLabel: "Ctrl+P",
          enabled: false,
        },
        {
          label: "Print Pre&view",
          enabled: false,
        },
        {
          label: "Page Set&up...",
          enabled: false,
        },
        "MENU_DIVIDER",
        {
          label: "Recent File",
          enabled: false,
        },
        "MENU_DIVIDER",
        {
          label: "Sen&d...",
          enabled: false,
        },
        "MENU_DIVIDER",
        {
          label: "E&xit",
          action: () => this.win.close(),
        },
      ],
      "&Edit": [
        {
          label: "&Undo",
          shortcutLabel: "Ctrl+Z",
          action: () => this.undoButton.click(),
        },
        "MENU_DIVIDER",
        {
          label: "Cu&t",
          shortcutLabel: "Ctrl+X",
          action: () => this.cutButton.click(),
        },
        {
          label: "&Copy",
          shortcutLabel: "Ctrl+C",
          action: () => this.copyButton.click(),
        },
        {
          label: "&Paste",
          shortcutLabel: "Ctrl+V",
          action: () => this.pasteButton.click(),
        },
        {
          label: "Paste &Special...",
          enabled: false,
        },
        {
          label: "Cle&ar",
          shortcutLabel: "Del",
          enabled: false,
        },
        {
          label: "Select A&ll",
          shortcutLabel: "Ctrl+A",
          action: () => document.execCommand("selectAll", false, null),
        },
        "MENU_DIVIDER",
        {
          label: "&Find...",
          shortcutLabel: "Ctrl+F",
          action: () => this.findButton.click(),
        },
        {
          label: "Find &Next",
          shortcutLabel: "F3",
          action: () => this.findNext(),
        },
        {
          label: "R&eplace...",
          shortcutLabel: "Ctrl+H",
          enabled: false,
        },
        "MENU_DIVIDER",
        {
          label: "Lin&ks...",
          enabled: false,
        },
        {
          label: "Object P&roperties",
          shortcutLabel: "Alt+Enter",
          enabled: false,
        },
        {
          label: "Object",
          enabled: false,
        },
      ],
      "&View": [
        {
          label: "&Toolbar",
          checkbox: {
            check: () => this.isToolbarVisible,
            toggle: () => {
              this.isToolbarVisible = !this.isToolbarVisible;
              this.mainToolbar.style.display = this.isToolbarVisible
                ? "flex"
                : "none";
            },
          },
        },
        {
          label: "&Format Bar",
          checkbox: {
            check: () => this.isFormatBarVisible,
            toggle: () => {
              this.isFormatBarVisible = !this.isFormatBarVisible;
              this.formatToolbar.style.display = this.isFormatBarVisible
                ? "flex"
                : "none";
            },
          },
        },
        {
          label: "&Ruler",
          checkbox: {
            check: () => this.isRulerVisible,
            toggle: () => {
              this.isRulerVisible = !this.isRulerVisible;
              this.ruler.style.display = this.isRulerVisible ? "block" : "none";
            },
          },
        },
        {
          label: "&Status Bar",
          checkbox: {
            check: () => this.isStatusBarVisible,
            toggle: () => {
              this.isStatusBarVisible = !this.isStatusBarVisible;
              this.statusBar.style.display = this.isStatusBarVisible
                ? "flex"
                : "none";
            },
          },
        },
        "MENU_DIVIDER",
        {
          label: "&Options...",
          enabled: false,
        },
      ],
      "&Insert": [
        {
          label: "&Date and Time...",
          enabled: false,
        },
        {
          label: "&Object...",
          enabled: false,
        },
      ],
      "F&ormat": [
        {
          label: "&Font...",
          enabled: false,
        },
        {
          label: "&Bullet Style",
          enabled: false,
        },
        {
          label: "&Paragraph...",
          enabled: false,
        },
        {
          label: "&Tabs...",
          enabled: false,
        },
      ],
      "&Help": [
        {
          label: "&Help Topics",
          enabled: false,
        },
        "MENU_DIVIDER",
        {
          label: "&About WordPad",
          action: () => alert("A simple rich text editor."),
        },
      ],
    });
  }

  _createColorPalette() {
    this.colorPalette = document.createElement("div");
    this.colorPalette.className = "wordpad-color-palette";
    this.colorPalette.style.display = "none";
    document.querySelector(".desktop").appendChild(this.colorPalette);
  }

  async _onLaunch(data) {
    this.win.on("close", () => {
      if (this.colorPalette && this.colorPalette.parentNode) {
        this.colorPalette.parentNode.removeChild(this.colorPalette);
      }
    });

    this.editor = this.win.$content.find(".wordpad-editor")[0];
    this.mainToolbar = this.win.$content.find("#wordpad-main-toolbar")[0];
    this.formatToolbar = this.win.$content.find("#wordpad-format-toolbar")[0];
    this.ruler = this.win.$content.find(".wordpad-ruler")[0];
    this.statusBar = this.win.$content.find(".wordpad-statusbar")[0];
    this.findButton = this.win.$content.find("#wordpad-find")[0];
    this.undoButton = this.win.$content.find("#wordpad-undo")[0];
    this.cutButton = this.win.$content.find("#wordpad-cut")[0];
    this.copyButton = this.win.$content.find("#wordpad-copy")[0];
    this.pasteButton = this.win.$content.find("#wordpad-paste")[0];

    this._createColorPalette();
    this._setupToolbarListeners();
    this._populateColorPalette();
    this._setupRuler();
    this.updateTitle();

    this.editor.addEventListener("input", () => {
      this.isDirty = true;
      this.updateTitle();
    });

    const closeButton = this.win.element.querySelector(".window-close-button");
    if (closeButton) {
      const newCloseButton = closeButton.cloneNode(true);
      closeButton.parentNode.replaceChild(newCloseButton, closeButton);
      newCloseButton.addEventListener("click", () => {
        if (this.isDirty) {
          this.showUnsavedChangesDialogOnClose();
        } else {
          this.win.close(true); // Force close
        }
      });
    }

    this.editor.focus();
    document.execCommand("fontName", false, "Times New Roman");
    document.execCommand("fontSize", false, "2"); // Corresponds to 10pt

    const fontFamily = this.win.$content.find("#wordpad-font-family")[0];
    const fontSize = this.win.$content.find("#wordpad-font-size")[0];
    fontFamily.value = "Times New Roman";
    fontSize.value = "10";
  }

  _setupToolbarListeners() {
    const editor = this.editor;
    const newButton = this.win.$content.find("#wordpad-new")[0];
    const openButton = this.win.$content.find("#wordpad-open")[0];
    const saveButton = this.win.$content.find("#wordpad-save")[0];
    const printButton = this.win.$content.find("#wordpad-print")[0];
    const findButton = this.win.$content.find("#wordpad-find")[0];
    const cutButton = this.win.$content.find("#wordpad-cut")[0];
    const copyButton = this.win.$content.find("#wordpad-copy")[0];
    const pasteButton = this.win.$content.find("#wordpad-paste")[0];
    const undoButton = this.win.$content.find("#wordpad-undo")[0];
    const fontFamily = this.win.$content.find("#wordpad-font-family")[0];
    const fontSize = this.win.$content.find("#wordpad-font-size")[0];
    const boldButton = this.win.$content.find("#wordpad-bold")[0];
    const italicButton = this.win.$content.find("#wordpad-italic")[0];
    const underlineButton = this.win.$content.find("#wordpad-underline")[0];
    const colorButton = this.win.$content.find("#wordpad-color")[0];
    const alignLeftButton = this.win.$content.find("#wordpad-align-left")[0];
    const alignCenterButton = this.win.$content.find(
      "#wordpad-align-center",
    )[0];
    const alignRightButton = this.win.$content.find("#wordpad-align-right")[0];
    const bulletsButton = this.win.$content.find("#wordpad-bullets")[0];

    newButton.addEventListener("click", () => this.clearContent());
    openButton.addEventListener("click", () => this.openFile());
    saveButton.addEventListener("click", () => this.saveFile());

    findButton.addEventListener("click", () => this.showFindDialog());

    printButton.addEventListener("click", () => {
      this._printDocument();
    });

    cutButton.addEventListener("click", async () => {
      const selection = window.getSelection().toString();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(selection);
          document.execCommand("delete");
        } catch (err) {
          console.error("Failed to cut using Clipboard API: ", err);
          document.execCommand("cut"); // Fallback
        }
      } else {
        document.execCommand("cut"); // Fallback for older browsers
      }
      editor.focus();
    });

    copyButton.addEventListener("click", async () => {
      const selection = window.getSelection().toString();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(selection);
        } catch (err) {
          console.error("Failed to copy using Clipboard API: ", err);
          document.execCommand("copy"); // Fallback
        }
      } else {
        document.execCommand("copy"); // Fallback for older browsers
      }
      editor.focus();
    });

    pasteButton.addEventListener("click", async () => {
      if (navigator.clipboard && navigator.clipboard.readText) {
        try {
          const text = await navigator.clipboard.readText();
          document.execCommand("insertText", false, text);
        } catch (err) {
          console.error("Failed to paste using Clipboard API: ", err);
          document.execCommand("paste"); // Fallback
        }
      } else {
        document.execCommand("paste"); // Fallback for older browsers
      }
      editor.focus();
    });

    undoButton.addEventListener("click", () => {
      document.execCommand("undo");
      editor.focus();
    });

    fontFamily.addEventListener("change", () => {
      document.execCommand("fontName", false, fontFamily.value);
      editor.focus();
    });

    fontSize.addEventListener("change", () => {
      const sizeMap = {
        8: 1,
        9: 2,
        10: 2,
        11: 3,
        12: 3,
        14: 4,
        16: 5,
        18: 5,
        20: 6,
        24: 6,
        36: 7,
        48: 7,
        72: 7,
      };
      const size = sizeMap[fontSize.value] || 2; // Default to 10pt
      document.execCommand("fontSize", false, size);
      editor.focus();
    });

    boldButton.addEventListener("click", () => {
      document.execCommand("bold");
      editor.focus();
    });

    italicButton.addEventListener("click", () => {
      document.execCommand("italic");
      editor.focus();
    });

    underlineButton.addEventListener("click", () => {
      document.execCommand("underline");
      editor.focus();
    });

    colorButton.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = this.colorPalette.style.display === "none";
      if (isHidden) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
          this.savedSelectionRange = selection.getRangeAt(0).cloneRange();
        }
        // Temporarily display the palette to measure its dimensions
        this.colorPalette.style.visibility = "hidden";
        this.colorPalette.style.display = "grid";

        const paletteWidth = this.colorPalette.offsetWidth;
        const buttonRect = colorButton.getBoundingClientRect();
        const desktopRect = document
          .querySelector(".desktop")
          .getBoundingClientRect();

        let top = buttonRect.bottom - desktopRect.top;
        let left = buttonRect.left - desktopRect.left;

        // Adjust position if it overflows the right edge of the desktop
        if (left + paletteWidth > desktopRect.width) {
          left = desktopRect.width - paletteWidth - 5; // Add a 5px buffer
        }

        // Set the final position and make it visible
        this.colorPalette.style.top = `${top}px`;
        this.colorPalette.style.left = `${left}px`;
        this.colorPalette.style.visibility = "visible";
      } else {
        this.colorPalette.style.display = "none";
      }
    });

    document.addEventListener("click", (e) => {
      if (!this.colorPalette.contains(e.target) && e.target !== colorButton) {
        this.colorPalette.style.display = "none";
      }
    });

    alignLeftButton.addEventListener("click", () => {
      document.execCommand("justifyLeft");
      alignLeftButton.classList.add("selected");
      alignCenterButton.classList.remove("selected");
      alignRightButton.classList.remove("selected");
      editor.focus();
      updateToolbar();
    });

    alignCenterButton.addEventListener("click", () => {
      document.execCommand("justifyCenter");
      alignCenterButton.classList.add("selected");
      alignLeftButton.classList.remove("selected");
      alignRightButton.classList.remove("selected");
      editor.focus();
      updateToolbar();
    });

    alignRightButton.addEventListener("click", () => {
      document.execCommand("justifyRight");
      alignRightButton.classList.add("selected");
      alignCenterButton.classList.remove("selected");
      alignLeftButton.classList.remove("selected");
      editor.focus();
      updateToolbar();
    });

    bulletsButton.addEventListener("click", () => {
      document.execCommand("insertUnorderedList");
      editor.focus();
      updateToolbar();
    });

    const updateToolbar = () => {
      const isBold = document.queryCommandState("bold");
      const isItalic = document.queryCommandState("italic");
      const isUnderline = document.queryCommandState("underline");
      const currentFont = document
        .queryCommandValue("fontName")
        .replace(/['"]/g, "");

      boldButton.classList.toggle("selected", isBold);
      italicButton.classList.toggle("selected", isItalic);
      underlineButton.classList.toggle("selected", isUnderline);

      alignLeftButton.classList.toggle(
        "selected",
        document.queryCommandState("justifyLeft"),
      );
      alignCenterButton.classList.toggle(
        "selected",
        document.queryCommandState("justifyCenter"),
      );
      alignRightButton.classList.toggle(
        "selected",
        document.queryCommandState("justifyRight"),
      );
      bulletsButton.classList.toggle(
        "selected",
        document.queryCommandState("insertUnorderedList"),
      );

      if (currentFont) {
        fontFamily.value = currentFont;
      }
    };

    editor.addEventListener("keyup", updateToolbar);
    editor.addEventListener("mouseup", updateToolbar);
    editor.addEventListener("focus", updateToolbar);
  }

  _setupRuler() {
    const ppi = 96; // Standard pixels per inch

    const drawRuler = () => {
      this.ruler.innerHTML = ""; // Clear existing ticks
      const widthInPixels = this.ruler.offsetWidth;
      const widthInInches = widthInPixels / ppi;

      for (let i = 0; i < widthInInches; i++) {
        const inchMarkPos = i * ppi;

        const inchNumber = document.createElement("span");
        inchNumber.className = "ruler-number";
        inchNumber.textContent = i + 1;
        inchNumber.style.left = `${inchMarkPos + ppi}px`;
        this.ruler.appendChild(inchNumber);

        // Half-inch mark
        if (i + 0.5 < widthInInches) {
          const halfTick = document.createElement("span");
          halfTick.className = "ruler-tick half";
          halfTick.style.left = `${inchMarkPos + ppi / 2}px`;
          this.ruler.appendChild(halfTick);
        }

        // Quarter-inch marks
        if (i + 0.25 < widthInInches) {
          const quarterTick1 = document.createElement("span");
          quarterTick1.className = "ruler-tick quarter";
          quarterTick1.style.left = `${inchMarkPos + ppi / 4}px`;
          this.ruler.appendChild(quarterTick1);
        }
        if (i + 0.75 < widthInInches) {
          const quarterTick2 = document.createElement("span");
          quarterTick2.className = "ruler-tick quarter";
          quarterTick2.style.left = `${inchMarkPos + (ppi * 3) / 4}px`;
          this.ruler.appendChild(quarterTick2);
        }

        // Half-quarter
        if (i + 0.125 < widthInInches) {
          const halfQuarterTick1 = document.createElement("span");
          halfQuarterTick1.className = "ruler-tick quarter";
          halfQuarterTick1.style.left = `${inchMarkPos + ppi / 8}px`;
          this.ruler.appendChild(halfQuarterTick1);
        }

        if (i + 0.375 < widthInInches) {
          const halfQuarterTick2 = document.createElement("span");
          halfQuarterTick2.className = "ruler-tick quarter";
          halfQuarterTick2.style.left = `${inchMarkPos + (ppi * 7) / 8}px`;
          this.ruler.appendChild(halfQuarterTick2);
        }

        if (i + 0.625 < widthInInches) {
          const halfQuarterTick3 = document.createElement("span");
          halfQuarterTick3.className = "ruler-tick quarter";
          halfQuarterTick3.style.left = `${inchMarkPos + (ppi * 5) / 8}px`;
          this.ruler.appendChild(halfQuarterTick3);
        }

        if (i + 0.875 < widthInInches) {
          const halfQuarterTick4 = document.createElement("span");
          halfQuarterTick4.className = "ruler-tick quarter";
          halfQuarterTick4.style.left = `${inchMarkPos + (ppi * 3) / 8}px`;
          this.ruler.appendChild(halfQuarterTick4);
        }
      }
    };

    drawRuler();

    const resizeObserver = new ResizeObserver(drawRuler);
    resizeObserver.observe(this.ruler);
  }

  _populateColorPalette() {
    const colors = [
      { name: "Black", value: "#000000" },
      { name: "Maroon", value: "#800000" },
      { name: "Green", value: "#008000" },
      { name: "Olive", value: "#808000" },
      { name: "Navy", value: "#000080" },
      { name: "Purple", value: "#800080" },
      { name: "Teal", value: "#008080" },
      { name: "Gray", value: "#808080" },
      { name: "Silver", value: "#C0C0C0" },
      { name: "Red", value: "#FF0000" },
      { name: "Lime", value: "#00FF00" },
      { name: "Yellow", value: "#FFFF00" },
      { name: "Blue", value: "#0000FF" },
      { name: "Fuchsia", value: "#FF00FF" },
      { name: "Aqua", value: "#00FFFF" },
      { name: "White", value: "#FFFFFF" },
    ];

    let paletteHTML = "";
    colors.forEach((color) => {
      paletteHTML += `
                <div class="color-swatch" data-color="${color.value}" style="background-color: ${color.value};"></div>
                <div class="color-label" data-color="${color.value}">${color.name}</div>
            `;
    });
    paletteHTML += `
            <div class="color-swatch" data-color="#000000" style="background-color: #000000; border: 1px solid white;"></div>
            <div class="color-label" data-color="#000000">Automatic</div>
        `;
    this.colorPalette.innerHTML = paletteHTML;

    this.colorPalette.addEventListener("click", (e) => {
      const color = e.target.dataset.color;
      if (color) {
        this._applyColor(color);
        this.colorPalette.style.display = "none";
      }
    });
  }

  _applyColor(color) {
    this.editor.focus();
    const selection = window.getSelection();

    // Restore the saved selection before applying color
    if (this.savedSelectionRange) {
      selection.removeAllRanges();
      selection.addRange(this.savedSelectionRange);
    }

    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
      // No text is selected; apply color to future typing
      const span = document.createElement("span");
      span.style.color = color;
      // Use a zero-width space to hold the style
      span.innerHTML = "&#8203;";
      range.insertNode(span);

      // Move the cursor inside the new span
      range.selectNodeContents(span);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      // Text is selected; wrap it with a span
      const span = document.createElement("span");
      span.style.color = color;

      try {
        // SurroundContents is cleaner but can fail if the selection
        // spans across different block-level elements.
        range.surroundContents(span);
      } catch (e) {
        // Fallback for complex selections
        document.execCommand("foreColor", false, color);
        console.warn("Complex selection, fell back to execCommand:", e);
      }
    }
  }

  updateTitle() {
    const dirtyIndicator = this.isDirty ? "*" : "";
    this.win.title(`${dirtyIndicator}${this.fileName} - WordPad`);
  }

  async clearContent() {
    if ((await this.checkForUnsavedChanges()) === "cancel") return;
    this.editor.innerHTML = "";
    this.fileName = "Untitled";
    this.zenfsPath = null;
    this.isDirty = false;
    this.updateTitle();
    this.findState = {
      term: "",
      caseSensitive: false,
      direction: "down",
    };
  }

  async openFile() {
    if ((await this.checkForUnsavedChanges()) === "cancel") return;

    const path = await ShowFilePicker({
      title: "Open Document",
      mode: "open",
      fileTypes: [{ label: "HTML Document (*.html)", extensions: ["html"] }],
    });

    if (path) {
      try {
        const content = await getZenFSFileAsText(path);
        this.editor.innerHTML = content;
        this.zenfsPath = path;
        this.fileName = path.split("/").pop();
        this.isDirty = false;
        this.updateTitle();
      } catch (e) {
        console.error("Error opening file from ZenFS:", e);
      }
    }
  }

  async saveFile() {
    if (this.zenfsPath) {
      try {
        await fs.promises.writeFile(this.zenfsPath, this.editor.innerHTML);
        this.isDirty = false;
        this.updateTitle();
      } catch (err) {
        console.error("Error saving file:", err);
      }
    } else {
      await this.saveAs();
    }
  }

  async saveAs() {
    const path = await ShowFilePicker({
      title: "Save Document As",
      mode: "save",
      suggestedName:
        this.fileName === "Untitled" ? "Untitled.html" : this.fileName,
      fileTypes: [{ label: "HTML Document (*.html)", extensions: ["html"] }],
    });

    if (path) {
      try {
        await fs.promises.writeFile(path, this.editor.innerHTML);
        this.zenfsPath = path;
        this.fileName = path.split("/").pop();
        this.isDirty = false;
        this.updateTitle();
      } catch (err) {
        console.error("Error saving file:", err);
      }
    }
  }

  showUnsavedChangesDialog(options = {}) {
    return ShowDialogWindow({
      title: "WordPad",
      text: `<div style="white-space: pre-wrap">The text in the ${this.fileName} file has changed.\n\nDo you want to save the changes?</div>`,
      contentIconUrl: new URL(
        "../../assets/icons/msg_warning-0.png",
        import.meta.url,
      ).href,
      modal: true,
      soundEvent: "SystemQuestion",
      buttons: options.buttons || [],
    });
  }

  showUnsavedChangesDialogOnClose() {
    this.showUnsavedChangesDialog({
      buttons: [
        {
          label: "Yes",
          action: async () => {
            await this.saveFile();
            if (!this.isDirty) this.win.close(true);
            else return false;
          },
          isDefault: true,
        },
        { label: "No", action: () => this.win.close(true) },
        { label: "Cancel" },
      ],
    });
  }

  async checkForUnsavedChanges() {
    if (!this.isDirty) return "continue";
    return new Promise((resolve) => {
      this.showUnsavedChangesDialog({
        buttons: [
          {
            label: "Yes",
            action: async () => {
              await this.saveFile();
              resolve(!this.isDirty ? "continue" : "cancel");
            },
            isDefault: true,
          },
          { label: "No", action: () => resolve("continue") },
          { label: "Cancel", action: () => resolve("cancel") },
        ],
      });
    });
  }

  _printDocument() {
    const printFrame = document.createElement("iframe");
    printFrame.style.position = "absolute";
    printFrame.style.width = "0";
    printFrame.style.height = "0";
    printFrame.style.border = "0";
    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow.document;
    frameDoc.open();
    frameDoc.write(
      "<!DOCTYPE html><html><head><title>Print</title></head><body>" +
        this.editor.innerHTML +
        "</body></html>",
    );
    frameDoc.close();

    printFrame.contentWindow.focus();
    printFrame.contentWindow.print();

    // Clean up the iframe after printing
    setTimeout(() => {
      document.body.removeChild(printFrame);
    }, 1000);
  }

  showFindDialog() {
    const dialogContent = `
            <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <label for="find-text" style="margin-right: 5px;">Find what:</label>
                <input type="text" id="find-text" value="${this.findState.term}" style="flex-grow: 1;">
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div class="field-row">
                    <input type="checkbox" id="match-case" ${this.findState.caseSensitive ? "checked" : ""}>
                    <label for="match-case">Match case</label>
                </div>
                <fieldset class="group-box" style="padding: 5px 10px;">
                    <legend>Direction</legend>
                    <div class="field-row">
                        <input type="radio" name="direction" id="dir-up" value="up" ${this.findState.direction === "up" ? "checked" : ""}>
                        <label for="dir-up">Up</label>
                    </div>
                    <div class="field-row">
                        <input type="radio" name="direction" id="dir-down" value="down" ${this.findState.direction === "down" ? "checked" : ""}>
                        <label for="dir-down">Down</label>
                    </div>
                </fieldset>
            </div>
        `;

    const dialog = ShowDialogWindow({
      title: "Find",
      width: 380,
      height: "auto",
      text: dialogContent,
      buttons: [
        {
          label: "Find Next",
          action: (win) => {
            const findInput = win.element.querySelector("#find-text");
            const term = findInput.value;
            if (!term) return false;

            this.findState.term = term;
            this.findState.caseSensitive =
              win.element.querySelector("#match-case").checked;
            this.findState.direction = win.element.querySelector(
              'input[name="direction"]:checked',
            ).value;

            this.findNext();
            return true;
          },
          isDefault: true,
        },
        { label: "Cancel" },
      ],
      onclose: (win) => {
        const findInput = win.element.querySelector("#find-text");
        this.findState.term = findInput.value;
        this.findState.caseSensitive =
          win.element.querySelector("#match-case").checked;
        this.findState.direction = win.element.querySelector(
          'input[name="direction"]:checked',
        ).value;
      },
    });
    setTimeout(
      () => dialog.element.querySelector("#find-text").focus().select(),
      0,
    );
  }

  findNext() {
    const { term, caseSensitive, direction } = this.findState;
    if (!term) {
      this.showFindDialog();
      return;
    }

    this.editor.focus();

    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (direction === "down") {
        range.collapse(false);
      } else {
        range.collapse(true);
      }
    }

    const found = window.find(
      term,
      caseSensitive,
      direction === "up",
      false,
      false,
      false,
      false,
    );

    if (!found) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      const range = document.createRange();
      range.selectNodeContents(this.editor);
      range.collapse(direction !== "up");
      selection.addRange(range);

      const wrappedFound = window.find(
        term,
        caseSensitive,
        direction === "up",
        false,
        false,
        false,
        false,
      );

      if (!wrappedFound) {
        ShowDialogWindow({
          title: "WordPad",
          text: `Cannot find "${term}"`,
          soundEvent: "SystemHand",
          buttons: [{ label: "OK", isDefault: true }],
        });
      }
    }
  }
}
