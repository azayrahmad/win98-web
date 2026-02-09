# Proposal: Semantic HTML Improvements for Windows 98 Web Edition

This document outlines a proposal to improve the semantic structure of the HTML used in the Windows 98 Web Edition project. The goal is to move away from generic `<div>` elements where more descriptive HTML5 tags can be used, improving accessibility and code clarity.

## 1. Main Shell Structure (`src/shell/ui.js`)

The core UI currently uses several `<div>` elements to define the main application areas.

### Proposed Changes:
- Replace `#app-container` with `<main>` to indicate the primary content area of the application.
- Replace `.taskbar` with `<footer>` to reflect its position and role as a persistent utility bar at the bottom of the screen.

| Element Selector | Current Tag | Proposed Tag | Notes |
|------------------|-------------|--------------|-------|
| `#app-container` | `div`       | `main`       | |
| `.taskbar`       | `div`       | `footer`     | Add `aria-label="Taskbar"` |

### Example:
**Before:**
```javascript
const appContainer = document.createElement('div');
appContainer.id = 'app-container';
const taskbar = document.createElement('div');
taskbar.className = 'taskbar';
```

**Proposed:**
```javascript
const appContainer = document.createElement('main');
appContainer.id = 'app-container';
const taskbar = document.createElement('footer');
taskbar.className = 'taskbar';
taskbar.setAttribute('aria-label', 'Taskbar');
```

---

## 2. Taskbar Components (`src/shell/taskbar/taskbar.js`)

The taskbar contains navigation and status information.

### Proposed Changes:
- Use `<nav>` inside the taskbar for areas that facilitate application switching and navigation.
- Use `<section>` for the system tray.

| Component Area | Proposed Tag | Reason |
|----------------|--------------|--------|
| Taskbar (outer) | `footer` | Main bottom utility bar. |
| Quick Launch / Icon Area | `nav` | Navigation for common links. |
| Taskbar App Area | `nav` | Navigation between open windows. |
| System Tray | `section` | A distinct area for system status/tray apps. |

---

## 3. Start Menu (`src/shell/start-menu/start-menu.js`)

The Start Menu serves as both a primary navigation landmark and a list of commands.

### Proposed Changes:
- Use `<nav aria-label="Start Menu">` as the outer container to define it as a navigation landmark.
- Use `<menu>` instead of `<ul>` for the internal list of items, as it semantically represents a list of interactive commands.

### Example:
**Before:**
```html
<div id="start-menu" class="start-menu hidden">
  <ul class="start-menu-list">
    <!-- ... -->
  </ul>
</div>
```

**Proposed:**
```html
<nav id="start-menu" class="start-menu hidden" aria-label="Start Menu">
  <menu class="start-menu-list">
    <!-- ... -->
  </menu>
</nav>
```

> **Note on `<menu>` vs `<nav>`:** While `<nav>` is used to identify a section that contains navigation links, `<menu>` is intended specifically for an unordered list of interactive items (commands). Using `<nav>` as a wrapper provides the accessibility benefit of a landmark role, while `<menu>` correctly describes the nature of the interactive items within the Start Menu.

---

## 4. Boot Screen (`index.html`)

The boot screen is an introductory sequence that precedes the main application.

### Proposed Changes:
- Use `<section>` for the `#boot-screen` and `#splash-screen`.

### Example:
**Before:**
```html
<div id="boot-screen">
    <div id="initial-boot-message">Initializing...</div>
    <!-- ... -->
</div>
```

**Proposed:**
```html
<section id="boot-screen" aria-live="polite">
    <div id="initial-boot-message">Initializing...</div>
    <!-- ... -->
</section>
```

---

## 5. Desktop Area (`src/shell/ui.js`)

The desktop area is where icons are placed and windows are rendered.

### Proposed Changes:
- Use `<section>` for `#desktop-area` to define it as a specific functional region of the application.

---

## 6. Windowing System (`public/os-gui/$Window.js`)

The windowing system is responsible for creating and managing application windows and dialogs.

### Proposed Changes:
- Replace the outer window `<div>` with `<article role="window">` for standard windows.
- For modal dialogs, use the native `<dialog>` element.
- Replace `.window-titlebar` with `<header>`.
- Replace `.window-content` with `<section>`.

| Element Selector | Current Tag | Proposed Tag |
|------------------|-------------|--------------|
| `.window` (standard) | `div`    | `article`    |
| `.window` (modal)    | `div`    | `dialog`     |
| `.window-titlebar`| `div`      | `header`     |
| `.window-content` | `div`      | `section`    |

### Example (Standard Window):
**Before:**
```html
<div class="window os-window">
    <div class="window-titlebar">...</div>
    <div class="window-content">...</div>
</div>
```

**Proposed:**
```html
<article class="window os-window">
    <header class="window-titlebar">...</header>
    <section class="window-content">...</section>
</article>
```

---

## 7. Dialog Windows (`src/shared/components/dialog-window.js`)

Dialog windows are often modal and represent a specific interaction.

### Proposed Changes:
- Use the native `<dialog>` element for all dialogs created through `ShowDialogWindow`.

---

## 8. Menus and Popups (`public/os-gui/MenuPopup.js`, `public/os-gui/MenuBar.js`, `public/os-gui/ContextMenu.js`)

Menus and context menus currently use a mix of `div`, `table`, `tr`, and `td` with ARIA roles.

### Proposed Changes:
- Replace the outer menu `div` with `<menu>`.
- Keep the internal `<table>` structure for layout consistency, but explore moving to semantic items in the future.

| Component | Current Tag | Proposed Tag |
|-----------|-------------|--------------|
| Menu Popup| `div`       | `menu`       |

---

## 9. Toolbars and Address Bars (`public/os-gui/Toolbar.js`, `public/os-gui/AddressBar.js`)

Toolbars and Address Bars provide specialized navigation and command grouping.

### Proposed Changes:
- For Toolbars, use `<nav role="toolbar">` to identify them as navigation landmarks with a specific role.
- For Address Bars, use `<nav role="combobox" aria-label="Address Bar">` to indicate its role in navigation and selection.

| Component   | Proposed Tag | Role |
|-------------|--------------|------|
| Toolbar     | `nav`        | `toolbar` |
| Address Bar | `nav`        | `combobox`|

---

## 10. Desktop Icons (`src/shell/desktop/desktop.js`, `src/shell/desktop/icon-manager.js`)

The desktop is essentially a grid of shortcuts and files.

### Proposed Changes:
- Use a `<ul>` to contain all desktop icons, with each icon wrapped in an `<li>`. This provides a clear list structure for screen readers.

---

## 11. Specialized Dialogs (`src/shell/run-dialog.js`, `src/shell/shutdown-dialog.js`)

These dialogs contain specific forms and option sets.

### Proposed Changes:
- Use `<form>` for the Run dialog (inherited from `$FormWindow`).
- Use `<fieldset>` and `<legend>` for the radio button options in the Shutdown dialog to group related controls semantically.

---

## 12. Status Bars (`src/shared/components/status-bar.js`)

Status bars provide information about the current state of an application or window.

### Proposed Changes:
- Use `<footer>` for the status bar within a window.
- Add `aria-label="Status Bar"` to distinguish it from the taskbar.

---

## Summary of Benefits
1. **Accessibility**: Landmark tags like `<header>` and `<nav>` provide better navigation for assistive technologies.
2. **Code Clarity**: Semantic tags clearly define the purpose of each structural element, making the code easier to understand and maintain.
3. **Future Proofing**: Moving towards standard HTML5 and ARIA patterns ensures better compatibility with future browser features.
