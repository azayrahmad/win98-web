/**
 * NavigationHistory - Manages navigation history and MRU folders
 */

export class NavigationHistory {
    constructor() {
        this.history = [];
        this.historyIndex = -1;
        this.mruFolders = []; // Array of { id, path, timestamp, manuallySelected }
        this.mruMaxSize = 10;
        this.nextMruId = 1;
        this.manuallySelectedPath = null; // Track which path user manually selected
        this.manuallySelectedId = null; // Track which specific entry ID was manually selected
    }

    /**
     * Push a new path to history
     * @param {string} path - Path to add
     */
    push(path) {
        // If we are at some point in history and not at the end, nuke forward history
        if (this.historyIndex < this.history.length - 1) {
            this.history.splice(this.historyIndex + 1);
        }

        // Avoid pushing duplicate consecutive paths
        if (this.history[this.historyIndex] !== path) {
            this.history.push(path);
            this.historyIndex = this.history.length - 1;
        }
    }

    /**
     * Add path to MRU (Most Recently Used) list
     * @param {string} path - Path to add
     * @param {boolean} isManualSelection - Whether this was manually selected by user
     */
    addToMRU(path, isManualSelection = false) {
        // If there's a manually selected entry, remove all entries after it
        if (this.manuallySelectedId !== null && !isManualSelection) {
            const selectedIndex = this.mruFolders.findIndex(e => e.id === this.manuallySelectedId);
            if (selectedIndex !== -1) {
                // Keep entries up to and including the selected one
                this.mruFolders = this.mruFolders.slice(0, selectedIndex + 1);
            }
            // Clear the manual selection since we're branching from it
            this.manuallySelectedId = null;
            this.manuallySelectedPath = null;
        }

        // Add new entry with unique ID and timestamp
        const newEntry = {
            id: this.nextMruId++,
            path: path,
            timestamp: Date.now(),
            manuallySelected: isManualSelection
        };

        this.mruFolders.push(newEntry);

        // Keep only the latest entries up to max size
        if (this.mruFolders.length > this.mruMaxSize) {
            this.mruFolders = this.mruFolders.slice(-this.mruMaxSize);
        }

        // Track manually selected path
        if (isManualSelection) {
            this.manuallySelectedPath = path;
            this.manuallySelectedId = newEntry.id; // Also track the ID of the newly selected entry
        }
    }

    /**
     * Mark a path as manually selected
     * @param {string} path - Path that was manually selected
     */
    markAsManuallySelected(path) {
        const entry = this.mruFolders.find(e => e.path === path);
        if (entry) {
            entry.manuallySelected = true;
            this.manuallySelectedPath = path;
        }
    }

    /**
     * Mark a specific entry as manually selected by ID
     * @param {number} id - ID of the entry that was manually selected
     */
    markAsManuallySelectedById(id) {
        const entry = this.mruFolders.find(e => e.id === id);
        if (entry) {
            entry.manuallySelected = true;
            this.manuallySelectedPath = entry.path;
            this.manuallySelectedId = id;
        }
    }

    /**
     * Check if can go back in history
     * @returns {boolean}
     */
    canGoBack() {
        return this.historyIndex > 0;
    }

    /**
     * Check if can go forward in history
     * @returns {boolean}
     */
    canGoForward() {
        return this.historyIndex < this.history.length - 1;
    }

    /**
     * Go back in history
     * @returns {string|null} Previous path or null if can't go back
     */
    goBack() {
        if (this.canGoBack()) {
            this.historyIndex--;
            return this.history[this.historyIndex];
        }
        return null;
    }

    /**
     * Go forward in history
     * @returns {string|null} Next path or null if can't go forward
     */
    goForward() {
        if (this.canGoForward()) {
            this.historyIndex++;
            return this.history[this.historyIndex];
        }
        return null;
    }

    /**
     * Get MRU folders list
     * @returns {Array<{id: number, path: string, timestamp: number, manuallySelected: boolean}>}
     */
    getMRUFolders() {
        return [...this.mruFolders];
    }

    /**
     * Get the selected path (either manually selected or latest)
     * @returns {string|null}
     */
    getSelectedMRUPath() {
        if (this.manuallySelectedPath) {
            // Check if manually selected path still exists in MRU
            const exists = this.mruFolders.some(e => e.path === this.manuallySelectedPath);
            if (exists) {
                return this.manuallySelectedPath;
            }
        }

        // Return the entry with the highest ID (latest added)
        if (this.mruFolders.length > 0) {
            const latestEntry = this.mruFolders.reduce((max, entry) =>
                entry.id > max.id ? entry : max
            );
            return latestEntry.path;
        }

        return null;
    }

    /**
     * Get the ID of the selected MRU entry
     * @returns {number|null}
     */
    getSelectedMRUId() {
        // If user manually selected a specific entry by ID, return that
        if (this.manuallySelectedId !== null) {
            const entry = this.mruFolders.find(e => e.id === this.manuallySelectedId);
            if (entry) {
                return this.manuallySelectedId;
            }
        }

        if (this.manuallySelectedPath) {
            // Find the entry with the manually selected path and highest ID
            const matchingEntries = this.mruFolders.filter(e => e.path === this.manuallySelectedPath);
            if (matchingEntries.length > 0) {
                // Return the one with highest ID if multiple exist
                const selected = matchingEntries.reduce((max, entry) =>
                    entry.id > max.id ? entry : max
                );
                return selected.id;
            }
        }

        // Return the entry with the highest ID (latest added)
        if (this.mruFolders.length > 0) {
            const latestEntry = this.mruFolders.reduce((max, entry) =>
                entry.id > max.id ? entry : max
            );
            return latestEntry.id;
        }

        return null;
    }
}
