# Boxedwine Implementation Guide

This guide details how to integrate **Boxedwine**, a Linux emulator that runs WINE via WebAssembly, into the Windows 98 Web project. This allows running 16-bit and 32-bit Windows applications directly in the browser.

## 1. Binaries and Assets

Boxedwine requires several core files to run. These should be placed in `public/apps/boxedwine/`.

*   **boxedwine.wasm**: The core WebAssembly engine.
*   **boxedwine.js**: The Emscripten glue code.
*   **boxedwine.zip**: The root filesystem containing a minimal Linux environment and WINE.

You can download the latest versions (e.g., 25R1) from [boxedwine.org](http://boxedwine.org/).

### Demo Game: SkiFree
To test the implementation, you can use **SkiFree** (a 32-bit classic).
*   Place `ski32.exe` in `/C:/Games/SkiFree/` within the virtual filesystem.

## 2. Host Environment (`host.html`)

Create a `public/apps/boxedwine/host.html` file to host the emulator. This file should:
1.  Initialize the Emscripten `Module`.
2.  Pre-load the `boxedwine.zip` into the Emscripten filesystem.
3.  Provide a `startWithArgs(args)` function that the OS can call to launch specific applications.
4.  Communicate readiness back to the parent window via `postMessage`.

```html
<!-- Example snippet for host.html -->
<script>
    window.Module = {
        onRuntimeInitialized: () => {
            window.parent.postMessage({ type: "BOXEDWINE_READY" }, "*");
        },
        // ... other Emscripten configurations
    };

    window.startWithArgs = (args) => {
        Module['arguments'] = args;
        Module["removeRunDependency"]("setupBoxedWine");
    };
</script>
<script src="boxedwine.js"></script>
```

## 3. Application Class (`boxedwine-app.js`)

Create `src/apps/boxedwine/boxedwine-app.js` extending the `Application` base class.

### Key Responsibilities:
*   **Lifecycle Management**: Handle window creation and iframe hosting.
*   **Filesystem Syncing**:
    *   Before launch: Copy files from ZenFS (`/C:/Games/...`) into the Boxedwine internal FS.
    *   After close: Copy modified files back from Boxedwine to ZenFS.
*   **Argument Passing**: Construct the command line for Boxedwine.
    *   Example: `["-root", "/root", "-zip", "boxedwine.zip", "-mount_drive", "/mnt/c", "c", "-p", "/mnt/c/Games/SkiFree/SKI32.EXE"]`

## 4. System Integration

### Smart EXE Launching
To differentiate between DOS and Windows executables, implement a utility that reads the first few bytes of the file.

*   `MZ` header: Standard DOS (use DOSBox).
*   `PE` signature (usually at offset 0x3C): Win32 (use Boxedwine).
*   `NE` signature: Win16 (use Boxedwine).

Modify the file association logic to use this utility:

```javascript
// Pseudo-code for EXE detection
async function getExeType(path) {
    const buffer = await fs.promises.readFile(path, { length: 1024 });
    if (buffer[0] === 0x4D && buffer[1] === 0x5A) { // MZ
        // Check for PE/NE signatures at offset indicated by 0x3C
        const offset = buffer[0x3C] | (buffer[0x3D] << 8);
        if (buffer[offset] === 0x50 && buffer[offset+1] === 0x45) return 'WIN32';
        if (buffer[offset] === 0x4E && buffer[offset+1] === 0x45) return 'WIN16';
        return 'DOS';
    }
    return 'UNKNOWN';
}
```

### Context Menu ("Open with...")
Add entries to the Explorer context menu for `.exe` files:
*   "Open with DOSBox"
*   "Open with Boxedwine"

### File Associations
Update `src/config/file-associations.js` or the launcher logic to default to the detected emulator type.

## 5. Persistence
Ensure that `C:` drive changes are persisted. Since Boxedwine runs in an isolated MEMFS inside the iframe, you must manually sync files back to ZenFS (IndexedDB) when the application window is closed.

## 6. Known Issues / Tips
*   **Performance**: Boxedwine can be slow for complex 3D games in the browser.
*   **Sound**: Ensure the "Enable Sound" toggle is handled if passing `-nosound` to the emulator.
*   **Resolution**: Use the `-resolution` argument to match the window size.

## 7. Reference
For a similar integration, refer to `src/apps/dos-box/dos-box-app.js` and `public/games/dos/doswasmx/host.html`, which implement the DOSBox-X integration using a similar iframe-based approach.
