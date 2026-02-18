import { appManager } from '../../system/app-manager.js';

let sheepInstances = [];
let eSheepAppInstance = null;
let observer = null;

function makeDraggable(sheep) {
    let offset = { top: 0, left: 0 };
    let targetX = 0;
    let targetY = 0;
    let dragUpdateLoop = null;

    const el = sheep.DOMsheep;

    function getEventCoords(e) {
        const originalEvent = e.originalEvent || e;
        const touch = originalEvent.touches && originalEvent.touches[0];
        return touch || e;
    }

    function calculateClickOffset(e) {
        const coords = getEventCoords(e);
        const o = el.offset();
        return {
            top: coords.pageY - o.top,
            left: coords.pageX - o.left,
        };
    }

    function updateLocation() {
        el.css({ top: targetY, left: targetX });
        dragUpdateLoop = window.requestAnimationFrame(updateLocation);
    }

    function dragMove(e) {
        e.preventDefault();
        const coords = getEventCoords(e);
        targetX = coords.pageX - offset.left;
        targetY = coords.pageY - offset.top;
    }

    function finishDrag() {
        window.cancelAnimationFrame(dragUpdateLoop);
        $(window).off("touchmove", dragMove);
        $(window).off("touchend", finishDrag);
        if (sheep.Resume) sheep.Resume();
    }

    function startDrag(e) {
        if (sheep.Pause) sheep.Pause();
        offset = calculateClickOffset(e);

        $(window).on("touchmove", dragMove);
        $(window).on("touchend", finishDrag);

        dragUpdateLoop = window.setTimeout(updateLocation, 10);
    }

    el.on("touchstart", (e) => {
        e.preventDefault();
        startDrag(e);
    });
}

function setupObserver() {
    if (observer) return;

    observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1 && node.classList.contains('esheep')) {
                    const sheepInstance = sheepInstances.find(s => s.DOMsheep[0] === node);
                    if (sheepInstance) {
                        makeDraggable(sheepInstance);
                    }
                }
            });
        });
    });

    const desktop = document.getElementById('screen');
    observer.observe(desktop, { childList: true, subtree: true });
}

export function closeAllESheep() {
  sheepInstances.forEach((sheep) => sheep.remove());
  sheepInstances = [];
  const trayIcon = document.querySelector("#tray-icon-esheep");
  if (trayIcon) {
    trayIcon.remove();
  }
  if (observer) {
    observer.disconnect();
    observer = null;
  }
}

export function getESheepMenuItems(app) {
  return [
    {
      label: "Add another sheep",
      action: () => {
        const newSheep = new window.eSheep();
        newSheep.Start();
        sheepInstances.push(newSheep);
      },
    },
    "MENU_DIVIDER",
    {
      label: "Close",
      action: () => {
        if (eSheepAppInstance) {
          appManager.closeApp(eSheepAppInstance.id);
        }
      },
    },
  ];
}

export function showESheepContextMenu(event, app) {
  const menuItems = getESheepMenuItems(app);
  new window.ContextMenu(menuItems, event);
}

export function launchESheepApp(app) {
  if (app) {
    eSheepAppInstance = app;
  }

  setupObserver();

  if (sheepInstances.length === 0) {
    const firstSheep = new window.eSheep();
    firstSheep.Start();
    sheepInstances.push(firstSheep);
  } else {
    const newSheep = new window.eSheep();
    newSheep.Start();
    sheepInstances.push(newSheep);
  }
}
