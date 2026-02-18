import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs, mount, umount } from "@zenfs/core";
import { Zip } from "@zenfs/archives";
import { existsAsync } from "../../system/zenfs-utils.js";
import { ShowDialogWindow } from '../../shared/components/dialog-window.js';
import { DosGamesDownloaderProgressDialog } from './dos-games-downloader-progress-dialog.js';
import { getIcon } from '../../shared/utils/icon-resolver.js';
import "./dos-games-downloader.css";

export class DosGamesDownloaderApp extends Application {
  static config = {
    id: "dos-games-downloader",
    title: "DOS Games Downloader",
    description: "Search and download DOS games from Archive.org",
    icon: ICONS.msdos,
    category: "",
    width: 500,
    height: 400,
    resizable: true,
  };

  constructor(config) {
    super(config);
    this.results = [];
    this.isDownloading = false;
    this.installedGames = {};
    this.persistencePath = "/C:/Program Files/DOS Games Downloader/installed.json";
  }

  async _onLaunch() {
    await this._loadInstalledGames();
  }

  async _loadInstalledGames() {
    try {
      if (await existsAsync(this.persistencePath)) {
        const content = await fs.promises.readFile(this.persistencePath, "utf8");
        this.installedGames = JSON.parse(content);
      }
    } catch (e) {
      console.error("Failed to load installed games", e);
    }
  }

  async _saveInstalledGames() {
    try {
      const dir = "/C:/Program Files/DOS Games Downloader";
      if (!(await existsAsync(dir))) {
        await fs.promises.mkdir(dir, { recursive: true });
      }
      await fs.promises.writeFile(this.persistencePath, JSON.stringify(this.installedGames, null, 2));
    } catch (e) {
      console.error("Failed to save installed games", e);
    }
  }

