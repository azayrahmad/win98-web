import { ICONS } from './icons.js';
import { getClippyMenuItems } from '../apps/clippy/clippy.js';
import { getESheepMenuItems } from '../apps/esheep/esheep.js';
import { getWebampMenuItems } from '../apps/webamp/webamp.js';

export const appRegistry = {
  "about": {
    config: {
    id: "about",
    title: "About",
    description: "Displays information about this application.",
    summary: "<b>azOS Second Edition</b><br>Copyright © 2024",
    icon: ICONS.windowsUpdate,
    width: 400,
    height: 280,
    resizable: false,
    minimizeButton: false,
    maximizeButton: false,
    isSingleton: true,
  },
    importApp: () => import("../shell/about/about-app.js")
  },
  "app-maker": {
    config: {
        id: "app-maker",
        title: "App Maker",
        description: "Create your own applications.",
        icon: ICONS.appmaker,
        width: 600,
        height: 500,
        resizable: true,
        isSingleton: true,
    },
    importApp: () => import("../apps/app-maker/app-maker-app.js")
  },
  "buggy-program": {
    config: {
    id: "buggy-program",
    title: "buggyprogram.exe",
    description:
      "An intentionally buggy program that leaves trails when moved.",
    icon: ICONS.shell,
    width: 450,
    height: 200,
    resizable: false,
    isSingleton: false,
  },
    importApp: () => import("../apps/buggy-program/buggy-program-app.js")
  },
  "buy-me-a-coffee": {
    config: {
    id: "buy-me-a-coffee",
    title: "Buy me a coffee",
    description: "Support the developer.",
    icon: ICONS["buy-me-a-coffee"], category: "",
    width: 300,
    height: 650,
    resizable: false,
    maximizable: false,
    isSingleton: true,
  },
    importApp: () => import("../apps/buy-me-a-coffee/buy-me-acoffee-app.js")
  },
  "calculator": {
    config: {
    id: "calculator",
    title: "Calculator",
    description: "Perform calculations.",
    icon: ICONS.calculator, category: "Accessories",
    width: 260,
    height: 280,
    resizable: false,
  },
    importApp: () => import("../apps/calculator/calculator-app.js")
  },
  "clippy": {
    config: {
        id: "clippy",
        title: "Assistant",
        description: "Your friendly assistant.",
        icon: ICONS.clippy, category: "Accessories",
        hasTray: true,
        isSingleton: true,
        tray: {
          contextMenu: getClippyMenuItems,
        },
        tips: [
          "Need help? Try the <a href='#' class='tip-link' data-app='clippy'>Assistant</a> for assistance with azOS features.",
          "You can ask Clippy about Aziz's resume by clicking on it.",
          "Right-click on Clippy to see more options, like changing the agent or making it animate.",
        ],
    },
    importApp: () => import("../apps/clippy/clippy-app.js")
  },
  "command-prompt": {
    config: {
    id: "command-prompt",
    title: "MS-DOS Prompt",
    description: "Starts a new MS-DOS prompt.",
    icon: ICONS.msdos, category: "",
    width: 640,
    height: 480,
    resizable: true,
    isSingleton: false,
  },
    importApp: () => import("../apps/command-prompt/command-prompt-app.js")
  },
  "cursor-explorer": {
    config: {
    id: "cursor-explorer",
    title: "Mouse",
    description: "Explore and preview cursor schemes.",
    icon: ICONS["mouse"],
    width: 400,
    height: 500,
    resizable: true,
    isSingleton: true,
  },
    importApp: () => import("../apps/cursor-explorer/cursor-explorer-app.js")
  },
  "defrag": {
    config: {
    id: "defrag",
    title: "Disk Defragmenter",
    description: "Defragments your disk for optimal performance.",
    icon: ICONS.defrag, category: "Accessories/System Tools",
    width: 400,
    height: 300,
    resizable: true,
    isSingleton: true,
  },
    importApp: () => import("../apps/defrag/defrag-app.js")
  },
  "desktop-themes": {
    config: {
    id: "desktop-themes",
    title: "Desktop Themes",
    description: "Customize your desktop's appearance.",
    icon: ICONS.desktopthemes,
    width: 550,
    height: 500,
    resizable: false,
    isSingleton: true,
  },
    importApp: () => import("../apps/desktop-themes/desktop-themes-app.js")
  },
  "diablo": {
    config: {
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
    },
    importApp: () => import("../apps/diablo/diablo-app.js")
  },
  "display-properties": {
    config: {
    id: "display-properties",
    title: "Display",
    description: "Customize your display settings.",
    icon: ICONS.displayProperties,
    width: 404,
    height: 448,
    resizable: false,
    isSingleton: true,
  },
    importApp: () => import("../shell/display-properties/display-properties-app.js")
  },
  "doom": {
    config: {
    id: "doom",
    title: "Doom",
    description: "Play the classic game Doom.",
    icon: ICONS.doom, category: "",
    width: 640,
    height: 400,
    resizable: true,
    maximizable: true,
    allowFullscreen: true,
    startFullscreen: true,
    isSingleton: true,
  },
    importApp: () => import("../apps/doom/doom-app.js")
  },
  "dos-box": {
    config: [
    {
      id: "dos-box",
      title: "DOSBox",
      description: "DOSBox-X Emulator",
      icon: ICONS.msdos,
      category: null,
      width: 640,
      height: 480,
      resizable: true,
      maximizable: true,
      allowFullscreen: true,
      startFullscreen: true,
      isSingleton: false,
    },
  ],
    importApp: () => import("../apps/dos-box/dos-box-app.js")
  },
  "dos-games-downloader": {
    config: {
    id: "dos-games-downloader",
    title: "DOS Games Downloader",
    description: "Search and download DOS games from Archive.org",
    icon: ICONS.msdos,
    category: "",
    width: 500,
    height: 400,
    resizable: true,
  },
    importApp: () => import("../apps/dos-games-downloader/dos-games-downloader-app.js")
  },
  "dx-ball": {
    config: {
    id: "dx-ball",
    title: "DX-Ball",
    description: "The classic Breakout game.",
    icon: ICONS.dxball, category: "",
    width: 654, // Adjusted for typical window borders to avoid scrollbars at 640x480
    height: 520,
    resizable: true,
    maximizable: true,
    allowFullscreen: true,
    startFullscreen: true,
    isSingleton: true,
  },
    importApp: () => import("../apps/dx-ball/dx-ball-app.js")
  },
  "esheep": {
    config: {
        id: "esheep",
        title: "eSheep",
        description: "A classic desktop pet.",
        icon: ICONS.esheep, category: "",
        hasTray: true,
        isSingleton: true,
        tray: {
            contextMenu: getESheepMenuItems,
        },
    },
    importApp: () => import("../apps/esheep/esheep-app.js")
  },
  "flash-player": {
    config: {
    id: "flash-player",
    title: "Flash Player",
    icon: ICONS.flashPlayer, category: "Accessories/Entertainment",
    width: 550,
    height: 400,
    resizable: true,
  },
    importApp: () => import("../apps/flash-player/flash-player-app.js")
  },
  "freecell": {
    config: {
    id: "freecell",
    title: "FreeCell",
    width: 632,
    height: 446,
    resizable: false,
    icon: ICONS.freecell, category: "Accessories/Games",
  },
    importApp: () => import("../apps/freecell/free-cell-app.js")
  },
  "help": {
    config: {
    id: "help",
    title: "Help Topics",
    description: "Provides help and support.",
    icon: ICONS.help,
    width: 600,
    height: 450,
    resizable: true,
    isSingleton: false,
  },
    importApp: () => import("../apps/help/help-app.js")
  },
  "image-resizer": {
    config: {
        id: "image-resizer",
        title: "Image Resizer",
        description: "Resize and convert images.",
        icon: ICONS.image,
        width: 920,
        height: 720,
        resizable: true,
        isSingleton: false,
    },
    importApp: () => import("../apps/image-resizer/image-resizer-app.js")
  },
  "image-viewer": {
    config: {
    id: "image-viewer",
    title: "Image Viewer",
    description: "View images.",
    icon: ICONS.imageViewer, category: "Accessories",
    width: 400,
    height: 300,
    resizable: true,
    isSingleton: false,
  },
    importApp: () => import("../apps/image-viewer/image-viewer-app.js")
  },
  "keen": {
    config: {
    id: "keen",
    title: "Commander Keen",
    description: "Play the classic game Commander Keen.",
    icon: ICONS.keen, category: "",
    width: 672,
    height: 414,
    resizable: true,
    maximizable: true,
    allowFullscreen: true,
    startFullscreen: true,
    isSingleton: true,
  },
    importApp: () => import("../apps/keen/keen-app.js")
  },
  "media-player": {
    config: {
    id: "media-player",
    title: "Media Player",
    description: "Play audio and video files.",
    icon: ICONS.mediaPlayer, category: "Accessories/Entertainment",
    width: 480,
    height: 360,
    resizable: true,
    isSingleton: false,
  },
    importApp: () => import("../apps/media-player/media-player-app.js")
  },
  "minesweeper": {
    config: {
    id: "minesweeper",
    title: "Minesweeper",
    description: "Play the classic game of Minesweeper.",
    icon: ICONS.minesweeper, category: "Accessories/Games",
    width: 200,
    height: 280,
    resizable: false,
    isSingleton: true,
  },
    importApp: () => import("../apps/minesweeper/minesweeper-app.js")
  },
  "notepad": {
    config: {
        id: "notepad",
        title: "Notepad",
        description: "A simple text editor.",
        icon: ICONS.notepad, category: "Accessories",
        width: 600,
        height: 400,
        resizable: true,
        isSingleton: false,
        tips: [
            "Notepad can be used for more than just text. It also supports syntax highlighting for various programming languages.",
            "In Notepad, you can format your code using the 'Format' option in the 'File' menu.",
            "You can preview Markdown files in Notepad by selecting 'Preview Markdown' from the 'View' menu.",
            "Notepad can copy text with syntax highlighting. Use 'Copy with Formatting' from the 'Edit' menu.",
        ],
    },
    importApp: () => import("../apps/notepad/notepad-app.js")
  },
  "paint": {
    config: {
        id: "paint",
        title: "Paint",
        description: "Create and edit images.",
        icon: ICONS.paint, category: "Accessories",
        width: 800,
        height: 600,
        resizable: true,
        isSingleton: true,
    },
    importApp: () => import("../apps/paint/paint-app.js")
  },
  "pdf-viewer": {
    config: {
    id: "pdf-viewer",
    title: "PDF Viewer",
    description: "View PDF documents.",
    icon: ICONS.pdf, category: "",
    width: 800,
    height: 600,
    resizable: true,
    isSingleton: false,
    tips: [
      "You can open PDF files by double-clicking them on the desktop or in the file explorer.",
    ],
  },
    importApp: () => import("../apps/pdf-viewer/pdf-viewer-app.js")
  },
  "pinball": {
    config: {
    id: "pinball",
    title: "Space Cadet Pinball",
    description: "Play a classic game of pinball.",
    icon: ICONS.pinball, category: "Accessories/Games",
    width: 600,
    height: 400,
    resizable: false,
    isSingleton: true,
  },
    importApp: () => import("../apps/pinball/pinball-app.js")
  },
  "prince-of-persia": {
    config: {
    id: "prince-of-persia",
    title: "Prince of Persia",
    icon: ICONS.princeofpersia, category: "",
    width: 640,
    height: 420,
    resizable: true,
    maximizable: true,
    allowFullscreen: true,
    startFullscreen: true,
  },
    importApp: () => import("../apps/prince-of-persia/prince-of-persia-app.js")
  },
  "quake": {
    config: {
        id: 'quake',
        title: 'Quake',
        icon: ICONS.quake, category: "",
        width: 640,
        height: 480,
        resizable: true,
        maximizable: true,
        allowFullscreen: true,
        startFullscreen: true,
        isSingleton: true,
    },
    importApp: () => import("../apps/quake/quake-app.js")
  },
  "report-a-bug": {
    config: {
    id: "report-a-bug",
    title: "Report a Bug",
    icon: ICONS.error,
    width: 400,
    height: 320,
    resizable: false,
  },
    importApp: () => import("../apps/report-a-bug/report-abug-app.js")
  },
  "solitaire": {
    config: {
    id: "solitaire",
    title: "Solitaire",
    width: 700,
    height: 600,
    resizable: true,
    icon: ICONS.solitaire, category: "Accessories/Games",
  },
    importApp: () => import("../apps/solitaire/solitaire-app.js")
  },
  "sound-scheme-explorer": {
    config: {
    id: "sound-scheme-explorer",
    title: "Sound Scheme Explorer",
    description: "Explore and listen to sound schemes.",
    icon: ICONS.soundschemeexplorer,
    width: 400,
    height: 300,
    resizable: true,
    isSingleton: true,
  },
    importApp: () => import("../apps/sound-scheme-explorer/sound-scheme-explorer-app.js")
  },
  "spider-solitaire": {
    config: {
    id: "spider-solitaire",
    title: "Spider Solitaire",
    width: 880,
    height: 550,
    resizable: true,
    icon: ICONS.spidersolitaire, category: "Accessories/Games",
  },
    importApp: () => import("../apps/spider-solitaire/spider-solitaire-app.js")
  },
  "task-manager": {
    config: {
    id: "task-manager",
    title: "Task Manager",
    description: "Manage running applications.",
    icon: ICONS.windows,
    width: 300,
    height: 400,
    resizable: false,
    isSingleton: true,
  },
    importApp: () => import("../apps/task-manager/task-manager-app.js")
  },
  "theme-to-css": {
    config: {
    id: "theme-to-css",
    title: "Theme to CSS",
    description: "Convert a Windows theme file to CSS.",
    icon: ICONS.themetocss,
    width: 700,
    height: 350,
    resizable: true,
    isSingleton: true,
  },
    importApp: () => import("../apps/theme-to-css/theme-to-css-app.js")
  },
  "tip-of-the-day": {
    config: {
        id: "tip-of-the-day",
        title: "Tip of the Day",
        description: "Provides useful tips about using the system.",
        icon: ICONS.tip, category: "",
        width: 400,
        height: 300,
        resizable: false,
        minimizeButton: false,
        maximizeButton: false,
        isSingleton: true,
        tips: [
            "To open a file or an application from desktop, double-click the icon.",
            "To close a window, click the X in the top-right corner.",
        ],
    },
    importApp: () => import("../apps/tip-of-the-day/tip-of-the-day-app.js")
  },
  "webamp": {
    config: {
    id: "webamp",
    title: "Winamp",
    description: "A classic music player.",
    icon: ICONS.webamp,
    category: "",
    hasTaskbarButton: true,
    isSingleton: true,
    tray: {
      contextMenu: getWebampMenuItems,
    },
    tips: [
      "Webamp is a music player that looks and feels like the classic Winamp.",
      "You can minimize and restore Webamp using its button in the taskbar.",
    ],
  },
    importApp: () => import("../apps/webamp/webamp-app.js")
  },
  "wordpad": {
    config: {
    id: "wordpad",
    title: "WordPad",
    description: "A simple rich text editor.",
    icon: ICONS.wordpad, category: "Accessories",
    width: 600,
    height: 400,
    resizable: true,
    isSingleton: false,
  },
    importApp: () => import("../apps/wordpad/word-pad-app.js")
  },
};
