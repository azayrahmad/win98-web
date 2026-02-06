# Windows 98 Web Edition: AI Agent Development Guidelines

This document provides essential knowledge for AI agents to effectively contribute to the Windows 98 Web Edition project. Adhering to these guidelines will ensure that contributions align with the project's architecture and design patterns.

## 1. Project Architecture

Windows 98 Web Edition is a modular web-based desktop environment that emulates Windows 98. It separates core system logic, shell components, and applications.

### Core Systems (`src/system/`)

-   **OS Initialization** (`os-init.js`): Orchestrates the boot process, initializes core systems, and sets up the global `window.System` object.
-   **App Manager** (`app-manager.js`): Manages the application lifecycle (launching, closing, tracking running instances).
-   **Window Manager** (`window-manager.js`): Handles window stacking (z-index), focus, and minimize/restore logic.
-   **ZenFS Integration** (`zenfs-init.js`): Configures the virtual file system with IndexedDB persistence for the `C:` drive.
-   **Application Base Class** (`application.js`): The abstract base class that all windowed applications must extend.
-   **Core Utilities**: Includes specialized managers for `ScreenManager`, `ColorModeManager`, `ThemeManager`, `RecycleBinManager`, and more.

### Shell Components (`src/shell/`)

-   **Desktop** (`src/shell/desktop/desktop.js`): Manages desktop icons, wallpaper, and icon-specific interactions.
-   **Taskbar** (`src/shell/taskbar/taskbar.js`): Renders the taskbar, Start Menu, and system tray.
-   **Explorer** (`src/shell/explorer/`): The file explorer application and shell extensions for handling directory views.

### Centralized Configuration (`src/config/`)

-   `apps.js`: Entry point for application registration (system apps and dynamic loading).
-   `icons.js`: Defines the system icon set.
-   `themes.js` & `sound-schemes.js`: Configures visual and auditory themes.
-   `start-menu.js`: Defines the Start Menu structure.

## 2. Key Dependencies

-   **ZenFS**: Provides the persistent virtual file system. Use `fs` and `mounts` from `@zenfs/core`.
-   **os-gui**: A library for Windows 98 UI components. **Note**: We use a modified version located in `public/os-gui/` which overrides the npm package for core components like `$Window`.
-   **jQuery**: Used primarily by `os-gui` for DOM manipulation.
-   **Vite**: Build tool and development server.

## 3. Development Patterns

### Application Integration

Applications are dynamically discovered by `src/config/apps.js` using Vite's glob import if they follow the `src/apps/*/*-app.js` naming convention and export a class with a static `config` property.

#### Static Config Schema:
```javascript
static config = {
  id: "my-app",
  title: "My Application",
  description: "A brief description.",
  icon: ICONS.myAppIcon,
  width: 640,
  height: 480,
  resizable: true,
  isSingleton: true, // Only one instance allowed
  hasTaskbarButton: true,
  // ... other properties from Application base class
};
```

### The Global `window.System` Object

The `window.System` object is the central API for system operations.
-   `window.System.launchApp(appId, data)`: The standard way to launch an application.
-   `window.System.appManager`: Access to the running application instances.
-   `window.fs`: Access to the ZenFS instance.

### File System Persistence

User data should be stored in `/C:/My Documents/` or `/C:/WINDOWS/`. ZenFS ensures these paths persist across sessions via IndexedDB.

## 4. Development Workflow

### Local Development
```bash
npm run dev     # Start development server
npm run build   # Build for production
npm run preview # Preview production build
```

### Adding a New Application
1.  **Create App Directory**: `src/apps/my-app/`.
2.  **Implementation**: Create `my-app-app.js` extending `Application` from `../../system/application.js`.
3.  **Static Config**: Define the `static config` property on your class.
4.  **Registration**: The app will be automatically picked up by the dynamic loader in `src/config/apps.js`.
5.  **Icon**: Add your icon to `src/assets/icons/` and register it in `src/config/icons.js`.

## 5. Release Management and Commit Guidelines

### Conventional Commits
All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification (e.g., `feat: add new app`, `fix: window focus bug`).

### Automated Releases
Merging to `main` triggers [Release Please](https://github.com/googleapis/release-please), which manages `CHANGELOG.md` and versioning.
