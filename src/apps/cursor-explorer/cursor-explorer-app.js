import { Application } from '../../system/application.js';
import { cursors } from '../../config/cursors.js';
import { convertAniBinaryToCSS } from "ani-cursor";
import { ICONS } from '../../config/icons.js';
import {
  getCursorSchemeId,
  setCursorScheme,
} from '../../system/theme-manager.js';

export class CursorExplorerApp extends Application {
  static config = {
    id: "cursor-explorer",
    title: "Mouse",
    description: "Explore and preview cursor schemes.",
    icon: ICONS["mouse"],
    width: 400,
    height: 500,
    resizable: true,
    isSingleton: true,
  };

  constructor(options) {
    super(options);
    this.initialSchemeId = getCursorSchemeId();
  }

  _createWindow() {
    const win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
    });

    win.$content[0].style.display = "flex";
    win.$content[0].style.flexDirection = "column";

    this._createUI(win.$content[0]);

    win.on("close", () => {
      setCursorScheme(this.initialSchemeId);
    });

    this.win = win;
    return win;
  }

  _createUI(container) {
    const selectorContainer = document.createElement("div");
    selectorContainer.style.padding = "10px";
    selectorContainer.style.borderBottom = "1px solid var(--border-color)";

    const label = document.createElement("label");
    label.textContent = "Cursor Scheme: ";
    label.style.marginRight = "10px";
    selectorContainer.appendChild(label);

    const select = document.createElement("select");
    const schemes = Object.keys(cursors);
    schemes.forEach((scheme) => {
      const option = document.createElement("option");
      option.value = scheme;
      option.textContent = scheme;
      select.appendChild(option);
    });

    select.value = this.initialSchemeId;

    selectorContainer.appendChild(select);
    container.appendChild(selectorContainer);

    const listContainer = document.createElement("div");
    listContainer.className = "cursor-list-container";
    listContainer.style.flex = "1";
    listContainer.style.overflowY = "auto";
    container.appendChild(listContainer);

    select.addEventListener("change", (event) => {
      const newScheme = event.target.value;
      setCursorScheme(newScheme);
      this._populateCursorList(listContainer, newScheme);
    });

    // Initial population
    this._populateCursorList(listContainer, select.value);

    // Add buttons
    const buttonContainer = document.createElement("div");
    buttonContainer.style.display = "flex";
    buttonContainer.style.justifyContent = "flex-end";
    buttonContainer.style.padding = "10px";
    buttonContainer.style.borderTop = "1px solid var(--border-color)";

    const okButton = document.createElement("button");
    okButton.textContent = "OK";
    okButton.style.marginRight = "5px";
    okButton.addEventListener("click", () => {
      this.initialSchemeId = select.value;
      this.win.close();
    });

    const applyButton = document.createElement("button");
    applyButton.textContent = "Apply";
    applyButton.style.marginRight = "5px";
    applyButton.addEventListener("click", () => {
      this.initialSchemeId = select.value;
    });

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.addEventListener("click", () => {
      this.win.close();
    });

    buttonContainer.appendChild(okButton);
    buttonContainer.appendChild(applyButton);
    buttonContainer.appendChild(cancelButton);
    container.appendChild(buttonContainer);
  }

  _populateCursorList(container, scheme) {
    container.innerHTML = "";
    const cursorSet = cursors[scheme];

    if (!cursorSet) return;

    Object.entries(cursorSet).forEach(([name, url]) => {
      const item = document.createElement("div");
      item.className = "cursor-list-item";

      const preview = document.createElement("div");
      preview.className = "cursor-preview";
      preview.style.width = "32px";
      preview.style.height = "32px";

      const nameLabel = document.createElement("span");
      nameLabel.textContent = name;

      item.appendChild(preview);
      item.appendChild(nameLabel);
      container.appendChild(item);

      if (url.endsWith(".ani")) {
        this._applyAniCursorPreview(preview, url, `${scheme}-${name}`);
      } else {
        preview.style.backgroundImage = `url(${url})`;
        preview.style.backgroundRepeat = 'no-repeat';
        preview.style.backgroundPosition = 'center';
      }
    });
  }

  async _applyAniCursorPreview(element, url, id) {
    try {
      const response = await fetch(url);
      const data = new Uint8Array(await response.arrayBuffer());
      const styleId = `ani-cursor-style-${id}`;
      let style = document.getElementById(styleId);

      if (!style) {
        style = document.createElement("style");
        style.id = styleId;
        document.head.appendChild(style);
      }

      const className = `cursor-preview-${id}`;
      element.classList.add(className);
      style.innerText = convertAniBinaryToCSS(`.${className}`, data);
    } catch (error) {
      console.error("Failed to apply animated cursor preview:", error);
    }
  }
}
