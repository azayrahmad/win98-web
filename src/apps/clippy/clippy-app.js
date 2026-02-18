import { Application, openApps } from '../../system/application.js';
import { launchClippyApp, getClippyMenuItems } from './clippy.js';
import { appManager } from '../../system/app-manager.js';
import { ICONS } from '../../config/icons.js';

export class ClippyApp extends Application {
    static config = {
        id: "clippy",
        title: "Assistant",
        description: "Your friendly assistant.",
        icon: ICONS.clippy, category: "Accessories",
        hasTray: true,
        isSingleton: true,
        tray: {
          contextMenu: getClippyMenuItems,
        },
        tips: [
          "Need help? Try the <a href='#' class='tip-link' data-app='clippy'>Assistant</a> for assistance with azOS features.",
          "You can ask Clippy about Aziz's resume by clicking on it.",
          "Right-click on Clippy to see more options, like changing the agent or making it animate.",
        ],
    };

    constructor(config) {
        super(config);
    }

    _createWindow() {
        // This app doesn't create a window.
        return null;
    }

    _onLaunch() {
        // Call the legacy launch function.
        launchClippyApp(this);
    }

    _cleanup() {
        const agent = window.clippyAgent;
        if (agent) {
            agent.hide();
            $(".clippy, .clippy-balloon").remove();
            $(".os-menu").remove();
            const trayIcon = document.querySelector("#tray-icon-clippy");
            if (trayIcon) {
                trayIcon.remove();
            }
            window.clippyAgent = null;
        }
    }
}
