import { ShowProgressDialog } from "../../shared/components/progress-dialog.js";

export class InternetExplorerEmulator {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.emulator = null;
    this.jsnet = null;
    this.isBooted = false;
    this.proxyUrl = localStorage.getItem("ie-proxy-url") || "https://wabac-cors-proxy.webrecorder.workers.dev/proxy/";
  }

  async init(initialUrl = "http://azay.rahmad/") {
    this.container.innerHTML = "";

    // Create screen container for v86
    this.screenElement = document.createElement("div");
    this.screenElement.className = "ie-emulator-screen";
    this.screenElement.style.width = "100%";
    this.screenElement.style.height = "100%";
    this.screenElement.style.backgroundColor = "black";
    this.screenElement.style.overflow = "hidden";
    this.screenElement.style.position = "relative";
    this.container.appendChild(this.screenElement);

    // v86 needs these internal elements
    const textDiv = document.createElement("div");
    textDiv.style.whiteSpace = "pre";
    textDiv.style.fontFamily = "monospace";
    textDiv.style.lineHeight = "10px";
    textDiv.style.position = "absolute";
    textDiv.style.top = "0";
    textDiv.style.left = "0";
    textDiv.style.color = "white";
    this.screenElement.appendChild(textDiv);

    const canvas = document.createElement("canvas");
    canvas.style.display = "none";
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    this.screenElement.appendChild(canvas);

    const progress = ShowProgressDialog({
      title: "Internet Explorer",
      text: "Starting Internet Explorer emulator...",
    });

    try {
      // 1. Load v86 and JSNet scripts
      progress.setLabel("Loading emulator engine...");
      await this._loadScript("/lib/v86/libv86.js");
      await this._loadScript("/lib/picotcp/jsnet-client.js");

      // 2. Initialize Networking
      progress.setLabel("Initializing virtual network...");

      this.jsnet = new window.JSNetClient({
        jsnetUrl: "/lib/picotcp/jsnet.js",
        replayUrl: initialUrl,
        proxyIP: "10.0.2.2",
        proxyPort: 80,
      });

      // 3. Start Emulator
      progress.setLabel("Downloading Windows 3.1 disk image...");

      const emulatorOptions = {
        wasm_path: "/lib/v86/v86.wasm",
        bios: { url: "/lib/v86/seabios.bin" },
        vga_bios: { url: "/lib/v86/vgabios.bin" },
        // Default to a known working image from oldweb-today infrastructure
        hda: {
            url: this.options.imageUrl || "https://owt.sfo3.cdn.digitaloceanspaces.com/images/v86-2/images/win31.img",
            async_loader: true,
            size: 15 * 1024 * 1024,
        },
        network_adapter: (bus) => {
            bus.register("net0-send", (data) => {
                this.jsnet.send(data);
            });
            this.jsnet.recvCallback = (data) => {
                bus.send("net0-receive", data);
            };
            return {
                send: (data) => this.jsnet.send(data),
                destroy: () => {}
            };
        },
        screen_container: this.screenElement,
        autostart: true,
      };

      this.emulator = new window.V86Starter(emulatorOptions);

      this.emulator.add_listener("emulator-ready", () => {
        progress.close();
        this.isBooted = true;
      });

      // Forward download progress
      this.emulator.add_listener("download-progress", (e) => {
          if (e.lengthComputable) {
              const percent = (e.loaded / e.total) * 100;
              progress.update(percent);
          }
      });

    } catch (err) {
      console.error("Emulator failed to start", err);
      progress.close();
      alert("Failed to start Internet Explorer emulator: " + err.message);
    }
  }

  _loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  destroy() {
    if (this.emulator) {
      this.emulator.destroy();
      this.emulator = null;
    }
    if (this.jsnet && this.jsnet.netWorker) {
        this.jsnet.netWorker.terminate();
    }
  }

  navigateTo(url) {
    if (this.jsnet && this.jsnet.netWorker) {
        this.jsnet.netWorker.postMessage({ replayUrl: url });
    }
  }
}
