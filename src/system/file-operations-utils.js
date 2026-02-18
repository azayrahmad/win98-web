import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';
import { findItemByPath } from './directory.js';

function getUniqueName(destinationPath, originalName) {
    const destinationFolder = findItemByPath(destinationPath);
    if (!destinationFolder) return originalName;

    const allDroppedFiles = getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) || [];
    const itemsInDestination = [
        ...(destinationFolder.children || []),
        ...allDroppedFiles.filter(f => f.path === destinationPath)
    ];

    let newName = originalName;
    let counter = 1;
    let nameExists = itemsInDestination.some(item => (item.name || item.filename) === newName);

    while (nameExists) {
        const extensionIndex = originalName.lastIndexOf('.');
        if (extensionIndex > 0) {
            const name = originalName.substring(0, extensionIndex);
            const ext = originalName.substring(extensionIndex);
            newName = `${name} (${counter})${ext}`;
        } else {
            newName = `${originalName} (${counter})`;
        }
        counter++;
        nameExists = itemsInDestination.some(item => (item.name || item.filename) === newName);
    }

    return newName;
}

export function pasteItems(destinationPath, items, operation) {
    const allDroppedFiles = getItem(LOCAL_STORAGE_KEYS.DROPPED_FILES) || [];
    let updatedFiles = [...allDroppedFiles];

    items.forEach(item => {
        if (operation === 'copy') {
            const newItem = {
                ...item,
                id: `dropped-${Date.now()}-${Math.random()}`,
                path: destinationPath,
                name: getUniqueName(destinationPath, item.name || item.filename),
            };
            delete newItem.source;
            updatedFiles.push(newItem);
        } else if (operation === 'cut') {
            const itemIndex = updatedFiles.findIndex(f => f.id === item.id);
            if (itemIndex !== -1) {
                updatedFiles[itemIndex].path = destinationPath;
                updatedFiles[itemIndex].name = getUniqueName(destinationPath, updatedFiles[itemIndex].name || updatedFiles[itemIndex].filename);
            }
        }
    });

    setItem(LOCAL_STORAGE_KEYS.DROPPED_FILES, updatedFiles);
    document.dispatchEvent(new CustomEvent("desktop-refresh"));
    document.dispatchEvent(new CustomEvent("explorer-refresh"));
}
