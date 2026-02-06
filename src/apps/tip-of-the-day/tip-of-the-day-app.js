import { Application } from '../../system/application.js';
import { tipOfTheDayContent } from './tip-of-the-day.js';
import { apps } from '../../config/apps.js';
import { launchApp } from '../../system/app-manager.js';
import { getStartupApps, addStartupApp, removeStartupApp } from '../../system/startup-manager.js';
import { ICONS } from '../../config/icons.js';

export class TipOfTheDayApp extends Application {
    static config = {
        id: "tip-of-the-day",
        title: "Tip of the Day",
        description: "Provides useful tips about using the system.",
        icon: ICONS.tip,
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
        const win = new $Window({
            id: this.id,
            title: this.title,
            outerWidth: this.width,
            outerHeight: this.height,
            resizable: this.resizable,
            minimizeButton: this.minimizeButton,
            maximizeButton: this.maximizeButton,
            icons: this.icon,
        });

        win.$content.html(tipOfTheDayContent);
        return win;
    }

    async _onLaunch() {
        const tips = apps.reduce((acc, app) => {
            if (app.tips) {
                return acc.concat(app.tips);
            }
            return acc;
        }, []);

        const contentElement = this.win.$content[0];
        let currentTipIndex = Math.floor(Math.random() * tips.length);

        const tipTextElement = contentElement.querySelector('#tip-text');
        const nextTipButton = contentElement.querySelector('#next-tip');
        const closeButton = contentElement.querySelector('.button-group button:last-child');

        if (nextTipButton) {
            nextTipButton.innerHTML = '';
            nextTipButton.appendChild(window.AccessKeys.toFragment('&Next Tip'));
        }
        if (closeButton) {
            closeButton.innerHTML = '';
            closeButton.appendChild(window.AccessKeys.toFragment('&Close'));
            closeButton.addEventListener('click', () => this.win.close());
        }

        const displayTip = (tipIndex) => {
            if (tipTextElement) {
                tipTextElement.innerHTML = tips[tipIndex];
                const links = tipTextElement.querySelectorAll('.tip-link');
                links.forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const appId = link.getAttribute('data-app');
                        launchApp(appId);
                    });
                });
            }
        };

        displayTip(currentTipIndex);

        if (nextTipButton && tipTextElement) {
            nextTipButton.addEventListener('click', () => {
                currentTipIndex = (currentTipIndex + 1) % tips.length;
                displayTip(currentTipIndex);
            });
        }

        const showTipsCheckbox = contentElement.querySelector('#show-tips');
        if (showTipsCheckbox) {
            const startupApps = await getStartupApps();
            showTipsCheckbox.checked = startupApps.includes('tipOfTheDay');

            showTipsCheckbox.addEventListener('change', async () => {
                if (showTipsCheckbox.checked) {
                    await addStartupApp('tipOfTheDay');
                } else {
                    await removeStartupApp('tipOfTheDay');
                }
            });
        }
    }
}
