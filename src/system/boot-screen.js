import { Terminal } from "@xterm/xterm";
import { ImageAddon } from "@xterm/addon-image";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { runSetupTUI } from "./setup-utility.js";

let terminal = null;
let setupMode = false;
let awardLogo = null;
let energyStarLogo = null;

async function getBase64Image(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    const size = blob.size;
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({
            base64: reader.result.split(",")[1],
            size: size
        });
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function preloadLogos() {
    if (awardLogo && energyStarLogo) return;
    const BASE_URL = import.meta.env.BASE_URL || "/";
    const awardUrl = `${BASE_URL}img/award.png`.replace(/\/+/g, "/");
    const energyStarUrl = `${BASE_URL}img/energystar.png`.replace(/\/+/g, "/");
    try {
        [awardLogo, energyStarLogo] = await Promise.all([
            getBase64Image(awardUrl),
            getBase64Image(energyStarUrl),
        ]);
    } catch (e) {
        console.error("Failed to preload boot logos", e);
    }
}

function drawBIOSHeader() {
    if (!terminal) return;
    const cols = terminal.cols;

    // Award Logo at (1,1)
    if (awardLogo) {
        terminal.write(`\x1b[1;1H\x1b]1337;File=inline=1;size=${awardLogo.size}:${awardLogo.base64}\x07`);
    }

    // BIOS Text next to Award Logo
    terminal.write("\x1b[1;5HAward Modular BIOS v4.51PG, An Energy Star Ally");
    terminal.write("\x1b[2;5HCopyright (C) 1984-85, Award Software, Inc.");

    // Energy Star Logo at top right
    // Terminal is cols wide. Energy Star is 135px wide.
    // Assuming ~8px per cell, it's ~17 columns.
    const energyStarCols = 17;
    if (energyStarLogo && cols >= energyStarCols + 46) {
        terminal.write(`\x1b[1;${cols - energyStarCols + 1}H\x1b]1337;File=inline=1;size=${energyStarLogo.size}:${energyStarLogo.base64}\x07`);
    }
}

function drawBIOSFooter() {
    if (!terminal) return;
    // Standard boot footer at the last row
    terminal.write(`\x1b[${terminal.rows};1H\x1b[0mPress F8 for Startup Menu.`);
}

export async function prepareBootScreen() {
    const term = initTerminal();
    if (!term) return;

    await preloadLogos();
    term.write("\x1b[2J\x1b[H"); // Clear screen and home
    drawBIOSHeader();
    drawBIOSFooter();

    // Set scrolling region for the log: Rows 7 to last-1
    term.write(`\x1b[7;${term.rows - 1}r`);
    // Move cursor to the start of the log area
    term.write("\x1b[7;1H");
}

function initTerminal() {
    if (terminal) return terminal;

    const container = document.getElementById("boot-terminal");
    if (!container) return null;

    terminal = new Terminal({
        cursorStyle: "underline",
        cursorBlink: true,
        theme: {
            background: "black",
            foreground: "#aaaaaa", // Standard BIOS gray
        },
        fontFamily: '"IBM BIOS", Courier, monospace',
        fontSize: 13,
        allowTransparency: true,
    });

    const imageAddon = new ImageAddon();
    terminal.loadAddon(imageAddon);

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);

    terminal.open(container);
    fitAddon.fit();

    window.addEventListener("resize", () => {
        if (terminal) {
            fitAddon.fit();
        }
    });

    // Ensure cursor is visible and blinking
    terminal.write("\x1b[?25h");

    terminal.focus();

    terminal.onKey(({ domEvent }) => {
        if (!setupMode && (domEvent.key === "F8" || domEvent.key === "Delete")) {
            const event = new KeyboardEvent("keydown", {
                key: domEvent.key,
                code: domEvent.code,
                keyCode: domEvent.keyCode,
                bubbles: true,
            });
            window.dispatchEvent(event);
        }
    });

    // Refocus terminal on click anywhere on the boot screen
    const bootScreen = document.getElementById("boot-screen");
    if (bootScreen) {
        bootScreen.addEventListener("click", () => {
            if (terminal) terminal.focus();
        });
    }

    return terminal;
}

function hideBootScreen() {
    const bootScreenEl = document.getElementById("boot-screen");
    if (bootScreenEl) {
        const contentEl = document.getElementById("boot-screen-content");
        if (contentEl) {
            contentEl.style.visibility = "hidden";
        }
        bootScreenEl.classList.add("fade-out");
        setTimeout(() => {
            if (terminal) {
                terminal.dispose();
                terminal = null;
            }
            bootScreenEl.remove();
        }, 500);
    }
}

function startBootProcessStep(message) {
    const term = initTerminal();
    if (term) {
        term.write("\x1b[?25h"); // Show cursor

        // If we haven't set the scrolling region yet, we should probably do it.
        // But prepareBootScreen should have been called.

        term.write(message);
        return {
            get firstChild() {
                return {
                    set nodeValue(val) {
                        // Use \r to return to start of line, then \x1b[2K to clear line
                        term.write('\r\x1b[2K' + val);
                    }
                };
            }
        };
    }
    return null;
}

function finalizeBootProcessStep(stepInfo, status, error) {
    if (terminal && stepInfo && !setupMode) {
        if (status === undefined || status === null) {
            terminal.write('\r\n');
        } else {
            terminal.write(` ${status}\r\n`);
        }

        if (error) {
            writeBootError(error.message || error);
        }

        terminal.write("\x1b[?25h"); // Ensure cursor is visible
    }
}

function showBlinkingCursor() {
    const term = initTerminal();
    if (term) {
        term.options.cursorBlink = true;
    }
}

function removeLastBlinkingCursor() {
    // xterm cursor is handled by the terminal itself
}

function promptToContinue() {
    return new Promise((resolve) => {
        const term = initTerminal();
        if (!term) {
            resolve();
            return;
        }

        let countdown = 10;
        const renderPrompt = () => {
            term.write(`\r\x1b[2KPress any key to continue... ${countdown}`);
        };

        renderPrompt();

        const timer = setInterval(() => {
            countdown--;
            renderPrompt();
            if (countdown <= 0) {
                clearInterval(timer);
                cleanup();
                resolve();
            }
        }, 1000);

        let termDisposable = null;

        const cleanup = () => {
            clearInterval(timer);
            term.write("\r\n");
            window.removeEventListener("keydown", continueHandler);
            window.removeEventListener("touchstart", continueHandler);
            if (termDisposable) termDisposable.dispose();
        };

        const continueHandler = () => {
            cleanup();
            resolve();
        };

        termDisposable = term.onKey(continueHandler);
        window.addEventListener("keydown", continueHandler, { once: true });
        window.addEventListener("touchstart", continueHandler, { once: true });
    });
}

function showSetupScreen() {
    setupMode = true;
    const term = initTerminal();

    if (term) {
        // Reset scrolling region to full screen before entering setup
        term.write("\x1b[r");
        term.write("\x1b[2J\x1b[H"); // Clear screen and home cursor
        runSetupTUI(term, () => {
            setupMode = false;
            // Optionally restore boot screen if we were to return,
            // but setup usually ends in reboot.
        });
    }
}

export function getTerminal() {
    return terminal;
}

export function writeBootError(message) {
    if (terminal) {
        // Ensure we're on a new line and show the error
        terminal.write(`\r\nError: ${message}\r\n`);
    }
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
