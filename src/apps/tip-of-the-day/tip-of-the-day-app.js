import { Application } from '../../system/application.js';
import { tipOfTheDayContent } from './tip-of-the-day.js';
import { apps } from '../../config/apps.js';
import { launchApp, appManager } from '../../system/app-manager.js';
import { getStartupApps, addStartupApp, removeStartupApp } from '../../system/startup-manager.js';
import { ICONS } from '../../config/icons.js';

export class TipOfTheDayApp extends Application {
    static config = {
        id: "tip-of-the-day",
        title: "Tip of the Day",
        description: "Provides useful tips about using the system.",
        icon: ICONS.tip, category: "",
        width: 400,
        height: 300,
        resizable: false,
        minimizeButton: false,
        maximizeButton: false,
        isSingleton: true,
        tips: [
            "To open a file or an application from desktop, double-click the icon.",
            "To close a window, click the X in the top-right corner.",
        ],
    };

    constructor(config) {
        super(config);
    }

    _createWindow() {
        return null;
    }

    async _onLaunch() {
        // Delegate to the Assistant (Clippy) to show a tip
        await launchApp("clippy", { showTip: true });

        // Close this proxy app
        appManager.closeApp(this.instanceKey);
    }
}
