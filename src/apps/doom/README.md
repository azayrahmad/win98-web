# Doom

## Purpose

This application brings the legendary first-person shooter **Doom** to azOS Second Edition. It utilizes a web-based port of the Doom engine to provide a full-speed, authentic gaming experience directly in the browser.

## Key Features

- **High Performance**: Runs at full speed thanks to Emscripten-compiled C code.
- **Multiple Game Support**: Supports various WAD files, including the shareware version (`doom1.wad`), Ultimate Doom, Doom II, and more.
- **Persistence**: Game progress (save games) and configurations are persisted to the virtual file system at `/C:/Program Files/Doom`.
- **WAD Selection**: Automatically scans for available WAD files on launch and provides a selection dialog.
- **Classic Gameplay**: Support for all original keyboard and mouse controls.

## How to Use

1.  Launch **Doom** from the desktop or Start Menu.
2.  If multiple WAD files are found in `/C:/Program Files/Doom`, select the version you wish to play.
3.  The game will load and run. Use standard Doom controls (Arrow keys to move, Ctrl to fire, Space to open doors).
4.  Your save games will be automatically synchronized back to your persistent storage when you close the application.

## Technologies Used

- **Emscripten**: Used to compile the original C source code (Doom engine) into WebAssembly/JavaScript.
- **ZenFS**: Manages the persistence of save files and configuration.
- **Doomflare / Emscripten FS Bridge**: A custom bridge that synchronizes the game's internal `MEMFS` with the host's `ZenFS`.

## Technical Implementation

Doom is integrated via an `iframe` hosting the Emscripten-compiled engine. The `DoomApp` class handles the complex task of bridging the host's persistent filesystem (ZenFS) with the iframe's temporary memory filesystem (MEMFS). At launch, persistent files are copied into the iframe. Upon closing the app, the `_onClose` handler identifies changed files (like `.dsg` save games) and synchronizes them back to the host filesystem.

## Screenshot

![Screenshot of Doom](./screenshot.png)
