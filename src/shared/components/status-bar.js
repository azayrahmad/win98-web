import { ICONS } from '../../config/icons.js';

export class StatusBar {
  constructor() {
    this.element = window.os_gui_utils.E("div", {
      className: "status-bar",
      style: "display: flex; gap: 2px;",
    });

    const leftSection = window.os_gui_utils.E("div", {
      className: "status-bar-field",
      style:
        "flex: 1; display: flex; align-items: center; gap: 4px; padding: 0 2px; border: 1px inset;",
    });

    this.statusText = window.os_gui_utils.E("div", {
      style:
        "flex: 3; padding: 2px 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; height: 16px;",
    });

    leftSection.append(this.statusText);

    const rightSection = window.os_gui_utils.E("div", {
      className: "status-bar-field",
      style:
        "width: 150px; display: flex; align-items: center; gap: 4px; padding: 2px 4px; border: 1px inset;",
    });

    const myComputerIcon = window.os_gui_utils.E("img", {
      src: ICONS.computer[16],
      style: "width: 16px; height: 16px;",
    });

    const myComputerText = document.createTextNode("My Computer");
    rightSection.append(myComputerIcon, myComputerText);

    this.element.append(leftSection, rightSection);
  }

  setText(text) {
    this.statusText.textContent = text;
  }
}
