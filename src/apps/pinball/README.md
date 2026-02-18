# 3D Pinball

## Purpose

3D Pinball brings the classic "Space Cadet" pinball table, famously included with Windows, to the azOS Second Edition desktop. This application is a web-based port of the original game, offering a faithful, nostalgic experience with all the original sounds, physics, and table rules.

## Key Features

- **Authentic Experience**: A pixel-perfect recreation of the "Space Cadet" table.
- **Game Controls**: Use the standard `Game` menu or keyboard shortcuts to manage your sessions.
- **Full Screen Mode**: Supports browser full-screen for an immersive arcade experience.
- **Persistence**: High scores and game settings are persisted to your virtual drive.

## How to Use

1.  Launch **3D Pinball** from the desktop or Start Menu.
2.  Use the `Game` menu or press **F2** to start a **New Game**.
3.  Press and hold the **Spacebar** to pull back the plunger, then release it to **Launch Ball**.
4.  Use the keyboard controls to play:
    -   **Left Flipper:** `Z`
    -   **Right Flipper:** `/` (Forward Slash)
    -   **Left Table Bump:** `X`
    -   **Right Table Bump:** `.` (Period)
    -   **Plunger:** `Spacebar`
5.  Press **F3** to **Pause** or **Resume** the game.
6.  View or change controls under `Options > Player Keys...`.

## Technologies Used

- **Emscripten**: The original C++ source code for Space Cadet Pinball is compiled to WebAssembly.
- **IFrameApplication**: Managed within azOS via a specialized iframe wrapper that handles user inactivity and window lifecycle.
- **ZenFS Integration**: Uses a custom sync-back mechanism to ensure high scores are saved to the persistent `C:` drive.

## Screenshot

![Screenshot of the pinball app](./screenshot.png)
