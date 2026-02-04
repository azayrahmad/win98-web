import { fs } from "@zenfs/core";
import { SYSTEM_SOURCE_FILES } from "../config/system-files.js";
import { existsAsync } from "./zenfs-utils.js";

export async function syncSystemFiles() {
    const systemDir = "/C:/WINDOWS/System/src";
    if (!(await existsAsync(systemDir))) {
        await fs.promises.mkdir(systemDir, { recursive: true });
    }

    for (const [path, content] of Object.entries(SYSTEM_SOURCE_FILES)) {
        // path is like './main.js' or './utils/zenfs-init.js'
        // We want to save it to /C:/WINDOWS/System/src/...
        const targetPath = `${systemDir}/${path.replace('./', '')}`;

        // Ensure subdirectories exist
        const parts = targetPath.split('/');
        parts.pop(); // Remove filename
        const dir = parts.join('/');
        if (!(await existsAsync(dir))) {
            await fs.promises.mkdir(dir, { recursive: true });
        }

        try {
            await fs.promises.writeFile(targetPath, content);
        } catch (e) {
            console.warn(`Failed to sync system file ${path}:`, e);
        }
    }

    // Try to capture the kernel (the entry point script)
    try {
        const response = await fetch(import.meta.url);
        const code = await response.text();
        await fs.promises.writeFile("/C:/WINDOWS/System/kernel.js", code);
    } catch (e) {
        // This might fail in some environments, that's okay
    }
}
