import { Application } from "../Application.js";
import { createPdfViewerContent } from "./pdfviewer.js";
import { ICONS } from "../../config/icons.js";
import { isZenFSPath, getZenFSFileAsBlob } from "../../utils/zenfs-utils.js";

export class PdfViewerApp extends Application {
  static config = {
    id: "pdfviewer",
    title: "PDF Viewer",
    description: "View PDF documents.",
    icon: ICONS.pdf,
    width: 800,
    height: 600,
    resizable: true,
    isSingleton: false,
    tips: [
      "You can open PDF files by double-clicking them on the desktop or in the file explorer.",
    ],
  };

  constructor(config) {
    super(config);
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.6.347/pdf.worker.min.js";
    this.pdfDoc = null;
    this.zoomLevel = 1.0;
    this.isPanning = false;
    this.startX = 0;
    this.startY = 0;
    this.scrollLeft = 0;
    this.scrollTop = 0;
  }

  _createWindow(filePath) {
    let fileName = null;
    if (typeof filePath === "string") {
      fileName = filePath.split("/").pop();
    } else if (filePath instanceof File) {
      fileName = filePath.name;
    } else if (filePath && filePath.name) {
      fileName = filePath.name;
    }
    const title = fileName ? `${fileName} - ${this.title}` : this.title;

    this.win = new $Window({
      title: title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
    });

    const menuBar = this._createMenuBar();
    this.win.setMenuBar(menuBar);

    const content = createPdfViewerContent();
    this.win.$content.html(content);

    this._initPanning();

    return this.win;
  }

  _createMenuBar() {
    return new MenuBar({
      File: [
        {
          label: "&Open",
          action: () => this._openFile(),
          shortcutLabel: "Ctrl+O",
        },
        {
          label: "&Close",
          action: () => this.win.close(),
          shortcutLabel: "Alt+F4",
        },
      ],
      Help: [
        {
          label: "&About PDF Viewer",
          action: () => alert("A simple PDF viewer."),
        },
      ],
      View: [
        {
          label: "Zoom In",
          action: () => this.zoomIn(),
        },
        {
          label: "Zoom Out",
          action: () => this.zoomOut(),
        },
        {
          label: "Fit to Width",
          action: () => this.fitWidth(),
        },
      ],
    });
  }

  async _onLaunch(data) {
    if (typeof data === "string") {
      const correctedPath = data.startsWith("public/")
        ? data.substring("public/".length)
        : data;
      try {
        const fileName = correctedPath.split("/").pop();
        this.win.title(`${fileName} - ${this.title}`);

        let arrayBuffer;
        if (isZenFSPath(data)) {
          const blob = await getZenFSFileAsBlob(data);
          arrayBuffer = await blob.arrayBuffer();
        } else {
          const response = await fetch(correctedPath);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          arrayBuffer = await response.arrayBuffer();
        }
        const pdfData = new Uint8Array(arrayBuffer);
        await this._loadPdf(pdfData);
      } catch (error) {
        console.error(`Failed to load PDF from path: ${correctedPath}`, error);
        const placeholder = this.win.$content.find(".pdf-viewer-placeholder");
        placeholder.text(`Failed to load PDF from ${correctedPath}.`);
      }
    } else if (data instanceof File) {
      this.win.title(`${data.name} - ${this.title}`);
      const reader = new FileReader();
      reader.onload = (event) => {
        const pdfData = new Uint8Array(event.target.result);
        this._loadPdf(pdfData);
      };
      reader.readAsArrayBuffer(data);
    } else if (data && typeof data === "object") {
      this.win.title(`${data.name} - ${this.title}`);
      const byteString = atob(data.content.split(",")[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      await this._loadPdf(ia);
    }
  }

  _openFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".pdf";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const pdfData = new Uint8Array(event.target.result);
        this._loadPdf(pdfData);
        this.win.title(`${file.name} - ${this.title}`);
      };
      reader.readAsArrayBuffer(file);
    };
    input.click();
  }

  async _loadPdf(pdfData) {
    try {
      this.pdfDoc = await pdfjsLib.getDocument({ data: pdfData }).promise;
      this.fitWidth();
    } catch (error) {
      console.error("Error loading PDF:", error);
      const placeholder = this.win.$content.find(".pdf-viewer-placeholder");
      placeholder.text("Failed to load PDF.");
    }
  }

  async _renderPdf() {
    if (!this.pdfDoc) {
      return;
    }

    const container = this.win.$content.find(".pdf-canvas-container")[0];
    container.innerHTML = ""; // Clear previous content

    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      const canvas = document.createElement("canvas");
      container.appendChild(canvas);

      const page = await this.pdfDoc.getPage(i);
      const context = canvas.getContext("2d");
      const viewport = page.getViewport({ scale: this.zoomLevel });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };
      await page.render(renderContext).promise;
    }

    this.win.$content.find(".pdf-viewer-placeholder").hide();
  }

  zoomIn() {
    this.zoomLevel += 0.2;
    this._renderPdf();
  }

  zoomOut() {
    this.zoomLevel = Math.max(0.2, this.zoomLevel - 0.2);
    this._renderPdf();
  }

  fitWidth() {
    if (!this.pdfDoc) {
      return;
    }
    this.pdfDoc.getPage(1).then((page) => {
      const container = this.win.$content.find(".pdf-viewer-content")[0];
      const scale =
        container.clientWidth / page.getViewport({ scale: 1 }).width;
      this.zoomLevel = scale;
      this._renderPdf();
    });
  }

  _initPanning() {
    const container = this.win.$content.find(".pdf-viewer-content")[0];

    const startPanning = (e) => {
      e.preventDefault();
      this.isPanning = true;
      this.startX = e.pageX - container.offsetLeft;
      this.startY = e.pageY - container.offsetTop;
      this.scrollLeft = container.scrollLeft;
      this.scrollTop = container.scrollTop;
      container.style.cursor = "grabbing";
    };

    const stopPanning = () => {
      this.isPanning = false;
      container.style.cursor = "grab";
    };

    const doPan = (e) => {
      if (!this.isPanning) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const y = e.pageY - container.offsetTop;
      const walkX = x - this.startX;
      const walkY = y - this.startY;
      container.scrollLeft = this.scrollLeft - walkX;
      container.scrollTop = this.scrollTop - walkY;
    };

    container.addEventListener("mousedown", startPanning);
    container.addEventListener("mouseup", stopPanning);
    container.addEventListener("mouseleave", stopPanning);
    container.addEventListener("mousemove", doPan);
  }
}
