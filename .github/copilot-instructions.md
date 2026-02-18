# Windows 98 Web Edition: AI Agent Development Guidelines

This document provides essential knowledge for AI agents to effectively contribute to the Windows 98 Web Edition project. Adhering to these guidelines will ensure that contributions align with the project's architecture and design patterns.

## 1. Project Architecture

Windows 98 Web Edition is a web-based desktop environment built with vanilla JavaScript that emulates the Windows 98 experience. It is a modular system with a centralized configuration.

### Core Components & Systems

-   **Entry Point** (`src/main.js`): Initializes all core systems, including the desktop, taskbar, and global `window.System` object.
-   **App Manager** (`src/utils/appManager.js`): Handles the entire lifecycle of applications, from launching to closing. It is the single source of truth for all running applications.
-   **Desktop** (`src/components/desktop.js`): Manages desktop icons, wallpaper, and user interactions like selection and context menus.
-   **Taskbar** (`src/components/taskbar.js`): Renders the Start Menu, taskbar buttons for running apps, and the system tray.
-   **Window Management** (`public/os-gui/$Window.js`): The core `$Window` component from the `os-gui` library handles window creation and basic interactions.
-   **Global System Object** (`src/main.js`): A global `window.System` object is initialized at startup. It exposes a `WindowManagerSystem` class that manages global z-indexing and minimize/restore functionality for all windows.

### Centralized Configuration

The project relies heavily on a centralized configuration model located in the `src/config/` directory. This is the single source of truth for defining applications, icons, themes, and more.

-   `apps.js`: Registers all applications and their properties.
-   `icons.js`: Defines all system icons with multiple sizes.
-   `themes.js`: Contains definitions for all visual themes, including colors, wallpapers, and sound schemes.
-   `sound-schemes.js`: Maps system events to audio files.
-   `startmenu.js`: Defines the structure and content of the Start Menu.
-   `desktop.json`: Specifies which icons appear on the default desktop.

## 2. Key Dependencies

-   **Vite**: The build tool and development server.
-   **os-gui**: A custom-modified component library for core UI elements like windows and menus.
-   **jQuery**: Included as a local file (`/jquery-3.3.1.js`) and used primarily by the `os-gui` library for DOM manipulation. It is **not** the primary tool for application-level logic.
-   **CDN Libraries**: Several libraries are loaded via CDN in `index.html`:
    -   `highlight.js`: For syntax highlighting in Notepad.
    -   `Marked.js`: For Markdown parsing.
    -   `Prettier`: For code formatting.

## 3. Development Patterns

### Application Integration

All applications are registered in `src/config/apps.js`. To add a new app, you must provide a configuration object with the following schema:

```javascript
{
  // A unique identifier for the application.
  id: "string",

  // The display name shown in titles and menus.
  title: "string",

  // A brief description for tooltips or properties.
  description: "string",

  // The icon object, providing 16px and 32px versions. See Icon System below.
  icon: ICONS.iconName,

  // The application's main class that extends the base Application class.
  appClass: class,

  // --- Optional Properties ---

  // Window dimensions.
  width: integer,
  height: integer,

  // Window behavior flags.
  resizable: boolean,
  isSingleton: boolean, // If true, only one instance can run.

  // Defines a right-click context menu for the app's desktop/start menu icon.
  contextMenu: [
    { label: "string", action: "string" | function },
    // ...
  ],

  // For apps that run in the background and show in the system tray.
  hasTray: boolean,
  tray: {
    contextMenu: function // A function that returns a menu item array.
  },

  // Alternative to appClass for simple, function-based actions.
  action: {
    type: "function",
    handler: function // A function to execute when launched.
  },
}
```

### Icon System

The icon system is defined in `src/config/icons.js`. It is **not** based on simple `.ico` files.

-   Icons are defined as objects with `16` and `32` pixel properties.
-   The values are URLs to `.png` or `.gif` files, correctly bundled by Vite using the `new URL(...)` pattern.
-   To add a new icon, place the asset in `src/assets/icons/` and add a corresponding entry to the `ICONS` object in `icons.js`.

**Example:**

```javascript
// in src/config/icons.js
export const ICONS = {
  notepad: {
    16: new URL("../assets/icons/notepad-0.png", import.meta.url).href,
    32: new URL("../assets/icons/NOTEPAD_1-32.png", import.meta.url).href,
  },
  // ...
};

// in src/config/apps.js
import { ICONS } from "./icons.js";
// ...
{
  id: "notepad",
  title: "Notepad",
  icon: ICONS.notepad,
  // ...
}
```

### Theming

The theme system is managed by `src/utils/themeManager.js` and configured in `src/config/themes.js`. Each theme object defines the theme's colors, wallpaper, sound scheme, and cursor scheme. Theme stylesheets are located in `public/os-gui/` and work by overriding CSS custom properties.

## 4. Development Workflow

### Local Development

Use the following Bun scripts to run the project:

```bash
bun run dev     # Start the Vite development server.
bun run build   # Create a production build in the /dist directory.
bun run preview # Serve the production build locally.
```

### Adding a New Application

1.  **Create the App Class**: Create a new directory in `src/apps/` and add your main application file (e.g., `MyApp.js`). The class must extend `Application` from `src/apps/Application.js`.
2.  **Add Icons**: Add `16x16` and `32x32` `.png` icons for your app to `src/assets/icons/`.
3.  **Register Icons**: Add an entry for your new icon in `src/config/icons.js`.
4.  **Register Application**: Import your app class into `src/config/apps.js` and add a new configuration object to the `apps` array, following the schema described above.
5.  **Add to Desktop/Start Menu** (Optional):
    -   To add the app to the desktop, add its `id` to the `apps` array in `src/config/desktop.json`.
    -   To add it to the Start Menu, modify the structure in `src/config/startmenu.js`.
