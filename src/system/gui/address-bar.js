import { E } from '../../shared/utils/gui-utils.js';

/**
 * AddressBar modernized ES6 class.
 * Ported from public/os-gui/AddressBar.js
 */
export class AddressBar {
    constructor(items) {
        this.items = items;
        this.selectedItem = null;
        this.dropdownVisible = false;

        this._initElement();
    }

    _initElement() {
        this.element = E("nav", {
            class: "address-bar",
            role: "combobox",
            "aria-label": "Address Bar"
        });

        const addressLabel = E("div", { class: "address-label" });
        addressLabel.textContent = "Address";
        this.element.appendChild(addressLabel);

        this.selectedItemContainer = E("div", { class: "selected-item-container" });
        this.element.appendChild(this.selectedItemContainer);

        const dropdownButton = E("button", { class: "dropdown-button" });
        dropdownButton.innerHTML = '&#9662;'; // Down arrow
        this.element.appendChild(dropdownButton);

        this.dropdownListContainer = E("div", { class: "dropdown-list-container" });
        this.dropdownListContainer.style.display = "none";
        this.element.appendChild(this.dropdownListContainer);

        this.selectedItem = this.findInitialSelectedItem(this.items);
        this.renderSelectedItem(this.selectedItem);
        this.renderDropdownList(this.items, this.dropdownListContainer, 0);

        dropdownButton.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        const onClickOutside = (e) => {
            if (!this.element.contains(e.target)) {
                this.hideDropdown();
            }
        };
        document.addEventListener("click", onClickOutside);

        // Cleanup listener if needed (though GUI elements often live as long as the window)
        this._cleanup = () => document.removeEventListener("click", onClickOutside);
    }

    findInitialSelectedItem(items) {
        for (const item of items) {
            if (item.selected) {
                return item;
            }
            if (item.children) {
                const found = this.findInitialSelectedItem(item.children);
                if (found) {
                    return found;
                }
            }
        }
        return this.items[0];
    }

    renderSelectedItem(item) {
        if (!item) return;
        this.selectedItemContainer.innerHTML = "";
        const icon = E("img", { src: item.icon, class: "selected-item-icon" });
        const label = E("span", { class: "selected-item-label" });
        label.textContent = item.label;
        this.selectedItemContainer.appendChild(icon);
        this.selectedItemContainer.appendChild(label);
    }

    toggleDropdown() {
        this.dropdownVisible = !this.dropdownVisible;
        this.dropdownListContainer.style.display = this.dropdownVisible ? "block" : "none";
    }

    hideDropdown() {
        this.dropdownVisible = false;
        this.dropdownListContainer.style.display = "none";
    }

    renderDropdownList(items, parentElement, level) {
        items.forEach(item => {
            const listItem = E("div", { class: "dropdown-list-item" });
            listItem.style.paddingLeft = `${level * 20}px`;

            const icon = E("img", { src: item.icon, class: "list-item-icon" });
            const label = E("span", { class: "list-item-label" });
            label.textContent = item.label;

            listItem.appendChild(icon);
            listItem.appendChild(label);

            listItem.addEventListener("click", () => {
                this.selectItem(item);
            });

            parentElement.appendChild(listItem);

            if (item.children) {
                this.renderDropdownList(item.children, parentElement, level + 1);
            }
        });
    }

    selectItem(item) {
        this.selectedItem = item;
        this.renderSelectedItem(item);
        this.hideDropdown();
        if (item.action) {
            item.action();
        }
    }
}
