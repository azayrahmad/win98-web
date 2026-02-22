import { BaseProcess } from '../../system/base-process.js';
import { launchESheepApp, closeAllESheep, getESheepMenuItems } from './esheep.js';
import { ICONS } from '../../config/icons.js';

export class ESheepApp extends BaseProcess {
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

    constructor(config, services) {
        super(config, services);
    }

    _onLaunch() {
        launchESheepApp(this);
    }

    _cleanup() {
        closeAllESheep();
    }
}
