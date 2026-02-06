import { Application } from "../../system/application.js";
import { ShowComingSoonDialog } from "../../shared/components/dialog-window.js";
import { appManager } from "../../system/app-manager.js";
import "./taskmanager.css";
import { ICONS } from "../../config/icons.js";

export class TaskManagerApp extends Application {
  static config = {
    id: "task-manager",
    title: "Task Manager",
    description: "Manage running applications.",
    icon: ICONS.windows,
    width: 300,
    height: 400,
    resizable: false,
    isSingleton: true,
  };

  async _onLaunch() {
    this.win.element.style.zIndex = $Window.Z_INDEX++; // Bring to front on launch
    this._updateTaskList();
    this._setupEventDelegation();

    // Custom event listener for app changes
    document.addEventListener("app-launched", () => this._updateTaskList());
    document.addEventListener("app-closed", () => this._updateTaskList());
  }

  _updateTaskList() {
    const taskList = this.win.$content.find(".task-list");
    const selectedAppId = this.win.$content
      .find(".task-list tr.highlighted")
      .data("instanceKey");
    const tableBody = $("<tbody></tbody>");

    const runningApps = appManager.getRunningApps();

    for (const [instanceKey, appInstance] of Object.entries(runningApps)) {
      if (appInstance.id === "task-manager") continue;

      const appConfig = appManager.getAppConfig(appInstance.id);
      const title = appInstance.win ? appInstance.win.title() : appConfig.title;

      const tableRow = $(`<tr><td>${title}</td></tr>`);
      tableRow.data("instanceKey", instanceKey);
      if (selectedAppId && instanceKey === selectedAppId) {
        tableRow.addClass("highlighted");
      }
      tableBody.append(tableRow);
    }

    taskList.empty().append(tableBody);

    const isItemSelected = taskList.find("tr.highlighted").length > 0;
    this.win.$content.find(".end-task-btn").prop("disabled", !isItemSelected);
    this.win.$content.find(".switch-to-btn").prop("disabled", !isItemSelected);
  }

  _setupEventDelegation() {
    const content = this.win.$content;

    // Table row selection
    content.on("click", ".task-list tr", (e) => {
      const selectedItem = $(e.currentTarget);
      content.find(".task-list tr").removeClass("highlighted");
      selectedItem.addClass("highlighted");
      content.find(".end-task-btn").prop("disabled", false);
      content.find(".switch-to-btn").prop("disabled", false);
    });

    // Button actions
    content.on("click", ".end-task-btn", () => {
      const selectedItem = content.find(".task-list tr.highlighted");
      if (selectedItem.length) {
        const instanceKey = selectedItem.data("instanceKey");
        appManager.closeApp(instanceKey);
      }
    });

    content.on("click", ".switch-to-btn", () => {
      ShowComingSoonDialog("Switch To");
    });

    content.on("click", ".new-task-btn", () => {
      ShowComingSoonDialog("Create New Task");
    });
  }

  _createWindow() {
    const win = new $Window({
      title: "Close Program",
      icons: this.icon,
      width: 300,
      height: 400,
      resizable: false,
      minimizeButton: false,
      maximizeButton: false,
      id: "task-manager",
    });

    const content = `
            <div class="task-manager-content">
                <div class="task-list-container inset-deep">
                    <table class="task-list"></table>
                </div>

                <div>
                    <p>WARNING: Pressing CTRL+ALT+DEL again will restart your computer. You will lose unsaved information in all programs that are running.</p>
                </div>
                <div class="button-bar">
                    <button class="end-task-btn" disabled>End Task</button>
                    <button class="switch-to-btn" disabled>Switch To</button>
                    <button class="new-task-btn">New Task...</button>
                </div>
            </div>
        `;

    win.$content.html(content);
    this.win = win; // Store reference to window instance
    return win;
  }
}
