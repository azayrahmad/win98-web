import { Application } from "../Application.js";
import { ShowDialogWindow } from "../../components/DialogWindow.js";
import "./imageviewer.css";
import { ICONS } from "../../config/icons.js";
import { isZenFSPath, getZenFSFileAsBlob } from "../../utils/zenfs-utils.js";

export class ImageViewerApp extends Application {
  static config = {
    id: "image-viewer",
    title: "Image Viewer",
    description: "View images.",
    icon: ICONS.imageViewer,
    width: 400,
    height: 300,
    resizable: true,
    isSingleton: false,
  };

  constructor(config) {
    super(config);
    this.file = null;
    this.zoomLevel = 1;
    this.zoomStep = 0.1;

    // Panning state
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this.backgroundRemoved = false;
  }

  _createWindow(file) {
    let fileName = null;
    if (typeof file === "string") {
      fileName = file.split("/").pop();
    } else if (file && file.name) {
      fileName = file.name;
    }
    const title = fileName ? `${fileName} - Image Viewer` : "Image Viewer";
    this.file = file;

    const win = new $Window({
      title: title,
      outerWidth: this.width || 400,
      outerHeight: this.height || 300,
      resizable: this.resizable,
      icons: this.icon,
      id: this.id,
    });

    const menuBar = this._createMenuBar();
    win.setMenuBar(menuBar);

    win.$content.append('<div class="image-viewer-container"><img /></div>');
    return win;
  }

  _createMenuBar() {
    return new MenuBar({
      "&File": [
        {
          label: "&Open...",
          action: () => this.openFile(),
        },
        {
          label: "&Save",
          action: () => this.saveFile(),
        },
        {
          label: "Save &As...",
          action: () => this.saveFileAs(),
        },
        "MENU_DIVIDER",
        {
          label: "E&xit",
          action: () => this.win.close(),
        },
      ],
      "&View": [
        {
          label: "Zoom &In",
          shortcutLabel: "Scroll Up",
          action: () => this.zoomIn(),
        },
        {
          label: "Zoom &Out",
          shortcutLabel: "Scroll Down",
          action: () => this.zoomOut(),
        },
        {
          label: "&Reset Zoom",
          action: () => this.resetZoom(),
        },
      ],
      "&Edit": [
        {
          label: "&Resize...",
          action: () => this.showResizeDialog(),
        },
        {
          label: "Remove &Background",
          action: () => this.removeBackground(),
        },
        "MENU_DIVIDER",
        {
          label: "Extract &Icons...",
          action: () => this.showExtractIconsDialog(),
          enabled: () =>
            this.file &&
            this.file.name &&
            this.file.name.toLowerCase().endsWith(".ico"),
        },
      ],
      "&Help": [
        {
          label: "&About Image Viewer",
          action: () => alert("A simple image viewer built for azOS."),
        },
      ],
    });
  }

  async _onLaunch(data) {
    try {
      this.img = this.win.$content.find("img")[0];
      const imageContainer = this.win.$content.find(".image-viewer-container")[0];

      if (typeof data === "string") {
        // It's a file path
        const fileName = decodeURIComponent(data.split("/").pop());
        const handleBlob = (blob) => {
          const file = new File([blob], fileName);
          this.loadFile(file);
        };

        if (isZenFSPath(data)) {
          getZenFSFileAsBlob(data)
            .then(handleBlob)
            .catch((e) => {
              console.error("Error loading image from ZenFS:", e);
              this.win.close();
            });
        } else {
          fetch(data)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.blob();
            })
            .then(handleBlob)
            .catch((e) => {
              console.error("Error loading image:", e);
              this.win.close(); // Close the window if the image fails to load
            });
        }
      } else if (data instanceof File) {
        this.loadFile(data);
      } else if (data && typeof data === "object") {
        // It's a file object from drag-and-drop
        this.win.title(`${data.name} - Image Viewer`);
        this.img.src = data.content;
        this.img.onload = () => {
          this.resetZoom();
          setTimeout(() => this._adjustWindowSize(this.img), 0);
          this._updatePannableState();
        };
      } else {
        console.log("Image Viewer launched without a file.");
      }

