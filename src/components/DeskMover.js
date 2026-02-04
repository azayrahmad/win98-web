/**
 * DeskMover - Recreates the Windows 98 Active Desktop item behavior
 * Handles moving, resizing, and the hoverable frame.
 */
export class DeskMover {
    constructor(item, container, options = {}) {
        this.item = item; // { id, url, x, y, width, height, style }
        this.container = container;
        this.options = options;
        this.onUpdate = options.onUpdate || (() => {});

        this.element = null;
        this.titleBar = null;
        this.iframe = null;

        this.isDragging = false;
        this.isResizing = false;
        this.dragOffset = { x: 0, y: 0 };
        this.resizeDir = "";

        this.render();
    }

    render() {
        const { id, url, x, y, width, height, style } = this.item;

        const wrapper = document.createElement("div");
        wrapper.className = `desk-mover-wrapper style-${style || "ad"}`;
        wrapper.style.left = x;
        wrapper.style.top = y;
        wrapper.style.width = width;
        wrapper.style.height = height;
        wrapper.dataset.id = id;

        const titleBar = document.createElement("div");
        titleBar.className = "desk-mover-title-bar";
        titleBar.innerHTML = `
            <div class="desk-mover-title"></div>
            <div class="desk-mover-controls">
                <button class="desk-mover-close" title="Close">×</button>
            </div>
        `;

        const content = document.createElement("div");
        content.className = "desk-mover-content";

        const iframe = document.createElement("iframe");
        iframe.src = url;
        iframe.className = "desk-mover-iframe";
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        iframe.style.border = "none";

        content.appendChild(iframe);
        wrapper.appendChild(titleBar);
        wrapper.appendChild(content);

        // Add resize handles
        const handles = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
        handles.forEach(dir => {
            const handle = document.createElement("div");
            handle.className = `desk-mover-resize-handle handle-${dir}`;
            handle.dataset.dir = dir;
            wrapper.appendChild(handle);
        });

        this.element = wrapper;
        this.titleBar = titleBar;
        this.iframe = iframe;
        this.container.appendChild(wrapper);

        this.setupEvents();
    }

    setupEvents() {
        this.titleBar.addEventListener("mousedown", (e) => {
            if (e.target.classList.contains("desk-mover-close")) {
                this.options.onClose && this.options.onClose(this.item.id);
                return;
            }
            this.startDrag(e);
        });

        this.element.querySelectorAll(".desk-mover-resize-handle").forEach(handle => {
            handle.addEventListener("mousedown", (e) => {
                this.startResize(e, handle.dataset.dir);
            });
        });

        window.addEventListener("mousemove", (e) => {
            if (this.isDragging) this.handleDrag(e);
            if (this.isResizing) this.handleResize(e);
        });

        window.addEventListener("mouseup", () => {
            if (this.isDragging || this.isResizing) {
                this.isDragging = false;
                this.isResizing = false;
                this.element.classList.remove("moving");
                this.iframe.style.pointerEvents = "auto";
                this.onUpdate(this.item.id, {
                    x: this.element.style.left,
                    y: this.element.style.top,
                    width: this.element.style.width,
                    height: this.element.style.height
                });
            }
        });
    }

    startDrag(e) {
        this.isDragging = true;
        this.element.classList.add("moving");
        this.iframe.style.pointerEvents = "none";
        const rect = this.element.getBoundingClientRect();
        this.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    handleDrag(e) {
        const x = e.clientX - this.dragOffset.x;
        const y = e.clientY - this.dragOffset.y;
        this.element.style.left = `${x}px`;
        this.element.style.top = `${y}px`;
    }

    startResize(e, dir) {
        this.isResizing = true;
        this.resizeDir = dir;
        this.iframe.style.pointerEvents = "none";
        this.resizeStart = {
            x: e.clientX,
            y: e.clientY,
            width: this.element.offsetWidth,
            height: this.element.offsetHeight,
            left: this.element.offsetLeft,
            top: this.element.offsetTop
        };
        e.preventDefault();
        e.stopPropagation();
    }

    handleResize(e) {
        const dx = e.clientX - this.resizeStart.x;
        const dy = e.clientY - this.resizeStart.y;
        let { width, height, left, top } = this.resizeStart;

        if (this.resizeDir.includes("e")) width += dx;
        if (this.resizeDir.includes("w")) {
            width -= dx;
            left += dx;
        }
        if (this.resizeDir.includes("s")) height += dy;
        if (this.resizeDir.includes("n")) {
            height -= dy;
            top += dy;
        }

        if (width > 50) {
            this.element.style.width = `${width}px`;
            this.element.style.left = `${left}px`;
        }
        if (height > 30) {
            this.element.style.height = `${height}px`;
            this.element.style.top = `${top}px`;
        }
    }
}
