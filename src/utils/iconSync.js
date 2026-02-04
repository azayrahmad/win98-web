import { fs } from "@zenfs/core";
import { ICONS, SHORTCUT_OVERLAY } from "../config/icons.js";
import { getZenFSFileUrl, existsAsync } from "./zenfs-utils.js";

async function syncIcon(key, icon, prefix = "") {
    // Generate paths if they don't exist
    const name = prefix ? `${prefix}_${key}` : key;
    const path16 = `/C:/WINDOWS/Icons/${name}_16.png`;
    const path32 = `/C:/WINDOWS/Icons/${name}_32.png`;

    // Inject paths into the icon object (optional, but good for reference)
    icon.path16 = path16;
    icon.path32 = path32;

    try {
        if (!(await existsAsync(path16))) {
            const blob16 = await (await fetch(icon[16])).blob();
            const arrayBuffer16 = await blob16.arrayBuffer();
            await fs.promises.writeFile(path16, new Uint8Array(arrayBuffer16));
        }
        if (!(await existsAsync(path32))) {
            const blob32 = await (await fetch(icon[32])).blob();
            const arrayBuffer32 = await blob32.arrayBuffer();
            await fs.promises.writeFile(path32, new Uint8Array(arrayBuffer32));
        }

        // Update the URL to use the ZenFS path (via Blob URL)
        // This mutates the global ICONS/SHORTCUT_OVERLAY objects
        icon[16] = await getZenFSFileUrl(path16);
        icon[32] = await getZenFSFileUrl(path32);
    } catch (e) {
        console.warn(`Failed to sync icon ${name}:`, e);
    }
}

export async function syncIcons() {
    const iconsDir = "/C:/WINDOWS/Icons";
    if (!(await existsAsync(iconsDir))) {
        await fs.promises.mkdir(iconsDir, { recursive: true });
    }

    // Sync all main icons
    const iconPromises = Object.entries(ICONS).map(([key, icon]) => syncIcon(key, icon));

    // Sync shortcut overlay
    iconPromises.push(syncIcon("shortcut", SHORTCUT_OVERLAY, "overlay"));

    await Promise.all(iconPromises);
}
