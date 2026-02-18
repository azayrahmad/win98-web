import { Application } from '../../system/application.js';
import { launchESheepApp, closeAllESheep, getESheepMenuItems } from './esheep.js';
import { ICONS } from '../../config/icons.js';

export class ESheepApp extends Application {
    static config = {
        id: "esheep",
        title: "eSheep",
        description: "A classic desktop pet.",
        icon: ICONS.esheep, category: "",
        hasTray: true,
        isSingleton: true,
        tray: {
            contextMenu: getESheepMenuItems,
        },
    };

    constructor(config) {
        super(config);
    }

    _createWindow() {
        // This app doesn't create a window.
        return null;
    }

    _onLaunch() {
        launchESheepApp(this);
    }

    _cleanup() {
        closeAllESheep();
    }
}