      imageContainer.addEventListener("wheel", (e) => {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.zoomIn();
        } else {
          this.zoomOut();
        }
      });

      const startPanning = (e) => {
        if (this._isPannable()) {
          e.preventDefault();
          this.isPanning = true;
          const point = e.touches ? e.touches[0] : e;
          this.startX = point.pageX - imageContainer.offsetLeft;
          this.startY = point.pageY - imageContainer.offsetTop;
          this.scrollLeft = imageContainer.scrollLeft;
          this.scrollTop = imageContainer.scrollTop;
          imageContainer.style.cursor = "var(--cursor-grabbing, grabbing)";
        }
      };

      const stopPanning = () => {
        this.isPanning = false;
        if (this._isPannable()) {
          imageContainer.style.cursor = "var(--cursor-grab, grab)";
        }
      };

      const doPan = (e) => {
        if (!this.isPanning) return;
        e.preventDefault();
        const point = e.touches ? e.touches[0] : e;
        const x = point.pageX - imageContainer.offsetLeft;
        const y = point.pageY - imageContainer.offsetTop;
        const walkX = (x - this.startX) * 2;
        const walkY = (y - this.startY) * 2;
        imageContainer.scrollLeft = this.scrollLeft - walkX;
        imageContainer.scrollTop = this.scrollTop - walkY;
      };

      // Panning Listeners
      imageContainer.addEventListener("mousedown", startPanning);
      imageContainer.addEventListener("mouseup", stopPanning);
      imageContainer.addEventListener("mouseleave", stopPanning);
      imageContainer.addEventListener("mousemove", doPan);
      imageContainer.addEventListener("touchstart", startPanning, {
        passive: false,
      });
      imageContainer.addEventListener("touchend", stopPanning);
      imageContainer.addEventListener("touchcancel", stopPanning);
      imageContainer.addEventListener("touchmove", doPan, { passive: false });
    } catch (e) {
      console.error("Error in ImageViewerApp._onLaunch:", e);
      this.win.close();
    }
  }

  loadFile(file) {
    this.file = file; // Update the current file being viewed
    this.win.title(`${file.name} - Image Viewer`);
    const reader = new FileReader();
    reader.onload = (e) => {
      this.img.src = e.target.result;
      this.img.onload = () => {
        this.resetZoom();
        setTimeout(() => this._adjustWindowSize(this.img), 0);
        this._updatePannableState();
      };
    };
    reader.readAsDataURL(file);
  }

  openFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.loadFile(file);
      }
    };
    input.click();
  }

  saveFile() {
    if (!this.img || !this.img.src) {
      alert("There is no image to save.");
      return;
    }

    const link = document.createElement("a");
    link.href = this.img.src;

    let downloadName;
    const originalName = this.file ? this.file.name : "image.png";

    if (this.backgroundRemoved) {
      const nameWithoutExt =
        originalName.lastIndexOf(".") !== -1
          ? originalName.substring(0, originalName.lastIndexOf("."))
          : originalName;
      downloadName = `${nameWithoutExt}-modified.png`;
    } else {
      downloadName = `resized-${originalName}`;
    }

    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async saveFileAs() {
    if (!this.img || !this.img.src) {
      alert("There is no image to save.");
      return;
    }

    try {
      if ("showSaveFilePicker" in window) {
        const response = await fetch(this.img.src);
        const blob = await response.blob();

        let suggestedName = this.file ? this.file.name : "image.png";
        let fileType = blob.type;
        let fileExtension = suggestedName.split(".").pop();

        let types = [
          {
            description: "Image Files",
            accept: { [fileType]: ["." + fileExtension] },
          },
        ];

        if (this.backgroundRemoved) {
          const nameWithoutExt =
            suggestedName.lastIndexOf(".") !== -1
              ? suggestedName.substring(0, suggestedName.lastIndexOf("."))
              : suggestedName;
          suggestedName = `${nameWithoutExt}-modified.png`;
          types = [
            { description: "PNG Image", accept: { "image/png": [".png"] } },
          ];
        }

        const options = {
          suggestedName,
          types,
        };

        const fileHandle = await window.showSaveFilePicker(options);
        const writableStream = await fileHandle.createWritable();
        await writableStream.write(blob);
        await writableStream.close();
        console.log("Image saved successfully with File System Access API.");
      } else {
        // Fallback for browsers that don't support showSaveFilePicker
        const link = document.createElement("a");
        link.href = this.img.src;
        let downloadName = this.file ? this.file.name : "image.png";

        if (this.backgroundRemoved) {
          const nameWithoutExt =
            downloadName.lastIndexOf(".") !== -1
              ? downloadName.substring(0, downloadName.lastIndexOf("."))
              : downloadName;
          downloadName = `${nameWithoutExt}-modified.png`;
        }

        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        console.log("Image downloaded (showSaveFilePicker not supported).");
      }
    } catch (error) {
      if (error.name === "AbortError") {
        console.log("Save operation aborted by user.");
      } else {
        console.error("Error saving file:", error);
        alert("Could not save the image. Please try again.");
      }
    }
  }

  _adjustWindowSize(img) {
    const desktop = document.querySelector(".desktop");
    const desktopRect = desktop.getBoundingClientRect();

    const padding = 20; // 10px margin on each side
    const titleBarHeight =
      this.win.element.querySelector(".window-titlebar").offsetHeight;
    const menuBarHeight =
      this.win.element.querySelector(".menus")?.offsetHeight || 0;
    const windowBorders =
      this.win.element.offsetWidth - this.win.element.clientWidth;

    const maxInnerWidth = desktopRect.width - padding - windowBorders;
    const maxInnerHeight =
      desktopRect.height - padding - titleBarHeight - menuBarHeight;

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    let newInnerWidth = Math.max(this.win.element.innerWidth || 380, imgWidth);
    let newInnerHeight = Math.max(
      this.win.element.innerHeight || 260,
      imgHeight,
    );

    const aspectRatio = imgWidth / imgHeight;

    if (newInnerWidth > maxInnerWidth) {
      newInnerWidth = maxInnerWidth;
      newInnerHeight = newInnerWidth / aspectRatio;
    }

    if (newInnerHeight > maxInnerHeight) {
      newInnerHeight = maxInnerHeight;
      newInnerWidth = newInnerHeight * aspectRatio;
    }

    this.win.setDimensions({
      innerWidth: Math.round(newInnerWidth),
      innerHeight: Math.round(newInnerHeight),
    });
    this.win.center();
  }

  zoomIn() {
    this.zoomLevel += this.zoomStep;
    this.applyZoom();
  }

  zoomOut() {
    this.zoomLevel = Math.max(0.1, this.zoomLevel - this.zoomStep);
    this.applyZoom();
  }

  resetZoom() {
    this.zoomLevel = 1;
    this.applyZoom();
  }

  applyZoom() {
    if (this.img) {
      this.img.style.transform = `scale(${this.zoomLevel})`;
      this.img.style.maxWidth = this.zoomLevel === 1 ? "100%" : "none";
      this.img.style.maxHeight = this.zoomLevel === 1 ? "100%" : "none";
      this._updatePannableState();
    }
  }

  _isPannable() {
    const imageContainer = this.win.$content.find(".image-viewer-container")[0];
    return (
      imageContainer.scrollWidth > imageContainer.clientWidth ||
      imageContainer.scrollHeight > imageContainer.clientHeight
    );
  }

  _updatePannableState() {
    const imageContainer = this.win.$content.find(".image-viewer-container")[0];
    if (this._isPannable()) {
      imageContainer.classList.add("pannable");
    } else {
      imageContainer.classList.remove("pannable");
    }
  }

  showResizeDialog() {
    if (!this.img || !this.img.src) {
      alert("Please open an image first.");
      return;
    }

    const originalWidth = this.img.naturalWidth;
    const originalHeight = this.img.naturalHeight;

    const dialogContent = `
            <div class="resize-controls">
                <div class="field-row-stacked">
                    <label for="widthInput">Width (px):</label>
                    <input type="number" id="widthInput" min="1" value="${originalWidth}">
                </div>
                <div class="field-row-stacked">
                    <label for="heightInput">Height (px):</label>
                    <input type="number" id="heightInput" min="1" value="${originalHeight}">
                </div>
                <div class="field-row" style="margin-top: 10px;">
                    <input type="checkbox" id="aspectRatio" checked>
                    <label for="aspectRatio">Keep Aspect Ratio</label>
                </div>
            </div>
        `;

    const dialog = ShowDialogWindow({
      title: "Resize Image",
      text: dialogContent,
      modal: true,
      buttons: [
        {
          label: "Resize",
          action: (win) => {
            const widthInput = win.$content.find("#widthInput")[0];
            const heightInput = win.$content.find("#heightInput")[0];
            const newWidth = parseInt(widthInput.value, 10);
            const newHeight = parseInt(heightInput.value, 10);
            this.resizeImage(newWidth, newHeight);
          },
          isDefault: true,
        },
        {
          label: "Cancel",
          action: () => { },
        },
      ],
    });

    // Add aspect ratio logic
    const widthInput = dialog.$content.find("#widthInput")[0];
    const heightInput = dialog.$content.find("#heightInput")[0];
    const aspectRatioCheckbox = dialog.$content.find("#aspectRatio")[0];
    let isUpdatingDimensions = false;

    const updateDimensions = (event) => {
      if (isUpdatingDimensions || !aspectRatioCheckbox.checked) return;

      isUpdatingDimensions = true;
      const ratio = originalHeight / originalWidth;
      if (event.target === widthInput) {
        heightInput.value = Math.round(widthInput.value * ratio);
      } else {
        widthInput.value = Math.round(heightInput.value / ratio);
      }
      isUpdatingDimensions = false;
    };

    widthInput.addEventListener("input", updateDimensions);
    heightInput.addEventListener("input", updateDimensions);
  }

  resizeImage(width, height) {
    if (!this.img || !this.img.src || !width || !height) {
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Create a temporary canvas to get the original image's pixel data
    const originalCanvas = document.createElement("canvas");
    originalCanvas.width = this.img.naturalWidth;
    originalCanvas.height = this.img.naturalHeight;
    const originalCtx = originalCanvas.getContext("2d");
    originalCtx.drawImage(this.img, 0, 0);
    const originalData = originalCtx.getImageData(
      0,
      0,
      originalCanvas.width,
      originalCanvas.height,
    );
    const originalPixels = originalData.data;

    // Create ImageData for the new dimensions
    const newImageData = ctx.createImageData(width, height);
    const newPixels = newImageData.data;

    const scaleX = originalCanvas.width / width;
    const scaleY = originalCanvas.height / height;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcX = Math.floor(x * scaleX);
        const srcY = Math.floor(y * scaleY);

        const srcIdx = (srcY * originalCanvas.width + srcX) * 4;
        const dstIdx = (y * width + x) * 4;

        newPixels[dstIdx] = originalPixels[srcIdx]; // R
        newPixels[dstIdx + 1] = originalPixels[srcIdx + 1]; // G
        newPixels[dstIdx + 2] = originalPixels[srcIdx + 2]; // B
        newPixels[dstIdx + 3] = originalPixels[srcIdx + 3]; // A
      }
    }

    // Put the resized image data onto the canvas
    ctx.putImageData(newImageData, 0, 0);

    // Get the new image as a data URL
    const dataUrl = canvas.toDataURL(); // Defaults to PNG

    // Update the image source
    this.img.src = dataUrl;
    this.img.onload = () => {
      // Reset zoom and adjust window after resize
      this.resetZoom();
      this._adjustWindowSize(this.img);
    };
  }

  showExtractIconsDialog() {
    if (!this.file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const buffer = e.target.result;

        let icons;
        if (typeof ICO.parse === "function") {
          icons = await ICO.parse(buffer);
        } else if (typeof ICO.parseICO === "function") {
          icons = await ICO.parseICO(buffer);
        } else {
          throw new Error(
            "ICO parsing function not found on window.ICO object.",
          );
        }

        if (!icons || icons.length === 0) {
          throw new Error("No icons found in the file.");
        }

        let selectedIconIndex = 0;

        const radioItems = icons
          .map(
            (icon, index) => `
          <div class="field-row">
            <input type="radio" id="icon-${index}" name="icon-selection" value="${index}" ${index === 0 ? "checked" : ""}>
            <label for="icon-${index}">${icon.width}x${icon.height}, ${icon.bpp}-bit</label>
          </div>
        `,
          )
          .join("");

        const dialogContent = `<div class="icon-selection-container">${radioItems}</div>`;

        const dialog = ShowDialogWindow({
          title: "Extract Icon",
          text: dialogContent,
          modal: true,
          buttons: [
            {
              label: "Extract...",
              action: (win) => {
                const selectedRadio = win.$content.find(
                  'input[name="icon-selection"]:checked',
                )[0];
                if (selectedRadio) {
                  selectedIconIndex = parseInt(selectedRadio.value, 10);
                  this.extractIcon(icons[selectedIconIndex]);
                }
              },
              isDefault: true,
            },
            {
              label: "Cancel",
              action: () => { },
            },
          ],
        });
      } catch (error) {
        console.error("Failed to parse ICO file:", error);
        ShowDialogWindow({
          title: "Error",
          text: "Could not parse the ICO file. It might be corrupted or in an unsupported format.",
          modal: true,
          buttons: [{ label: "OK" }],
        });
      }
    };
    reader.onerror = () => {
      ShowDialogWindow({
        title: "Error",
        text: "Failed to read the ICO file.",
        modal: true,
        buttons: [{ label: "OK" }],
      });
    };
    reader.readAsArrayBuffer(this.file);
  }

  extractIcon(icon) {
    const canvas = document.createElement("canvas");
    canvas.width = icon.width;
    canvas.height = icon.height;
    const ctx = canvas.getContext("2d");

    const imageData = new ImageData(
      new Uint8ClampedArray(icon.buffer),
      icon.width,
      icon.height,
    );
    ctx.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataUrl;

    const originalName = this.file.name;
    const nameWithoutExt =
      originalName.lastIndexOf(".") !== -1
        ? originalName.substring(0, originalName.lastIndexOf("."))
        : originalName;
    link.download = `${nameWithoutExt}-${icon.width}.png`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  removeBackground() {
    if (!this.img || !this.img.src) {
      alert("Please open an image first.");
      return;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = this.img;

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.drawImage(img, 0, 0);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const red = data[i];
      const green = data[i + 1];
      const blue = data[i + 2];

      // Check for #FF00FF
      if (red === 255 && green === 0 && blue === 255) {
        data[i + 3] = 0; // Set alpha to 0
      }
    }

    ctx.putImageData(imageData, 0, 0);
    this.img.src = canvas.toDataURL("image/png");
    this.backgroundRemoved = true;
  }
}
