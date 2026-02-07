# DOSBox Integration Plan

This document outlines the implementation of the DOSBox application based on DosWasmX, integrated into the Windows 98 Web Edition.

## 1. Objectives
- Integrate DosWasmX (DOSBox-X) as a system application.
- Provide seamless execution of DOS executables (.EXE, .COM, .BAT) from both File Explorer and the MS-DOS Prompt.
- Utilize ZenFS for persistent storage of game data and user modifications.
- Automate the setup of test games (e.g., Wolfenstein 3D).

## 2. Technical Architecture

### 2.1 Component Structure
- **DosBoxApp Class** (`src/apps/doswasmx/dosbox-app.js`): Manages the application lifecycle, windowing, and communication with the emulator iframe.
- **Iframe Container** (`public/doswasmx/index.html`): A minimal HTML container that hosts the WASM emulator.
- **Runtime Bridge** (`public/doswasmx/runtime.js`): Handles Emscripten initialization and exposes a message-based API for the host OS to send commands.
- **WASM Artifacts**: Core emulator binaries (`main.js`, `main.wasm`) and support files (`dosbox.conf`, `main.ttf`).

### 2.2 Filesystem Integration
DOSBox-X runs in an isolated Emscripten environment. To achieve integration with the OS's ZenFS:
1. **Launch Phase**: Files from the host's ZenFS `/C:/` drive (excluding system folders like `WINDOWS`) are copied into the emulator's MEMFS at `/game`.
2. **Mount Phase**: The emulator runs `MOUNT C /game` to expose these files as the `C:` drive in DOS.
3. **Session Phase**: For real-time visibility, the emulator's MEMFS is mounted back to the host at a temporary path (e.g., `/C:/DOSBOX_SESSION_xxxx`).
4. **Shutdown Phase**: When the window is closed, modified files from the emulator's `/game` are synced back to the persistent ZenFS `/C:/`.

## 3. Integration Points

### 3.1 File Associations
The system is configured to use `doswasmx` as the default application for:
- `.exe` (Application)
- `.com` (MS-DOS Application)
- `.bat` (MS-DOS Batch File)

### 3.2 Command Prompt
The `MS-DOS Prompt` app includes a `dosbox` command:
- Usage: `dosbox [path_to_executable]`
- Additionally, typing the path to a DOS binary directly in the prompt will trigger a launch via DOSBox.

## 4. Automation & Testing
- **Wolfenstein 3D**: During the OS boot sequence, if `/C:/GAMES/WOLF3D` is missing, the system automatically downloads `WOLF3D.zip` from a local mirror and extracts it to the virtual filesystem.
- **Desktop Shortcut**: A shortcut to Wolfenstein 3D is added to the `Games` folder on the desktop.

## 5. Maintenance
To update the DOSBox version:
1. Replace `main.js` and `main.wasm` in `public/doswasmx/` with the latest artifacts from the DosWasmX repository.
2. Update `dosbox.conf` if new configuration options are required.
