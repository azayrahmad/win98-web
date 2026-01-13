let lastCursorElement = null;

function hideBootScreen() {
    const bootScreenEl = document.getElementById("boot-screen");
    if (bootScreenEl) {
        const contentEl = document.getElementById("boot-screen-content");
        if (contentEl) {
            contentEl.style.visibility = "hidden";
        }
        bootScreenEl.classList.add("fade-out");
        setTimeout(() => {
            bootScreenEl.remove();
        }, 500);
    }
}

function startBootProcessStep(message) {
    const bootLogEl = document.getElementById("boot-log");
    if (bootLogEl) {
        const logEntry = document.createElement("div");
        logEntry.textContent = message;

        const cursor = document.createElement("span");
        cursor.className = "blinking-cursor";
        cursor.textContent = "_";
        logEntry.appendChild(cursor);

        bootLogEl.appendChild(logEntry);
        return logEntry;
    }
    return null;
}

function finalizeBootProcessStep(logElement, status) {
    if (logElement) {
        const cursor = logElement.querySelector(".blinking-cursor");
        if (cursor) {
            cursor.remove();
        }
        logElement.textContent += ` ${status}`;
    }
}

function showBlinkingCursor() {
    const bootLogEl = document.getElementById("boot-log");
    if (bootLogEl) {
        if (lastCursorElement) {
            lastCursorElement.remove();
        }
        const cursorEntry = document.createElement("div");
        const cursor = document.createElement("span");
        cursor.className = "blinking-cursor";
        cursor.textContent = "_";
        cursorEntry.appendChild(cursor);
        bootLogEl.appendChild(cursorEntry);
        lastCursorElement = cursorEntry;
    }
}

function removeLastBlinkingCursor() {
    if (lastCursorElement) {
        lastCursorElement.remove();
        lastCursorElement = null;
    }
}

function promptToContinue() {
    return new Promise((resolve) => {
        removeLastBlinkingCursor();
        const bootLogEl = document.getElementById("boot-log");
        if (bootLogEl) {
            const promptEl = document.createElement("div");
            let countdown = 10;
            promptEl.textContent = `Press any key to continue... ${countdown}`;
            bootLogEl.appendChild(promptEl);

            const timer = setInterval(() => {
                countdown--;
                promptEl.textContent = `Press any key to continue... ${countdown}`;
                if (countdown <= 0) {
                    clearInterval(timer);
                    window.removeEventListener("keydown", continueHandler);
                    window.removeEventListener("touchstart", continueHandler);
                    resolve();
                }
            }, 1000);

            const continueHandler = () => {
                clearInterval(timer);
                window.removeEventListener("keydown", continueHandler);
                window.removeEventListener("touchstart", continueHandler);
                resolve();
            };

            window.addEventListener("keydown", continueHandler, { once: true });
            window.addEventListener("touchstart", continueHandler, { once: true });
        } else {
            resolve();
        }
    });
}

function showSetupScreen() {
    const bootLogEl = document.getElementById("boot-log");
    const biosInfoRow = document.getElementById("bios-info-row");
    const rightColumn = document.getElementById("boot-screen-right-column");
    const footer = document.getElementById("boot-screen-footer");

    if (bootLogEl) bootLogEl.innerHTML = "";
    if (biosInfoRow) biosInfoRow.style.display = "none";
    if (rightColumn) rightColumn.style.display = "none";
    if (footer) footer.style.display = "none";

    const menuItems = ["1. Format hard drive", "2. Return"];
    let selectedIndex = 0;

    const renderMenu = () => {
        bootLogEl.innerHTML = "";
        menuItems.forEach((item, index) => {
            const menuItemEl = document.createElement("div");
            menuItemEl.textContent = item;
            if (index === selectedIndex) {
                menuItemEl.style.backgroundColor = "#aaaaaa";
                menuItemEl.style.color = "black";
            }
            bootLogEl.appendChild(menuItemEl);
        });

        const promptEl = document.createElement("div");
        promptEl.textContent = "Enter your choice: ";
        const cursor = document.createElement("span");
        cursor.className = "blinking-cursor";
        cursor.textContent = "_";
        promptEl.appendChild(cursor);
        bootLogEl.appendChild(promptEl);
    };

    const handleKeyDown = (e) => {
        switch (e.key) {
            case "ArrowUp":
                selectedIndex =
                    (selectedIndex - 1 + menuItems.length) % menuItems.length;
                renderMenu();
                break;
            case "ArrowDown":
                selectedIndex = (selectedIndex + 1) % menuItems.length;
                renderMenu();
                break;
            case "1":
                selectedIndex = 0;
                renderMenu();
                break;
            case "2":
                selectedIndex = 1;
                renderMenu();
                break;
            case "Enter":
                window.removeEventListener("keydown", handleKeyDown);
                handleMenuAction();
                break;
        }
    };

    const handleMenuAction = () => {
        if (selectedIndex === 0) {
            // Format hard drive
            const confirmationEl = document.createElement("div");
            confirmationEl.textContent = "Are you sure? (Y/n) ";
            const cursor = document.createElement("span");
            cursor.className = "blinking-cursor";
            cursor.textContent = "_";
            confirmationEl.appendChild(cursor);
            bootLogEl.appendChild(confirmationEl);

            const confirmationHandler = (e) => {
                // Ignore modifier keys so user can press Shift + y
                if (["Shift", "Control", "Alt", "Meta"].includes(e.key)) {
                    return;
                }

                window.removeEventListener("keydown", confirmationHandler);
                if (e.key.toLowerCase() === "y") {
                    localStorage.clear();
                    window.location.reload();
                } else {
                    // Cancellation: Re-render the menu and re-attach the main listener
                    renderMenu();
                    window.addEventListener("keydown", handleKeyDown);
                }
            };
            window.addEventListener("keydown", confirmationHandler);
        } else {
            // Return
            window.location.reload();
        }
    };

    window.addEventListener("keydown", handleKeyDown);
    renderMenu();
}

export {
    hideBootScreen,
    startBootProcessStep,
    finalizeBootProcessStep,
    showBlinkingCursor,
    promptToContinue,
    removeLastBlinkingCursor,
    showSetupScreen,
};
