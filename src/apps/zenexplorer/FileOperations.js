import { fs } from "@zenfs/core";
import { ShowDialogWindow } from "../../components/DialogWindow.js";
import { showInputDialog } from "./components/InputDialog.js";
import { handleFileSystemError } from "./utils/ErrorHandler.js";
import { joinPath, normalizePath, getPathName } from "./utils/PathUtils.js";
import ZenClipboardManager from "./utils/ZenClipboardManager.js";
import { RecycleBinManager } from "./utils/RecycleBinManager.js";
import ZenUndoManager from "./utils/ZenUndoManager.js";

/**
 * FileOperations - Handles file system operations with user interaction
 */

export class FileOperations {
    constructor(app) {
        this.app = app;
    }

    /**
     * Cut items to clipboard
     * @param {Array<string>} paths - Paths to cut
     */
    cutItems(paths) {
        if (paths.length === 0) return;
        ZenClipboardManager.set(paths, "cut");
    }

    /**
     * Copy items to clipboard
     * @param {Array<string>} paths - Paths to copy
     */
    copyItems(paths) {
        if (paths.length === 0) return;
        ZenClipboardManager.set(paths, "copy");
    }

    /**
     * Paste items from clipboard
     * @param {string} destinationPath - Path to paste into
     */
    async pasteItems(destinationPath) {
        const { items, operation } = ZenClipboardManager.get();
        if (items.length === 0) return;

        const targetPaths = [];

        try {
            for (const itemPath of items) {
                const itemName = getPathName(itemPath);
                const targetPath = await this.getUniquePastePath(destinationPath, itemName, operation);

                if (operation === "cut") {
                    await fs.promises.rename(itemPath, targetPath);
                } else if (operation === "copy") {
                    await this.copyRecursive(itemPath, targetPath);
                }
                targetPaths.push(targetPath);
            }

            if (operation === "cut") {
                ZenClipboardManager.clear();
                ZenUndoManager.push({
                    type: 'move',
                    data: { from: items, to: targetPaths }
                });
            } else if (operation === "copy") {
                ZenUndoManager.push({
                    type: 'copy',
                    data: { created: targetPaths }
                });
            }

            this.app.navigateTo(this.app.currentPath);
        } catch (e) {
            handleFileSystemError(operation === "cut" ? "move" : "copy", e, "items");
        }
    }

    /**
     * Get a unique path for pasting to avoid collisions
     * @private
     */
    async getUniquePastePath(destPath, originalName, operation) {
        let checkPath = normalizePath(joinPath(destPath, originalName));
        try {
            await fs.promises.stat(checkPath);
            // If it doesn't throw, it exists. We need a new name.
        } catch (e) {
            // Doesn't exist, we can use it.
            return checkPath;
        }

        if (operation === "cut") {
            let name = originalName;
            let counter = 1;
            const extensionIndex = originalName.lastIndexOf('.');
            const hasExtension = extensionIndex > 0;
            const baseName = hasExtension ? originalName.substring(0, extensionIndex) : originalName;
            const ext = hasExtension ? originalName.substring(extensionIndex) : '';

            while (true) {
                name = hasExtension ? `${baseName} (${counter})${ext}` : `${originalName} (${counter})`;
                checkPath = normalizePath(joinPath(destPath, name));
                try {
                    await fs.promises.stat(checkPath);
                    counter++;
                } catch (e) {
                    return checkPath;
                }
            }
        } else {
            // Windows-style copy naming: "Copy of X", "Copy (2) of X", etc.
            const copyNOfRegex = /^Copy \((\d+)\) of (.*)$/;
            const copyOfRegex = /^Copy of (.*)$/;

            let baseName = originalName;
            let match;
            if ((match = originalName.match(copyNOfRegex))) {
                baseName = match[2];
            } else if ((match = originalName.match(copyOfRegex))) {
                baseName = match[1];
            }

            let candidateName = `Copy of ${baseName}`;
            checkPath = normalizePath(joinPath(destPath, candidateName));
            try {
                await fs.promises.stat(checkPath);
                // "Copy of X" exists, try "Copy (2) of X", "Copy (3) of X", etc.
                let counter = 2;
                while (true) {
                    candidateName = `Copy (${counter}) of ${baseName}`;
                    checkPath = normalizePath(joinPath(destPath, candidateName));
                    try {
                        await fs.promises.stat(checkPath);
                        counter++;
                    } catch (e) {
                        return checkPath;
                    }
                }
            } catch (e) {
                return checkPath;
            }
        }
    }

