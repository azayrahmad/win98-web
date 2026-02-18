function createMainUI() {
  const appContainer = document.createElement("main");
  appContainer.id = "app-container";
  appContainer.className = "app-container";

  const desktopArea = document.createElement("section");
  desktopArea.id = "desktop-area";
  desktopArea.className = "desktop-area";
  desktopArea.setAttribute("aria-label", "Desktop");

  const desktop = document.createElement("ul");
  desktop.className = "desktop";

  desktopArea.appendChild(desktop);
  appContainer.appendChild(desktopArea);

  const taskbar = document.createElement("footer");
  taskbar.className = "taskbar";
  taskbar.setAttribute("aria-label", "Taskbar");

  const screen = document.getElementById("screen");
  screen.appendChild(appContainer);
  screen.appendChild(taskbar);
}

export { createMainUI };
