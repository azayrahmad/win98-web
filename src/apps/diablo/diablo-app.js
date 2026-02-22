import { WindowedApplication } from '../../system/application.js';
import './diablo.css';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";
import { DiabloProgressDialog } from './diablo-progress-dialog.js';
import { existsAsync } from '../../system/zenfs-utils.js';
import { DiabloStorage } from './diablo-storage.js';

export class DiabloApp extends WindowedApplication {
    static config = {
        id: "diablo",
        title: "Diablo",
        description: "Play the classic game Diablo.",
        icon: ICONS.diablo, category: "",
        width: 800,
        height: 600,
        resizable: true,
        maximizable: true,
        allowFullscreen: true,
        startFullscreen: true,
        isSingleton: true,
    };

    constructor(config, services) {
        super(config, services);
        this.win = null;
        this.iframe = null;
        this.baseLocalPath = "/C:/Program Files/Diablo";
        this.selectedMPQ = null;
        this.isReady = false;
        this.isDownloading = false;
        this._isClosing = false;
        this._boundHandleMessage = this._handleMessage.bind(this);
    }

    async _onLaunch() {
        window.addEventListener("message", this._boundHandleMessage);
        await this._ensureFileSystem();
        await this._setupFileSystemSync();
        await this._scanAndLaunch();
    }

    async _onClose() {
        this._isClosing = true;
        window.removeEventListener("message", this._boundHandleMessage);
        await this._persistFilesToZenFS();
    }

    async _ensureFileSystem() {
        if (!(await existsAsync(this.baseLocalPath))) {
            await fs.promises.mkdir(this.baseLocalPath, { recursive: true });
        }
    }

    async _scanAndLaunch() {
        const mpqs = await this._scanForMPQs();

        if (mpqs.length === 1) {
            this._startGame(mpqs[0]);
        } else if (mpqs.length > 1) {
            this._showMPQSelectionDialog(mpqs);
        } else {
            this._showDownloadConfirmationDialog();
        }
    }

    async _scanForMPQs() {
        try {
            const entries = await fs.promises.readdir(this.baseLocalPath);
            return entries.filter(e => e.toLowerCase().endsWith('.mpq'));
        } catch (e) {
            console.error("Failed to scan for MPQs", e);
            return [];
        }
    }

    _showMPQSelectionDialog(mpqs) {
        const content = document.createElement("div");
        content.style.padding = "10px";

        const label = document.createElement("label");
        label.textContent = "Multiple MPQ files found. Select game version:";
        label.style.display = "block";
        label.style.marginBottom = "8px";

        const select = document.createElement("select");
        select.style.width = "100%";
        select.style.padding = "4px";

        mpqs.forEach((mpq) => {
            const option = document.createElement("option");
            option.value = mpq;
            option.textContent = mpq;
            select.appendChild(option);
        });

        content.appendChild(label);
        content.appendChild(select);

        this.services.ui.showDialog({
            title: "Diablo MPQ Selection",
            content: content,
            modal: true,
            parentWindow: this.win,
            buttons: [
                {
                    label: "OK",
                    isDefault: true,
                    action: () => {
                        this._startGame(select.value);
                    },
                },
                {
                    label: "Cancel",
                    action: () => {
                        // User cancelled, maybe they want to use their own or do nothing
                    },
                },
            ],
        });
    }

    _showDownloadConfirmationDialog() {
        this.services.ui.showDialog({
            title: "No Diablo files found",
            text: "No Diablo MPQ files were found in your system.<br><br>Would you like to download the shareware version (spawn.mpq) to play?",
            modal: true,
            parentWindow: this.win,
            buttons: [
                {
                    label: "OK",
                    isDefault: true,
                    action: () => {
                        this._downloadShareware();
                    }
                },
                {
                    label: "Cancel",
                    action: () => {
                        // Let the iframe show its own prompt
                    }
                }
            ]
        });
    }

