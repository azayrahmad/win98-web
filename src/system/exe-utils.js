import { fs } from "@zenfs/core";

/**
 * Detects the type of an executable file by reading its header.
 * @param {string} path Path to the executable
 * @returns {Promise<'DOS'|'WIN16'|'WIN32'|'UNKNOWN'>}
 */
export async function getExeType(path) {
    try {
        const { buffer } = await fs.promises.readFile(path);
        const view = new DataView(buffer);

        // Check for MZ header
        if (view.getUint16(0, true) !== 0x5A4D) { // 'MZ'
            return 'UNKNOWN';
        }

        // PE header offset is at 0x3C
        if (buffer.byteLength < 0x40) return 'DOS';
        const peOffset = view.getUint32(0x3C, true);

        if (buffer.byteLength < peOffset + 4) return 'DOS';

        const signature = view.getUint32(peOffset, true);
        if (signature === 0x00004550) { // 'PE\0\0'
            return 'WIN32';
        }
        if ((signature & 0xFFFF) === 0x454E) { // 'NE'
            return 'WIN16';
        }

        return 'DOS';
    } catch (e) {
        console.error("Error detecting EXE type:", e);
        return 'UNKNOWN';
    }
}
