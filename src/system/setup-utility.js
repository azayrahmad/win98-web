export async function runSetupTUI(term, onExit) {
    let timeLeft = 30;
    const selectedOption = "1";

    const drawStatic = () => {
        // Clear screen and reset cursor
        term.write("\x1b[2J\x1b[H");
        term.write("\x1b[0m"); // Reset to theme defaults (light gray on black)

        term.write("Microsoft Windows 98 Startup Menu\r\n");
        // Double underline using ANSI double-line character
        term.write("\u2550".repeat(33) + "\r\n\r\n");

        // Option 1 - Black background as requested
        term.write("    1. Reboot\r\n\r\n");

        // Choice
        term.write(`Enter a choice: ${selectedOption}`);

        // Footer at the bottom of the terminal
        term.write(`\x1b[${term.rows};1H\x1b[0mF5=Safe mode   Shift+F5=Command prompt   Shift+F8=Step-by-step confirmation [N]`);
    };

    const drawTimer = () => {
        // Position timer on row 6, after the choice prompt if possible
        const timerCol = Math.max(30, Math.min(term.cols - 20, 30));
        term.write(`\x1b[6;${timerCol}HTime remaining: ${timeLeft.toString().padStart(2, ' ')}`);
        // Move cursor back to just after the choice for the underline cursor
        term.write("\x1b[6;17H");
    };

    drawStatic();
    drawTimer();

    const reboot = () => {
        clearInterval(timer);
        disposable.dispose();
        onExit();
        window.location.reload();
    };

    const timer = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 0) {
            reboot();
        } else {
            drawTimer();
        }
    }, 1000);

    const onKey = ({ key }) => {
        // Accept '1' or Enter
        if (key === "1" || key === "\r") {
            reboot();
        }
    };

    const disposable = term.onKey(onKey);
}
