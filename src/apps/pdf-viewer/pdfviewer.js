export function createPdfViewerContent() {
  return `
    <div class="pdf-viewer-content" style="width: 100%; height: 100%; overflow: auto; background-color: #525252; text-align: center;">
      <div class="pdf-viewer-placeholder" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%; color: white;">
        <p>No PDF file loaded. Please open a PDF file.</p>
      </div>
      <div class="pdf-canvas-container"></div>
    </div>
  `;
}
