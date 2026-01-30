import { configure, InMemory, fs } from "@zenfs/core";
import { IndexedDB } from "@zenfs/dom";

let isInitialized = false;

export async function initFileSystem() {
    if (isInitialized) return;

    try {
        await configure({
            mounts: {
                "/": InMemory,
                "/C:": {
                    backend: IndexedDB,
                    name: "win98-c-drive",
                },
            },
        });

        // Ensure A: and E: drive directory exists in the root
        if (!fs.existsSync('/A:')) {
            await fs.promises.mkdir('/A:');
        }
        if (!fs.existsSync('/E:')) {
            await fs.promises.mkdir('/E:');
        }

        // Ensure WINDOWS directory exists on C: for persistence
        if (!fs.existsSync('/C:/WINDOWS')) {
            await fs.promises.mkdir('/C:/WINDOWS');
        }

        // Ensure My Documents exists
        if (!fs.existsSync('/C:/My Documents')) {
            await fs.promises.mkdir('/C:/My Documents');
        }

        // Ensure Desktop exists and populate with initial shortcuts if empty
        const desktopPath = '/C:/WINDOWS/Desktop';
        if (!fs.existsSync(desktopPath)) {
            await fs.promises.mkdir(desktopPath);

            const initialShortcuts = [
                { name: 'Winamp.lnk', target: 'webamp' },
                { name: 'Pinball.lnk', target: 'pinball' },
                { name: 'Minesweeper.lnk', target: 'minesweeper' },
                { name: 'Solitaire.lnk', target: 'solitaire' },
                { name: 'Internet Explorer.lnk', target: 'internet-explorer' },
                { name: 'Paint.lnk', target: 'paint' },
                { name: 'MS-DOS Prompt.lnk', target: 'command-prompt' },
                { name: 'WordPad.lnk', target: 'wordpad' },
            ];

            for (const sc of initialShortcuts) {
                await fs.promises.writeFile(`${desktopPath}/${sc.name}`, JSON.stringify({
                    type: 'shortcut',
                    appId: sc.target
                }));
            }
        }

        isInitialized = true;
        console.log("ZenFS initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize ZenFS:", error);
    }
}
