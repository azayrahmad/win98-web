import { Application } from '../../system/application.js';
import './quake.css';
import { ICONS } from '../../config/icons.js';

export class QuakeApp extends Application {
    static config = {
        id: 'quake',
        title: 'Quake',
        icon: ICONS.quake, category: "",
        width: 640,
        height: 480,
        resizable: true,
        isSingleton: true,
    };

    constructor(config) {
        super(config);
        this.win = null;
        this.iframe = null;
        this.monitorInterval = null;
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

        this.iframe = document.createElement('iframe');
        this.iframe.className = 'quake-iframe';
        this.iframe.src = 'https://www.netquake.io/quake';
        this.win.$content.append(this.iframe);

        this.win.on('close', () => {
            if (this.monitorInterval) {
                clearInterval(this.monitorInterval);
                this.monitorInterval = null;
            }
        });

        return this.win;
    }

    async _onLaunch() {
        // It can take a moment for the iframe's contentWindow to be available
        setTimeout(() => this.startMonitoring(), 1000);
    }

    startMonitoring() {
        this.monitorInterval = setInterval(() => {
            try {
                // Check if the iframe's location has changed
                if (this.iframe.contentWindow.location.href === 'https://www.netquake.io/') {
                    this.win.close(); // This will trigger the 'close' event and clear the interval
                }
            } catch (e) {
                // Cross-origin error, we can't access the location, but we can stop monitoring
                // as the user has likely navigated away.
                clearInterval(this.monitorInterval);
                this.monitorInterval = null;
            }
        }, 2000); // Check every 2 seconds
    }
}
