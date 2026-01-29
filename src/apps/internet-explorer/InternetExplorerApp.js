import { IFrameApplication } from "../IFrameApplication.js";
import { AnimatedLogo } from "../../components/AnimatedLogo.js";
import { AddressBar } from "../../components/AddressBar.js";
import browseUiIcons from "../../assets/icons/browse-ui-icons.png";
import browseUiIconsGrayscale from "../../assets/icons/browse-ui-icons-grayscale.png";
import { ICONS } from "../../config/icons.js";
import { isZenFSPath, getZenFSFileUrl } from "../../utils/zenfs-utils.js";

export class InternetExplorerApp extends IFrameApplication {
  static config = {
    id: "internet-explorer",
    title: "Internet Explorer",
    description: "Browse the web.",
    icon: ICONS["internet-explorer"],
    width: 800,
    height: 600,
    resizable: true,
    isSingleton: false,
  };

  constructor(options) {
    super(options);
    this.retroMode = true;
    this.history = [];
    this.historyIndex = -1;
    this.blobUrl = null;
  }

  _onClose() {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }

  async _onLaunch(data) {
    let url = "azay.rahmad";

    if (typeof data === "string") {
      url = data;
    } else if (data instanceof File) {
      url = URL.createObjectURL(data);
    } else if (typeof data === "object" && data !== null) {
      url = data.url || url;
      if (data.retroMode === false) {
        this.retroMode = false;
      }
    }
    this._updateTitle(); // Always call this to set the correct initial title
    this.navigateTo(url);
  }

  _createWindow() {
    const initialTitle = this.retroMode
      ? "Internet Explorer (Retro Mode)"
      : "Internet Explorer";
    const win = new window.$Window({
      title: initialTitle,
      outerWidth: 600,
      outerHeight: 400,
      icons: this.icon,
      id: this.id,
      resizable: this.resizable,
    });
    this.win = win;

    this.iframe = window.os_gui_utils.E("iframe", {
      className: "content-window",
      style:
        "width: 100%; height: 100%; flex-grow: 1; background-color: var(--Window);",
    });

    // --- Status Bar ---
    // Main container
    const statusBar = window.os_gui_utils.E("div", {
      className: "status-bar",
      style: "display: flex; gap: 2px;",
    });

    // Left section container
    const leftSection = window.os_gui_utils.E("div", {
      className: "status-bar-field",
      style:
        "flex: 1; display: flex; align-items: center; gap: 4px; padding: 0 2px; border: 1px inset;",
    });

    // Status text
    this.statusText = window.os_gui_utils.E("div", {
      style:
        "flex: 3; padding: 2px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;",
    });
    this.statusText.textContent = "Done";

    // Right section (My Computer)
    const rightSection = window.os_gui_utils.E("div", {
      className: "status-bar-field",
      style:
        "width: 150px; display: flex; align-items: center; gap: 4px; padding: 2px 4px; border: 1px inset;",
    });
    const myComputerIcon = window.os_gui_utils.E("img", {
      src: ICONS.computer[16],
      style: "width: 16px; height: 16px;",
    });
    const myComputerText = document.createTextNode("My Computer");
    rightSection.append(myComputerIcon, myComputerText);

    statusBar.append(leftSection, rightSection);

    this.goBack = () => {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this._loadUrl(this.history[this.historyIndex], true);
      }
    };

