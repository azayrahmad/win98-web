import { Application } from "../../system/application.js";
import { aboutContent } from "./about.js";
import "./about.css";
import { ICONS } from "../../config/icons.js";
import { renderHTML } from "../../shared/utils/dom-utils.js";

import readmeMarkdown from "../../../README.md?raw";
import changelogMarkdown from "../../../CHANGELOG.md?raw";

export class AboutApp extends Application {
  static config = {
    id: "about",
    title: "About",
    description: "Displays information about this application.",
    summary: "<b>azOS Second Edition</b><br>Copyright © 2024",
    icon: ICONS.windowsUpdate,
    width: 400,
    height: 280,
    resizable: false,
    minimizeButton: false,
    maximizeButton: false,
    isSingleton: true,
  };

  constructor(config) {
    super(config);
  }

  _createWindow() {
    const win = new $Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      minimizeButton: this.minimizeButton,
      maximizeButton: this.maximizeButton,
      icons: ICONS.windows,
    });

    win.$content.html(aboutContent);

    this.checkVersion(win.$content.find(".version-status"));

    win.$content
      .find("#about-readme")
      .on("click", () => this.openFile(readmeMarkdown, "README"));
    win.$content
      .find("#about-changelog")
      .on("click", () => this.openFile(changelogMarkdown, "Changelog"));

    return win;
  }

  async openFile(markdown, title) {
    // Fix image paths: in production, the 'public' folder contents are at the root
    const fixedMarkdown = markdown.replaceAll('./public/', './');
    const html = marked.parse(fixedMarkdown);
    const win = new $Window({
      title: title,
      outerWidth: 600,
      outerHeight: 400,
      resizable: true,
      maximizeButton: true,
      icons: ICONS.windows,
    });

    const contentArea = document.createElement("div");
    contentArea.className = "about-file-content";
    contentArea.style.height = "100%";
    contentArea.style.padding = "8px";
    contentArea.style.display = "flex";
    contentArea.style.flexDirection = "column";

    win.$content.append(contentArea);
    renderHTML(contentArea, html, "sunken-panel");

    const sunkenPanel = contentArea.querySelector(".sunken-panel");
    if (sunkenPanel) {
      sunkenPanel.style.flexGrow = "1";
      sunkenPanel.style.overflowY = "auto";
      sunkenPanel.style.padding = "16px";
      sunkenPanel.style.backgroundColor = "white";

      // Ensure headings have IDs for anchor links
      sunkenPanel.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
        if (!h.id) {
          h.id = h.textContent
            .toLowerCase()
            .replace(/[^\w]+/g, "-")
            .replace(/^-+|-+$/g, "");
        }
      });

      // Make external links open in new tab
      sunkenPanel.querySelectorAll("a").forEach((a) => {
        const href = a.getAttribute("href");
        if (href && /^https?:\/\//.test(href)) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
      });

      // Handle anchor links scrolling within the panel
      sunkenPanel.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (link) {
          const href = link.getAttribute("href");
          if (href && href.startsWith("#")) {
            e.preventDefault();
            const id = href.substring(1);
            const targetEl = sunkenPanel.querySelector(
              `[id="${id}"], [name="${id}"]`,
            );
            if (targetEl) {
              targetEl.scrollIntoView();
            }
          }
        }
      });
    }

    win.center();
    win.focus();
  }

  async checkVersion($status) {
    try {
      const response = await fetch(
        "https://api.github.com/repos/azayrahmad/win98-web/releases/latest",
      );
      if (!response.ok) throw new Error("Failed to fetch version info");
      const data = await response.json();

      // Extract version number (e.g., "0.5.0" from "v0.5.0" or "win98-web-v0.5.0")
      const versionMatch = data.tag_name.match(/(\d+\.\d+\.\d+)/);
      const latestVersion = versionMatch
        ? versionMatch[1]
        : data.tag_name.replace(/^v/, "");
      const currentVersion = import.meta.env.APP_VERSION;

      if (latestVersion === currentVersion) {
        $status.text("You are using the latest version.");
      } else {
        $status.html(`A new version is available: <b>${latestVersion}</b>`);
      }
    } catch (error) {
      console.error("Version check failed:", error);
      $status.text("Could not check for updates.");
    }
  }
}
