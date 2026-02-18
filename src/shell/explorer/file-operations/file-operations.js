import { fs } from "@zenfs/core";
import {
    requestBusyState,
    releaseBusyState,
} from '../../../system/busy-state-manager.js';
import { ShowDialogWindow } from '../../../shared/components/dialog-window.js';
import { ProgressBarShowDialogWindow } from '../interface/progress-bar-dialog-window.js';
import { playSound } from '../../../system/sound-manager.js';
import { showInputDialog } from '../interface/input-dialog.js';
import { handleFileSystemError } from './error-handler.js';
import { joinPath, normalizePath, getPathName, getParentPath, getDriveLabel } from '../navigation/path-utils.js';
import { ShellManager } from '../extensions/shell-manager.js';
import ClipboardManager from './clipboard-manager.js';
import { RecycleBinManager } from './recycle-bin-manager.js';
import UndoManager from './undo-manager.js';
import LayoutManager from '../interface/layout-manager.js';

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

    async createShortcuts(paths, destinationPath = null, dialog = null) {
        const dest = destinationPath || this.app.currentPath;
        const targetPaths = [];
        try {
            for (const itemPath of paths) {
                if (dialog && dialog.cancelled) break;
                const itemName = getPathName(itemPath);
                const targetLnkPath = await this.getUniquePastePath(dest, itemName, "shortcut");

                if (dialog) {
                    const sourceDir = getParentPath(itemPath);
                    dialog.update(itemPath, sourceDir, dest, 0);
                }

                let lnkData = { type: "shortcut" };

                // Check if it's already a shortcut with an appId
                const stats = await ShellManager.stat(itemPath).catch(() => ({}));
                if (stats.isFile && stats.isFile() && (itemPath.endsWith(".lnk.json") || itemPath.endsWith(".lnk"))) {
                    try {
                        const content = await fs.promises.readFile(ShellManager.getRealPath(itemPath), "utf8");
                        const data = JSON.parse(content);
                        if (data.appId) {
                            lnkData.appId = data.appId;
                            lnkData.args = data.args;
                        } else {
                            lnkData.targetPath = ShellManager.getRealPath(data.targetPath || itemPath);
                        }
                    } catch (e) {
                        lnkData.targetPath = ShellManager.getRealPath(itemPath);
                    }
                } else {
                    lnkData.targetPath = ShellManager.getRealPath(itemPath);
                }

                await fs.promises.writeFile(ShellManager.getRealPath(targetLnkPath), JSON.stringify(lnkData, null, 2));
                targetPaths.push(targetLnkPath);
                if (dialog) dialog.finishItem(0);
            }

            if (dest === this.app.currentPath) {
                await this.app.navigateTo(this.app.currentPath, true, true);
            }
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        } catch (e) {
            handleFileSystemError("create", e, "shortcut");
        }
    }

    async pasteItems(destinationPath) {
        const { items, operation } = ClipboardManager.get();
        if (items.length === 0) return;

        if (RecycleBinManager.isRecycleBinPath(destinationPath)) {
            const totalSize = await this.getTotalSize(items);
            const dialog = new ProgressBarShowDialogWindow("recycle", items.length, totalSize);
            try {
                await RecycleBinManager.moveItemsToRecycleBin(items, dialog);
                if (operation === "cut") ClipboardManager.clear();
            } finally {
                dialog.close();
            }
            return;
        }

        if (items.some(p => RecycleBinManager.isRecycledItemPath(p))) {
            await this.moveItemsFromRecycleBin(items, destinationPath);
            if (operation === "cut") ClipboardManager.clear();
            return;
        }

        const totalSize = await this.getTotalSize(items);
        const dialog = new ProgressBarShowDialogWindow(operation, items.length, totalSize);

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

    async pasteShortcuts(destinationPath) {
        const { items, operation } = ClipboardManager.get();
        if (items.length === 0 || operation === "cut") return;

        const dialog = new ProgressBarShowDialogWindow("shortcut", items.length, 0);

        try {
            await this.createShortcuts(items, destinationPath, dialog);
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
                const targetPath = await this.getUniquePastePath(destinationPath, itemName, "cut", itemPath);
                if (itemPath !== targetPath) {
                    if (dialog) {
                        const stats = await fs.promises.stat(ShellManager.getRealPath(itemPath));
                        const sourceDir = getParentPath(itemPath);
                        dialog.update(itemPath, sourceDir, destinationPath, 0);
                        await fs.promises.rename(ShellManager.getRealPath(itemPath), ShellManager.getRealPath(targetPath));
                        dialog.finishItem(stats.isDirectory() ? 0 : stats.size);
                    } else {
                        await fs.promises.rename(ShellManager.getRealPath(itemPath), ShellManager.getRealPath(targetPath));
                    }
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
                const targetPath = await this.getUniquePastePath(destinationPath, itemName, "copy", itemPath);
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

    async getUniquePastePath(destPath, originalName, operation, sourcePath = null) {
        let effectiveName = originalName;

        if (operation !== "shortcut" && sourcePath) {
            const driveLabel = getDriveLabel(sourcePath);
            if (driveLabel) {
                effectiveName = driveLabel;
            }
        }

        if (operation === "shortcut") {
            const cleanName = originalName.replace(".lnk.json", "").replace(".lnk", "");
            let candidateName = `Shortcut to ${cleanName}.lnk.json`;
            let checkPath = normalizePath(joinPath(destPath, candidateName));
            try {
                await fs.promises.stat(ShellManager.getRealPath(checkPath));
                let counter = 2;
                while (true) {
                    candidateName = `Shortcut (${counter}) to ${cleanName}.lnk.json`;
                    checkPath = normalizePath(joinPath(destPath, candidateName));
                    try {
                        await fs.promises.stat(ShellManager.getRealPath(checkPath));
                        counter++;
                    } catch (e) { return checkPath; }
                }
            } catch (e) { return checkPath; }
        }

        let checkPath = normalizePath(joinPath(destPath, effectiveName));

        if (operation === "cut" && sourcePath && normalizePath(sourcePath) === normalizePath(checkPath)) {
            return checkPath;
        }

        try {
            await fs.promises.stat(ShellManager.getRealPath(checkPath));
        } catch (e) {
            return checkPath;
        }
        if (operation === "cut") {
            let name = effectiveName;
            let counter = 1;
            const extensionIndex = effectiveName.lastIndexOf('.');
            const hasExtension = extensionIndex > 0;
            const baseName = hasExtension ? effectiveName.substring(0, extensionIndex) : effectiveName;
            const ext = hasExtension ? effectiveName.substring(extensionIndex) : '';
            while (true) {
                name = hasExtension ? `${baseName} (${counter})${ext}` : `${effectiveName} (${counter})`;
                checkPath = normalizePath(joinPath(destPath, name));
                try {
                    await fs.promises.stat(checkPath);
                    counter++;
                } catch (e) { return checkPath; }
            }
        } else {
            const copyNOfRegex = /^Copy \((\d+)\) of (.*)$/;
            const copyOfRegex = /^Copy of (.*)$/;
            let baseName = effectiveName;
            let match;
            if ((match = effectiveName.match(copyNOfRegex))) baseName = match[2];
            else if ((match = effectiveName.match(copyOfRegex))) baseName = match[1];
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
        const realSrc = ShellManager.getRealPath(src);
        const realDest = ShellManager.getRealPath(dest);
        const stats = await fs.promises.stat(realSrc);
        if (stats.isDirectory()) {
            await fs.promises.mkdir(realDest, { recursive: true });
            const files = await fs.promises.readdir(realSrc);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.copyRecursive(joinPath(src, file), joinPath(dest, file), dialog);
            }
        } else {
            if (dialog) {
                await this.copyFileWithProgress(src, dest, stats.size, dialog);
                dialog.finishItem(stats.size);
            } else {
                const data = await fs.promises.readFile(realSrc);
                await fs.promises.writeFile(realDest, data);
            }
        }
    }

    async copyFileWithProgress(src, dest, totalSize, dialog) {
        const bufferSize = 64 * 1024;
        const buffer = new Uint8Array(bufferSize);
        let bytesReadTotal = 0;
        const handleIn = await fs.promises.open(ShellManager.getRealPath(src), 'r');
        const handleOut = await fs.promises.open(ShellManager.getRealPath(dest), 'w');
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
                const realPath = ShellManager.getRealPath(path);
                const stats = await fs.promises.stat(realPath);
                if (stats.isDirectory()) total += await this._getRecursiveSize(path);
                else total += stats.size;
            } catch (e) {}
        }
        return total;
    }

    async _getRecursiveSize(path) {
        let size = 0;
        try {
            const realPath = ShellManager.getRealPath(path);
            const files = await fs.promises.readdir(realPath);
            for (const file of files) {
                const fullPath = joinPath(path, file);
                const realFullPath = ShellManager.getRealPath(fullPath);
                const stats = await fs.promises.stat(realFullPath);
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

        const parentWindow = (this.app.win && this.app.win.id !== 'desktop') ? this.app.win : null;

        ShowDialogWindow({
            title: "Confirm File Delete",
            text: message,
            parentWindow: parentWindow,
            modal: true,
            buttons: [
                {
                    label: "Yes",
                    isDefault: true,
                    action: async () => {
                        const busyId = `delete-${Math.random()}`;
                        requestBusyState(busyId, this.app.win.element);
                        const totalSize = await this.getTotalSize(paths);
                        const dialog = new ProgressBarShowDialogWindow(isPermanent ? "delete" : "recycle", paths.length, totalSize);
                        try {
                            if (isPermanent) {
                                for (const path of paths) {
                                    if (dialog.cancelled) break;
                                    await this.removeRecursiveWithProgress(path, dialog);
                                }
                                if (alreadyInRecycle && !dialog.cancelled) {
                                    const recyclePath = RecycleBinManager.getRecyclePath(paths[0]);
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
        await this.app.enterRenameModeByPath(fullPath);
    }

    async createNewFolder() {
        const busyId = `create-folder-${Math.random()}`;
        let newPath = null;
        requestBusyState(busyId, this.app.win.element);
        try {
            const name = await this.getUniqueName(this.app.currentPath, "New Folder");
            newPath = joinPath(this.app.currentPath, name);
            await fs.promises.mkdir(ShellManager.getRealPath(newPath));
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        } catch (e) {
            handleFileSystemError("create", e, "folder");
        } finally {
            releaseBusyState(busyId, this.app.win.element);
            if (newPath) await this.app.enterRenameModeByPath(newPath);
        }
    }

    async createNewTextFile() {
        const busyId = `create-file-${Math.random()}`;
        let newPath = null;
        requestBusyState(busyId, this.app.win.element);
        try {
            const name = await this.getUniqueName(this.app.currentPath, "New Text Document", ".txt");
            newPath = joinPath(this.app.currentPath, name);
            await fs.promises.writeFile(ShellManager.getRealPath(newPath), "");
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        } catch (e) {
            handleFileSystemError("create", e, "file");
        } finally {
            releaseBusyState(busyId, this.app.win.element);
            if (newPath) await this.app.enterRenameModeByPath(newPath);
        }
    }

    async removeRecursiveWithProgress(path, dialog) {
        if (dialog && dialog.cancelled) return;
        let stats;
        const realPath = ShellManager.getRealPath(path);
        try { stats = await fs.promises.stat(realPath); } catch (e) { return; }
        const sourceDir = getParentPath(path);
        if (stats.isDirectory()) {
            const files = await fs.promises.readdir(realPath);
            for (const file of files) {
                if (dialog && dialog.cancelled) return;
                await this.removeRecursiveWithProgress(joinPath(path, file), dialog);
            }
            if (dialog && dialog.cancelled) return;
            await fs.promises.rmdir(realPath);
        } else {
            if (dialog) dialog.update(path, sourceDir, null, 0);
            await fs.promises.unlink(realPath);
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
                await fs.promises.stat(ShellManager.getRealPath(checkPath));
                counter++;
                name = `${baseName} (${counter})${extension}`;
            } catch (e) { return name; }
        }
    }

    async restoreItems(paths) {
        if (paths.length === 0) return;
        const busyId = `restore-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);
        const totalSize = await this.getTotalSize(paths);
        const dialog = new ProgressBarShowDialogWindow("restore", paths.length, totalSize);
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

    async moveItemsFromRecycleBin(paths, destinationPath) {
        if (paths.length === 0) return;
        const busyId = `move-from-recycle-${Math.random()}`;
        requestBusyState(busyId, this.app.win.element);
        const totalSize = await this.getTotalSize(paths);
        const dialog = new ProgressBarShowDialogWindow("move", paths.length, totalSize);
        try {
            await RecycleBinManager.moveItemsFromRecycleBin(paths, destinationPath, dialog);
        } catch (e) {
            handleFileSystemError("move", e, "items");
        } finally {
            dialog.close();
            releaseBusyState(busyId, this.app.win.element);
            await this.app.navigateTo(this.app.currentPath, true, true);
            document.dispatchEvent(new CustomEvent("fs-change", { detail: { sourceAppId: this.app.win.element.id } }));
        }
    }

    async emptyRecycleBin(path = null) {
        const targetPath = path || this.app.currentPath;
        const recyclePath = RecycleBinManager.getRecyclePath(targetPath) || targetPath;
        if (!RecycleBinManager.isRecycleBinPath(recyclePath)) return;

        const isEmpty = await RecycleBinManager.isEmpty(recyclePath);
        if (isEmpty) return;

        const parentWindow = (this.app.win && this.app.win.id !== 'desktop') ? this.app.win : null;

        ShowDialogWindow({
            title: "Confirm Empty Recycle Bin",
            text: "Are you sure you want to permanently delete all items in the Recycle Bin?",
            parentWindow: parentWindow,
            modal: true,
            buttons: [
                {
                    label: "Yes",
                    isDefault: true,
                    action: async () => {
                        const busyId = `empty-recycle-${Math.random()}`;
                        requestBusyState(busyId, this.app.win.element);
                        const metadata = await RecycleBinManager.getMetadata(recyclePath);
                        const ids = Object.keys(metadata);
                        const paths = ids.map(id => joinPath(recyclePath, id));
                        const totalSize = await this.getTotalSize(paths);
                        const dialog = new ProgressBarShowDialogWindow("empty", ids.length, totalSize);
                        try {
                            await RecycleBinManager.emptyRecycleBin(recyclePath, dialog);
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
            const parentWindow = (this.app.win && this.app.win.id !== 'desktop') ? this.app.win : null;
            ShowDialogWindow({
                title: "Undo",
                text: `Could not undo operation: ${e.message}`,
                parentWindow: parentWindow,
                modal: true,
                buttons: [{ label: "OK" }]
            });
        } finally {
            releaseBusyState(busyId, this.app.win.element);
        }
    }

    async _undoRename(data) {
        try { await fs.promises.stat(ShellManager.getRealPath(data.from)); throw new Error(`The destination already contains an item named '${getPathName(data.from)}'.`); }
        catch (e) { if (e.code !== 'ENOENT') throw e; }
        await fs.promises.rename(ShellManager.getRealPath(data.to), ShellManager.getRealPath(data.from));
    }

    async _undoMove(data) {
        for (let i = 0; i < data.to.length; i++) {
            const to = data.to[i];
            const from = data.from[i];
            await fs.promises.stat(ShellManager.getRealPath(to));
            try { await fs.promises.stat(ShellManager.getRealPath(from)); throw new Error(`The destination already contains an item named '${getPathName(from)}'.`); }
            catch (e) { if (e.code !== 'ENOENT') throw e; }
        }
        for (let i = 0; i < data.to.length; i++) await fs.promises.rename(ShellManager.getRealPath(data.to[i]), ShellManager.getRealPath(data.from[i]));
    }

    async _undoCopy(data) {
        for (const path of data.created) {
            try { await fs.promises.rm(ShellManager.getRealPath(path), { recursive: true }); }
            catch (e) { if (e.code !== 'ENOENT') throw e; }
        }
    }

    async _undoDelete(data) { await RecycleBinManager.restoreItems(data.recycledPaths || data.recycledIds); }

    async _undoCreate(data) {
        try { await fs.promises.rm(ShellManager.getRealPath(data.path), { recursive: true }); }
        catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
}
