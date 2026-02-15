import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';
import { fs } from "@zenfs/core";
import { existsAsync } from '../../system/zenfs-utils.js';

const AVAILABLE_GAMES = [
  {
    id: "wolf3d",
    title: "Wolfenstein 3D",
    path: "/C:/Games/WOLF3D",
    remotePath: "games/dos/wolf3d/",
    files: [
      "AUDIOHED.WL6", "AUDIOT.WL6", "CONFIG.WL6", "GAMEMAPS.WL6",
      "MAPHEAD.WL6", "VGADICT.WL6", "VGAGRAPH.WL6", "VGAHEAD.WL6",
      "VSWAP.WL6", "WOLF3D.EXE"
    ]
  },
  {
    id: "sky",
    title: "Beneath a Steel Sky",
    path: "/C:/Games/SKY",
    remotePath: "games/dos/sky/",
    files: ["SKY.DNR", "SKY.DSK", "SKY.EXE", "SKY.RST"]
  },
  {
    id: "sim-city-2000",
    title: "SimCity 2000 Demo",
    path: "/C:/Games/SC2000",
    remotePath: "games/dos/simcity2000/",
    files: [
      "DEMOCITY.SC2", "INFO.EXE", "INSTALL.EXE", "INSTALL.MXS",
      "MAXIS.CIM", "MW_ATIUP.EXE", "POSTCARD.CIM", "README.TXT",
      "SC2000.CFG", "SC2000.DAT", "SC2000.EXE", "START.COM",
      "VDETECT.EXE",
      "VESA/ATI/READ.ME", "VESA/ATI/VVESA1.COM", "VESA/ATI/VVESA2.COM",
      "VESA/CIRRUS/CLVESA.COM", "VESA/CIRRUS/CRUSVESA.COM", "VESA/CIRRUS/README.DOC",
      "VESA/COMPAQ/CPQVESA.EXE", "VESA/COMPAQ/README.VSA",
      "VESA/DIAMOND/24XVESA.EXE", "VESA/DIAMOND/READ.ME", "VESA/DIAMOND/VESA.EXE",
      "VESA/HEADLAND/HTVESA.COM", "VESA/HEADLAND/READ.ME",
      "VESA/IBM/READ.ME", "VESA/IBM/VESA.EXE", "VESA/IBM/XGAVESA.EXE",
      "VESA/OAK/67VESA.COM", "VESA/OAK/OAK-37.COM", "VESA/OAK/OAK-77.COM",
      "VESA/OAK/OTIVBE.COM", "VESA/OAK/OTIVESA.COM", "VESA/OAK/README.DOC",
      "VESA/PARADISE/PARADISE.EXE", "VESA/PARADISE/READ.ME", "VESA/PARADISE/VESA.EXE",
      "VESA/PARADISE/VESA1A1B.EXE", "VESA/PARADISE/VESA1C.EXE", "VESA/PARADISE/VESA1D.EXE", "VESA/PARADISE/VESAX.EXE",
      "VESA/TRIDENT/READ.ME", "VESA/TRIDENT/VESA.EXE",
      "VESA/TSENG/TLIVESA.COM", "VESA/TSENG/TLIVESA.DOC", "VESA/TSENG/TLIVESA1.COM",
      "VESA/UNIVESA/COPYRIGH", "VESA/UNIVESA/UNIVESA.DOC", "VESA/UNIVESA/UNIVESA.EXE",
      "VESA/VIDEO7/READ.ME", "VESA/VIDEO7/V7VESA.COM", "VESA/VIDEO7/V7WVGA.COM"
    ]
  }
];

const DOS_GAMES_DESKTOP_PATH = "/C:/WINDOWS/Desktop/DOS Games";

export class DosGamesDownloaderApp extends Application {
  static config = {
    id: "dos-games-downloader",
    title: "DOS Games Downloader",
    description: "Download and install DOS games.",
    icon: ICONS.msdos,
    width: 400,
    height: 350,
    resizable: true,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
    this.gameStatus = {};
  }

  async _createWindow() {
    const win = new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
    });

    const content = document.createElement("div");
    content.className = "dos-downloader-content";
    content.style.padding = "10px";
    content.style.backgroundColor = "#c0c0c0";
    content.style.height = "100%";
    content.style.boxSizing = "border-box";
    content.style.display = "flex";
    content.style.flexDirection = "column";

    const title = document.createElement("h3");
    title.textContent = "Available DOS Games";
    title.style.marginTop = "0";
    content.appendChild(title);

    this.listContainer = document.createElement("div");
    this.listContainer.style.flex = "1";
    this.listContainer.style.overflowY = "auto";
    this.listContainer.style.border = "2px inset #ffffff";
    this.listContainer.style.backgroundColor = "#ffffff";
    this.listContainer.style.padding = "4px";
    content.appendChild(this.listContainer);

    win.$content.append(content);
    this.win = win;

    await this.refreshList();

    return win;
  }

  async refreshList() {
    this.listContainer.innerHTML = "";
    for (const game of AVAILABLE_GAMES) {
      const isInstalled = await existsAsync(game.path);
      this.gameStatus[game.id] = isInstalled ? "installed" : "available";

      const item = document.createElement("div");
      item.style.display = "flex";
      item.style.justifyContent = "space-between";
      item.style.alignItems = "center";
      item.style.padding = "4px";
      item.style.borderBottom = "1px solid #c0c0c0";

      const label = document.createElement("span");
      label.textContent = game.title;
      item.appendChild(label);

      const btn = document.createElement("button");
      btn.style.width = "80px";
      btn.textContent = isInstalled ? "Installed" : "Install";
      btn.disabled = isInstalled;
      btn.onclick = () => this.installGame(game, btn);
      item.appendChild(btn);

      this.listContainer.appendChild(item);
    }
  }

  async installGame(game, btn) {
    btn.disabled = true;
    btn.textContent = "0%";

    try {
      if (!(await existsAsync(game.path))) {
        await fs.promises.mkdir(game.path, { recursive: true });
      }

      let completed = 0;
      for (const file of game.files) {
        const response = await fetch(game.remotePath + file);
        const buffer = await response.arrayBuffer();
        const targetPath = `${game.path}/${file}`;
        const targetDir = targetPath.substring(0, targetPath.lastIndexOf("/"));

        if (!(await existsAsync(targetDir))) {
            await fs.promises.mkdir(targetDir, { recursive: true });
        }

        await fs.promises.writeFile(targetPath, new Uint8Array(buffer));
        completed++;
        btn.textContent = Math.floor((completed / game.files.length) * 100) + "%";
      }

      // Create shortcut in DOS Games folder
      if (!(await existsAsync(DOS_GAMES_DESKTOP_PATH))) {
        await fs.promises.mkdir(DOS_GAMES_DESKTOP_PATH, { recursive: true });
      }

      const lnkPath = `${DOS_GAMES_DESKTOP_PATH}/${game.title}.lnk.json`;
      await fs.promises.writeFile(
        lnkPath,
        JSON.stringify(
          {
            type: "shortcut",
            appId: game.id,
          },
          null,
          2,
        ),
      );

      // Trigger FS change to refresh desktop if open
      document.dispatchEvent(
        new CustomEvent("zen-fs-change", { detail: { path: DOS_GAMES_DESKTOP_PATH } }),
      );

      btn.textContent = "Installed";
    } catch (e) {
      console.error(`Failed to install ${game.title}:`, e);
      btn.textContent = "Error";
      btn.disabled = false;
    }
  }
}