    async _downloadShareware() {
        if (this.isDownloading) return;
        this.isDownloading = true;

        const baseUrl = import.meta.env.BASE_URL || "/";
        const downloadUrl = `${baseUrl}games/diablo/spawn.mpq`.replace(/\/+/g, '/');
        const targetPath = `${this.baseLocalPath}/spawn.mpq`;

        const dialog = new DiabloProgressDialog({
            title: "Downloading Shareware",
            parentWindow: this.win,
            onCancel: () => {
                this.isDownloading = false;
            }
        });

        try {
            const response = await fetch(downloadUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const contentLength = response.headers.get('content-length');
            const totalSize = contentLength ? parseInt(contentLength, 10) : 0;
            dialog.setTotalSize(totalSize);

            const reader = response.body.getReader();
            let downloadedSize = 0;
            const chunks = [];

            while (true) {
                if (dialog.cancelled) {
                    this.isDownloading = false;
                    return;
                }

                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                downloadedSize += value.length;
                dialog.update(`Downloading...`, downloadedSize);
            }

            dialog.update("Saving to system...", downloadedSize);

            const buffer = new Uint8Array(downloadedSize);
            let offset = 0;
            for (const chunk of chunks) {
                buffer.set(chunk, offset);
                offset += chunk.length;
            }

            await fs.promises.writeFile(targetPath, buffer);
            dialog.close();
            this.isDownloading = false;

            this._startGame("spawn.mpq");
        } catch (e) {
            console.error("Download failed", e);
            dialog.close();
            this.isDownloading = false;
            this.services.ui.showDialog({
                title: "Download Failed",
                text: `Error downloading shareware: ${e.message}`,
                buttons: [{ label: "OK", isDefault: true }],
                modal: true,
            });
        }
    }

    _startGame(filename) {
        this.selectedMPQ = filename;
        if (this.isReady) {
            this._sendStartMessage();
        }
    }

    async _sendStartMessage() {
        if (!this.selectedMPQ || !this.iframe || !this.iframe.contentWindow) return;

        try {
            console.log(`Starting Diablo with ${this.selectedMPQ} from ZenFS`);
            const data = await fs.promises.readFile(`${this.baseLocalPath}/${this.selectedMPQ}`);
            this.iframe.contentWindow.postMessage({
                type: 'START_WITH_FILE',
                name: this.selectedMPQ,
                data: data
            }, window.location.origin, [data.buffer || data]);
        } catch (e) {
            console.error("Failed to send start message:", e);
        }
    }

    async _handleMessage(event) {
        if (!event.data || typeof event.data !== 'object') return;

        const { type } = event.data;

        if (type === "DIABLO_READY") {
            this.isReady = true;
            if (this.selectedMPQ) {
                this._sendStartMessage();
            }
        } else if (type === "DIABLO_EXIT") {
            if (this.win && !this._isClosing) {
                await this._persistFilesToZenFS();
                this.win.close();
            }
        } else if (type === "GET_MPQ") {
            const { url } = event.data;
            const port = event.ports[0];
            if (!port) return;

            try {
                const filename = url.split('/').pop();
                const entries = await fs.promises.readdir(this.baseLocalPath);
                const match = entries.find(e => e.toLowerCase() === filename.toLowerCase());

                if (match) {
                    const data = await fs.promises.readFile(`${this.baseLocalPath}/${match}`);
                    port.postMessage(data, [data.buffer || data]);
                } else {
                    port.postMessage({ error: `File not found in ZenFS: ${filename}` });
                }
            } catch (e) {
                console.error("Error providing MPQ", e);
                port.postMessage({ error: e.message });
            }
        }
    }

    async _setupFileSystemSync() {
        try {
            const entries = await fs.promises.readdir(this.baseLocalPath);
            const storage = new DiabloStorage();
            const filesToSync = new Map();
            for (const entry of entries) {
                if (entry.toLowerCase().endsWith('.mpq')) continue;
                const path = `${this.baseLocalPath}/${entry}`;
                const stat = await fs.promises.stat(path);
                if (stat.isDirectory()) continue;

                const data = await fs.promises.readFile(path);
                filesToSync.set(entry, data);
            }
            if (filesToSync.size > 0) {
                await storage.setFiles(filesToSync);
            }
        } catch (e) {
            console.error("Failed to sync files to Diablo storage", e);
        }
    }

    async _persistFilesToZenFS() {
        try {
            const storage = new DiabloStorage();
            const files = await storage.getFiles();
            for (const [name, data] of files) {
                if (name.toLowerCase().endsWith('.mpq')) continue;
                await fs.promises.writeFile(`${this.baseLocalPath}/${name}`, data);
            }
            document.dispatchEvent(new CustomEvent("zen-fs-change", { detail: { path: this.baseLocalPath } }));
        } catch (e) {
            console.error("Failed to persist Diablo files to ZenFS", e);
        }
    }

    _createWindow() {
        this.win = this.services.ui.createWindow({
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            maximizable: this.config.maximizable,
            allowFullscreen: this.config.allowFullscreen,
            startFullscreen: this.config.startFullscreen,
            icons: this.icon,
            id: this.id,
        });

        const baseUrl = import.meta.env.BASE_URL || "/";
        this.iframe = document.createElement('iframe');
        this.iframe.className = 'diablo-iframe';
        this.iframe.src = `${baseUrl}games/diablo/index.html`.replace(/\/+/g, '/');
        this.iframe.allow = 'fullscreen';
        this.iframe.onload = () => {
            try {
                const style = this.iframe.contentDocument.createElement('style');
                style.textContent = '.App .start { display: none !important; }';
                this.iframe.contentDocument.head.appendChild(style);
            } catch (e) {
                console.warn("Failed to inject CSS into Diablo iframe", e);
            }
        };

        this.win.$content.append(this.iframe);

        return this.win;
    }
}
