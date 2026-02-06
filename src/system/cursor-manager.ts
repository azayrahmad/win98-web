import { convertAniBinaryToCSS } from "ani-cursor";
import { cursors, getCursorThemes } from '../config/cursors.js';
import { getCursorSchemeId } from './theme-manager.js';

const styleMap = new Map<string, HTMLStyleElement>();

export async function applyAniCursorTheme(theme: string, cursorType: string): Promise<void> {
  // `cursorType` directly corresponds to the key in the cursors object (e.g., 'busy', 'wait')
  const cursorUrl = (cursors as any)[theme]?.[cursorType];

  if (!cursorUrl) {
    // If a specific theme doesn't have an animated cursor, fall back to default if it exists.
    if ((cursors as any).default?.[cursorType]) {
      // console.log(`Falling back to default animated cursor for theme: ${theme}, type: ${cursorType}`);
      // When falling back, use 'default' as the themeKey, not the original 'theme'
      await applyAniCursorTheme("default", cursorType); // Recursively call with default theme
      return;
    }
    console.warn(
      `Animated cursor not found for theme: ${theme}, type: ${cursorType}. No default fallback.`,
    );
    return;
  }

  try {
    const response = await fetch(cursorUrl);
    const data = new Uint8Array(await response.arrayBuffer());

    // Use a unique ID for the style element to manage it easily
    const styleId = `ani-cursor-style-${theme}-${cursorType}`;
    let style = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.innerText = convertAniBinaryToCSS(`.cursor-${cursorType}`, data);
    styleMap.set(`.cursor-${cursorType}`, style);
  } catch (error) {
    console.error("Failed to apply animated cursor:", error);
  }
}

export function clearAniCursor(): void {
  for (const [selector, style] of styleMap.entries()) {
    if (style && style.parentNode) {
      style.parentNode.removeChild(style);
    }
    styleMap.delete(selector);
  }
}

/**
 * Applies a busy/wait cursor to a specific element.
 * @param {HTMLElement} [element=document.body] - The element to apply the cursor to.
 */
export function applyBusyCursor(element: HTMLElement = document.body): void {
  element.classList.add("cursor-busy");
  element.style.cursor = "var(--cursor-wait, wait)";
}

/**
 * Clears the busy/wait cursor from a specific element.
 * @param {HTMLElement} [element=document.body] - The element to clear the cursor from.
 */
export function clearBusyCursor(element: HTMLElement = document.body): void {
  // Use a short timeout to prevent the cursor from reverting too quickly,
  // ensuring the browser has time to render the change.
  setTimeout(() => {
    element.classList.remove("cursor-busy");
    // Revert to the default cursor for the body, or let other elements inherit.
    if (element === document.body) {
      element.style.cursor = "var(--cursor-default, default)";
    } else {
      element.style.cursor = "";
    }
  }, 50);
}

/**
 * Applies a wait/progress cursor to a specific element.
 * @param {HTMLElement} [element=document.body] - The element to apply the cursor to.
 */
export function applyWaitCursor(element: HTMLElement = document.body): void {
  element.classList.add("cursor-wait");
  element.style.cursor = "var(--cursor-progress, progress)";
}

/**
 * Clears the wait/progress cursor from a specific element.
 * @param {HTMLElement} [element=document.body] - The element to clear the cursor from.
 */
export function clearWaitCursor(element: HTMLElement = document.body): void {
  setTimeout(() => {
    element.classList.remove("cursor-wait");
    if (element === document.body) {
      element.style.cursor = "var(--cursor-default, default)";
    } else {
      element.style.cursor = "";
    }
  }, 50);
}

export function applyCursorTheme(_themeIdOverride?: string): void {
  const themeId = getCursorSchemeId();
  const root = document.documentElement;
  let themeConfig = getCursorThemes(themeId);
  if (!themeConfig) themeConfig = getCursorThemes("default");

  if (themeConfig) {
    for (const [property, config] of Object.entries(themeConfig)) {
      if ((config as any).animated) {
        applyAniCursorTheme(themeId, (config as any).type);
      } else {
        root.style.setProperty(property, (config as any).value);
      }
    }
  } else {
    clearAniCursor();
    // Assuming getCursorThemes returns an array of property names on failure, which seems unlikely.
    // This part might need adjustment based on the actual return value.
    const defaultCursorConfig = getCursorThemes("default");
    const defaultCursorProperties = defaultCursorConfig
      ? Object.keys(defaultCursorConfig)
      : [];
    for (const property of defaultCursorProperties) {
      root.style.removeProperty(property);
    }
  }
}
