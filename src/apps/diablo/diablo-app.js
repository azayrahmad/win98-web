import { Application } from '../../system/application.js';
import './diablo.css';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import { DiabloProgressDialog } from './diablo-progress-dialog.js';
import { existsAsync } from '../../system/zenfs-utils.js';

export class DiabloApp extends Application {
    static config = {
        id: "diablo",
        title: "Diablo",
        description: "Play the classic game Diablo.",
        icon: ICONS.diablo, category: "",
        width: 800,
        height: 600,
        resizable: true,
        isSingleton: true,
    };

    constructor(config) {
        super(config);
        this.win = null;
        this.iframe = null;
        this.baseLocalPath = "/C:/Program Files/Diablo";
        this.selectedMPQ = null;
        this.isReady = false;
        this.isDownloading = false;
        this._boundHandleMessage = this._handleMessage.bind(this);
    }

    async _onLaunch() {
        window.addEventListener("message", this._boundHandleMessage);
        await this._ensureFileSystem();
        await this._scanAndLaunch();
    }

    async _onClose() {
        window.removeEventListener("message", this._boundHandleMessage);
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

        ShowDialogWindow({
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
        ShowDialogWindow({
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
            ShowDialogWindow({
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
            }, '*', [data.buffer || data]);
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

    _createWindow() {
        this.win = new $Window({
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            icons: this.icon,
            id: this.id,
        });

        const baseUrl = import.meta.env.BASE_URL || "/";
        this.iframe = document.createElement('iframe');
        this.iframe.className = 'diablo-iframe';
        this.iframe.src = `${baseUrl}games/diablo/index.html`.replace(/\/+/g, '/');
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
