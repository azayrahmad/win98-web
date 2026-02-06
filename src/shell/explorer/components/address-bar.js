import "./address-bar.css";

export class AddressBar {
  constructor(options = {}) {
    this.options = options;
    this.element = document.createElement("div");
    this.element.className = "address-bar";

    const label = document.createElement("label");
    label.className = "address-bar-label";
    label.textContent = "Address";
    this.element.appendChild(label);

    // Combo box container
    this.combo = document.createElement("div");
    this.combo.className = "address-bar-combo inset-deep";
    this.element.appendChild(this.combo);

    // Input wrapper (Icon + Input)
    this.inputWrapper = document.createElement("div");
    this.inputWrapper.className = "address-bar-input-wrapper";
    this.combo.appendChild(this.inputWrapper);

    // Icon
    this.iconImg = document.createElement("img");
    this.iconImg.className = "address-bar-icon-img";
    this.iconImg.style.display = "none"; // Hidden until set
    this.inputWrapper.appendChild(this.iconImg);

    // Text Input
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "address-bar-input";
    if (this.options.placeholder) {
      this.input.placeholder = this.options.placeholder;
    }
    this.inputWrapper.appendChild(this.input);

    // Dropdown Button
    this.dropdownButton = document.createElement("button");
    this.dropdownButton.className = "address-bar-dropdown-button";
    this.combo.appendChild(this.dropdownButton);

    // Dropdown Menu
    this.dropdownMenu = document.createElement("div");
    this.dropdownMenu.className = "address-bar-dropdown";
    document.body.appendChild(this.dropdownMenu);

    if (this.options.onEnter) {
      this.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          this.options.onEnter(this.input.value);
          this.closeDropdown();
        }
      });
    }

    this.dropdownButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    this._handleClickOutside = (e) => {
      if (!this.combo.contains(e.target) && !this.dropdownMenu.contains(e.target)) {
        this.closeDropdown();
      }
    };

    this._currentIcon = null;
    this._currentPath = "/";
  }

  setIcon(iconUrl) {
    if (iconUrl) {
      this.iconImg.src = iconUrl;
      this.iconImg.style.display = "block";
    } else {
      this.iconImg.style.display = "none";
    }
  }

  setValue(value) {
    this.input.value = value;
  }

  getValue() {
    return this.input.value;
  }

  setCurrentPath(path) {
    this._currentPath = path;
  }

  async toggleDropdown() {
    if (this.dropdownMenu.classList.contains("show")) {
      this.closeDropdown();
    } else {
      await this.openDropdown();
    }
  }

  async openDropdown() {
    // Positioning
    const rect = this.combo.getBoundingClientRect();
    this.dropdownMenu.style.top = `${rect.bottom}px`;
    this.dropdownMenu.style.left = `${rect.left}px`;
    this.dropdownMenu.style.width = `${rect.width}px`;

    await this.renderTree();

    this.dropdownMenu.classList.add("show");
    document.addEventListener("mousedown", this._handleClickOutside);
  }

  closeDropdown() {
    this.dropdownMenu.classList.remove("show");
    document.removeEventListener("mousedown", this._handleClickOutside);
  }

  async renderTree() {
    this.dropdownMenu.innerHTML = "";
    if (!this.options.getTreeItems) {
        this.dropdownMenu.innerHTML = "<div class='address-bar-tree-item'>No items</div>";
        return;
    }

    const items = await this.options.getTreeItems(this._currentPath);
    items.forEach(item => {
        const div = document.createElement("div");
        div.className = "address-bar-tree-item";
        div.style.paddingLeft = `${item.indent * 16}px`;

        const img = document.createElement("img");
        img.src = item.icon;
        div.appendChild(img);

        const name = document.createElement("span");
        name.className = "address-bar-tree-item-name";
        name.textContent = item.name;
        div.appendChild(name);

        div.addEventListener("click", () => {
            if (this.options.onEnter) {
                this.options.onEnter(item.path);
            }
            this.closeDropdown();
        });

        this.dropdownMenu.appendChild(div);
    });
  }

  destroy() {
    if (this.dropdownMenu && this.dropdownMenu.parentElement) {
        this.dropdownMenu.parentElement.removeChild(this.dropdownMenu);
    }
    document.removeEventListener("mousedown", this._handleClickOutside);
  }
}
