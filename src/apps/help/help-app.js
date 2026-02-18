import { Application } from '../../system/application.js';
import "./help.css";
import contentHtml from "./help.html?raw";
import { ICONS } from '../../config/icons.js';
import helpData from "../../config/help.json";

class HelpApp extends Application {
  static config = {
    id: "help",
    title: "Help Topics",
    description: "Provides help and support.",
    icon: ICONS.help,
    width: 600,
    height: 450,
    resizable: true,
    isSingleton: false,
  };

  constructor(data) {
    super(data);
    this.history = [];
    this.historyIndex = -1;
    this.currentHelpData = null;
    this.rootPath = "";
  }

  _createWindow() {
    return new window.$Window({
      title: this.title,
      outerWidth: this.width,
      outerHeight: this.height,
      resizable: this.resizable,
      icons: this.icon,
      id: this.id,
      className: "help-window"
    });
  }

  async _onLaunch(data) {
    const { win } = this;
    win.$content.html(contentHtml);

    if (typeof data === "string") {
      if (data.endsWith(".hhc")) {
          // It's an HHC file path
          const response = await fetch(data);
          const hhcText = await response.text();
          this.rootPath = data.substring(0, data.lastIndexOf("/"));
          this.currentHelpData = {
              title: data.split('/').pop().replace('.hhc', '').replace('ms', '') + ' Help',
              topics: this.parseHHC(hhcText)
          };
          if (this.currentHelpData.title.toLowerCase().startsWith('paint')) {
              this.currentHelpData.title = "Paint Help";
          }

          // Try to load HHK (index)
          const hhkPath = data.replace(".hhc", ".hhk");
          try {
              const hhkResponse = await fetch(hhkPath);
              if (hhkResponse.ok) {
                  const hhkText = await hhkResponse.text();
                  this.currentHelpData.index = this.parseHHK(hhkText);
              }
          } catch (e) {
              console.warn("Failed to load HHK file", hhkPath);
          }
      } else {
          // Legacy JSON path support (or other strings)
          // For now, assume it might be a JSON if not .hhc
          try {
              const response = await fetch(data);
              this.currentHelpData = await response.json();
          } catch (e) {
              console.error("Failed to load help data from string", data, e);
          }
      }
    } else if (typeof data === "object" && data !== null) {
      if (data.hhc || data.hhk) {
        this.rootPath = data.baseUrl || "";
        this.currentHelpData = {
          title: data.title || (data.hhc ? "Help" : "Help Topics"),
          topics: data.hhc ? this.parseHHC(data.hhc) : [],
          index: data.hhk ? this.parseHHK(data.hhk) : []
        };
      } else {
        this.currentHelpData = data;
      }
    }

    if (!this.currentHelpData) {
        this.currentHelpData = helpData;
    }

    if (this.currentHelpData.title) {
      win.title(this.currentHelpData.title);
    }

    this._setupToolbar(win);
    this._setupResizer(win);
    this._setupTabs(win);
    this._renderContents();
    this._renderIndex();
    this._setupSearch();

    // Show default topic - find the first one with a file
    const findFirstTopicWithFile = (topics) => {
      for (const topic of topics) {
        if (topic.file) return topic;
        if (topic.children && topic.children.length > 0) {
          const found = findFirstTopicWithFile(topic.children);
          if (found) return found;
        }
      }
      return null;
    };
    const defaultTopic = findFirstTopicWithFile(this.currentHelpData.topics || []) || { title: "Welcome", file: "default.html" };
    this._showTopic(defaultTopic);
  }

  parseHHC(hhcText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(hhcText, "text/html");

    const parseUl = (ul) => {
      const items = [];
      const children = Array.from(ul.children);

      for (let i = 0; i < children.length; i++) {
        const el = children[i];
        if (el.tagName !== "LI") continue;

        const params = {};
        const obj = el.querySelector("object");
        if (obj) {
            for (const param of obj.querySelectorAll("param")) {
                const name = param.getAttribute("name");
                const value = param.getAttribute("value");
                if (name) params[name] = value;
            }
        }

        if (!params.Name) continue;

        const item = {
          title: params.Name.trim(),
          file: params.Local,
          children: []
        };

        // Children UL might be inside LI or as a sibling of LI
        let childUl = el.querySelector("ul");
        if (!childUl && i + 1 < children.length && children[i+1].tagName === "UL") {
            childUl = children[i+1];
        }

        if (childUl) {
          item.children = parseUl(childUl);
        }
        items.push(item);
      }
      return items;
    };

    const rootUl = doc.querySelector("ul");
    return rootUl ? parseUl(rootUl) : [];
  }

