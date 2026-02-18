import { launchApp } from '../system/app-manager.js';
import { ShowRunDialog } from '../shell/run-dialog.js';
import { ICONS } from './icons.js';
import { START_MENU_PATH, FAVORITES_PATH } from '../shell/start-menu/start-menu-utils.js';

const startMenuConfig = [
  {
    label: "Programs",
    icon: ICONS.programs[32],
    isDynamic: true,
    path: START_MENU_PATH,
    submenu: [
      {
        id: "startup-folder",
        label: "StartUp",
        icon: ICONS.programs[16],
        submenu: [],
      },
    ],
  },
  {
    label: "Favorites",
    icon: ICONS.favorites[32],
    isDynamic: true,
    path: FAVORITES_PATH,
    submenu: [
      {
        label: "Channels",
        icon: ICONS.programs[16],
        submenu: [
          {
            label: "AOL",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "aol.com",
            action: () => launchApp("internet-explorer", "aol.com"),
          },
          {
            label: "BBC",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "bbc.com",
            action: () => launchApp("internet-explorer", "bbc.com"),
          },
          {
            label: "CNN",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "cnn.com",
            action: () => launchApp("internet-explorer", "cnn.com"),
          },
          {
            label: "Detik",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "detik.com",
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
            appId: "internet-explorer",
            args: "excite.com",
            action: () => launchApp("internet-explorer", "excite.com"),
          },
          {
            label: "Google",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "google.com",
            action: () => launchApp("internet-explorer", "google.com"),
          },
          {
            label: "Infospace",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "infospace.com",
            action: () => launchApp("internet-explorer", "infospace.com"),
          },
          {
            label: "Lycos",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "lycos.com",
            action: () => launchApp("internet-explorer", "lycos.com"),
          },
          {
            label: "Netscape",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "netscape.com",
            action: () => launchApp("internet-explorer", "netscape.com"),
          },
          {
            label: "Yahoo",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "yahoo.com",
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
            appId: "internet-explorer",
            args: "amazon.com",
            action: () => launchApp("internet-explorer", "amazon.com"),
          },
          {
            label: "GeoCities",
            icon: ICONS.htmlFile[16],
            appId: "internet-explorer",
            args: "geocities.com",
            action: () => launchApp("internet-explorer", "geocities.com"),
          },
        ],
      },
      {
        label: "Microsoft",
        icon: ICONS.htmlFile[16],
        appId: "internet-explorer",
        args: "microsoft.com",
        action: () => launchApp("internet-explorer", "microsoft.com"),
      },
      {
        label: "MSN",
        icon: ICONS.htmlFile[16],
        appId: "internet-explorer",
        args: "msn.com",
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
          launchApp("explorer", "/C:/My Documents"),
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
