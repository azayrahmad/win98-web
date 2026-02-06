# Flash Player

## Purpose

The **Flash Player** application allows you to play classic Adobe Flash (`.swf`) files within azOS Second Edition. It provides a bridge to the past, enabling the enjoyment of legacy web animations and games.

## Key Features

- **SWF Compatibility**: Plays a wide range of Flash files using the Ruffle emulator.
- **File System Integration**: Open `.swf` files directly from your virtual drives.
- **Classic UI**: Wrapped in a period-correct window with basic playback controls.

## How to Use

1.  Launch **Flash Player**.
2.  Use the `File > Open` menu (if implemented) or launch a `.swf` file from **Explorer**.
3.  The Flash content will begin playing automatically.
4.  Right-click the player area for standard Flash context menu options (provided by the emulator).

## Technologies Used

- **Ruffle**: A Flash Player emulator written in Rust that runs natively in the browser via WebAssembly.
- **os-gui**: Used for the application window and menus.

## Implementation Details

Flash Player uses the Ruffle web library to create a player instance within the application window. It handles file loading by reading the `.swf` file as a blob from ZenFS and passing it to the Ruffle player.
