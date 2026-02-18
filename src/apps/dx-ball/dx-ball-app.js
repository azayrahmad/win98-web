import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from '@zenfs/core';

export class DXBallApp extends Application {
  static config = {
    id: "dx-ball",
    title: "DX-Ball",
    description: "The classic Breakout game.",
    icon: ICONS.dxball, category: "",
    width: 654, // Adjusted for typical window borders to avoid scrollbars at 640x480
    height: 520,
    resizable: true,
    maximizable: true,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.iframe = null;
    this.scoresPath = '/C:/My Documents/DX-Ball Scores.json';
    this._boundHandleMessage = this._handleMessage.bind(this);
  }

  async _onLaunch() {
    window.addEventListener('message', this._boundHandleMessage);
  }

  async _onClose() {
    window.removeEventListener('message', this._boundHandleMessage);
  }

  async _handleMessage(event) {
    if (!event.data || typeof event.data !== 'object') return;

    if (event.data.type === 'DXBALL_READY') {
      await this._sendScoresToIframe();
    } else if (event.data.type === 'DXBALL_SAVE_SCORE') {
      await this._saveScore(event.data.name, event.data.score);
    }
  }

  async _sendScoresToIframe() {
    if (!this.iframe || !this.iframe.contentWindow) return;

    let scores = [];
    try {
      if (fs.existsSync(this.scoresPath)) {
        const data = await fs.promises.readFile(this.scoresPath, 'utf8');
        scores = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load DX-Ball scores:', e);
    }

    this.iframe.contentWindow.postMessage({
      type: 'DXBALL_SCORES',
      scores: scores
    }, '*');
  }

  async _saveScore(name, score) {
    let scores = [];
    try {
      if (fs.existsSync(this.scoresPath)) {
        const data = await fs.promises.readFile(this.scoresPath, 'utf8');
        scores = JSON.parse(data);
      }
    } catch (e) {
      console.warn('Failed to load DX-Ball scores for saving:', e);
    }

    scores.push({ name, score, date: new Date().toISOString() });
    scores.sort((a, b) => b.score - a.score);
    scores = scores.slice(0, 100); // Keep top 100

    try {
      const dir = this.scoresPath.substring(0, this.scoresPath.lastIndexOf('/'));
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(this.scoresPath, JSON.stringify(scores, null, 2));

      // Notify filesystem change so Explorer can see it
      document.dispatchEvent(new CustomEvent('zen-fs-change', { detail: { path: this.scoresPath } }));
    } catch (e) {
      console.error('Failed to save DX-Ball scores:', e);
    }
  }

  async _createWindow() {
    const win = new window.$Window({
      title: this.title,
      outerWidth: this.config.width,
      outerHeight: this.config.height,
      resizable: this.config.resizable,
      maximizable: this.config.maximizable,
      icons: this.config.icon,
      id: "dx-ball",
    });

    const iframe = document.createElement("iframe");
    // Ensure the path is correct regardless of where the app is hosted
    const baseUrl = import.meta.env.BASE_URL || "/";
    iframe.src = `${baseUrl}games/dx-ball/index.html`.replace(/\/+/g, '/');
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    iframe.style.display = "block";

    win.$content.append(iframe);
    this.iframe = iframe;
    this.win = win;

    return win;
  }
}
