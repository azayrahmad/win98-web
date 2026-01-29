import { apps } from "./apps.js";
import { launchApp } from "../utils/appManager.js";
import { ShowRunDialog } from "../components/RunDialog.js";
import { ICONS } from "./icons.js";

const startMenuAppIds = [
  "zenexplorer",
  "webamp",
  "tipOfTheDay",
  "internet-explorer",
  "keen",
  "command-prompt",
  "buy-me-a-coffee",
  "pdfviewer",
  "doom",
  "simcity2000",
  "diablo",
  "esheep",
  "quake",
  "princeofpersia",
];
const accessoriesAppIds = [
  "notepad",
  "clippy",
  "paint",
  "image-viewer",
  "wordpad",
  "calculator",
];

function getAppList(appListIds) {
  return appListIds
    .map((id) => apps.find((app) => app.id === id))
    .filter((app) => app)
    .sort((a, b) => a.title.localeCompare(b.title))
    .map((app) => ({
      label: app.title,
      icon: app.icon[16],
      action: () => launchApp(app.id),
    }));
}

const startMenuConfig = [
  {
    label: "Programs",
    icon: ICONS.programs[32],
    submenu: [
      {
        id: "startup-folder",
        label: "StartUp",
        icon: ICONS.programs[16],
        submenu: [],
      },
      {
        label: "Accessories",
        icon: ICONS.programs[16],
        submenu: [
          {
            label: "Games",
            icon: ICONS.programs[16],
            submenu: getAppList(["pinball", "minesweeper", "solitaire", "spidersolitaire", "freecell"]),
          },
          {
            label: "Entertainment",
            icon: ICONS.programs[16],
            submenu: getAppList(["media-player", "flashplayer"]),
          },
          {
            label: "System Tools",
            icon: ICONS.programs[16],
            submenu: getAppList(["defrag"]),
          },
          ...getAppList(accessoriesAppIds),
        ],
      },
      ...getAppList(startMenuAppIds),
      {
        label: "Windows Explorer",
        icon: ICONS.windowsExplorer[16],
        action: () => launchApp("my-computer"),
      },
    ],
  },
  {
    label: "Favorites",
    icon: ICONS.favorites[32],
    submenu: [
      {
        label: "Channels",
        icon: ICONS.programs[16],
        submenu: [
          {
            label: "AOL",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "aol.com"),
          },
          {
            label: "BBC",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "bbc.com"),
          },
          {
            label: "CNN",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "cnn.com"),
          },
          {
            label: "Detik",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "detik.com"),
          },
        ],
      },
      {
        label: "Links",
        icon: ICONS.programs[16],
        submenu: [
          {
            label: "Excite",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "excite.com"),
          },
          {
            label: "Google",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "google.com"),
          },
          {
            label: "Infospace",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "infospace.com"),
          },
          {
            label: "Lycos",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "lycos.com"),
          },
          {
            label: "Netscape",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "netscape.com"),
          },
          {
            label: "Yahoo",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "yahoo.com"),
          },
        ],
      },
      {
        label: "Media",
        icon: ICONS.programs[16],
        submenu: [
          {
            label: "Amazon",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "amazon.com"),
          },
          {
            label: "GeoCities",
            icon: ICONS.htmlFile[16],
            action: () => launchApp("internet-explorer", "geocities.com"),
          },
        ],
      },
      {
        label: "Microsoft",
        icon: ICONS.htmlFile[16],
        action: () => launchApp("internet-explorer", "microsoft.com"),
      },
      {
        label: "MSN",
        icon: ICONS.htmlFile[16],
        action: () => launchApp("internet-explorer", "msn.com"),
      },
    ],
  },
  {
    label: "Documents",
    icon: ICONS.documents[32],
    submenu: [
      {
        label: "My Documents",
        icon: ICONS.folder[16],
        action: () =>
          launchApp("explorer", "/drive-c/folder-user/folder-documents"),
      },
    ],
  },
  {
    label: "Settings",
    icon: ICONS.settings[32],
    submenu: [
      {
        label: "Control Panel",
        icon: ICONS.controlPanel[16],
        action: () => launchApp("control-panel"),
      },
    ],
  },
  {
    label: "Find",
    icon: ICONS.find[32],
    submenu: [],
  },
  {
    label: "Help",
    icon: ICONS.help[32],
    action: () => launchApp("help"),
  },
  {
    label: "Run",
    icon: ICONS.run[32],
    action: () => ShowRunDialog(),
  },
];

export default startMenuConfig;
