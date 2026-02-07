window.Module = {
    noInitialRun: true,
    onRuntimeInitialized: () => {
        window.parent.postMessage({ type: 'DOSBOX_READY' }, '*');
    },
    canvas: document.getElementById('canvas'),
    print: (text) => console.log(text),
    printErr: (text) => console.error(text),
    locateFile: (path, prefix) => {
        if (path.endsWith('.wasm')) return prefix + 'main.wasm';
        return prefix + path;
    }
};

window.addEventListener('message', async (event) => {
    if (event.data.type === 'START_DOSBOX') {
        const { commands } = event.data;

        // Load assets into Emscripten FS before starting
        try {
            const ttfResp = await fetch('main.ttf');
            if (ttfResp.ok) {
                const buffer = await ttfResp.arrayBuffer();
                Module.FS.writeFile('main.ttf', new Uint8Array(buffer));
            }
        } catch (e) { console.warn(e); }

        try {
            const confResp = await fetch('dosbox.conf');
            if (confResp.ok) {
                const text = await confResp.text();
                Module.FS.writeFile('dosbox.conf', text);
            }
        } catch (e) { console.warn(e); }

        // Define wraps
        const sendDosCommands = Module.cwrap('neil_send_dos_commands', null, ['string']);

        // Start DOSBox
        Module.callMain(['-conf', 'dosbox.conf']);

        // Run commands after a short delay to let it boot
        if (commands && commands.length > 0) {
            setTimeout(() => {
                for (const cmd of commands) {
                    sendDosCommands(cmd);
                }
            }, 2000);
        }
    }
});