    /**
     * Recursively copy a file or directory
     * @private
     */
    async copyRecursive(src, dest) {
        const stats = await fs.promises.stat(src);
        if (stats.isDirectory()) {
            await fs.promises.mkdir(dest, { recursive: true });
            const files = await fs.promises.readdir(src);
            for (const file of files) {
                await this.copyRecursive(joinPath(src, file), joinPath(dest, file));
            }
        } else {
            const data = await fs.promises.readFile(src);
            await fs.promises.writeFile(dest, data);
        }
    }

    /**
     * Delete items with confirmation dialog
     * @param {Array<string>} paths - Paths to delete
     * @param {boolean} permanent - Whether to bypass Recycle Bin
     */
    async deleteItems(paths, permanent = false) {
        if (paths.length === 0) return;

        // If items are already in Recycle Bin, deletion is always permanent
        const alreadyInRecycle = paths.some(path => RecycleBinManager.isRecycledItemPath(path));
        const isPermanent = permanent || alreadyInRecycle;

        const message = isPermanent
            ? (paths.length === 1
                ? `Are you sure you want to permanently delete '${getPathName(paths[0])}'?`
                : `Are you sure you want to permanently delete these ${paths.length} items?`)
            : (paths.length === 1
                ? `Are you sure you want to send '${getPathName(paths[0])}' to the Recycle Bin?`
                : `Are you sure you want to send these ${paths.length} items to the Recycle Bin?`);

        ShowDialogWindow({
            title: "Confirm File Delete",
            text: message,
            parentWindow: this.app.win,
            modal: true,
            buttons: [
                {
                    label: "Yes",
                    isDefault: true,
                    action: async () => {
                        try {
                            if (isPermanent) {
                                for (const path of paths) {
                                    await fs.promises.rm(path, { recursive: true });
                                }
                                // If it was in recycle bin, we should also clean up metadata
                                if (alreadyInRecycle) {
                                    const metadata = await RecycleBinManager.getMetadata();
                                    let changed = false;
                                    for (const path of paths) {
                                        const id = getPathName(path);
                                        if (metadata[id]) {
                                            delete metadata[id];
                                            changed = true;
                                        }
                                    }
                                    if (changed) {
                                        await RecycleBinManager.saveMetadata(metadata);
                                        document.dispatchEvent(new CustomEvent("zen-recycle-bin-change"));
                                    }
                                }
                            } else {
                                const recycledIds = await RecycleBinManager.moveItemsToRecycleBin(paths);
                                ZenUndoManager.push({
                                    type: 'delete',
                                    data: { recycledIds }
                                });
                            }

                            // If it was permanent and NOT in recycle bin, we need to refresh manually
                            // because no event was dispatched. If an event was dispatched,
                            // ZenExplorerApp already refreshed.
                            if (isPermanent && !alreadyInRecycle) {
                                this.app.navigateTo(this.app.currentPath);
                            }
                        } catch (e) {
                            handleFileSystemError("delete", e, "items");
                        }
                    }
                },
                { label: "No" }
            ]
        });
    }

    /**
     * Rename item using inline rename
     * @param {string} fullPath - Full path to item
     */
    async renameItem(fullPath) {
        this.app.enterRenameModeByPath(fullPath);
    }

