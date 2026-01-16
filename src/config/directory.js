import { generateProgramFiles } from "./generateProgramFiles.js";
import { generatePlusFiles } from "./generatePlusFiles.js";

const directory = [
  {
    id: "drive-c",
    name: "C:",
    type: "drive",
    children: [
      {
        id: "folder-program-files",
        name: "Program Files",
        type: "folder",
        children: [
          ...generateProgramFiles(),
          { id: "app-doom", type: "app", appId: "doom", name: "Doom" },
          { id: "app-quake", type: "app", appId: "quake", name: "Quake" },
          { id: "app-esheep", type: "app", appId: "esheep", name: "eSheep" },
          {
            id: "app-simcity2000",
            type: "app",
            appId: "simcity2000",
            name: "SimCity 2000 Demo",
          },
          {
            id: "app-minesweeper",
            type: "app",
            appId: "minesweeper",
            name: "Minesweeper",
          },
          {
            id: "app-wordpad",
            type: "app",
            appId: "wordpad",
            name: "WordPad",
          },
          {
            id: "app-calculator",
            type: "app",
            appId: "calculator",
            name: "Calculator",
          },
          { id: "app-help", type: "app", appId: "help", name: "Help" },
          {
            id: "app-princeofpersia",
            type: "app",
            appId: "princeofpersia",
            name: "Prince of Persia",
          },
          {
            id: "folder-plus",
            name: "Plus!",
            type: "folder",
            children: generatePlusFiles(),
          },
          { id: "app-solitaire", type: "app", appId: "solitaire" },
          {
            id: "app-spidersolitaire",
            type: "app",
            appId: "spidersolitaire",
            name: "Spider Solitaire",
          },
          { id: "app-songs", type: "app", appId: "songs", name: "songs" },
        ].sort((a, b) =>
          (a.name || "").localeCompare(b.name || "", undefined, {
            sensitivity: "base",
          }),
        ),
      },
      {
        id: "folder-user",
        name: "user",
        type: "folder",
        children: [
          {
            id: "folder-desktop",
            name: "desktop",
            type: "folder",
            children: [
              { id: "app-my-computer", type: "app", appId: "my-computer" },
              { id: "app-my-documents", type: "app", appId: "my-documents" },
              { id: "app-recycle-bin", type: "app", appId: "recycle-bin" },
              {
                id: "app-network-neighborhood",
                type: "app",
                appId: "network-neighborhood",
              },
              { id: "app-my-briefcase", type: "app", appId: "my-briefcase" },
              {
                id: "shortcut-to-clippy",
                type: "shortcut",
                targetId: "app-clippy",
                name: "Assistant",
              },
              {
                id: "shortcut-to-webamp",
                type: "shortcut",
                targetId: "app-webamp",
                name: "Winamp",
              },
              {
                id: "shortcut-to-internet-explorer",
                type: "shortcut",
                targetId: "app-internet-explorer",
                name: "Internet Explorer",
              },
              {
                id: "shortcut-to-paint",
                type: "shortcut",
                targetId: "app-paint",
                name: "Paint",
              },
              // {
              //   id: "file-resume",
              //   type: "file",
              //   name: "Resume.pdf",
              //   contentUrl: "public/files/Resume.pdf",
              // },
              {
                id: "file-resume-txt",
                type: "file",
                name: "AzizRahmad_Resume_2026.txt",
                contentUrl: "files/AzizRahmad_Resume_2026.txt",
              },
              {
                id: "file-readme",
                type: "file",
                name: "README.md",
                contentUrl: "files/README.md",
              },
              {
                id: "shortcut-to-media-player",
                type: "shortcut",
                targetId: "app-media-player",
                name: "Media Player",
              },
              {
                id: "shortcut-to-buy-me-a-coffee",
                type: "shortcut",
                targetId: "app-buy-me-a-coffee",
                name: "Buy me a coffee",
              },
              {
                id: "shortcut-to-esheep",
                type: "shortcut",
                targetId: "app-esheep",
                name: "sheep.exe",
              },
              {
                id: "shortcut-to-command-prompt",
                type: "shortcut",
                targetId: "command-prompt",
                name: "MS-DOS Prompt",
              },
              {
                id: "shortcut-to-calculator",
                type: "shortcut",
                targetId: "app-calculator",
                name: "Calculator",
              },
              {
                id: "shortcut-to-defrag",
                type: "shortcut",
                targetId: "app-defrag",
                name: "Disk Defragmenter",
              },
              {
                id: "shortcut-to-wordpad",
                type: "shortcut",
                targetId: "app-wordpad",
                name: "WordPad",
              },
              {
                id: "shortcut-to-buggyprogram",
                type: "shortcut",
                targetId: "app-buggyprogram",
                name: "buggyprogram.exe",
              },
              {
                id: "shortcut-to-songs",
                type: "shortcut",
                targetId: "app-songs",
                name: "songs",
              },
              {
                id: "folder-games",
                name: "Games",
                type: "folder",
                children: [
                  {
                    id: "shortcut-to-pinball",
                    type: "shortcut",
                    targetId: "app-pinball",
                    name: "3D Pinball",
                  },
                  {
                    id: "shortcut-to-doom",
                    type: "shortcut",
                    targetId: "app-doom",
                    name: "Doom",
                  },
                  {
                    id: "shortcut-to-simcity2000",
                    type: "shortcut",
                    targetId: "app-simcity2000",
                    name: "SimCity 2000 Demo",
                  },
                  {
                    id: "shortcut-to-keen",
                    type: "shortcut",
                    targetId: "app-keen",
                    name: "Commander Keen",
                  },
                  {
                    id: "shortcut-to-diablo",
                    type: "shortcut",
                    targetId: "app-diablo",
                    name: "Diablo",
                  },
                  {
                    id: "shortcut-to-quake",
                    type: "shortcut",
                    targetId: "app-quake",
                    name: "Quake",
                  },
                  {
                    id: "shortcut-to-minesweeper",
                    type: "shortcut",
                    targetId: "app-minesweeper",
                    name: "Minesweeper",
                  },
                  {
                    id: "shortcut-to-princeofpersia",
                    type: "shortcut",
                    targetId: "app-princeofpersia",
                    name: "Prince of Persia",
                  },
                  {
                    id: "shortcut-to-solitaire",
                    type: "shortcut",
                    targetId: "app-solitaire",
                    name: "Solitaire",
                  },
                  {
                    id: "shortcut-to-spidersolitaire",
                    type: "shortcut",
                    targetId: "app-spidersolitaire",
                    name: "Spider Solitaire",
                  },
                ],
              },
            ],
          },
          {
            id: "folder-documents",
            name: "Documents",
            type: "folder",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: "drive-d",
    name: "D:",
    type: "drive",
    children: [
      {
        id: "folder-songs",
        name: "songs",
        type: "folder",
        children: [
          {
            id: "folder-anosci",
            name: "anosci - Blank VHS Tape Jingle Collection",
            type: "folder",
            children: [
              {
                id: "file-anosci-01",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 01 spun telecom tape.ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 01 spun telecom tape.ogg",
              },
              {
                id: "file-anosci-02",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 02 golden springs tape.ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 02 golden springs tape.ogg",
              },
              {
                id: "file-anosci-03",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 03 gentle envelopment.ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 03 gentle envelopment.ogg",
              },
              {
                id: "file-anosci-04",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 04 waiting room disco tape (loop).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 04 waiting room disco tape (loop).ogg",
              },
              {
                id: "file-anosci-05",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 05 checker field tape (stinger).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 05 checker field tape (stinger).ogg",
              },
              {
                id: "file-anosci-06",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 06 gridsquare tape (fade).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 06 gridsquare tape (fade).ogg",
              },
              {
                id: "file-anosci-07",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 07 augs and 6ths study (15).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 07 augs and 6ths study (15).ogg",
              },
              {
                id: "file-anosci-08",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 08 augs and 6th study (30).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 08 augs and 6th study (30).ogg",
              },
              {
                id: "file-anosci-09",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 09 beach tape (cut).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 09 beach tape (cut).ogg",
              },
              {
                id: "file-anosci-10",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 10 synth tape (loop).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 10 synth tape (loop).ogg",
              },
              {
                id: "file-anosci-11",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 11 kinda western tape (15).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 11 kinda western tape (15).ogg",
              },
              {
                id: "file-anosci-12",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 12 kinda western tape (15 + intro).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 12 kinda western tape (15 + intro).ogg",
              },
              {
                id: "file-anosci-13",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 13 three hit tape (loop).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 13 three hit tape (loop).ogg",
              },
              {
                id: "file-anosci-14",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 14 2 bright tape (15).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 14 2 bright tape (15).ogg",
              },
              {
                id: "file-anosci-15",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 15 2 bright tape (30).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 15 2 bright tape (30).ogg",
              },
              {
                id: "file-anosci-16",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection - 16 water basin tape (loop).ogg",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection - 16 water basin tape (loop).ogg",
              },
              {
                id: "file-anosci-cover",
                type: "file",
                name: "cover.png",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/cover.png",
              },
              {
                id: "file-anosci-playlist",
                type: "file",
                name: "anosci - Blank VHS Tape Jingle Collection.m3u",
                contentUrl:
                  "songs/anosci - Blank VHS Tape Jingle Collection/anosci - Blank VHS Tape Jingle Collection.m3u",
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "folder-briefcase",
    name: "My Briefcase",
    type: "briefcase",
    enableFileDrop: true,
    children: [],
  },
  {
    id: "folder-control-panel",
    name: "Control Panel",
    type: "folder",
    children: [
      {
        id: "shortcut-to-display-properties",
        type: "shortcut",
        targetId: "app-displayproperties",
        name: "Display",
      },
      {
        id: "shortcut-to-desktopthemes",
        type: "shortcut",
        targetId: "app-desktopthemes",
        name: "Desktop Themes",
      },
      {
        id: "shortcut-to-soundschemeexplorer",
        type: "shortcut",
        targetId: "app-soundschemeexplorer",
        name: "Sound",
      },
      {
        id: "shortcut-to-themetocss",
        type: "shortcut",
        targetId: "app-themetocss",
        name: "Theme to CSS",
      },
      {
        id: "shortcut-to-cursor-explorer",
        type: "shortcut",
        targetId: "app-cursorexplorer",
        name: "Mouse",
      },
    ],
  },
];

export default directory;
