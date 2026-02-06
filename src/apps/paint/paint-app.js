import { Application } from '../../system/application.js';
import { ICONS } from '../../config/icons.js';

export class PaintApp extends Application {
    static config = {
        id: "paint",
        title: "Paint",
        description: "Create and edit images.",
        icon: ICONS.paint,
        width: 800,
        height: 600,
        resizable: true,
        isSingleton: false,
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
            icons: this.icon,
        });

        const iframe = document.createElement('iframe');
        iframe.src = 'https://jspaint.app';
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';

        win.$content.append(iframe);

        return win;
    }

    _onLaunch() {
        this.win.focus();
    }
}
