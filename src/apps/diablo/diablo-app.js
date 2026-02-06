import { Application } from '../../system/application.js';
import './diablo.css';
import { ICONS } from '../../config/icons.js';

export class DiabloApp extends Application {
    static config = {
        id: "diablo",
        title: "Diablo",
        description: "Play the classic game Diablo.",
        icon: ICONS.diablo,
        width: 800,
        height: 600,
        resizable: true,
        isSingleton: true,
    };

    constructor(config) {
        super(config);
        this.win = null;
    }

    _createWindow() {
        this.win = new $Window({
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            icons: this.icon,
            id: this.id,
        });

        const iframe = document.createElement('iframe');
        iframe.className = 'diablo-iframe';
        iframe.src = 'https://d07riv.github.io/diabloweb/';

        this.win.$content.append(iframe);

        return this.win;
    }
}
