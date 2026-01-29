/**
 * ZenFloppyManager - Singleton to track the label of the mounted floppy in ZenFS
 */

let floppyLabel = null;

export const ZenFloppyManager = {
    setLabel(label) {
        floppyLabel = label;
    },
    getLabel() {
        return floppyLabel;
    },
    clear() {
        floppyLabel = null;
    }
};
