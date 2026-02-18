import { fs } from "@zenfs/core";
import { joinPath } from '../shell/explorer/navigation/path-utils.js';

/**
 * Recursively scans the filesystem and renames .lnk files to .lnk.json
 * @param {string} dir - Directory to scan
 */
export async function migrateShortcuts(dir = "/") {
    try {
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
            const fullPath = joinPath(dir, file);
            let stats;
            try {
                stats = await fs.promises.stat(fullPath);
            } catch (e) {
                continue;
            }

            if (stats.isDirectory()) {
                await migrateShortcuts(fullPath);
            } else if (file.endsWith(".lnk") && !file.endsWith(".lnk.json")) {
                const newPath = fullPath + ".json";
                try {
                    await fs.promises.rename(fullPath, newPath);
                } catch (e) {
                    console.error(`Failed to migrate shortcut ${fullPath}:`, e);
                }
            }
        }
    } catch (e) {
        console.error(`Error during shortcut migration in ${dir}:`, e);
    }
}
