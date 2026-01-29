/**
 * ZenSidebar component for ZenExplorer
 * Manages the sidebar UI element with icon and title
 */

export class ZenSidebar {
    constructor() {
        this.element = this._createSidebar();
        this.icon = this.element.querySelector(".sidebar-icon");
        this.title = this.element.querySelector(".sidebar-title");
    }

    /**
     * Create sidebar DOM structure
     * @private
     * @returns {HTMLElement} Sidebar element
     */
    _createSidebar() {
        const sidebar = document.createElement("div");
        sidebar.className = "explorer-sidebar";

        // Reuse the bitmap from explorer
        sidebar.style.backgroundImage = `url(${new URL("../../../assets/img/wvleft.bmp", import.meta.url).href})`;
        sidebar.style.backgroundRepeat = "no-repeat";

        const sidebarIcon = document.createElement("img");
        sidebarIcon.className = "sidebar-icon";
        sidebar.appendChild(sidebarIcon);

        const sidebarTitle = document.createElement("h1");
        sidebarTitle.className = "sidebar-title";
        sidebar.appendChild(sidebarTitle);

        const sidebarLine = document.createElement("img");
        sidebarLine.src = new URL("../../../assets/img/wvline.gif", import.meta.url).href;
        sidebarLine.style.width = "100%";
        sidebarLine.style.height = "auto";
        sidebar.appendChild(sidebarLine);

        return sidebar;
    }

    /**
     * Update sidebar content
     * @param {string} title - Title to display
     * @param {string} iconSrc - Icon source URL
     */
    update(title, iconSrc) {
        this.title.textContent = title;
        this.icon.src = iconSrc;
    }
}
