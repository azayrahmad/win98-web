import { Application } from "../Application.js";
import { launchApp } from "../../utils/appManager.js";
import { playSound } from "../../utils/soundManager.js";
import { ICONS } from "../../config/icons.js";
import warningIconUrl from "../../assets/icons/msg_warning-0.png";
import html2canvas from "html2canvas";

export class BuggyProgramApp extends Application {
  static config = {
    id: "buggyprogram",
    title: "buggyprogram.exe",
    description:
      "An intentionally buggy program that leaves trails when moved.",
    icon: ICONS.shell,
    width: 450,
    height: 200,
    resizable: true,
    closeButton: false,
  };

  _createWindow() {
    const win = new window.$Window({
      title: this.config.title,
      width: this.config.width,
      height: this.config.height,
      resizable: this.config.resizable,
      minimizeButton: false,
      maximizeButton: false,
      icons: this.config.icon,
    });

    const content = `
      <div style="display: flex; align-items: flex-start; padding: 10px; gap: 15px;">
        <img src="${warningIconUrl}" alt="Warning" width="32" height="32" />
        <div style="text-align: left; flex-grow: 1;">
          <span>This program has performed an illegal operation and will be shut down.</span>
          <br />
          <span>If the problem persists, contact the program vendor.</span>
        </div>
      </div>

      <div class="button-group" style="text-align: center; display: block;">
        <button class="ok-button" style="min-width: 80px;">OK</button>
      </div>
    `;
    win.$content.html(content);

    const okButton = win.$content.find(".ok-button")[0];
    okButton.addEventListener("click", () => {
      launchApp("buggyprogram");
    });

    setTimeout(() => {
      okButton.focus();
      okButton.classList.add("default");
    }, 0);

    playSound("SystemExclamation");

    const desktop = document.querySelector(".desktop");
    if (desktop) {
      const canvas = document.createElement("canvas");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.position = "absolute";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.zIndex = "9998"; // Just below the active window
      canvas.style.pointerEvents = "none"; // Initially, let clicks pass through
      desktop.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      let isDragging = false;
      let winSnapshotCanvas = null;

      const titleBar = win.element.querySelector(".window-titlebar");

      let dragOffsetX, dragOffsetY;

      const onMouseMove = (e) => {
        if (!isDragging) return;

        // Manually move the window
        const newX = e.clientX - dragOffsetX;
        const newY = e.clientY - dragOffsetY;
        win.element.style.left = `${newX}px`;
        win.element.style.top = `${newY}px`;

        // Draw the trail
        if (winSnapshotCanvas) {
            ctx.drawImage(
                winSnapshotCanvas,
                newX,
                newY
            );
        }
      };

      const onMouseUp = () => {
        isDragging = false;
        canvas.style.pointerEvents = "none"; // Let clicks pass through again
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      const onMouseDown = (e) => {
        if (e.button !== 0) return;

        // Stop the window's default drag logic
        e.stopImmediatePropagation();

        isDragging = true;
        canvas.style.pointerEvents = "auto"; // Start capturing events
        win.element.style.zIndex = "9999";

        dragOffsetX = e.clientX - win.element.offsetLeft;
        dragOffsetY = e.clientY - win.element.offsetTop;

        // 1. Freeze the background
        html2canvas(document.body, {
          useCORS: true,
          ignoreElements: (element) => element === win.element || canvas,
        })
          .then((bgCanvas) => {
            ctx.drawImage(bgCanvas, 0, 0);

            // 2. Capture the window snapshot *after* the background is frozen
            return html2canvas(win.element, { useCORS: true });
          })
          .then((winCanvas) => {
            winSnapshotCanvas = winCanvas;
            // Now that we have the snapshot, we can start listening for mouse movement
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
          })
          .catch(console.error);
      };

      titleBar.addEventListener("mousedown", onMouseDown);

      const dispose = win.onClosed(() => {
        if (canvas.parentNode) {
          desktop.removeChild(canvas);
        }
        titleBar.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        dispose();
      });
    }

    win.on("close", () => {
      launchApp("buggyprogram");
    });
    return win;
  }
}
