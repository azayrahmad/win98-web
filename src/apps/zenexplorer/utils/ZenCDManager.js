/**
 * ZenCDManager - Singleton to track the label of the mounted CD-ROM in ZenFS
 */

let cdLabel = null;

export const ZenCDManager = {
    setLabel(label) {
        cdLabel = label;
    },
    getLabel() {
        return cdLabel;
    },
    clear() {
        cdLabel = null;
    }
};
