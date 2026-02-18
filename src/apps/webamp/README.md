# Webamp App

## Purpose

The Webamp app integrates a faithful recreation of the classic Winamp music player into the azOS desktop environment. It provides a nostalgic, widget-like experience for playing music directly on the desktop, separate from the standard application windows.

## Key Features

- **Classic Music Player UI**: Replicates the iconic look and feel of the Winamp media player, including its main window, equalizer, and playlist editor.
- **Direct Desktop Rendering**: Webamp is not confined to a typical application window and can be moved around freely like a desktop widget.
- **Taskbar Integration**: A dedicated taskbar button allows you to minimize and restore the Webamp player, with its state reflecting whether the player is active, in focus, or minimized.
- **Playback Controls**: Comes pre-loaded with a default track and supports standard playback controls, which can be accessed through a context menu for system-wide integration.
- **Dynamic Loading**: The Webamp library is loaded on-demand from a CDN, keeping the initial application size small.

## How to Use

1.  **Launch Webamp**: Open the app from the desktop or start menu. The Webamp player will appear on the desktop.
2.  **Control Playback**: Use the buttons on the player to play, pause, and skip tracks.
3.  **Manage the Player**: Drag the player to move it around the desktop. Use the taskbar button to minimize and restore it.

## Technologies Used

- **External Libraries**:
  - **Webamp**: The core web-based Winamp player, loaded dynamically from `unpkg.com`.
- **UI Integration**:
  - **Taskbar API**: Custom functions (`createTaskbarButton`, `updateTaskbarButton`, `removeTaskbarButton`) are used to manage the app's presence and state on the system taskbar.
  - **DOM Manipulation**: A container `div` is created and appended to the `document.body` to serve as the mounting point for the Webamp instance.

## Screenshot

![Screenshot of the webamp app](./screenshot.png)
