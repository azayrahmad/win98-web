// src/components/IconManager.js

export class IconManager {
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.iconSelector = options.iconSelector || ".desktop-icon";
    this.selectedIcons = new Set();
    this.lasso = null;
    this.isLassoing = false;
    this.wasLassoing = false;

    this.init();
  }

  init() {
    this.container.addEventListener(
      "mousedown",
      this.handleMouseDown.bind(this),
    );
    this.container.addEventListener("click", this.handleClick.bind(this));
    this.container.addEventListener(
      "contextmenu",
      this.handleContextMenu.bind(this),
    );
  }

  // Internal methods that don't trigger the callback
  _clear() {
    this.selectedIcons.forEach((icon) => {
      this.toggleHighlight(icon, false);
    });
    this.selectedIcons.clear();
  }

  _add(icon) {
    if (!this.selectedIcons.has(icon)) {
      this.selectedIcons.add(icon);
      this.toggleHighlight(icon, true);
    }
  }

  _remove(icon) {
    if (this.selectedIcons.has(icon)) {
      this.selectedIcons.delete(icon);
      this.toggleHighlight(icon, false);
    }
  }

  // Public method to set the selection and trigger the callback
  setSelection(newSelection) {
    const currentSelection = new Set(this.selectedIcons);
    let changed = false;

    // Remove icons that are no longer in the new selection
    currentSelection.forEach(icon => {
      if (!newSelection.has(icon)) {
        this._remove(icon);
        changed = true;
      }
    });

    // Add icons from the new selection
    newSelection.forEach(icon => {
      if (!currentSelection.has(icon)) {
        this._add(icon);
        changed = true;
      }
    });

    if (changed && this.options.onSelectionChange) {
      this.options.onSelectionChange();
    }
  }

  clearSelection() {
    this.setSelection(new Set());
  }

  selectIcon(icon) {
    const newSelection = new Set(this.selectedIcons);
    newSelection.add(icon);
    this.setSelection(newSelection);
  }

  toggleHighlight(icon, shouldHighlight) {
    const iconImg = icon.querySelector(".icon img");
    const iconLabel = icon.querySelector(".icon-label");

    if (shouldHighlight) {
      icon.classList.add("selected");
      if (iconImg) iconImg.classList.add("highlighted-icon");
      if (iconLabel) {
        iconLabel.classList.add("highlighted-label", "selected");
      }
    } else {
      icon.classList.remove("selected");
      if (iconImg) iconImg.classList.remove("highlighted-icon");
      if (iconLabel) {
        iconLabel.classList.remove("highlighted-label", "selected");
      }
    }
  }

  isIntersecting(rect1, rect2) {
    return !(
      rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom
    );
  }

  handleMouseDown(e) {
    if (e.target !== this.container) return; // Only start lasso on container itself
    if (e.button !== 0) return; // Only for left click

    this.isLassoing = true;
    const containerRect = this.container.getBoundingClientRect();
    const lassoStartX = e.clientX - containerRect.left + this.container.scrollLeft;
    const lassoStartY = e.clientY - containerRect.top + this.container.scrollTop;


    this.lasso = document.createElement("div");
    this.lasso.className = "lasso";
    this.lasso.style.left = `${lassoStartX}px`;
    this.lasso.style.top = `${lassoStartY}px`;
    this.container.appendChild(this.lasso);

    this.clearSelection();
    e.preventDefault();

    const onMouseMove = (moveEvent) => {
      if (!this.isLassoing) return;
      this.wasLassoing = true;

      const currentX = moveEvent.clientX - containerRect.left + this.container.scrollLeft;
      const currentY = moveEvent.clientY - containerRect.top + this.container.scrollTop;

      const width = Math.abs(currentX - lassoStartX);
      const height = Math.abs(currentY - lassoStartY);
      const left = Math.min(currentX, lassoStartX);
      const top = Math.min(currentY, lassoStartY);

      this.lasso.style.width = `${width}px`;
      this.lasso.style.height = `${height}px`;
      this.lasso.style.left = `${left}px`;
      this.lasso.style.top = `${top}px`;

      const lassoRect = this.lasso.getBoundingClientRect();
      const icons = this.container.querySelectorAll(this.iconSelector);
      const newSelection = new Set();

      icons.forEach((icon) => {
        const iconRect = icon.getBoundingClientRect();
        if (this.isIntersecting(lassoRect, iconRect)) {
          newSelection.add(icon);
        }
      });
      this.setSelection(newSelection);
    };

    const onMouseUp = () => {
      this.isLassoing = false;
      if (this.lasso && this.lasso.parentElement) {
        this.lasso.parentElement.removeChild(this.lasso);
      }
      this.lasso = null;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      setTimeout(() => {
        this.wasLassoing = false;
      }, 0);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  handleClick(e) {
    if (this.wasLassoing) {
      this.wasLassoing = false;
      e.stopImmediatePropagation();
      return;
    }
    if (
      e.target === this.container &&
      !this.isLassoing &&
      !e.target.closest(this.iconSelector)
    ) {
      this.clearSelection();
    }
  }

  handleContextMenu(e) {
    if (e.target === this.container) {
      if (this.options.onBackgroundContext) {
        e.preventDefault();
        this.options.onBackgroundContext(e);
      }
    } else {
      const icon = e.target.closest(this.iconSelector);
      if (icon && this.options.onItemContext) {
        e.preventDefault();
        if (!this.selectedIcons.has(icon)) {
          this.setSelection(new Set([icon]));
        }
        this.options.onItemContext(e, icon);
      }
    }
  }

  configureIcon(icon) {
    icon.addEventListener("mousedown", (e) =>
      this.handleIconMouseDown(e, icon),
    );
    icon.addEventListener("click", (e) => this.handleIconClick(e, icon));

    // Allow context menu events to propagate to the container for onItemContext handling
    // icon.addEventListener("contextmenu", e => e.stopPropagation());
  }

  handleIconMouseDown(e, icon) {
    if (e.button !== 0) return; // Only left-click
    e.stopPropagation();

    if (!e.ctrlKey && !this.selectedIcons.has(icon)) {
      this.setSelection(new Set([icon]));
    }
  }

  handleIconClick(e, icon) {
    e.stopPropagation();

    // The drag handler in desktop.js will set wasDragged. If it's true, we don't process the click.
    if (this.wasDragged) {
      this.wasDragged = false;
      return;
    }
    const newSelection = new Set(this.selectedIcons);
    if (e.ctrlKey) {
      if (newSelection.has(icon)) {
        newSelection.delete(icon);
      } else {
        newSelection.add(icon);
      }
    } else {
      newSelection.clear();
      newSelection.add(icon);
    }
    this.setSelection(newSelection);
  }
}