    /**
     * Create new folder with inline rename
     */
    async createNewFolder() {
        try {
            const name = await this.getUniqueName(this.app.currentPath, "New Folder");
            const newPath = joinPath(this.app.currentPath, name);
            await fs.promises.mkdir(newPath);
            await this.app.navigateTo(this.app.currentPath, true, true);
            this.app.enterRenameModeByPath(newPath);
        } catch (e) {
            handleFileSystemError("create", e, "folder");
        }
    }

    /**
     * Create new text document with inline rename
     */
    async createNewTextFile() {
        try {
            const name = await this.getUniqueName(this.app.currentPath, "New Text Document", ".txt");
            const newPath = joinPath(this.app.currentPath, name);
            await fs.promises.writeFile(newPath, "");
            await this.app.navigateTo(this.app.currentPath, true, true);
            this.app.enterRenameModeByPath(newPath);
        } catch (e) {
            handleFileSystemError("create", e, "file");
        }
    }

    /**
     * Get a unique name for a new item
     * @private
     */
    async getUniqueName(parentPath, baseName, extension = "") {
        let name = baseName + extension;
        let counter = 1;
        while (true) {
            const checkPath = joinPath(parentPath, name);
            try {
                await fs.promises.stat(checkPath);
                // Exists, try next
                counter++;
                name = `${baseName} (${counter})${extension}`;
            } catch (e) {
                // Doesn't exist, we can use it
                return name;
            }
        }
    }

    /**
     * Undo the last file operation
     */
    async undo() {
        const op = ZenUndoManager.peek();
        if (!op) return;

        try {
            switch (op.type) {
                case 'rename':
                    await this._undoRename(op.data);
                    break;
                case 'move':
                    await this._undoMove(op.data);
                    break;
                case 'copy':
                    await this._undoCopy(op.data);
                    break;
                case 'delete':
                    await this._undoDelete(op.data);
                    break;
                case 'create':
                    await this._undoCreate(op.data);
                    break;
            }
            ZenUndoManager.pop(); // Only pop if successful
            this.app.navigateTo(this.app.currentPath);
        } catch (e) {
            ShowDialogWindow({
                title: "Undo",
                text: `Could not undo operation: ${e.message}`,
                parentWindow: this.app.win,
                modal: true,
                buttons: [{ label: "OK" }]
            });
        }
    }

    async _undoRename(data) {
        // data: { from, to }
        try {
            await fs.promises.stat(data.from);
            throw new Error(`The destination already contains an item named '${getPathName(data.from)}'.`);
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }
        await fs.promises.rename(data.to, data.from);
    }

    async _undoMove(data) {
        // data: { from: [], to: [] }
        // First check all collisions and existence
        for (let i = 0; i < data.to.length; i++) {
            const to = data.to[i];
            const from = data.from[i];

            await fs.promises.stat(to); // Ensure 'to' still exists

            try {
                await fs.promises.stat(from);
                throw new Error(`The destination already contains an item named '${getPathName(from)}'.`);
            } catch (e) {
                if (e.code !== 'ENOENT') throw e;
            }
        }

        // Perform the moves
        for (let i = 0; i < data.to.length; i++) {
            await fs.promises.rename(data.to[i], data.from[i]);
        }
    }

    async _undoCopy(data) {
        // data: { created: [] }
        for (const path of data.created) {
            try {
                await fs.promises.rm(path, { recursive: true });
            } catch (e) {
                // Ignore if already deleted
                if (e.code !== 'ENOENT') throw e;
            }
        }
    }

    async _undoDelete(data) {
        // data: { recycledIds: [] }
        await RecycleBinManager.restoreItems(data.recycledIds);
    }

    async _undoCreate(data) {
        // data: { path }
        try {
            await fs.promises.rm(data.path, { recursive: true });
        } catch (e) {
            if (e.code !== 'ENOENT') throw e;
        }
    }
}
