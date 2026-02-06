function createMainUI() {
  const appContainer = document.createElement('div');
  appContainer.id = 'app-container';
  appContainer.className = 'app-container';

  const desktopArea = document.createElement('div');
  desktopArea.id = 'desktop-area';
  desktopArea.className = 'desktop-area';

  const desktop = document.createElement('div');
  desktop.className = 'desktop';

  desktopArea.appendChild(desktop);
  appContainer.appendChild(desktopArea);

  const taskbar = document.createElement('div');
  taskbar.className = 'taskbar';

  const screen = document.getElementById('screen');
  screen.appendChild(appContainer);
  screen.appendChild(taskbar);
}

export { createMainUI };
