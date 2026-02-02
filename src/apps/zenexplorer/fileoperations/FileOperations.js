import { fs } from "@zenfs/core";
import {
    requestBusyState,
    releaseBusyState,
} from "../../../utils/busyStateManager.js";
import { ShowDialogWindow } from "../../../components/DialogWindow.js";
import { showInputDialog } from "../interface/InputDialog.js";
import { handleFileSystemError } from "./ErrorHandler.js";
import { joinPath, normalizePath, getPathName, getParentPath } from "../navigation/PathUtils.js";
import ClipboardManager from "./ClipboardManager.js";
import { RecycleBinManager } from "./RecycleBinManager.js";
import UndoManager from "./UndoManager.js";
import LayoutManager from "../interface/LayoutManager.js";

export class FileOperations {
    constructor(app) {
        this.app = app;
    }

    cutItems(paths) {
        if (paths.length === 0) return;
        ClipboardManager.set(paths, "cut");
    }

    copyItems(paths) {
        if (paths.length === 0) return;
        ClipboardManager.set(paths, "copy");
    }

    async pasteItems(destinationPath) {
        const { items, operation } = ClipboardManager.get();
        if (items.length === 0) return;

        if (RecycleBinManager.isRecycleBinPath(destinationPath)) {
            const { ProgressBarDialogWindow } = await import("../interface/ProgressBarDialogWindow.js");
            const totalSize = await this.getTotalSize(items);
            const dialog = new ProgressBarDialogWindow("recycle", items.length, totalSize);
            try {
                await RecycleBinManager.moveItemsToRecycleBin(items, dialog);
                if (operation === "cut") ClipboardManager.clear();
            } finally {
                dialog.close();
            }
            return;
        }

        if (items.some(p => RecycleBinManager.isRecycledItemPath(p))) {
            await this.restoreItems(items);
            if (operation === "cut") ClipboardManager.clear();
            return;
        }

        const { ProgressBarDialogWindow } = await import("../interface/ProgressBarDialogWindow.js");
        const totalSize = await this.getTotalSize(items);
        const dialog = new ProgressBarDialogWindow(operation, items.length, totalSize);

        try {
            if (operation === "cut") {
                await this.moveItemsDirect(items, destinationPath, {}, dialog);
                ClipboardManager.clear();
            } else if (operation === "copy") {
                await this.copyItemsDirect(items, destinationPath, {}, dialog);
            }
        } finally {
            dialog.close();
        }
    }

    async moveItemsDirect(sourcePaths, destinationPath, options = {}, dialog = null) {
        const targetPaths = [];
        try {
            for (const itemPath of sourcePaths) {
                if (dialog && dialog.cancelled) break;
                const itemName = getPathName(itemPath);
                const targetPath = await this.getUniquePastePath(destinationPath, itemName, "cut");
                if (dialog) {
                    const stats = await fs.promises.stat(itemPath);
                    const sourceDir = getParentPath(itemPath);
                    dialog.update(itemPath, sourceDir, destinationPath, 0);
                    await fs.promises.rename(itemPath, targetPath);
                    dialog.finishItem(stats.isDirectory() ? 0 : stats.size);
                } else {
                    await fs.promises.rename(itemPath, targetPath);
                }
                targetPaths.push(targetPath);
            }
            if (options.dropX !== undefined && options.dropY !== undefined) {
                const positions = {};
                targetPaths.forEach((path, i) => {
                    const name = getPathName(path);
                    const offset = options.offsets ? options.offsets[i] : { x: i * 10, y: i * 10 };
                    positions[name] = { x: options.dropX + offset.x, y: options.dropY + offset.y };
                });
                await LayoutManager.updateItemPositions(destinationPath, positions, this.app.win.element.id);
            }
            UndoManager.push({ type: 'move', data: { from: sourcePaths, to: targetPaths } });
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        } catch (e) {
            handleFileSystemError("move", e, "items");
            throw e;
        }
    }

