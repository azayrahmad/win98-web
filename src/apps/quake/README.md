# Quake

## Purpose

Play the groundbreaking 3D first-person shooter **Quake** within azOS Second Edition. This application integrates an online port of the game, allowing you to experience the fast-paced, atmospheric action that defined the genre.

## Key Features

- **True 3D Rendering**: Experience the original's innovative 3D graphics and level design.
- **Online Play**: Integrated via `netquake.io`, supporting multiplayer matches.
- **Windowed Mode**: Runs within a standard OS window, allowing you to multitask while you play.

## How to Use

1.  Launch **Quake** from the desktop.
2.  Wait for the game to load within the window.
3.  Use standard Quake controls (WASD or Arrow keys to move, Space to jump, Ctrl or Mouse Click to fire).
4.  If the game redirects to the main `netquake.io` page (e.g., after exiting), the window will automatically close.

## Technologies Used

- **WebAssembly**: Quake is powered by a WebAssembly port of the engine.
- **IFrame Integration**: The game is hosted in an iframe with a specialized monitoring system to handle navigation and closure.

## Screenshot

![Screenshot of Quake](./screenshot.png)
