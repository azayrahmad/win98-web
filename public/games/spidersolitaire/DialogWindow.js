// No longer a module, so no imports

/**
 * @typedef {object} DialogButton
 * @property {string} label - The text to display on the button.
 * @property {() => void} action - The function to call when the button is clicked.
 * @property {boolean} [isDefault] - Whether this button is the default action.
 */

/**
 * @typedef {object} DialogOptions
 * @property {string} title - The title of the dialog window.
 * @property {string} [titleIconUrl] - Optional URL for an icon in the title bar.
 * @property {string} [contentIconUrl] - Optional URL for an icon in the content area.
 * @property {string} text - The main text content of the dialog.
 * @property {DialogButton[]} [buttons] - The buttons to display in the dialog.
 * @property {string} [soundEvent] - The name of the sound event to play.
 * @property {boolean} [modal=false] - Whether the dialog should be modal.
 */

/**
 * Creates and shows a dialog window.
 * @param {DialogOptions} options
 */
function ShowDialogWindow(options) {
  const {
    title,
    titleIconUrl,
    contentIconUrl,
    text,
    content, // Added content property
    buttons = [{ label: "OK", action: () => {}, isDefault: true }],
    soundEvent,
    modal = false,
    onOpen,
  } = options;

  const winOptions = {
    title: title || "Dialog",
    toolWindow: false,
    resizable: false,
    minimizeButton: false,
    maximizeButton: false,
    width: 400,
    height: "auto",
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
    textEl.innerHTML = text;
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
  let modalOverlay = null;
  if (modal) {
    const screen = document.getElementById("screen");
    modalOverlay = document.createElement("div");
    modalOverlay.className = "modal-overlay";

    // Use a high z-index, but relative to the window manager's current z-index
    // This should be just below the dialog window itself.
    win.css("z-index", $Window.Z_INDEX + 1);
    modalOverlay.style.zIndex = $Window.Z_INDEX;
    $Window.Z_INDEX += 2; // Increment for both overlay and window

    screen.appendChild(modalOverlay);
    win.onClosed(() => {
      if (screen.contains(modalOverlay)) {
        screen.removeChild(modalOverlay);
      }
    });
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
    const frameHeight = win.outerHeight() - win.$content.innerHeight();
    win.outerHeight(contentHeight + frameHeight); // Add some padding
    win.center(); // Recenter after resizing
  }, 0);

  win.focus();

  if (onOpen) {
    onOpen(win);
  }

  return win;
}

function ShowComingSoonDialog(title) {
  ShowDialogWindow({
    title: title,
    text: "Coming soon.",
    modal: true,
  });
}

// No longer a module, so no exports