    this.goForward = () => {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this._loadUrl(this.history[this.historyIndex], true);
      }
    };

    this._loadUrl = (url, isHistoryNav = false) => {
      if (url.includes("azay.rahmad")) {
        let page = "home.html";
        if (url.includes("about.html") || url.endsWith("/about")) {
          page = "about.html";
        } else if (url.includes("home.html")) {
          page = "home.html";
        } else if (
          url !== "azay.rahmad" &&
          url !== "http://azay.rahmad/" &&
          url !== "http://azay.rahmad"
        ) {
          page = "404.html";
        }
        this.iframe.src = `./azay.rahmad/${page}`;
        this.addressBar.setValue(url);
        if (!isHistoryNav) {
          if (this.historyIndex < this.history.length - 1) {
            this.history.splice(this.historyIndex + 1);
          }
          this.history.push(url);
          this.historyIndex = this.history.length - 1;
        }
        return;
      }

      if (!isHistoryNav) {
        if (this.historyIndex < this.history.length - 1) {
          this.history.splice(this.historyIndex + 1);
        }
        this.history.push(url);
        this.historyIndex = this.history.length - 1;
      }

      let finalUrl = url.trim();

      const isZenFS = isZenFSPath(finalUrl);
      const isLocal = isZenFS || finalUrl.startsWith("blob:") || finalUrl.startsWith("file:") || finalUrl.includes("localhost") || finalUrl.includes("127.0.0.1");

      if (!isLocal && !finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = `https://${finalUrl}`;
      }
      this.addressBar.setValue(finalUrl);

      const loadIframe = async (target) => {
        if (this.blobUrl) {
          URL.revokeObjectURL(this.blobUrl);
          this.blobUrl = null;
        }
        if (isZenFSPath(finalUrl)) {
          this.blobUrl = target;
        }
        this.statusText.textContent = "Connecting to site...";
        this.iframe.src = "about:blank";
        this.iframe.src = target;
      };

      if (isZenFS) {
        getZenFSFileUrl(finalUrl).then(loadIframe).catch(err => {
          console.error("Failed to load ZenFS file in IE:", err);
          this.statusText.textContent = "Failed to load local file.";
        });
      } else {
        const targetUrl = (this.retroMode && !isLocal)
          ? `https://web.archive.org/web/1998/${finalUrl}`
          : finalUrl;
        loadIframe(targetUrl);
      }
    };

    this._updateNavButtons = () => {
      if (this.toolbar) {
        this.toolbar.element.dispatchEvent(new Event("update"));
      }
      if (this.menuBar) {
        this.menuBar.element.dispatchEvent(new Event("update"));
      }
    };

    this.iframe.onload = () => {
      if (this.iframe.src.includes("/azay.rahmad/404.html")) {
        this.statusText.textContent = "Page not found.";
        this._updateNavButtons();
        return;
      }

      try {
        const iframeDoc = this.iframe.contentDocument;
        if (
          iframeDoc.title.includes("Not Found") ||
          iframeDoc.body.innerHTML.includes("Wayback Machine doesn")
        ) {
          this.iframe.src = "./azay.rahmad/404.html";
          this.statusText.textContent = "Page not found.";
        } else {
          this.statusText.textContent = "Done";
        }

        // Add a click listener to the iframe content
        iframeDoc.body.addEventListener("click", (e) => {
          const anchor = e.target.closest("a");
          if (anchor && anchor.getAttribute("href")) {
            const href = anchor.getAttribute("href");
            e.preventDefault();

            // Handle relative links for azay.rahmad
            if (
              this.iframe.src.includes("azay.rahmad") &&
              !href.startsWith("http") &&
              !href.startsWith("https") &&
              !href.startsWith("//")
            ) {
              const cleanHref = href.replace("./", "");
              this._loadUrl(`azay.rahmad/${cleanHref}`);
            } else {
              this._loadUrl(href);
            }
          }
        });
      } catch (e) {
        this.statusText.textContent = "Done";
      }

      this._updateNavButtons();
    };

    this.navigateTo = (url) => {
      this._loadUrl(url);
    };

    const menuBar = new window.MenuBar({
      File: [
        {
          label: "New Retro Window",
          action: () =>
            window.System.launchApp("internet-explorer", { retroMode: true }),
        },
        {
          label: "New Live Window",
          action: () =>
            window.System.launchApp("internet-explorer", { retroMode: false }),
        },
      ],
      Go: [
        {
          label: "Back",
          action: () => this.goBack(),
          enabled: () => this.historyIndex > 0,
        },
        {
          label: "Forward",
          action: () => this.goForward(),
          enabled: () => this.historyIndex < this.history.length - 1,
        },
        {
          label: "Up",
          action: () => {
            try {
              const currentUrl = new URL(this.addressBar.getValue());
              const pathParts = currentUrl.pathname.split("/").filter((p) => p);
              if (pathParts.length > 0) {
                pathParts.pop();
                currentUrl.pathname = pathParts.join("/");
                this.navigateTo(currentUrl.toString());
              }
            } catch (e) {
              // Invalid URL in address bar, do nothing
            }
          },
        },
      ],
    });
    this.menuBar = menuBar;
    win.setMenuBar(menuBar);

    const logo = new AnimatedLogo();
    const menuBarContainer = document.createElement("div");
    menuBarContainer.style.display = "flex";
    menuBarContainer.style.alignItems = "center";
    menuBarContainer.style.width = "100%";
    menuBarContainer.style.justifyContent = "space-between";

    // Wrap the existing menu bar element
    const menuBarElement = menuBar.element;
    menuBarElement.parentNode.insertBefore(menuBarContainer, menuBarElement);
    menuBarContainer.appendChild(menuBarElement);
    menuBarContainer.appendChild(logo);

    const toolbarItems = [
      "handler",
      {
        label: "Back",
        iconName: "back",
        action: () => this.goBack(),
        enabled: () => this.historyIndex > 0,
        submenu: () =>
          this.history
            .slice(0, this.historyIndex)
            .reverse()
            .slice(0, 3)
            .map((url, i) => ({
              label: url,
              action: () => {
                this.historyIndex -= i + 1;
                this._loadUrl(this.history[this.historyIndex], true);
              },
            })),
      },
      {
        label: "Forward",
        iconName: "forward",
        action: () => this.goForward(),
        enabled: () => this.historyIndex < this.history.length - 1,
        submenu: () =>
          this.history
            .slice(this.historyIndex + 1)
            .slice(0, 3)
            .map((url, i) => ({
              label: url,
              action: () => {
                this.historyIndex += i + 1;
                this._loadUrl(this.history[this.historyIndex], true);
              },
            })),
      },
      {
        label: "Stop",
        iconName: "stop",
        action: () => this.iframe.contentWindow.stop(),
      },
      {
        label: "Refresh",
        iconName: "refresh",
        action: () => this.iframe.contentWindow.location.reload(),
      },
      {
        label: "Home",
        iconName: "home",
        action: () => this.navigateTo("azay.rahmad"),
      },
      "divider",
      {
        label: "Search",
        iconName: "search",
        enabled: false,
      },
      {
        label: "Favorites",
        iconName: "favorites",
        enabled: false,
      },
      {
        label: "History",
        iconName: "history",
        enabled: false,
      },
      "divider",
      {
        label: "Print",
        iconName: "print",
        enabled: false,
      },
    ];

    this.toolbar = new window.Toolbar(toolbarItems, {
      icons: browseUiIcons,
      iconsGrayscale: browseUiIconsGrayscale,
    });

    this.addressBar = new AddressBar({
      placeholder: "Enter address",
      onEnter: (url) => this.navigateTo(url),
    });
    // For legacy reasons, other parts of the class might use this.input
    this.input = this.addressBar.input;

    win.$content.append(
      this.toolbar.element,
      this.addressBar.element,
      this.iframe,
      statusBar,
    );

    this._setupIframeForInactivity(this.iframe);

    return win;
  }

  _updateTitle() {
    const baseTitle = "Internet Explorer";
    const retroTitle = this.retroMode ? `${baseTitle} (Retro Mode)` : baseTitle;
    this.win.title(retroTitle);
  }
}
