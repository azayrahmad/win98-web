/**
 * ZenRemovableDiskManager - Singleton to track mounted removable disks
 */

const mountedDisks = new Map(); // letter -> label

export const ZenRemovableDiskManager = {
    mount(letter, label) {
        mountedDisks.set(letter.toUpperCase(), label);
    },
    unmount(letter) {
        mountedDisks.delete(letter.toUpperCase());
    },
    getLabel(letter) {
        return mountedDisks.get(letter.toUpperCase());
    },
    getMountedLetters() {
        return Array.from(mountedDisks.keys());
    },
    isMounted(letter) {
        return mountedDisks.has(letter.toUpperCase());
    },
    getAvailableLetter() {
        const excluded = ['A', 'B', 'C', 'E'];
        for (let i = 0; i < 26; i++) {
            const letter = String.fromCharCode(65 + i);
            if (!excluded.includes(letter) && !mountedDisks.has(letter)) {
                return letter;
            }
        }
        return null;
    }
};
