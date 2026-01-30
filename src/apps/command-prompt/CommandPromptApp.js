import { Application } from "../Application.js";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import "./command-prompt.css";
import directory from "../../config/directory.js";
import { findItemByPath } from "../../utils/directory.js";
import { launchApp } from "../../utils/appManager.js";
import { ICONS } from "../../config/icons.js";

export class CommandPromptApp extends Application {
  static config = {
    id: "command-prompt",
    title: "MS-DOS Prompt",
    description: "Starts a new MS-DOS prompt.",
    icon: ICONS.msdos,
    width: 640,
    height: 480,
    resizable: true,
    isSingleton: false,
  };

  constructor(config) {
    super(config);
    this.terminal = null;
    this.currentDirectory = "/drive-c"; // Start at C:/
    this.commandHistory = [];
    this.historyIndex = -1;
    this.currentCommand = "";
  }

  _createWindow() {
    const win = new window.$Window({
      title: this.title,
      outerWidth: 640,
      icons: this.icon,
      resizable: true,
      minimizeButton: this.minimizeButton,
      maximizeButton: this.maximizeButton,
      id: this.id,
    });

    this.win = win;

    const content = document.createElement("div");
    content.className = "command-prompt-content";
    content.style.width = "100%";
    content.style.height = "100%";

    const terminalContainer = document.createElement("div");
    terminalContainer.className = "terminal-container";
    terminalContainer.style.width = "100%";
    terminalContainer.style.height = "100%";
    content.appendChild(terminalContainer);

    win.$content.append(content);

    this.terminal = new Terminal({
      cursorStyle: "underline",
      cursorBlink: true,
      theme: {
        background: "black",
        foreground: "#aaaaaa",
      },
      fontFamily: '"IBM BIOS", Courier, monospace',
      fontSize: 13,
      wordWrap: true,
    });

    this.terminal.open(terminalContainer);
    this.terminal.write("Microsoft(R) Windows 98\r\n");
    this.terminal.write("   (C)Copyright Microsoft Corp 1981-1999.\r\n\r\n");
    this.prompt();

    this.terminal.onData((data) => this.handleData(data));

    return win;
  }

  handleData(data) {
    const code = data;
    if (code === "\u001b[A") {
      // Up arrow
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.currentCommand = this.commandHistory[this.historyIndex];
        this.terminal.write("\x1b[2K\r"); // Clear line and move to beginning
        this.prompt();
        this.terminal.write(this.currentCommand);
      }
    } else if (code === "\u001b[B") {
      // Down arrow
      if (this.historyIndex < this.commandHistory.length - 1) {
        this.historyIndex++;
        this.currentCommand = this.commandHistory[this.historyIndex];
        this.terminal.write("\x1b[2K\r"); // Clear line and move to beginning
        this.prompt();
        this.terminal.write(this.currentCommand);
      } else {
        this.historyIndex = this.commandHistory.length;
        this.currentCommand = "";
        this.terminal.write("\x1b[2K\r");
        this.prompt();
      }
    } else if (code.charCodeAt(0) === 13) {
      // Enter
      this.terminal.write("\r\n");
      this.processCommand(this.currentCommand);
      this.currentCommand = "";
    } else if (code.charCodeAt(0) === 127) {
      // Backspace
      if (this.currentCommand.length > 0) {
        this.terminal.write("\b \b");
        this.currentCommand = this.currentCommand.slice(0, -1);
      }
    } else if (code.charCodeAt(0) >= 32) {
      this.terminal.write(data);
      this.currentCommand += data;
    }
  }

  async processCommand(command) {
    command = command.trim();
    if (!command) {
      this.prompt();
      return;
    }

    this.commandHistory.push(command);
    this.historyIndex = this.commandHistory.length;

    const [cmd, ...args] = command
      .match(/(?:[^\s"]+|"[^"]*")+/g)
      .map((arg) => arg.replace(/"/g, ""));

    switch (cmd.toLowerCase()) {
      case "help":
        this.terminal.write("Available commands:\r\n");
        this.terminal.write("  DIR - Lists files and directories\r\n");
        this.terminal.write(
          "  CD <directory> - Changes the current directory\r\n",
        );
        this.terminal.write(
          "  CHDIR <directory> - Changes the current directory\r\n",
        );
        this.terminal.write("  CLS - Clears the screen\r\n");
        this.terminal.write("  HELP - Displays this help message\r\n");
        this.terminal.write("  <app-id> - Launches an application\r\n");
        break;

      case "dir":
        const item = findItemByPath(this.currentDirectory);
        if (item && item.children) {
          item.children.forEach((child) => {
            this.terminal.write(this._formatDirEntry(child));
          });
        }
        break;

      case "chdir":
      case "cd":
        if (args.length === 0) {
          this.terminal.write("Usage: cd <directory>\r\n");
          break;
        }

        const newPath = this.resolvePath(args[0]);
        const targetItem = findItemByPath(newPath);

        if (
          targetItem &&
          (targetItem.type === "folder" || targetItem.type === "drive")
        ) {
          this.currentDirectory = newPath;
        } else {
          this.terminal.write(`Directory not found: ${args[0]}\r\n`);
        }
        break;

      case "cls":
        this.terminal.clear();
        break;

      default:
        const { apps } = await import("../../config/apps.js");
        const app = apps.find(
          (app) =>
            app.id.toLowerCase() === cmd.toLowerCase() ||
            app.title.toLowerCase() === cmd.toLowerCase(),
        );
        if (app) {
          launchApp(app.id);
        } else {
          this.terminal.write(
            `'${cmd}' is not recognized as an internal or external command,\r\noperable program or batch file.\r\n`,
          );
        }
        break;
    }
    this.prompt();
  }

  prompt() {
    let pathString = this.currentDirectory
      .replace("/drive-c", "C:")
      .replace(new RegExp("/", "g"), "\\");
    if (pathString === "C:") {
      pathString = "C:\\";
    }
    this.terminal.write(`${pathString}>`);
  }

  resolvePath(path) {
    if (path.startsWith("C:") || path.startsWith("C:\\")) {
      return "/drive-c" + path.substring(2).replace(/\\/g, "/");
    }

    const parts = path.split(/[\\/]/);
    let currentParts = this.currentDirectory.split("/");

    for (const part of parts) {
      if (part === "" || part === ".") {
        continue;
      }
      if (part === "..") {
        if (currentParts.length > 2) {
          currentParts.pop();
        }
      } else {
        currentParts.push(part);
      }
    }

    return currentParts.join("/");
  }

  _formatDirEntry(item) {
    const parts = item.name.split('.');
    const hasExtension = parts.length > 1;
    let baseName = (hasExtension ? parts[0] : item.name).toUpperCase();

    let truncatedName = baseName;
    if (baseName.length > 8) {
      truncatedName = `${baseName.substring(0, 6)}~1`;
    }

    let extension = "";
    if (item.type === "folder") {
      extension = "<DIR>";
    } else if (item.type === "app") {
      extension = "EXE";
    } else if (hasExtension) {
      extension = parts.pop().toUpperCase().substring(0, 3);
    }

    const nameCol = truncatedName.padEnd(12);
    const extCol = extension.padEnd(8);

    return `${nameCol}${extCol}${item.name}\r\n`;
  }

  _onClose() {
    if (this.terminal) {
      this.terminal.dispose();
    }
    super._onClose();
  }
}
