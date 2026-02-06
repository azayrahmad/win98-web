import { Application } from "../../system/application.js";
import { launchApp } from "../../system/app-manager.js";
import { playSound } from "../../system/sound-manager.js";
import { ICONS } from "../../config/icons.js";
import warningIconUrl from "../../assets/icons/msg_warning-0.png";
import html2canvas from "html2canvas";

export class BuggyProgramApp extends Application {
  static config = {
    id: "buggy-program",
    title: "buggyprogram.exe",
    description:
      "An intentionally buggy program that leaves trails when moved.",
    icon: ICONS.shell,
    width: 450,
    height: 200,
    resizable: false,
    isSingleton: false,
  };

  _createWindow() {
    const win = new window.$Window({
      title: this.config.title,
      width: this.config.width,
      height: this.config.height,
      resizable: this.config.resizable,
      minimizeButton: false,
      maximizeButton: false,
      closable: false,
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
      launchApp("buggy-program");
    });

    setTimeout(() => {
      okButton.focus();
      okButton.classList.add("default");
    }, 0);

    playSound("SystemExclamation");

    setTimeout(() => {
      const desktop = document.querySelector(".desktop");
      if (!desktop) return;

      const canvas = document.createElement("canvas");
      canvas.className = "buggy-canvas-trails";
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.zIndex = "1";
      desktop.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      let lastX, lastY;

      const buggyWindowImage = new Image();

      // We wait for two animation frames to ensure the browser has fully
      // painted the window, including any CSS pseudo-elements like the
      // close button's "X" icon, before we capture it with html2canvas.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          html2canvas(win.element).then((canvas) => {
            buggyWindowImage.src = canvas.toDataURL();
          });
        });
      });

      const observer = new MutationObserver(() => {
        const rect = win.element.getBoundingClientRect();

        if (rect.left === lastX && rect.top === lastY) return;

        lastX = rect.left;
        lastY = rect.top;

        ctx.drawImage(buggyWindowImage, rect.left, rect.top);
      });
      observer.observe(win.element, {
        attributes: true,
        attributeFilter: ["style"],
      });

      const handleResize = () => {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(canvas, 0, 0);

        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        ctx.drawImage(tempCanvas, 0, 0);
      };

      window.addEventListener("resize", handleResize);

      const dispose = win.onClosed(() => {
        observer.disconnect();
        window.removeEventListener("resize", handleResize);
        if (canvas.parentNode) {
          desktop.removeChild(canvas);
        }
        dispose(); // self-disposing listener
      });
    }, 100);

    win.on("close", () => {
      launchApp("buggy-program");
    });
    return win;
  }
}
