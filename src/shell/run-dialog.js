import { ICONS } from '../config/icons.js';
import { launchApp } from '../system/app-manager.js';
import { getAssociation } from '../system/directory.js';
import { convertWindowsPathToInternal } from '../system/path.js';
import { ShowDialogWindow } from '../shared/components/dialog-window.js';
import { apps } from '../config/apps.js';
import { ShellManager } from '../shell/explorer/extensions/shell-manager.js';

async function ShowRunDialog() {
  const win = new $FormWindow("Run");
  win.setDimensions({
    outerWidth: 300,
  });

  const iconEl = document.createElement("img");
  iconEl.src = ICONS.run[32];
  iconEl.width = 32;
  iconEl.height = 32;
  iconEl.style.marginRight = "10px";
  iconEl.style.verticalAlign = "middle";

  const textEl = document.createElement("p");
  textEl.textContent =
    "Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.";
  textEl.style.margin = "0";

  const contentContainer = document.createElement("div");
  contentContainer.style.display = "flex";
  contentContainer.style.alignItems = "center";
  contentContainer.style.padding = "10px";
  contentContainer.append(iconEl, textEl);

  const formContainer = document.createElement("div");
  formContainer.style.display = "flex";
  formContainer.style.alignItems = "center";
  formContainer.style.padding = "10px";

  const labelEl = document.createElement("label");
  labelEl.textContent = "Open:";
  labelEl.style.marginRight = "10px";

  const inputEl = document.createElement("input");
  inputEl.type = "text";
  inputEl.style.flexGrow = "1";

  formContainer.append(labelEl, inputEl);

  win.$main.append(contentContainer, formContainer);

  const executeCommand = async () => {
    const command = inputEl.value.trim();
    if (!command) {
      return;
    }

    // Check if it's a URL
    if (
      command.startsWith("http://") ||
      command.startsWith("https://") ||
      command.startsWith("www.")
    ) {
      launchApp("internet-explorer", command);
      win.close();
      return;
    }

    // Check if it's an app ID
    const app = apps.find(
      (app) => app.id.toLowerCase() === command.toLowerCase(),
    );
    if (app) {
      launchApp(app.id);
      win.close();
      return;
    }

    // Treat as a file path
    const internalPath = convertWindowsPathToInternal(command);
    try {
      const stats = await ShellManager.stat(internalPath);
      if (stats.isDirectory()) {
        launchApp("explorer", internalPath);
      } else {
        const association = getAssociation(internalPath.split("/").pop());
        launchApp(association.appId, internalPath);
      }
      win.close();
      return;
    } catch (e) {
      // Not found, continue to error
    }

    // If nothing matches, show an error
    ShowDialogWindow({
      title: "Error",
      text: `Cannot find the file '${command}'. Please check the filename and try again.`,
      contentIconUrl: ICONS.warning[32],
    });
  };

  win.$Button("OK", async () => await executeCommand()).addClass("default");
  win.$Button("Cancel", () => win.close());
  const browseButton = win.$Button("Browse...", () => {});
  browseButton.disabled = true;

  const screen = document.getElementById("screen");
  const taskbarHeight = 32;
  const { height: windowHeight } = win.element.getBoundingClientRect();
  const top = screen.offsetHeight - windowHeight - taskbarHeight;
  win.css({
    top: `${top}px`,
    left: "4px",
  });

  inputEl.focus();

  return win;
}

export { ShowRunDialog };
