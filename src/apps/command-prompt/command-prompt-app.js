import { Application } from "../../system/application.js";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import "./command-prompt.css";
import { ICONS } from "../../config/icons.js";
import { DOSShell } from "../../system/dos-shell.js";

export class CommandPromptApp extends Application {
  static config = {
    id: "command-prompt",
    title: "MS-DOS Prompt",
    description: "Starts a new MS-DOS prompt.",
    icon: ICONS.msdos, category: "",
    width: 640,
    height: 480,
    resizable: true,
    isSingleton: false,
  };

  constructor(config) {
    super(config);
    this.terminal = null;
    this.shell = null;
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

    this.shell = new DOSShell(this.terminal, {
      onExit: () => this.win.close(),
      isMSDOSMode: false,
    });

    this.terminal.write("Microsoft(R) Windows 98\r\n");
    this.terminal.write("   (C)Copyright Microsoft Corp 1981-1999.\r\n\r\n");

    this.shell.init();

    return win;
  }

  _onClose() {
    if (this.terminal) {
      this.terminal.dispose();
    }
  }
}
