import { Application } from '../../system/application.js';
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import "./command-prompt.css";
import { fs, mounts } from "@zenfs/core";
import { apps } from '../../config/apps.js';
import { getAssociation } from '../../system/directory.js';
import { launchApp } from '../../system/app-manager.js';
import { ICONS } from '../../config/icons.js';

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
    this.currentDirectory = "/C:/WINDOWS"; // Start at C:\WINDOWS
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

    const matches = command.match(/(?:[^\s"]+|"[^"]*")+/g);
    if (!matches) {
      this.prompt();
      return;
    }
    const [cmd, ...args] = matches.map((arg) => arg.replace(/"/g, ""));

    // Check for drive change command (e.g., "A:")
    if (cmd.match(/^[A-Z]:$/i)) {
      const drive = cmd.toUpperCase();
      const mountPath = "/" + drive;
      if (drive === "C:" || mounts.has(mountPath)) {
        this.currentDirectory = mountPath;
      } else {
        this.terminal.write("General failure reading drive " + drive + "\r\n");
      }
      this.prompt();
      return;
    }

    switch (cmd.toLowerCase()) {
      case "help":
        this.terminal.write("Available commands:\r\n");
        this.terminal.write("  DIR [path]        - Lists files and directories\r\n");
        this.terminal.write("  CD [path]         - Changes the current directory\r\n");
        this.terminal.write("  CHDIR [path]      - Changes the current directory\r\n");
        this.terminal.write("  MD <path>         - Creates a directory\r\n");
        this.terminal.write("  MKDIR <path>      - Creates a directory\r\n");
        this.terminal.write("  RD <path>         - Removes a directory\r\n");
        this.terminal.write("  RMDIR <path>      - Removes a directory\r\n");
        this.terminal.write("  DEL <file>        - Deletes a file\r\n");
        this.terminal.write("  REN <old> <new>   - Renames a file or directory\r\n");
        this.terminal.write("  TYPE <file>       - Displays the contents of a text file\r\n");
        this.terminal.write("  COPY <src> <dest> - Copies a file\r\n");
        this.terminal.write("  CLS               - Clears the screen\r\n");
        this.terminal.write("  HELP              - Displays this help message\r\n");
        this.terminal.write("  <app-id>          - Launches an application\r\n");
        break;

      case "dir":
        const dirPath = args.length > 0 ? this.resolvePath(args[0]) : this.currentDirectory;
        if (dirPath === null) {
          this.terminal.write("Invalid directory\r\n");
          break;
        }

        // Check drive accessibility
        const dirDriveMatch = dirPath.match(/^\/([A-Z]:)/i);
        if (dirDriveMatch) {
          const drive = dirDriveMatch[1].toUpperCase();
          if (drive !== "C:" && !mounts.has("/" + drive)) {
            this.terminal.write("General failure reading drive " + drive + "\r\n");
            break;
          }
        }

        try {
          const files = await fs.promises.readdir(dirPath);
          this.terminal.write(` Directory of ${this._getDisplayPath(dirPath)}\r\n\r\n`);
          for (const file of files) {
            try {
              const fullPath = dirPath + (dirPath.endsWith("/") ? "" : "/") + file;
              const stats = await fs.promises.stat(fullPath);
              this.terminal.write(this._formatDirEntry(file, stats));
            } catch (e) {
              // Skip files that can't be stat'd
            }
          }
        } catch (e) {
          this.terminal.write(`File Not Found\r\n`);
        }
        break;

      case "chdir":
      case "cd":
        if (args.length === 0) {
          this.terminal.write(`${this.currentDirectory.replace(/\//g, "\\")}\r\n`);
          break;
        }

        const newPath = this.resolvePath(args[0]);
        if (newPath === null) {
          this.terminal.write("Invalid directory\r\n");
          break;
        }

        try {
          const stats = await fs.promises.stat(newPath);
          if (stats.isDirectory()) {
            // Check drive accessibility for A: and E:
            const driveMatch = newPath.match(/^\/([A-Z]:)/i);
            if (driveMatch) {
              const drive = driveMatch[1].toUpperCase();
              if (drive !== "C:" && !mounts.has("/" + drive)) {
                this.terminal.write("General failure reading drive " + drive + "\r\n");
                break;
              }
            }
            this.currentDirectory = newPath;
          } else {
            this.terminal.write(`Directory not found: ${args[0]}\r\n`);
          }
        } catch (e) {
          this.terminal.write(`Directory not found: ${args[0]}\r\n`);
        }
        break;

      case "mkdir":
      case "md":
        if (args.length === 0) {
          this.terminal.write("The syntax of the command is incorrect.\r\n");
          break;
        }
        try {
          await fs.promises.mkdir(this.resolvePath(args[0]));
        } catch (e) {
          this.terminal.write(`Error creating directory: ${e.message}\r\n`);
        }
        break;

      case "rmdir":
      case "rd":
        if (args.length === 0) {
          this.terminal.write("The syntax of the command is incorrect.\r\n");
          break;
        }
        try {
          await fs.promises.rmdir(this.resolvePath(args[0]));
        } catch (e) {
          this.terminal.write(`Error removing directory: ${e.message}\r\n`);
        }
        break;

      case "del":
        if (args.length === 0) {
          this.terminal.write("The syntax of the command is incorrect.\r\n");
          break;
        }
        try {
          await fs.promises.unlink(this.resolvePath(args[0]));
        } catch (e) {
          this.terminal.write(`Error deleting file: ${e.message}\r\n`);
        }
        break;

      case "ren":
        if (args.length < 2) {
          this.terminal.write("The syntax of the command is incorrect.\r\n");
          break;
        }
        try {
          await fs.promises.rename(this.resolvePath(args[0]), this.resolvePath(args[1]));
        } catch (e) {
          this.terminal.write(`Error renaming file: ${e.message}\r\n`);
        }
        break;

      case "type":
        if (args.length === 0) {
          this.terminal.write("The syntax of the command is incorrect.\r\n");
          break;
        }
        try {
          const content = await fs.promises.readFile(this.resolvePath(args[0]), "utf8");
          this.terminal.write(content.replace(/\n/g, "\r\n") + "\r\n");
        } catch (e) {
          this.terminal.write(`Error reading file: ${e.message}\r\n`);
        }
        break;

      case "copy":
        if (args.length < 2) {
          this.terminal.write("The syntax of the command is incorrect.\r\n");
          break;
        }
        try {
          const src = this.resolvePath(args[0]);
          const dest = this.resolvePath(args[1]);
          const data = await fs.promises.readFile(src);
          let finalDest = dest;
          try {
            const destStat = await fs.promises.stat(dest);
            if (destStat.isDirectory()) {
              const fileName = src.split("/").pop();
              finalDest = dest + (dest.endsWith("/") ? "" : "/") + fileName;
            }
          } catch (e) {
            // Destination does not exist, use as is
          }
          await fs.promises.writeFile(finalDest, data);
          this.terminal.write("        1 file(s) copied.\r\n");
        } catch (e) {
          this.terminal.write(`Error copying file: ${e.message}\r\n`);
        }
        break;

      case "cls":
        this.terminal.clear();
        break;

      default:
        const app = apps.find(
          (app) =>
            app.id.toLowerCase() === cmd.toLowerCase() ||
            app.title.toLowerCase() === cmd.toLowerCase(),
        );
        if (app) {
          launchApp(app.id);
        } else {
          // Check if it's a file in current directory
          const filePath = this.resolvePath(cmd);
          try {
            const stats = await fs.promises.stat(filePath);
            if (stats.isFile()) {
              const association = getAssociation(cmd);
              if (association && association.appId) {
                launchApp(association.appId, filePath);
              } else {
                this.terminal.write(`No association found for file: ${cmd}\r\n`);
              }
            } else {
              this.terminal.write(
                `'${cmd}' is not recognized as an internal or external command,\r\noperable program or batch file.\r\n`,
              );
            }
          } catch (e) {
            this.terminal.write(
              `'${cmd}' is not recognized as an internal or external command,\r\noperable program or batch file.\r\n`,
            );
          }
        }
        break;
    }
    this.prompt();
  }

  _getDisplayPath(path) {
    let pathString = path;
    const driveMatch = pathString.match(/^\/([A-Z]:)(.*)/i);
    if (driveMatch) {
      pathString = driveMatch[1] + driveMatch[2].replace(/\//g, "\\");
    } else {
      pathString = pathString.replace(/\//g, "\\");
      if (pathString === "") pathString = "\\";
    }

    if (pathString.match(/^[A-Z]:$/i)) {
      pathString += "\\";
    }
    return pathString;
  }

  prompt() {
    this.terminal.write(`${this._getDisplayPath(this.currentDirectory)}>`);
  }

  resolvePath(path) {
    if (path.match(/^[A-Z]:/i)) {
      const drive = path.substring(0, 2).toUpperCase();
      let rest = path.substring(2).replace(/\\/g, "/");
      if (rest === "" || rest === "\\") rest = "/";
      if (!rest.startsWith("/")) rest = "/" + rest;
      return "/" + drive + (rest === "/" ? "" : rest);
    }

    const parts = path.split(/[\\/]/);
    let currentParts = this.currentDirectory.split("/").filter((p) => p !== "");

    if (path.startsWith("/") || path.startsWith("\\")) {
      // Absolute path from drive root
      currentParts = [currentParts[0]]; // Keep only the drive (e.g., "C:")
    }

    for (const part of parts) {
      if (part === "" || part === ".") {
        continue;
      }
      if (part === "..") {
        if (currentParts.length > 1) {
          currentParts.pop();
        } else {
          return null; // Move above drive root
        }
      } else {
        currentParts.push(part);
      }
    }

    return "/" + currentParts.join("/");
  }

  _formatDirEntry(name, stats) {
    const isDirectory = stats.isDirectory();
    const date = stats.mtime || new Date();
    const dateStr = `${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")}-${date.getFullYear().toString().substring(2)}`;
    const hours = date.getHours();
    const ampm = hours >= 12 ? "p" : "a";
    const displayHours = hours % 12 || 12;
    const timeStr = `${displayHours.toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}${ampm}`;

    const parts = name.split(".");
    let ext = "";
    let base = name;
    if (!isDirectory && parts.length > 1) {
      ext = parts.pop().toUpperCase().substring(0, 3);
      base = parts.join(".");
    }

    const dosName = base.toUpperCase().substring(0, 8).padEnd(8);
    const dosExt = isDirectory ? "<DIR>   " : ext.padEnd(8);
    const sizeStr = isDirectory ? "        " : stats.size.toLocaleString().padStart(8);

    return `${dosName} ${dosExt} ${sizeStr}  ${dateStr}  ${timeStr}  ${name}\r\n`;
  }

  _onClose() {
    if (this.terminal) {
      this.terminal.dispose();
    }
  }
}
