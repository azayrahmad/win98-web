(function() {
    console.log("Diablo Bootloader initialized");

    let autoStartFile = null;

    // Signal readiness to parent
    window.parent.postMessage({ type: "DIABLO_READY" }, "*");

    window.addEventListener("message", (event) => {
        if (event.data && event.data.type === "START_WITH_FILE") {
            console.log("Received auto-start file:", event.data.name);
            autoStartFile = {
                name: event.data.name,
                data: event.data.data
            };

            // Try to start immediately or wait for button
            attemptAutoStart();
        }
    });

    let dropAttempted = false;

    function simulateDrop(file, filename) {
        const root = document.getElementById('root');
        if (!root) return false;

        console.log("Simulating drop of", filename);
        try {
            const dataTransfer = new DataTransfer();
            const f = new File([file], filename);
            dataTransfer.items.add(f);

            const dropEvent = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dataTransfer
            });

            root.dispatchEvent(dropEvent);
            return true;
        } catch (e) {
            console.error("Failed to simulate drop:", e);
            return false;
        }
    }

    function attemptAutoStart() {
        if (!autoStartFile) return;

        if (!dropAttempted) {
            dropAttempted = simulateDrop(autoStartFile.data, autoStartFile.name);
            if (dropAttempted) return;
        }

        // Try to find the start buttons
        const buttons = document.querySelectorAll('button, [role="button"], .btn, .button, a');
        for (const btn of buttons) {
            const text = btn.innerText || btn.textContent;
            if (text.includes("Play Shareware")) {
                console.log("Found 'Play Shareware' button, clicking to trigger fetch:", text);
                btn.click();
                return;
            }
        }

        // If not found yet, try again soon
        setTimeout(attemptAutoStart, 500);
    }

    const originalFetch = window.fetch;
    window.fetch = async function(url, options) {
        const urlStr = typeof url === 'string' ? url : (url.url || "");
        if (urlStr.toUpperCase().endsWith('.MPQ')) {
            const requestedFile = urlStr.split('/').pop().toUpperCase();

            // If we have an auto-start file that matches the name, use it.
            // Also, if we are auto-starting with retail DIABDAT.MPQ, but the button
            // clicked was "Play Shareware" (which fetches spawn.mpq), we should
            // probably serve DIABDAT.MPQ instead to force retail mode.
            if (autoStartFile) {
                const autoName = autoStartFile.name.toUpperCase();
                if (requestedFile === autoName || (autoName === 'DIABDAT.MPQ' && requestedFile === 'SPAWN.MPQ')) {
                    console.log("Providing auto-start file data for:", urlStr);
                    return new Response(autoStartFile.data);
                }
            }

            // Otherwise, ask the parent via the bridge
            return new Promise((resolve, reject) => {
                const channel = new MessageChannel();
                channel.port1.onmessage = (event) => {
                    if (event.data.error) {
                        console.warn("Fetch bridge: file not in ZenFS, falling back to original fetch:", urlStr);
                        originalFetch(url, options).then(resolve).catch(reject);
                    } else {
                        resolve(new Response(event.data));
                    }
                };
                window.parent.postMessage({
                    type: 'GET_MPQ',
                    url: urlStr
                }, '*', [channel.port2]);
            });
        }
        return originalFetch(url, options);
    };
})();
