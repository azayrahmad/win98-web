import { playSound } from '../../system/sound-manager.js';

/**
 * Creates and shows a dialog window.
 * @param {DialogOptions} options
 */
export function ShowDialogWindow(options: DialogOptions): OSGUI$Window {
  const {
    title,
    titleIconUrl,
    contentIconUrl,
    text,
    content,
    buttons = [{ label: "OK", action: () => {}, isDefault: true }],
    soundEvent,
    modal = false,
    showOverlay = false,
    parentWindow,
  } = options;

  const winOptions: OSGUIWindowOptions = {
    title: title || "Dialog",
    toolWindow: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    outerWidth: 400,
    parentWindow: parentWindow ?? undefined,
  };

  if (titleIconUrl) {
    const icon = document.createElement("img");
    icon.src = titleIconUrl;
    icon.width = 16;
    icon.height = 16;
    winOptions.icons = { any: icon };
  }

  const win = new $Window(winOptions);

  // Create dialog content
  const contentContainer = document.createElement("div");
  contentContainer.className = "dialog-content";

  if (content) {
    contentContainer.appendChild(content);
  } else {
    if (contentIconUrl) {
      const icon = document.createElement("img");
      icon.src = contentIconUrl;
      icon.className = "dialog-content-icon";
      icon.width = 32;
      icon.height = 32;
      contentContainer.appendChild(icon);
    }

    const textEl = document.createElement("div");
    textEl.className = "dialog-content-text";
    textEl.innerHTML = text || "";
    contentContainer.appendChild(textEl);
  }

  // Create buttons
  const buttonContainer = document.createElement("div");
  buttonContainer.className = "dialog-buttons";

  buttons.forEach((btnDef) => {
    const button = document.createElement("button");
    button.textContent = btnDef.label;
    button.onclick = async () => {
      if (btnDef.action) {
        const result = await btnDef.action(win);
        if (result === false) {
          return; // Don't close the dialog if action returns false
        }
      }
      win.close();
    };
    if (btnDef.isDefault) {
      button.classList.add("default");
    }
    if (btnDef.disabled) {
      button.disabled = true;
    }
    buttonContainer.appendChild(button);
  });

  win.$content.append(contentContainer, buttonContainer);
  win.center();

  // Handle modality
  let modalOverlay: HTMLDivElement | null = null;
  if (modal) {
    const screen = document.getElementById("screen");
    modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";
    if (showOverlay) {
      modalOverlay.classList.add("visible");
    }

    modalOverlay.onclick = () => {
      playSound("Default");
    };

    // Use a high z-index, but relative to the window manager's current z-index
    // This should be just below the dialog window itself.
    win.css("z-index", $Window.Z_INDEX + 1);
    modalOverlay.style.zIndex = String($Window.Z_INDEX);
    $Window.Z_INDEX += 2; // Increment for both overlay and window

    if (screen) {
      screen.appendChild(modalOverlay);
      win.onClosed(() => {
        if (screen.contains(modalOverlay!)) {
          screen.removeChild(modalOverlay!);
        }
      });
    }
  }

  // Play sound
  if (soundEvent) {
    playSound(soundEvent);
  }

  // Auto-height adjustment
  // The content needs to be rendered to get the correct height.
  setTimeout(() => {
    const contentHeight =
      contentContainer.offsetHeight + buttonContainer.offsetHeight;
    const currentOuterHeight = win.outerHeight() || 0;
    const currentInnerHeight = win.$content.innerHeight() || 0;
    const frameHeight = currentOuterHeight - currentInnerHeight;
    win.outerHeight(contentHeight + frameHeight); // Add some padding
    win.center(); // Recenter after resizing
  }, 0);

  win.focus();

  return win;
}

export function ShowComingSoonDialog(title: string): void {
  ShowDialogWindow({
    title: title,
    text: "Coming soon.",
    modal: true,
  });
}
