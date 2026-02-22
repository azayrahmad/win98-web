# Refactor Proposal: Modernizing azOS Architecture (OOP & SOLID)

## 1. Current Architecture Assessment

### Issues & SOLID Violations
*   **Tight Coupling (Violation of Dependency Inversion Principle)**: Core services like `WindowManager` directly call UI components like `taskbar`. This makes the system rigid; you cannot swap the UI without breaking the core.
*   **Hidden Dependencies (Service Locator Pattern)**: Most classes use `kernel.use('service')` internally. While functional, it makes unit testing difficult and dependencies non-obvious.
*   **Global Scope Pollution**: Legacy scripts like `$Window.js` and `MenuBar.js` attach themselves to `window`. This prevents proper encapsulation and can lead to naming collisions.
*   **Fragmented State**: Application state is split between `AppManager` and module-level variables in `application.js`.
*   **Single Responsibility Principle (SRP) Violations**: `AppManager` handles both the registry of apps and the low-level logic of launching/configuring them.

---

## 2. Proposed Final Architecture

### Core Design Patterns
*   **Event-Driven Communication (Observer Pattern)**: Services will emit events (e.g., `window:minimized`) via a central `EventBus`. The Shell (Taskbar, Desktop) will listen for these events.
*   **Explicit Dependency Injection (DI)**: Classes will receive their dependencies (Services) via constructors.
*   **Modern ES6 Classes**: All legacy GUI components will be converted to ES modules with a clear class-based structure.
*   **Centralized Process Management**: A new `ProcessManager` will serve as the single source of truth for all running processes (windowed or background).

### Architecture Diagram (Conceptual)
```
[ Shell (UI) ] <--- Listening for Events --- [ Kernel / Event Bus ]
      |                                              ^
      +--- Calls Methods ---> [ Services ] ----------+
                                 |
                                 +--- Injected Into ---> [ Applications ]
```

---

## 3. The Migration Path (Step-by-Step)

### Phase 1: Infrastructure (The Foundation)
1.  **Introduce `EventBus`**: Create a lightweight service for system-wide events.
2.  **Refactor `Kernel`**: Enhance it to support better service lifecycle management.
3.  **Modernize GUI Core**:
    *   Convert `public/os-gui/$Window.js` to `src/system/gui/window.js` (ES6 Class).
    *   Convert `MenuBar.js` and `MenuPopup.js` to ES6 classes.

### Phase 2: System Services (Decoupling)
1.  **`ProcessManager`**: Replace `AppManager`. It will track instances of `BaseProcess` and manage their lifecycle.
2.  **Decouple `WindowManager`**: Remove all references to `taskbar`. Replace them with `this.eventBus.emit()`.
3.  **Update Shell**: Update `taskbar.js` and `desktop.js` to subscribe to the new Event Bus.

### Phase 3: Application Layer (DI & OOP)
1.  **Refactor `BaseProcess`**: Update constructor to accept a `ServiceContext` (DI).
2.  **Update Application Hierarchy**: Ensure `WindowedApplication` and its subclasses (Notepad, Paint, etc.) use the injected services instead of global lookups.

### Phase 4: Cleanup & Verification
1.  **Remove Globals**: Strip `window.System`, `window.$Window`, etc., where safe.
2.  **Final Verification**: Run system-wide tests to ensure no regressions in app launching, window management, or UI updates.

---

## 4. Complexity & Risks
*   **Complexity**: Moderate.
*   **Risk**: High risk of breaking legacy apps if `Window` API changes significantly.
*   **Mitigation**: Maintain a "Legacy Adapter" or ensure the new `Window` class maintains method-signature compatibility with the old `$Window` jQuery object where possible.
