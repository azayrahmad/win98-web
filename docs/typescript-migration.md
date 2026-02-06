# TypeScript Migration Guide

This guide outlines the strategy for gradually converting the Windows 98 Web project from JavaScript to TypeScript. The goal is to achieve full type safety with `strict: true` while maintaining a functional project at every step.

## Migration Strategy

We will follow a **Hybrid Approach** that allows both `.js` and `.ts` files to coexist.

### Phase 1: Infrastructure & Ambient Declarations
- Set up `tsconfig.json` and install dependencies.
- Create ambient declaration files (`.d.ts`) for global libraries like `os-gui` and `jquery`.
- Define the global `window.System` interface.

### Phase 2: Core System Migration (Priority)
- Convert files in `src/system/` one by one.
- Rename `.js` to `.ts` and resolve type errors.
- Use `any` sparingly as a temporary bridge if needed, but aim for specific types.

### Phase 3: Shared Components & Utils
- Convert `src/shared/components/` and `src/shared/utils/`.
- These are used by both `system/` and `apps/`, so they provide high value once typed.

### Phase 4: Application Migration
- Convert individual apps in `src/apps/`.
- Since apps are often self-contained, they can be migrated independently.

---

## Initial Setup

### 1. Install Dependencies
Run the following command to install TypeScript and necessary type definitions:

```bash
npm install --save-dev typescript @types/jquery @types/node
```

### 2. Configure `tsconfig.json`
Create a `tsconfig.json` in the root directory:

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "useDefineForClassFields": true,
    "module": "ESNext",
    "lib": ["ESNext", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,

    /* Gradual Migration */
    "allowJs": true,
    "checkJs": false
  },
  "include": ["src", "public/os-gui"],
  "exclude": ["node_modules"]
}
```

### 3. Verification Script
Add a type-check script to `package.json`:

```json
"scripts": {
  "type-check": "tsc --noEmit"
}
```

---

## Handling External Libraries

Since libraries like `os-gui` are loaded via `<script>` tags in `index.html`, we need to declare them globally.

### Creating `src/types/os-gui.d.ts`
Create a file to define the types for the retro GUI library:

```typescript
/**
 * Global os-gui types
 */
declare interface OSGUIWindowOptions {
    title?: string;
    outerWidth?: number;
    outerHeight?: number;
    innerWidth?: number;
    innerHeight?: number;
    resizable?: boolean;
    minimizable?: boolean;
    maximizable?: boolean;
    closable?: boolean;
    icons?: Record<string | number, string | HTMLElement>;
    toolWindow?: boolean;
    parentWindow?: OSGUI$Window;
    // ... add more as needed
}

declare interface OSGUI$Window extends JQuery<HTMLElement> {
    element: HTMLElement;
    $titlebar: JQuery<HTMLElement>;
    $content: JQuery<HTMLElement>;
    title(text: string): this;
    title(): string;
    close(force?: boolean): void;
    minimize(): void;
    unminimize(): void;
    maximize(): void;
    bringToFront(): void;
    onClosed(callback: () => void): () => void;
    // ... add more as needed
}

declare class MenuBar {
    constructor(menus: Record<string, any>);
    element: HTMLElement;
    setKeyboardScope(el: HTMLElement): void;
}

declare var $Window: {
    new (options?: OSGUIWindowOptions): OSGUI$Window;
    Z_INDEX: number;
};
```

---

## JSDoc vs. .ts Files

| Feature | JSDoc (in `.js`) | TypeScript (in `.ts`) |
| :--- | :--- | :--- |
| **Git History** | Preserved (no rename) | Split (requires rename) |
| **Syntax** | Verbose comments | Concise language-level types |
| **Features** | Limited (no interfaces/enums) | Full power of TS |
| **Friction** | Very low | Medium (must fix whole file) |

**Recommendation:**
- Use **`.ts` files** for the `src/system/` core and any new files. It provides the best long-term developer experience and full access to strict typing.
- Use **JSDoc** sparingly for large legacy files that you aren't ready to fully convert yet but want some type-checking for.

---

## Example Conversion: `WindowManager`

Here is a walkthrough of converting `src/system/window-manager.js` to TypeScript.

### Step 1: Rename the file
Rename `src/system/window-manager.js` to `src/system/window-manager.ts`.

### Step 2: Add Imports and Interfaces
Define what a "window" looks like in the context of this manager.

```typescript
import { taskbar } from '../shell/taskbar/taskbar.js';

// Extend the base HTMLElement to include properties added by os-gui
interface WindowElement extends HTMLElement {
    id: string;
    $window?: OSGUI$Window;
    isMinimized?: boolean;
}

export class WindowManager {
  private _zIndex: number;
  public minimizedWindows: Map<string, any>;

  constructor() {
    this._zIndex = 1000;
    this.minimizedWindows = new Map();
  }

  incrementZIndex(): number {
    return ++this._zIndex;
  }

  getHighestZIndex(): number {
    return this._zIndex;
  }

  minimizeWindow(win: WindowElement | null, skipTaskbarUpdate: boolean = false): void {
    if (!win?.id) return;

    // Access the $window jQuery object
    const $window = win.$window || ($(win).closest(".window").data("$window") as OSGUI$Window);

    if ($window && typeof $window.minimize === "function") {
      $window.minimize();
    } else {
      console.warn("Window element does not have minimize method:", win);
      win.style.display = "none";
      win.isMinimized = true;
    }

    if (!skipTaskbarUpdate) {
      taskbar.updateTaskbarButton(win.id, false, true);
    }
  }

  // ... rest of the methods
}
```

### Key Takeaways from the Example:
1.  **Type Assertions:** Use `as OSGUI$Window` when retrieving data from jQuery's `.data()`.
2.  **Optional Chaining:** Use `win?.id` to handle potential null values safely.
3.  **Private/Public:** Use TS access modifiers to clarify the API.

---

### Creating `src/types/globals.d.ts`
Since many system objects are attached to `window`, define them in a global declaration file:

```typescript
import { WindowManager } from '../system/window-manager';

declare global {
  interface Window {
    System: WindowManager & {
      launchApp: (id: string, data?: any) => Promise<void>;
      appManager: any; // Add more specific type if available
    };
    fs: typeof import('@zenfs/core').fs;
    ShowDialogWindow: (options: any) => void;
    playSound: (event: string) => void;
    setTheme: (themeName: string) => Promise<void>;
  }
}
```

---

## Best Practices
1.  **Avoid `any`:** Try to define interfaces even if they are incomplete. You can always expand them later.
2.  **Type-Only Imports:** Use `import type { ... }` when only importing types to keep the compiled output clean.
3.  **Ambient Declarations:** Use `.d.ts` files for libraries without built-in types to avoid `Could not find a declaration file` errors.
