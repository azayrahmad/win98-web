# DOSBox Integration Plan

## Phase 1: Preparation and Assets
- [x] Download DosWasmX v0.3 release assets.
- [x] Extract assets to `public/games/dos/doswasmx/`.
- [x] Clean up unnecessary files from DosWasmX.
- [x] Verify assets are correctly placed and accessible.

## Phase 2: Wolfenstein 3D Setup
- [x] Download Wolfenstein 3D (WOLF3D.zip) from Archive.org.
- [x] Extract `WOLF3D.zip` to `public/games/dos/wolf3d/`.
- [x] Implement logic to "install" Wolf3D to `C:\Games\WOLF3D` in the virtual filesystem.
- [ ] Verify Wolf3D files are present in the virtual filesystem.

## Phase 3: DosBox Application Implementation
- [x] Create `src/apps/dos-box/dos-box-app.js`.
- [x] Implement the `DosBoxApp` class extending `Application`.
- [x] Create `public/games/dos/doswasmx/host.html` to serve as the iframe source, tailored for integration.
- [x] Implement ZenFS-Emscripten bridge in `DosBoxApp` to mount the host's `C:` drive.
- [x] Handle game save persistence back to ZenFS.
- [x] Add application icon for DOSBox.

## Phase 4: Command Prompt Integration
- [x] Update `CommandPromptApp` to handle `.EXE` and `.COM` files by launching `dos-box`.
- [x] Implement passing of the executable path and arguments from the prompt to `DosBoxApp`.

## Phase 5: File Associations and Shortcuts
- [x] Register `.EXE` and `.COM` file associations in `src/config/file-associations.js`.
- [x] Add a "Wolfenstein 3D" shortcut to the Games folder.
- [x] Register the `dos-box` app in `src/config/apps.js`.

## Phase 6: Verification and Testing
- [ ] Verify Wolf3D launches from the Games folder.
- [ ] Verify Wolf3D launches from the Command Prompt.
- [ ] Verify save games are persisted in the `C:` drive and visible in File Explorer.
- [ ] Complete pre-commit steps.