  parseHHK(hhkText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(hhkText, "text/html");
    const items = [];
    // HHK files can be just a list of OBJECTs without LIs
    const objects = doc.querySelectorAll("object[type='text/sitemap'], object[type='Text/sitemap']");
    for (const obj of objects) {
        const params = [];
        for (const param of obj.querySelectorAll("param")) {
            params.push({ name: param.getAttribute("name"), value: param.getAttribute("value") });
        }
        const nameParams = params.filter(p => p.name === "Name");
        const localParams = params.filter(p => p.name === "Local");
        if (nameParams.length > 0) {
            items.push({
                title: nameParams[0].value,
                file: localParams.length > 0 ? localParams[0].value : null
            });
        }
    }
    return items.sort((a, b) => a.title.localeCompare(b.title));
  }

  _renderContents() {
    const container = this.win.$content.find("#contents");
    container.empty();
    if (!this.currentHelpData.topics) return;
    const ul = document.createElement("ul");
    ul.className = "tree-view";

    this.currentHelpData.topics.forEach(topic => {
      ul.appendChild(this._createTreeNode(topic));
    });

    container.append(ul);
  }

  _renderIndex() {
    const container = this.win.$content.find("#index-list");
    container.empty();
    if (!this.currentHelpData.index) return;

    this.currentHelpData.index.forEach(item => {
        const li = document.createElement("li");
        li.textContent = item.title;
        li.addEventListener("click", () => {
            this.win.$content.find("#index-list li").removeClass("selected");
            $(li).addClass("selected");
            this._showTopic(item, true);
        });
        container.append(li);
    });

    const input = this.win.$content.find("#index-input");
    input.on("input", () => {
        const query = input.val().toLowerCase();
        container.find("li").each((i, li) => {
            const text = $(li).text().toLowerCase();
            $(li).toggle(text.includes(query));
        });
    });
  }

