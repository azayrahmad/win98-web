import { activeDesktopManager } from "../../../utils/activeDesktopManager.js";
import { getWebUrl } from "../../../utils/urlUtils.js";

export const webTab = {
  init(win, app) {
    this.win = win;
    this.app = app;
    this.settings = { ...activeDesktopManager.settings };

    this.$content = win.$content.find("#web");
    this.$enableCheckbox = this.$content.find("#enable-active-desktop");
    this.$itemsList = this.$content.find("#web-items-list");
    this.$newButton = this.$content.find("#new-web-item");
    this.$deleteButton = this.$content.find("#delete-web-item");
    this.$propertiesButton = this.$content.find("#properties-web-item");
    this.$preview = this.$content.find(".active-desktop-preview");

    this.render();
    this.setupEvents();
  },

  render() {
    this.$enableCheckbox.prop("checked", this.settings.enabled);
    this.$itemsList.empty();
    this.$preview.empty();

    if (this.settings.enabled) {
        this.settings.items.forEach(item => {
            if (item.visible) {
                const $itemPreview = $('<div class="item-preview"></div>');
                $itemPreview.css({
                    position: 'absolute',
                    border: '1px solid #fff',
                    background: '#ccc',
                    // Scale down for preview (approx 152x112 preview area vs 800x600 screen)
                    left: (parseInt(item.x) * 0.19) + 'px',
                    top: (parseInt(item.y) * 0.19) + 'px',
                    width: (parseInt(item.width) * 0.19) + 'px',
                    height: (parseInt(item.height) * 0.19) + 'px',
                });
                if (item.x.includes('calc')) {
                    $itemPreview.css('left', '80%');
                }
                this.$preview.append($itemPreview);
            }
        });
    }

    this.settings.items.forEach((item) => {
      const $li = $(`
        <li>
            <input type="checkbox" id="item-${item.id}" ${item.visible ? "checked" : ""}>
            <label for="item-${item.id}">${item.url}</label>
        </li>
      `);

      $li.on("click", () => {
        this.$itemsList.find("li").removeClass("selected");
        $li.addClass("selected");
        this.$deleteButton.prop("disabled", false);
        this.$propertiesButton.prop("disabled", false);
      });

      $li.find("input").on("change", (e) => {
          item.visible = e.target.checked;
          this.app._enableApplyButton(this.win);
      });

      this.$itemsList.append($li);
    });
  },

  setupEvents() {
    this.$enableCheckbox.on("change", (e) => {
      this.settings.enabled = e.target.checked;
      this.app._enableApplyButton(this.win);
    });

    this.$newButton.on("click", () => {
      const $content = $("<div>");
      $content.text("Enter the URL of the Active Desktop item you want to add:");
      const $input = $('<input type="text" style="width: 100%; margin-top: 10px;">');
      $content.append($input);

      window.System.ShowDialogWindow({
        title: "New Active Desktop Item",
        content: $content[0],
        modal: true,
        buttons: [
          {
            label: "OK",
            isDefault: true,
            action: () => {
              const url = $input.val();
              if (url) {
                const newItem = {
                  id: `item-${Date.now()}`,
                  url: getWebUrl(url),
                  x: "50px",
                  y: "50px",
                  width: "400px",
                  height: "300px",
                  visible: true,
                  style: "ad",
                };
                this.settings.items.push(newItem);
                this.render();
                this.app._enableApplyButton(this.win);
              }
            },
          },
          {
            label: "Cancel",
            action: () => {},
          },
        ],
      });
    });

    this.$deleteButton.on("click", () => {
        const $selected = this.$itemsList.find("li.selected");
        if ($selected.length) {
            const index = $selected.index();
            this.settings.items.splice(index, 1);
            this.render();
            this.app._enableApplyButton(this.win);
            this.$deleteButton.prop("disabled", true);
            this.$propertiesButton.prop("disabled", true);
        }
    });
  },

  applyChanges(app) {
    activeDesktopManager.settings = JSON.parse(JSON.stringify(this.settings));
    activeDesktopManager.saveSettings();
    activeDesktopManager.render();
  },
};
