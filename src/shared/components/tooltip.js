// tooltip.js - A simple tooltip component
export class Tooltip {
  constructor(text, targetElement) {
    this.text = text;
    this.targetElement = targetElement;
    this.element = null;
    this._create();
  }

  _create() {
    this.element = document.createElement('div');
    this.element.className = 'tooltip';
    if (this.text) {
        this.element.innerHTML = marked.parseInline(this.text, { breaks: true });
    }
    document.body.appendChild(this.element);

    this._position();

    // Using a timeout to ensure the event listener is set up after the current event cycle
    setTimeout(() => {
        document.addEventListener('pointerdown', this._close.bind(this), { once: true });
        window.addEventListener('blur', this._close.bind(this), { once: true });
        this.targetElement.addEventListener('contextmenu', this._close.bind(this), { once: true });
    }, 0);
  }

  _position() {
    const targetRect = this.targetElement.getBoundingClientRect();
    const tooltipRect = this.element.getBoundingClientRect();

    let top = targetRect.bottom + 5;
    let left = targetRect.left + (targetRect.width / 2) - (tooltipRect.width / 2);

    // Adjust if it goes off-screen
    if (left < 0) {
      left = 5;
    }
    if (top + tooltipRect.height > window.innerHeight) {
      top = targetRect.top - tooltipRect.height - 5;
    }

    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
  }

  _close() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