  _createWindow() {
    this.win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
    });

    this.win.$content.html(`
      <div class="downloader-container">
        <div class="search-bar">
          <input type="text" class="search-input" placeholder="Search for DOS games...">
          <button class="search-button">Search</button>
        </div>
        <div class="results-container inset-deep">
          <div class="results-list"></div>
        </div>
      </div>
    `);

    this._setupEventListeners();
    return this.win;
  }

  _setupEventListeners() {
    const searchBtn = this.win.$content.find(".search-button");
    const searchInput = this.win.$content.find(".search-input");

    searchBtn.on("click", () => this._handleSearch());
    searchInput.on("keydown", (e) => {
      if (e.key === "Enter") this._handleSearch();
    });

    this.win.$content.on("click", ".download-btn", (e) => {
      const identifier = $(e.currentTarget).data("id");
      const title = $(e.currentTarget).data("title");
      this._downloadAndInstall(identifier, title);
    });
  }

  async _handleSearch() {
    const query = this.win.$content.find(".search-input").val().trim();
    if (!query) return;

    this.win.$content.find(".results-list").empty();
    this._setStatus("Searching...");

    try {
      // Archive.org advanced search API
      const url = `https://archive.org/advancedsearch.php?q=collection:(softwarelibrary_msdos)+AND+title:(${encodeURIComponent(query)})&fl[]=identifier,title,description&output=json`;
      const response = await fetch(url);
      const data = await response.json();

      this.results = data.response.docs;
      this._renderResults();
      this._setStatus(this.results.length ? "" : "No results found.");
    } catch (e) {
      console.error("Search failed", e);
      this._setStatus("Search failed. Please try again.");
    }
  }

  _renderResults() {
    const list = this.win.$content.find(".results-list");
    list.empty();

    this.results.forEach((item) => {
      const isInstalled = !!this.installedGames[item.identifier];
      const thumbUrl = isInstalled ? this.installedGames[item.identifier].thumbUrl : `https://archive.org/services/img/${item.identifier}`;

      const card = $(`
        <div class="game-card">
          <img class="game-thumb" src="${thumbUrl}" alt="${item.title}" loading="lazy">
          <div class="game-info">
            <div class="game-title">${item.title}</div>
            <div class="game-id">${item.identifier}</div>
          </div>
          <button class="download-btn" data-id="${item.identifier}" data-title="${item.title}">Install</button>
        </div>
      `);
      list.append(card);
    });
  }

  _setStatus(msg) {
    const list = this.win.$content.find(".results-list");
    if (msg) {
        list.html(`<div class="status-info">${msg}</div>`);
    }
  }

  async _fetchWithProxy(url, title, dialog, signal) {
    const proxies = [
      (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
      (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    ];

    for (let i = 0; i < proxies.length; i++) {
      const proxiedUrl = proxies[i](url);
      try {
        console.log(`Attempting download with proxy ${i + 1}: ${proxiedUrl}`);
        const response = await fetch(proxiedUrl, { signal });
        if (response.ok) return response;
        console.warn(`Proxy ${i + 1} failed with status ${response.status}`);
      } catch (e) {
        if (e.name === 'AbortError') throw e;
        console.warn(`Proxy ${i + 1} failed with error:`, e);
      }

      if (i < proxies.length - 1) {
        if (dialog) dialog.update(`Proxy ${i+1} failed, retrying with fallback...`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    throw new Error("All download proxies failed. Archive.org might be temporarily blocking access.");
  }

  async _downloadAndInstall(identifier, title) {
    if (this.isDownloading) return;
    this.isDownloading = true;

    const abortController = new AbortController();
    const installDir = `/C:/Games/${identifier}`;

    const dialog = new DosGamesDownloaderProgressDialog({
      title: "Installing Game",
      parentWindow: this.win,
      onCancel: () => {
        abortController.abort();
      }
    });

    try {
      // 1. Get metadata to find the zip file
      dialog.update(`Fetching metadata for ${title}...`, "Archive.org", installDir);
      const metaUrl = `https://archive.org/metadata/${identifier}`;
      const metaResponse = await fetch(metaUrl, { signal: abortController.signal });
      const metaData = await metaResponse.json();

      const zipFile = metaData.files.find(f => f.name.toLowerCase().endsWith(".zip"));
      if (!zipFile) throw new Error("No ZIP file found for this game.");

      const downloadUrl = `https://archive.org/download/${identifier}/${zipFile.name}`;

      // 2. Download the ZIP with progress
      const zipResponse = await this._fetchWithProxy(downloadUrl, title, dialog, abortController.signal);

      const contentLength = zipResponse.headers.get('content-length');
      const totalDownloadSize = contentLength ? parseInt(contentLength, 10) : 0;
      dialog.setTotalSize(totalDownloadSize);
      dialog.update(`Downloading ${title}...`, downloadUrl, installDir);

      const reader = zipResponse.body.getReader();
      let downloadedSize = 0;
      const chunks = [];

      while(true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        downloadedSize += value.length;
        dialog.update(null, null, null, downloadedSize);
      }

      const buffer = new Uint8Array(downloadedSize);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      // 3. Extract to /C:/Games/[identifier]
      dialog.update(`Preparing extraction...`, null, null, 0);
      if (!(await existsAsync(installDir))) {
        await fs.promises.mkdir(installDir, { recursive: true });
      }

      const zipFs = await Zip.create({ data: buffer });
      await zipFs.ready();

      const mountPoint = `/mnt/zip-${identifier}`;
      if (!(await existsAsync("/mnt"))) await fs.promises.mkdir("/mnt");
      if (!(await existsAsync(mountPoint))) await fs.promises.mkdir(mountPoint);

      mount(mountPoint, zipFs);

      try {
        const totalExtractSize = await this._getRecursiveSize(mountPoint);
        dialog.setTotalSize(totalExtractSize);
        await this._copyRecursive(mountPoint, installDir, dialog, 0);
      } finally {
        umount(mountPoint);
        try {
            await fs.promises.rmdir(mountPoint);
        } catch (e) {}
      }

      // 4. Find the best executable (.EXE, .COM, .BAT)
      const executable = await this._findExecutable(installDir, identifier);

      // 5. Update persistence
      const thumbUrl = `https://archive.org/services/img/${identifier}`;
      this.installedGames[identifier] = {
        identifier,
        title,
        installDir,
        executable,
        thumbUrl
      };
      await this._saveInstalledGames();

      this._renderResults();
      dialog.close();

      ShowDialogWindow({
        title: "Installation Successful",
        text: `Successfully installed <b>${title}</b>!<br><br>The game is installed in:<br><code>${installDir}</code>`,
        contentIconUrl: ICONS.msdos[32],
        buttons: [
          {
            label: "Go to directory",
            action: () => {
              window.System.launchApp("explorer", { filePath: installDir });
            }
          },
          { label: "OK", isDefault: true }
        ],
        modal: true,
      });
    } catch (e) {
      if (e.name === 'AbortError' || dialog.cancelled) {
         console.log("Installation cancelled");
         // Cleanup
         try {
           if (await existsAsync(installDir)) {
             await fs.promises.rm(installDir, { recursive: true });
           }
         } catch (err) {
           console.error("Cleanup failed", err);
         }
      } else {
        console.error("Installation failed", e);
        ShowDialogWindow({
          title: "Installation Failed",
          text: `Error: ${e.message}`,
          buttons: [{ label: "OK", isDefault: true }],
          modal: true,
        });
      }
      dialog.close();
    } finally {
      this.isDownloading = false;
    }
  }

  async _findExecutable(installDir, identifier) {
    const candidates = [];
    const extensions = [".exe", ".com", ".bat"];

    try {
      const entries = await fs.promises.readdir(installDir);
      for (const entry of entries) {
        const fullPath = `${installDir}/${entry}`;
        const stats = await fs.promises.stat(fullPath);
        const lowerEntry = entry.toLowerCase();

        if (stats.isDirectory()) {
          // Check one level deep
          const subEntries = await fs.promises.readdir(fullPath);
          for (const subEntry of subEntries) {
            const subFullPath = `${fullPath}/${subEntry}`;
            const subStats = await fs.promises.stat(subFullPath);
            if (subStats.isFile()) {
              const subLower = subEntry.toLowerCase();
              const extMatch = extensions.find(ext => subLower.endsWith(ext));
              if (extMatch) {
                let score = extensions.length - extensions.indexOf(extMatch);
                const nameWithoutExt = subLower.slice(0, -extMatch.length);
                if (nameWithoutExt === lowerEntry) score += 10; // Matches parent dir
                if (nameWithoutExt === identifier.toLowerCase()) score += 5;
                candidates.push({ path: `${entry}/${subEntry}`, score });
              }
            }
          }
        } else if (stats.isFile()) {
          const extMatch = extensions.find(ext => lowerEntry.endsWith(ext));
          if (extMatch) {
            let score = extensions.length - extensions.indexOf(extMatch);
            const nameWithoutExt = lowerEntry.slice(0, -extMatch.length);
            const parentName = installDir.split("/").pop().toLowerCase();
            if (nameWithoutExt === parentName) score += 10;
            if (nameWithoutExt === identifier.toLowerCase()) score += 5;
            candidates.push({ path: entry, score });
          }
        }
      }
    } catch (e) {
      console.error("Error finding executable", e);
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].path;
  }

  async _getRecursiveSize(path) {
    let size = 0;
    const entries = await fs.promises.readdir(path);
    for (const entry of entries) {
      const fullPath = `${path}/${entry}`;
      const stats = await fs.promises.stat(fullPath);
      if (stats.isDirectory()) {
        size += await this._getRecursiveSize(fullPath);
      } else {
        size += stats.size;
      }
    }
    return size;
  }

  async _copyRecursive(src, dest, dialog, currentProgress) {
    const entries = await fs.promises.readdir(src);
    for (const entry of entries) {
      if (dialog && dialog.cancelled) throw new Error("Cancelled");
      const srcPath = `${src}/${entry}`;
      const destPath = `${dest}/${entry}`;
      const stats = await fs.promises.stat(srcPath);

      if (stats.isDirectory()) {
        if (!(await existsAsync(destPath))) {
          await fs.promises.mkdir(destPath);
        }
        currentProgress = await this._copyRecursive(srcPath, destPath, dialog, currentProgress);
      } else {
        const data = await fs.promises.readFile(srcPath);
        await fs.promises.writeFile(destPath, data);
        currentProgress += stats.size;
        if (dialog) dialog.update(`Extracting ${entry}...`, null, null, currentProgress);
      }
    }
    return currentProgress;
  }
}