  _setupSearch() {
    const input = this.win.$content.find("#search-input");
    const button = this.win.$content.find("#list-topics-button");
    const results = this.win.$content.find("#search-results");

    const allTopics = [];
    const flatten = (topics) => {
        topics.forEach(t => {
            if (t.file) allTopics.push(t);
            if (t.children) flatten(t.children);
        });
    };
    if (this.currentHelpData.topics) flatten(this.currentHelpData.topics);
    if (this.currentHelpData.index) {
        this.currentHelpData.index.forEach(item => {
            if (item.file) {
                // Check if already in allTopics
                if (!allTopics.some(t => t.file === item.file)) {
                    allTopics.push(item);
                }
            }
        });
    }

    const performSearch = () => {
        const query = input.val().toLowerCase();
        results.empty();
        if (!query) return;

        const filtered = allTopics.filter(t => t.title.toLowerCase().includes(query));
        filtered.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item.title;
            li.addEventListener("click", () => {
                results.find("li").removeClass("selected");
                $(li).addClass("selected");
                this._showTopic(item, true);
            });
            results.append(li);
        });
    };

    button.on("click", performSearch);
    input.on("keypress", (e) => {
        if (e.which === 13) performSearch();
    });
  }

  _createTreeNode(topic) {
    const li = document.createElement("li");
    li.className = "tree-node";

    const item = document.createElement("div");
    item.className = "item";
    item.textContent = topic.title;
    li.appendChild(item);

    if (topic.children && topic.children.length > 0) {
      li.classList.add("folder");
      const childUl = document.createElement("ul");
      topic.children.forEach(child => {
        childUl.appendChild(this._createTreeNode(child));
      });
      li.appendChild(childUl);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        li.classList.toggle("expanded");
        this._selectItem(item, topic);
      });
    } else {
      li.classList.add("page");
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this._selectItem(item, topic);
      });
    }

    return li;
  }

  _selectItem(itemElement, topic) {
    this.win.$content.find(".item").removeClass("selected");
    $(itemElement).addClass("selected");
    if (topic.file) {
        this._showTopic(topic, true);
    }
  }

  _joinPaths(base, path) {
    if (!base) return path;
    if (!path) return base;
    const baseHasSlash = base.endsWith("/");
    const pathHasSlash = path.startsWith("/");
    if (baseHasSlash && pathHasSlash) {
      return base + path.substring(1);
    } else if (!baseHasSlash && !pathHasSlash) {
      return base + "/" + path;
    } else {
      return base + path;
    }
  }

  async _showTopic(topic, addToHistory = false) {
    const contentPanel = this.win.$content.find(".content-panel");
    let url = topic.file;
    if (url && !url.startsWith("http") && !url.startsWith("/")) {
        url = this.rootPath ? this._joinPaths(this.rootPath, url) : this._joinPaths(import.meta.env.BASE_URL, url);
    }

    if (url) {
        let iframe = contentPanel.find("iframe")[0];
        if (!iframe) {
            iframe = document.createElement("iframe");
            contentPanel.empty().append(iframe);
        }
        iframe.src = url;

        if (addToHistory) {
            if (this.historyIndex < this.history.length - 1) {
                this.history = this.history.slice(0, this.historyIndex + 1);
            }
            this.history.push(url);
            this.historyIndex = this.history.length - 1;
            this._updateHistoryButtons();
        }
    }
  }

  _updateHistoryButtons() {
    const backButton = this.win.$content.find(".back-button")[0];
    const forwardButton = this.win.$content.find(".forward-button")[0];
    backButton.disabled = this.historyIndex <= 0;
    forwardButton.disabled = this.historyIndex >= this.history.length - 1;
  }

  _setupToolbar(win) {
    const hideButton = win.$content.find(".hide-button")[0];
    const showButton = win.$content.find(".show-button")[0];
    const backButton = win.$content.find(".back-button")[0];
    const forwardButton = win.$content.find(".forward-button")[0];
    const optionsButton = win.$content.find(".options-button")[0];
    const webHelpButton = win.$content.find(".web-help-button")[0];
    const sidebar = win.$content.find(".sidebar")[0];
    const resizer = win.$content.find(".resizer")[0];

    hideButton.addEventListener("click", () => {
        const sidebarWidth = sidebar.offsetWidth + resizer.offsetWidth;
        sidebar.style.display = "none";
        resizer.style.display = "none";
        hideButton.style.display = "none";
        showButton.style.display = "flex";

        // Adjust window
        const currentWidth = win.width();
        win.width(currentWidth - sidebarWidth);
        win.css("left", win.offset().left + sidebarWidth);
    });

    showButton.addEventListener("click", () => {
        sidebar.style.display = "flex";
        resizer.style.display = "block";
        showButton.style.display = "none";
        hideButton.style.display = "flex";

        const sidebarWidth = sidebar.offsetWidth + resizer.offsetWidth;
        const currentWidth = win.width();
        win.width(currentWidth + sidebarWidth);
        win.css("left", Math.max(0, win.offset().left - sidebarWidth));
    });

    backButton.addEventListener("click", () => {
        const iframe = win.$content.find("iframe")[0];
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.history.back();
            // We'd need to listen to iframe load to update historyIndex if we want it perfect
        }
    });

    forwardButton.addEventListener("click", () => {
        const iframe = win.$content.find("iframe")[0];
        if (iframe && iframe.contentWindow) {
            iframe.contentWindow.history.forward();
        }
    });

    optionsButton.addEventListener("click", (e) => {
        const menu = [
            {
                item: "Print...",
                action: () => {
                    const iframe = win.$content.find("iframe")[0];
                    if (iframe && iframe.contentWindow) iframe.contentWindow.print();
                }
            },
            {
                item: "Refresh",
                action: () => {
                    const iframe = win.$content.find("iframe")[0];
                    if (iframe && iframe.contentWindow) iframe.contentWindow.location.reload();
                }
            },
            {
                item: "Back",
                enabled: () => this.historyIndex > 0,
                action: () => backButton.click()
            },
            {
                item: "Forward",
                enabled: () => this.historyIndex < this.history.length - 1,
                action: () => forwardButton.click()
            }
        ];
        window.ContextMenu(menu, {
            left: e.clientX,
            top: e.clientY
        });
    });

    webHelpButton.addEventListener("click", () => {
        this._showTopic({ file: "online_support.htm" }, true);
    });

    // Update buttons on iframe load
    win.$content.on("load", "iframe", () => {
        // This is tricky because cross-origin iframes won't let us see history
        // But for internal help files it might work.
        this._updateHistoryButtons();
    });
  }

  _setupResizer(win) {
    const resizer = win.$content.find(".resizer")[0];
    const sidebar = win.$content.find(".sidebar")[0];

    let isDragging = false;

    resizer.addEventListener("mousedown", (e) => {
      isDragging = true;
      document.body.style.cursor = "ew-resize";
      // Add overlay to iframe to prevent losing mouse events
      win.$content.find(".content-panel").css("pointer-events", "none");
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const rect = win.$content[0].getBoundingClientRect();
      const x = e.clientX - rect.left;
      const sidebarWidth = Math.max(50, Math.min(x, rect.width - 50));
      sidebar.style.flexBasis = `${sidebarWidth}px`;
      sidebar.style.width = `${sidebarWidth}px`; // Ensure it stays this width
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = "";
        win.$content.find(".content-panel").css("pointer-events", "");
      }
    });
  }

  _setupTabs(win) {
    const $tabs = win.$content.find('[role="tab"]');
    $tabs.on("click", (e) => {
      e.preventDefault();
      const $clickedTab = $(e.currentTarget);
      const targetId = $clickedTab.find("a").attr("data-target");

      $tabs.attr("aria-selected", "false");
      $clickedTab.attr("aria-selected", "true");

      win.$content.find(".tab-content").hide();
      win.$content.find(targetId).css("display", "flex");
    });
  }
}

export default HelpApp;
