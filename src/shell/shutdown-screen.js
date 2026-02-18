import shuttingdown from '../assets/img/shuttingdown.png';
import shutdown from '../assets/img/shutdown.png';

function showShutdownScreen(isRestart = false) {
    const screen = document.getElementById('screen');
    if (screen) {
        screen.style.display = 'none';
    }

    const overlay = document.createElement('div');
    overlay.id = 'shutdown-overlay';

    const image = document.createElement('img');
    image.src = shuttingdown;
    overlay.appendChild(image);

    document.body.appendChild(overlay);

    if (!isRestart) {
        setTimeout(() => {
            image.src = shutdown;
        }, 1000);
    }
}

export { showShutdownScreen };
