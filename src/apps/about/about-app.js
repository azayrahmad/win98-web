import { Application } from '../../system/application.js';
import { aboutContent } from './about.js';
import './about.css';
import { ICONS } from '../../config/icons.js';

export class AboutApp extends Application {
    static config = {
        id: "about",
        title: "About",
        description: "Displays information about this application.",
        summary: "<b>azOS Second Edition</b><br>Copyright © 2024",
        icon: ICONS.windowsUpdate,
        width: 400,
        height: 216,
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
            icons: this.icon,
        });

        win.$content.html(aboutContent);
        return win;
    }
}