# Proposal: OOP and SOLID Architectural Refactoring

## 1. Current State Assessment
The current architecture follows a "Manager" pattern where several global managers (`WindowManager`, `AppManager`, `ThemeManager`) are monkey-patched onto a global `window.System` object.

### Key Issues:
- **LSP Violation:** The `Application` base class assumes every app has a window, forcing windowless apps (like `esheep`) to return `null` from `_createWindow` and bypass logic.
- **DIP Violation:** Applications and Shell components depend directly on concrete manager implementations and global functions (`ShowDialogWindow`, `playSound`).
- **SRP Violation:** The `Application` class handles process lifecycle, windowing, taskbar integration, and tray icons.
- **God Object:** `window.System` is an unstructured bucket of functions and objects.
- **Tight Coupling:** Core logic is tightly coupled with jQuery and the DOM, making unit testing without a browser environment nearly impossible.

## 2. Proposed Architecture

### A. The Kernel & Service Registry (DIP)
Instead of a global object, we introduce a `Kernel` that acts as a Service Locator/Registry.
- **Kernel:** Central hub for the OS. Manages the boot sequence and service lifecycle.
- **Services:** Modular, injectable components (e.g., `FileSystemService`, `WindowingService`, `AudioService`).

### B. Process-Based Application Model (LSP & SRP)
We will split the current `Application` class into two distinct concepts:
- **BaseProcess:** Handles the lifecycle (init, start, stop, error handling). No UI assumptions.
- **WindowedApplication (Subclass of BaseProcess):** Adds windowing capabilities, menubars, and shell integration.

### C. UI Abstraction Layer (ISP)
Applications should not know about `$Window` or jQuery. They should interact with a `UIService` interface.
- `UIService.createWindow(config)`
- `UIService.showDialog(config)`
This allows for mocking UI during tests and swapping the UI implementation (e.g., moving away from jQuery/os-gui in the future) without touching application logic.

### D. Settings & Persistence Service
Replace direct `localStorage` access with a `SettingsService` that can be backed by different storage engines (localStorage, ZenFS, etc.) and provides a clean, typed API.

## 3. Implementation Roadmap
1. **Core:** Implement `Kernel` and `ServiceRegistry`.
2. **Abstractions:** Define `BaseProcess` and `WindowedApplication`.
3. **Services:** Refactor `WindowManager` into `WindowingService` and `AppManager` into `ProcessManager`.
4. **Refactoring:** Update `os-init.js` to initialize the Kernel.
5. **Modernization:** Convert 2-3 key apps to the new model as a template.

## 4. Expected Benefits
- **Testability:** Logic can be tested by mocking services.
- **Maintainability:** Clearer boundaries between system, shell, and apps.
- **Flexibility:** Easier to add non-UI background tasks or services.
- **Scalability:** Standardized way to register and consume system features.
