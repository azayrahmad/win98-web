# Application Development Guide

This guide provides instructions on how to add new applications to Windows 98 Web Edition.

## Applications

### Games & Entertainment
*Classic games and media playback applications.*
| Application | Description |
| :--- | :--- |
| [3D Pinball](./pinball/README.md) | A classic "Space Cadet" pinball game. |
| [Buggy Program](./buggy-program/README.md) | An intentionally buggy program that leaves trails. |
| [Commander Keen](./keen/README.md) | Play the classic game Commander Keen. |
| [Diablo](./diablo/README.md) | Play the classic game Diablo. |
| [Doom](./doom/README.md) | Play the legendary first-person shooter Doom. |
| [eSheep](./esheep/README.md) | A classic desktop pet. |
| [FreeCell](./freecell/README.md) | Play the classic game of FreeCell solitaire. |
| [Media Player](./media-player/README.md) | Play audio and video files. |
| [Minesweeper](./minesweeper/README.md) | Play the classic game of Minesweeper. |
| [Prince of Persia](./prince-of-persia/README.md) | Play the classic cinematic platformer Prince of Persia. |
| [Quake](./quake/README.md) | Play the classic 3D shooter Quake. |
| [SimCity 2000](./sim-city-2000/README.md) | Play the SimCity 2000 demo. |
| [Solitaire](./solitaire/README.md) | Play the classic Klondike solitaire. |
| [Spider Solitaire](./spider-solitaire/README.md) | Play the challenging Spider solitaire. |
| [Webamp](./webamp/README.md) | A faithful recreation of the classic Winamp music player. |

### Accessories & Tools
*General-purpose productivity and creative tools.*
| Application | Description |
| :--- | :--- |
| [App Maker](./app-maker/README.md) | A tool to create custom, windowed applications using HTML. |
| [Calculator](./calculator/README.md) | A fully functional Standard and Scientific calculator. |
| [Clippy](./clippy/README.md) | An interactive AI assistant. |
| [Flash Player](./flash-player/README.md) | Play classic Adobe Flash (.swf) files. |
| [Image Resizer](./image-resizer/README.md) | A utility to enlarge images using nearest-neighbor scaling. |
| [Image Viewer](./image-viewer/README.md) | A simple application for viewing and editing image files. |
| [Notepad](./notepad/README.md) | A powerful text editor with syntax highlighting, code formatting, and Markdown preview. |
| [Paint](./paint/README.md) | A classic drawing and image editing application. |
| [PDF Viewer](./pdf-viewer/README.md) | A simple application for viewing PDF documents. |
| [Theme to CSS](./theme-to-css/README.md) | A developer utility to convert `.theme` INI files into CSS. |

### Community & Support
*Support the project and report issues.*
| Application | Description |
| :--- | :--- |
| [Buy me a coffee](./buy-me-a-coffee/README.md) | Support the developer. |
| [Report a Bug](./report-a-bug/README.md) | Report issues encountered while using the system. |

## Adding New Applications

Applications are now dynamically loaded. To add a new application, follow these steps:

### 1. Create the Application Class

Create a new directory in `src/apps/` and a JavaScript file ending in `-app.js` (e.g., `src/apps/my-app/my-app-app.js`). Your class must extend the base `Application` class.

```javascript
import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';

export class MyApp extends Application {
  static config = {
    id: "my-app",
    title: "My App",
    description: "What my app does.",
    icon: ICONS.default, // Register your icon in src/config/icons.js
    width: 400,
    height: 300,
    resizable: true,
  };

  _createWindow(filePath) {
    const win = new window.$Window({
      title: this.title,
      icons: this.icon,
      width: this.width,
      height: this.height,
      resizable: this.resizable,
      id: this.id,
    });

    win.$content.append('<div>Hello World!</div>');
    return win;
  }
}
```

### 2. Static Configuration

The `static config` property is used by the system to register the application and define its properties:

- `id`: A unique identifier.
- `title`: Display name.
- `icon`: Application icon (usually from `ICONS` in `src/config/icons.js`).
- `width` / `height`: Default window dimensions.
- `resizable`: Whether the window can be resized.
- `isSingleton`: If `true`, only one instance of the app can be open at a time.

### 3. Dynamic Loading

The system automatically finds and registers any class exported from a `*-app.js` file in `src/apps/` that has a `static config` property. This is handled in `src/config/apps.js` using Vite's glob import.

### 4. Integrating with the Shell

- **Desktop**: To add an icon to the desktop, add the app `id` to `src/config/desktop.json`.
- **Start Menu**: To add the app to the Start Menu, modify `src/config/start-menu.js`.
- **File Associations**: To associate the app with specific file extensions, modify `src/config/file-associations.js`.

## Global API Interaction

Use the global `window.System` object to interact with the OS:
- `window.System.launchApp('app-id', data)`: Launch another app.
- `window.fs`: Access the virtual file system.