    async copyItemsDirect(sourcePaths, destinationPath, options = {}, dialog = null) {
        const targetPaths = [];
        try {
            for (const itemPath of sourcePaths) {
                if (dialog && dialog.cancelled) break;
                const itemName = getPathName(itemPath);
                const targetPath = await this.getUniquePastePath(destinationPath, itemName, "copy");
                await this.copyRecursive(itemPath, targetPath, dialog);
                targetPaths.push(targetPath);
            }
            if (options.dropX !== undefined && options.dropY !== undefined) {
                const positions = {};
                targetPaths.forEach((path, i) => {
                    const name = getPathName(path);
                    const offset = options.offsets ? options.offsets[i] : { x: i * 10, y: i * 10 };
                    positions[name] = { x: options.dropX + offset.x, y: options.dropY + offset.y };
                });
                await LayoutManager.updateItemPositions(destinationPath, positions, this.app.win.element.id);
            }
            UndoManager.push({ type: 'copy', data: { created: targetPaths } });
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        } catch (e) {
            handleFileSystemError("copy", e, "items");
            throw e;
        }
    }

    async getUniquePastePath(destPath, originalName, operation) {
        let checkPath = normalizePath(joinPath(destPath, originalName));
        try {
            await fs.promises.stat(checkPath);
        } catch (e) {
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
                } catch (e) { return checkPath; }
            }
        } else {
            const copyNOfRegex = /^Copy \((\d+)\) of (.*)$/;
            const copyOfRegex = /^Copy of (.*)$/;
            let baseName = originalName;
            let match;
            if ((match = originalName.match(copyNOfRegex))) baseName = match[2];
            else if ((match = originalName.match(copyOfRegex))) baseName = match[1];
            let candidateName = `Copy of ${baseName}`;
            checkPath = normalizePath(joinPath(destPath, candidateName));
            try {
                await fs.promises.stat(checkPath);
                let counter = 2;
                while (true) {
                    candidateName = `Copy (${counter}) of ${baseName}`;
                    checkPath = normalizePath(joinPath(destPath, candidateName));
                    try {
                        await fs.promises.stat(checkPath);
                        counter++;
                    } catch (e) { return checkPath; }
                }
            } catch (e) { return checkPath; }
        }
    }

    async copyRecursive(src, dest, dialog = null) {
        if (dialog && dialog.cancelled) return;
        const stats = await fs.promises.stat(src);
        if (stats.isDirectory()) {
            await fs.promises.mkdir(dest, { recursive: true });
            const files = await fs.promises.readdir(src);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.copyRecursive(joinPath(src, file), joinPath(dest, file), dialog);
            }
        } else {
            if (dialog) {
                await this.copyFileWithProgress(src, dest, stats.size, dialog);
                dialog.finishItem(stats.size);
            } else {
                const data = await fs.promises.readFile(src);
                await fs.promises.writeFile(dest, data);
            }
        }
    }

    async copyFileWithProgress(src, dest, totalSize, dialog) {
        const bufferSize = 64 * 1024;
        const buffer = new Uint8Array(bufferSize);
        let bytesReadTotal = 0;
        const handleIn = await fs.promises.open(src, 'r');
        const handleOut = await fs.promises.open(dest, 'w');
        try {
            const sourceDir = getParentPath(src);
            const destDir = getParentPath(dest);
            while (bytesReadTotal < totalSize) {
                if (dialog && dialog.cancelled) break;
                const { bytesRead } = await handleIn.read(buffer, 0, bufferSize, bytesReadTotal);
                if (bytesRead === 0) break;
                await handleOut.write(buffer, 0, bytesRead, bytesReadTotal);
                bytesReadTotal += bytesRead;
                if (dialog) dialog.update(src, sourceDir, destDir, bytesReadTotal);
                if (bytesReadTotal % (bufferSize * 16) === 0) await new Promise(resolve => setTimeout(resolve, 0));
            }
        } finally {
            await handleIn.close();
            await handleOut.close();
        }
    }

    async getTotalSize(paths) {
        let total = 0;
        for (const path of paths) {
            try {
                const stats = await fs.promises.stat(path);
                if (stats.isDirectory()) total += await this._getRecursiveSize(path);
                else total += stats.size;
            } catch (e) {}
        }
        return total;
    }

    async _getRecursiveSize(path) {
        let size = 0;
        try {
            const files = await fs.promises.readdir(path);
            for (const file of files) {
                const fullPath = joinPath(path, file);
                const stats = await fs.promises.stat(fullPath);
                if (stats.isDirectory()) size += await this._getRecursiveSize(fullPath);
                else size += stats.size;
            }
        } catch (e) {}
        return size;
    }

    async deleteItems(paths, permanent = false) {
        if (paths.length === 0) return;
        const alreadyInRecycle = paths.some(path => RecycleBinManager.isRecycledItemPath(path));
        const isPermanent = permanent || alreadyInRecycle;
        const message = isPermanent
            ? (paths.length === 1 ? `Are you sure you want to permanently delete '${getPathName(paths[0])}'?` : `Are you sure you want to permanently delete these ${paths.length} items?`)
            : (paths.length === 1 ? `Are you sure you want to send '${getPathName(paths[0])}' to the Recycle Bin?` : `Are you sure you want to send these ${paths.length} items to the Recycle Bin?`);
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
                        const busyId = `delete-${Math.random()}`;
                        requestBusyState(busyId, this.app.win.element);
                        const { ProgressBarDialogWindow } = await import("../interface/ProgressBarDialogWindow.js");
                        const totalSize = await this.getTotalSize(paths);
                        const dialog = new ProgressBarDialogWindow(isPermanent ? "delete" : "recycle", paths.length, totalSize);
                        try {
                            if (isPermanent) {
                                for (const path of paths) {
                                    if (dialog.cancelled) break;
                                    await this.removeRecursiveWithProgress(path, dialog);
                                }
                                if (alreadyInRecycle && !dialog.cancelled) {
                                    const recyclePath = await RecycleBinManager.getRecyclePath(paths[0]);
                                    if (recyclePath) {
                                        const metadata = await RecycleBinManager.getMetadata(recyclePath);
                                        let changed = false;
                                        for (const path of paths) {
                                            const id = getPathName(path);
                                            if (metadata[id]) { delete metadata[id]; changed = true; }
                                        }
                                        if (changed) {
                                            await RecycleBinManager.saveMetadata(recyclePath, metadata);
                                            document.dispatchEvent(new CustomEvent("recycle-bin-change"));
                                        }
                                    }
                                }
                            } else {
                                const recycledPaths = await RecycleBinManager.moveItemsToRecycleBin(paths, dialog);
                                if (recycledPaths.length > 0) {
                                    UndoManager.push({ type: 'delete', data: { recycledPaths } });
                                }
                            }
                            if (isPermanent && !alreadyInRecycle) {
                                await this.app.navigateTo(this.app.currentPath, true, true);
                                document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
                            }
                        } catch (e) {
                            handleFileSystemError("delete", e, "items");
                        } finally {
                            dialog.close();
                            releaseBusyState(busyId, this.app.win.element);
                        }
                    }
                },
                { label: "No" }
            ]
        });
    }

    async renameItem(fullPath) {
        this.app.enterRenameModeByPath(fullPath);
    }

    async createNewFolder() {
        const busyId = `create-folder-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);
        try {
            const name = await this.getUniqueName(this.app.currentPath, "New Folder");
            const newPath = joinPath(this.app.currentPath, name);
            await fs.promises.mkdir(newPath);
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
            this.app.enterRenameModeByPath(newPath);
        } catch (e) {
            handleFileSystemError("create", e, "folder");
        } finally {
            releaseBusyState(busyId, this.app.win.element);
        }
    }

    async createNewTextFile() {
        const busyId = `create-file-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);
        try {
            const name = await this.getUniqueName(this.app.currentPath, "New Text Document", ".txt");
            const newPath = joinPath(this.app.currentPath, name);
            await fs.promises.writeFile(newPath, "");
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
            this.app.enterRenameModeByPath(newPath);
        } catch (e) {
            handleFileSystemError("create", e, "file");
        } finally {
            releaseBusyState(busyId, this.app.win.element);
        }
    }

    async removeRecursiveWithProgress(path, dialog) {
        if (dialog && dialog.cancelled) return;
        let stats;
        try { stats = await fs.promises.stat(path); } catch (e) { return; }
        const sourceDir = getParentPath(path);
        if (stats.isDirectory()) {
            const files = await fs.promises.readdir(path);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.removeRecursiveWithProgress(joinPath(path, file), dialog);
            }
            if (dialog && dialog.cancelled) return;
            await fs.promises.rmdir(path);
        } else {
            if (dialog) dialog.update(path, sourceDir, null, 0);
            await fs.promises.unlink(path);
            if (dialog) {
                dialog.finishItem(stats.size);
                dialog.update(path, sourceDir, null, 0);
            }
        }
    }

    async getUniqueName(parentPath, baseName, extension = "") {
        let name = baseName + extension;
        let counter = 1;
        while (true) {
            const checkPath = joinPath(parentPath, name);
            try {
                await fs.promises.stat(checkPath);
                counter++;
                name = `${baseName} (${counter})${extension}`;
            } catch (e) { return name; }
        }
    }

    async restoreItems(paths) {
        if (paths.length === 0) return;
        const busyId = `restore-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);
        const { ProgressBarDialogWindow } = await import("../interface/ProgressBarDialogWindow.js");
        const totalSize = await this.getTotalSize(paths);
        const dialog = new ProgressBarDialogWindow("restore", paths.length, totalSize);
        try {
            await RecycleBinManager.restoreItems(paths, dialog);
        } catch (e) {
            handleFileSystemError("restore", e, "items");
        } finally {
            dialog.close();
            releaseBusyState(busyId, this.app.win.element);
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        }
    }

    async emptyRecycleBin(path) {
        const targetPath = path || this.app.currentPath;
        const isRecycleBin = RecycleBinManager.isRecycleBinPath(targetPath);
        if (!isRecycleBin) return;

        const isEmpty = await RecycleBinManager.isEmpty(targetPath);
        if (isEmpty) return;
        ShowDialogWindow({
            title: "Confirm Empty Recycle Bin",
            text: "Are you sure you want to permanently delete all items in the Recycle Bin?",
            parentWindow: this.app.win,
            modal: true,
            buttons: [
                {
                    label: "Yes",
                    isDefault: true,
                    action: async () => {
                        const busyId = `empty-recycle-${Math.random()}`;
                        requestBusyState(busyId, this.app.win.element);
                        const metadata = await RecycleBinManager.getMetadata("/Recycle Bin");
                        const ids = Object.keys(metadata);

                        // To get total size, we need the real paths
                        const paths = [];
                        const allRecyclePaths = RecycleBinManager.getAllRecyclePaths();
                        for(const rp of allRecyclePaths) {
                            const m = await RecycleBinManager.getMetadata(rp);
                            for(const id in m) {
                                paths.push(joinPath(rp, id));
                            }
                        }

                        const { ProgressBarDialogWindow } = await import("../interface/ProgressBarDialogWindow.js");
                        const totalSize = await this.getTotalSize(paths);
                        const dialog = new ProgressBarDialogWindow("empty", paths.length, totalSize);
                        try {
                            await RecycleBinManager.emptyAllRecycleBins(dialog);
                            const { playSound } = await import("../../../utils/soundManager.js");
                            playSound("EmptyRecycleBin");
                        } catch (e) {
                            handleFileSystemError("delete", e, "items");
                        } finally {
                            dialog.close();
                            releaseBusyState(busyId, this.app.win.element);
                            await this.app.navigateTo(this.app.currentPath, true, true);
                        }
                    }
                },
                { label: "No" }
            ]
        });
    }

    async undo() {
        const op = UndoManager.peek();
        if (!op) return;
        const busyId = `undo-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);
        try {
            switch (op.type) {
                case 'rename': await this._undoRename(op.data); break;
                case 'move': await this._undoMove(op.data); break;
                case 'copy': await this._undoCopy(op.data); break;
                case 'delete': await this._undoDelete(op.data); break;
                case 'create': await this._undoCreate(op.data); break;
            }
            UndoManager.pop();
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        } catch (e) {
            ShowDialogWindow({
                title: "Undo",
                text: `Could not undo operation: ${e.message}`,
                parentWindow: this.app.win,
                modal: true,
                buttons: [{ label: "OK" }]
            });
        } finally {
            releaseBusyState(busyId, this.app.win.element);
        }
    }

    async _undoRename(data) {
        try { await fs.promises.stat(data.from); throw new Error(`The destination already contains an item named '${getPathName(data.from)}'.`); }
        catch (e) { if (e.code !== 'ENOENT') throw e; }
        await fs.promises.rename(data.to, data.from);
    }

    async _undoMove(data) {
        for (let i = 0; i < data.to.length; i++) {
            const to = data.to[i];
            const from = data.from[i];
            await fs.promises.stat(to);
            try { await fs.promises.stat(from); throw new Error(`The destination already contains an item named '${getPathName(from)}'.`); }
            catch (e) { if (e.code !== 'ENOENT') throw e; }
        }
        for (let i = 0; i < data.to.length; i++) await fs.promises.rename(data.to[i], data.from[i]);
    }

    async _undoCopy(data) {
        for (const path of data.created) {
            try { await fs.promises.rm(path, { recursive: true }); }
            catch (e) { if (e.code !== 'ENOENT') throw e; }
        }
    }

    async _undoDelete(data) { await RecycleBinManager.restoreItems(data.recycledPaths || data.recycledIds); }

    async _undoCreate(data) {
        try { await fs.promises.rm(data.path, { recursive: true }); }
        catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
}
