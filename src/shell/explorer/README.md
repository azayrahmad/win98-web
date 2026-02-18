# ZenExplorer (File Manager)

**ZenExplorer** is the next-generation file manager for win98-web, built on top of [ZenFS](https://zenfs.dev/). Unlike the legacy Explorer, ZenExplorer interacts with a real, asynchronous file system that supports persistence via IndexedDB.

## Architecture

ZenExplorer follows a modular architecture to separate concerns and maintain a clean codebase.

### Core Logic
- **`ZenExplorerApp.js`**: The main application entry point and "glue" class. It orchestrates the window lifecycle and coordinates between various managers and controllers.
- **`ZenNavigationController.js`**: Manages navigation state, path normalization, and interacts with `NavigationHistory`.
- **`FileOperations.js`**: Handles file system operations (copy, move, delete, create) and provides user confirmation dialogs.

### UI Components
- **`components/ZenDirectoryView.js`**: Responsible for rendering directory contents (icons) and handling inline renaming UI.
- **`components/ZenSidebar.js`**: Renders the dynamic sidebar showing information about the current location.
- **`MenuBarBuilder.js`**: Dynamically constructs the application menu bar.

### Utilities and Managers
- **`utils/ZenDriveManager.js`**: Handles mounting and ejecting of external media (Floppy disks via WebAccess and CDs via ISO images).
- **`utils/ZenContextMenuBuilder.js`**: Builds context menus for file items and the directory background.
- **`utils/ZenKeyboardHandler.js`**: Processes keyboard shortcuts (Ctrl+C, Ctrl+V, Delete, etc.).
- **`utils/RecycleBinManager.js`**: Manages the persistent Recycle Bin at `/C:/Recycled`.
- **`utils/ZenClipboardManager.js`**: A singleton that tracks cut/copy operations across explorer instances.
- **`utils/ZenUndoManager.js`**: Manages a global undo stack for file operations.
- **`utils/PropertiesManager.js`**: Handles file and folder properties dialogs.

## Features

### File Operations
- **Navigation**: Full support for browsing the filesystem, including Back, Forward, and Up actions.
- **Standard Actions**: Create folders/files, Delete (to Recycle Bin or permanent via Shift+Delete), Rename, and Open.
- **Clipboard**: Cross-window Cut, Copy, and Paste support.
- **Undo**: Multi-level undo for file operations.

### Media Support
- **Drive A:**: Mount local folders as a floppy drive using the File System Access API.
- **Drive E:**: Mount `.iso` files as a virtual CD-ROM.

### System Integration
- **Recycle Bin**: Fully functional Recycle Bin with "Restore" and "Empty" capabilities.
- **Properties**: Detailed information for files and folders, including recursive size calculation.
- **App Association**: Automatically launches the correct application based on file extension.

## Development

The ZenFS environment is initialized via `src/utils/zenfs-init.js`. It mounts:
- `/`: **InMemory** (Volatile, used for system mount points).
- `/C:`: **IndexedDB** (Persistent, the primary user drive).
- `/A:` & `/E:`: Dynamic mount points for Floppy and CD-ROM.
