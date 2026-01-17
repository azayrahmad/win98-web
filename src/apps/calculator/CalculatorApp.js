// CalculatorApp.js - Main logic for the calculator application
import { Application } from "../Application.js";
import { CalculatorLogic } from "./calculator-logic.js";
import { ShowDialogWindow } from "../../components/DialogWindow.js";
import { Tooltip } from "../../components/Tooltip.js";
import buttonDefinitions from "./buttons.js"; // Import the centralized button definitions
import "./calculator.css";
import { ICONS } from "../../config/icons.js";
import helpData from "./help.json";

export class CalculatorApp extends Application {
  static config = {
    id: "calculator",
    title: "Calculator",
    description: "Perform calculations.",
    icon: ICONS.calculator,
    width: 260,
    height: 280,
    resizable: false,
  };

  constructor(config) {
    super(config);
    this.win = null;
    this.logic = new CalculatorLogic();
    this.mode = "standard"; // 'standard' or 'scientific'
    this.statisticsWindow = null;
    this.areStatisticsButtonsActive = false;
    this.selectedStatisticsIndex = -1;
  }

  _createWindow() {
    this.win = new $Window({
      id: this.id,
      title: this.title,
      resizable: false, // Window is not resizable
      icons: this.icon,
      maximizable: false, // Disable maximize button based on reference image
    });

    const menuBar = this._createMenuBar();
    this.win.setMenuBar(menuBar);

    this.win.$content.html(`
            <div class="calculator-container">
                <div class="calculator-display-container">
                    <div class="calculator-display inset-deep">0.</div>
                </div>
                <div class="calculator-buttons"></div>
            </div>
        `);

    this._renderButtons();
    this._updateDisplay();
    this._updateNestingLevelDisplay();

    return this.win;
  }

  _createMenuBar() {
    return new MenuBar({
      "&Edit": [
        {
          label: "&Copy",
          shortcutLabel: "Ctrl+C",
          action: () => this._copyToClipboard(),
        },
        {
          label: "&Paste",
          shortcutLabel: "Ctrl+V",
          action: () => this._pasteFromClipboard(),
        },
      ],
      "&View": [
        {
          radioItems: [
            { label: "&Standard", value: "standard" },
            { label: "Sc&ientific", value: "scientific" },
          ],
          getValue: () => this.mode,
          setValue: (value) => this._setMode(value),
        },
      ],
      "&Help": [
        {
          label: "Help &Topics",
          action: () => window.System.launchApp("help", helpData),
        },
        {
          label: "&About Calculator",
          action: () => this._showAboutDialog(),
        },
      ],
    });
  }

  _setMode(newMode) {
    if (this.mode === newMode) return;
    this.mode = newMode;
    this._renderButtons();
    this.win.element
      .querySelector(".menus")
      .dispatchEvent(new CustomEvent("update"));
    this._updateNestingLevelDisplay();
  }

  _renderButtons() {
    const buttonsContainer = this.win.$content.find(".calculator-buttons")[0];
    buttonsContainer.innerHTML = ""; // Clear existing buttons

    const existingControls = this.win.$content.find(".scientific-controls")[0];
    if (existingControls) {
      existingControls.remove();
    }

    const layout =
      this.mode === "standard"
        ? this._getStandardLayout()
        : this._getScientificLayout();

    if (this.mode === "scientific") {
      this._renderScientificControls();
    }

    if (this.mode === "standard") {
      const standardContainer = document.createElement("div");
      standardContainer.className = "standard-layout-container";

      // Column 1: Memory section
      const memorySection = document.createElement("div");
      memorySection.className = "memory-section";
      memorySection.innerHTML =
        '<div id="memory-indicator" class="inset-deep calc-indicator"></div>';
      const memoryButtons = document.createElement("div");
      memoryButtons.className = "memory-buttons";
      layout.memory.forEach((key) => {
        const button = buttonDefinitions[key];
        if (button) {
          memoryButtons.appendChild(button.render(this));
        }
      });
      memorySection.appendChild(memoryButtons);
      standardContainer.appendChild(memorySection);

      // Column 2: Main area
      const mainArea = document.createElement("div");
      mainArea.className = "main-area";

      const controlButtons = document.createElement("div");
      controlButtons.className = "control-buttons";
      layout.controls.forEach((key) => {
        const button = buttonDefinitions[key];
        if (button) {
          controlButtons.appendChild(button.render(this));
        }
      });
      mainArea.appendChild(controlButtons);

      const mainButtons = document.createElement("div");
      mainButtons.className = "main-buttons";
      layout.main.forEach((row) => {
        row.forEach((key) => {
          const button = buttonDefinitions[key];
          if (button) {
            mainButtons.appendChild(button.render(this));
          }
        });
      });
      mainArea.appendChild(mainButtons);
      standardContainer.appendChild(mainArea);
      buttonsContainer.appendChild(standardContainer);
    } else {
      // Scientific mode
      const scientificContainer = document.createElement("div");
      scientificContainer.className = "scientific-layout-container";

      // Group 1: Sta column
      const staGroup = document.createElement("div");
      staGroup.className = "calc-sci-button-group sta-group";
      layout.sta.forEach((key) => {
        const button = buttonDefinitions[key];
        if (button) {
          staGroup.appendChild(button.render(this));
        }
      });
      scientificContainer.appendChild(staGroup);

      // Group 2: Functions columns
      const functionsGroup = document.createElement("div");
      functionsGroup.className = "calc-sci-button-group functions-group";
      layout.functions.forEach((col) => {
        const colDiv = document.createElement("div");
        colDiv.className = "button-column";
        col.forEach((key) => {
          const button = buttonDefinitions[key];
          if (button) {
            colDiv.appendChild(button.render(this));
          }
        });
        functionsGroup.appendChild(colDiv);
      });
      scientificContainer.appendChild(functionsGroup);

      // Group 3: Memory column
      const memoryGroup = document.createElement("div");
      memoryGroup.className = "calc-sci-button-group memory-group";
      layout.memory.forEach((key) => {
        const button = buttonDefinitions[key];
        if (button) {
          memoryGroup.appendChild(button.render(this));
        }
      });
      scientificContainer.appendChild(memoryGroup);

      // Group 4: Main digits and operators
      const mainGroup = document.createElement("div");
      mainGroup.className = "calc-sci-button-group main-group";
      layout.main.forEach((row) => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "button-row";
        row.forEach((key) => {
          const button = buttonDefinitions[key];
          if (button) {
            rowDiv.appendChild(button.render(this));
          }
        });
        mainGroup.appendChild(rowDiv);
      });
      scientificContainer.appendChild(mainGroup);

      buttonsContainer.appendChild(scientificContainer);

      const controlButtons = document.createElement("div");
      controlButtons.className = "control-buttons";
      layout.controls.forEach((key) => {
        const button = buttonDefinitions[key];
        if (button) {
          controlButtons.appendChild(button.render(this));
        }
      });
      const controlRow = this.win.$content.find(".control-row-bottom")[0];
      controlRow.appendChild(controlButtons);
    }

    this._updateMemoryIndicator();
    if (this.mode === "scientific") {
      this._updateHexButtonState();
      this._updateStatisticsButtonState();
    }
  }

  _getStandardLayout() {
    return {
      memory: ["MC", "MR", "MS", "M+"],
      controls: ["Backspace", "CE", "Clear"],
      main: [
        ["7", "8", "9", "/", "sqrt"],
        ["4", "5", "6", "*", "%"],
        ["1", "2", "3", "-", "1/x"],
        ["0", "+/-", ".", "+", "="],
      ],
    };
  }

  _getScientificLayout() {
    return {
      sta: ["Sta", "Ave", "Sum", "s", "Dat"],
      functions: [
        ["F-E", "dms", "sin", "cos", "tan"],
        ["(", "Exp", "x^y", "x^3", "x^2"],
        [")", "ln", "log", "n!", "1/x"],
      ],
      memory: ["MC", "MR", "MS", "M+", "pi"],
      controls: ["Backspace", "CE", "Clear"],
      main: [
        ["7", "8", "9", "/", "Mod", "And"],
        ["4", "5", "6", "*", "Or", "Xor"],
        ["1", "2", "3", "-", "Lsh", "Not"],
        ["0", "+/-", ".", "+", "=", "Int"],
        ["A", "B", "C", "D", "E", "F"],
      ],
    };
  }

  _renderScientificControls() {
    const controlsHTML = `
            <div class="scientific-controls">
                <div class="control-row">
                    <fieldset class="group-box">
                        <div class="field-row" data-tooltip-id="hex"><input type="radio" name="number-system" id="hex" value="16"><label for="hex">Hex</label></div>
                        <div class="field-row" data-tooltip-id="dec"><input type="radio" name="number-system" id="dec" value="10" checked><label for="dec">Dec</label></div>
                        <div class="field-row" data-tooltip-id="oct"><input type="radio" name="number-system" id="oct" value="8"><label for="oct">Oct</label></div>
                        <div class="field-row" data-tooltip-id="bin"><input type="radio" name="number-system" id="bin" value="2"><label for="bin">Bin</label></div>
                    </fieldset>
                    <fieldset class="group-box">
                        <div class="field-row" data-tooltip-id="degrees"><input type="radio" name="angle-measure" id="degrees" value="degrees" checked><label for="degrees">Degrees</label></div>
                        <div class="field-row" data-tooltip-id="radians"><input type="radio" name="angle-measure" id="radians" value="radians"><label for="radians">Radians</label></div>
                        <div class="field-row" data-tooltip-id="gradients"><input type="radio" name="angle-measure" id="gradients" value="gradients"><label for="gradients">Gradients</label></div>
                    </fieldset>
                </div>
                <div class="control-row control-row-bottom">
                  <fieldset class="group-box calc-func-switch">
                    <div class="checkbox-container" data-tooltip-id="inv"><input type="checkbox" id="inv"><label for="inv">Inv</label></div>
                    <div class="checkbox-container" data-tooltip-id="hyp"><input type="checkbox" id="hyp"><label for="hyp">Hyp</label></div>
                  </fieldset>
                  <div id="nesting-level-indicator" class="inset-deep calc-indicator"></div>
                  <div id="memory-indicator" class="inset-deep calc-indicator"></div>
                  <div style="width: 44px;"></div>
                </div>
            </div>
        `;

    const displayContainer = this.win.$content.find(
      ".calculator-display-container",
    )[0];
    displayContainer.insertAdjacentHTML("afterend", controlsHTML);

    const tooltips = {
      hex: "Hexadecimal (base 16)",
      dec: "Decimal (base 10)",
      oct: "Octal (base 8)",
      bin: "Binary (base 2)",
      degrees: "Degrees",
      radians: "Radians",
      gradients: "Gradians",
      inv: "Sets the inverse function for sin, cos, tan, PI, x^y, x^2, x^3, ln, log, Ave, Sum, and s.\nThe functions automatically turn off the inverse function after a calculation is completed.",
      hyp: "Sets the hyperbolic function for sin, cos, and tan.\nThe functions automatically turn off the hyperbolic function after a calculation is completed.",
    };

    Object.entries(tooltips).forEach(([id, text]) => {
      const element = this.win.$content.find(`[data-tooltip-id="${id}"]`)[0];
      if (element) {
        element.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          new window.ContextMenu(
            [
              {
                label: "What's this?",
                action: () => new Tooltip(text, element),
              },
            ],
            e,
          );
        });
      }
    });

    $.each(
      this.win.$content.find('input[name="number-system"]'),
      (index, radio) => {
        radio.addEventListener("change", (e) =>
          this._handleBaseChange(parseInt(e.target.value)),
        );
      },
    );
    $.each(
      this.win.$content.find('input[name="angle-measure"]'),
      (index, radio) => {
        radio.addEventListener("change", (e) =>
          this.logic.setAngleUnit(e.target.value),
        );
      },
    );

    const invCheckbox = this.win.$content.find("#inv")[0];
    if (invCheckbox) {
      invCheckbox.addEventListener("change", () => {
        this.logic.toggleInverse();
        // Force update to sync if logic rejected it? No, just toggle.
      });
    }

    const hypCheckbox = this.win.$content.find("#hyp")[0];
    if (hypCheckbox) {
      hypCheckbox.addEventListener("change", () => {
        this.logic.toggleHyperbolic();
      });
    }
  }

  _handleBaseChange(newBase) {
    this.logic.setBase(newBase);
    this._updateDisplay();
    this._updateHexButtonState();
  }

  _updateHexButtonState() {
    const hexButtons = this.win.$content.find(
      '[data-id="A"], [data-id="B"], [data-id="C"], [data-id="D"], [data-id="E"], [data-id="F"]',
    );
    const disabled = this.logic.base !== 16;
    Array.from(hexButtons).forEach((button) => (button.disabled = disabled));
  }

  _updateMemoryIndicator() {
    const indicator = this.win.$content.find("#memory-indicator")[0];
    if (indicator) {
      indicator.textContent = this.logic.memory !== 0 ? "M" : "";
    }
  }

  _updateDisplay() {
    const display = this.win.$content.find(".calculator-display")[0];
    display.textContent = this.logic.currentValue;
  }

  _updateNestingLevelDisplay() {
    const indicator = this.win.$content.find("#nesting-level-indicator")[0];
    if (!indicator) return;

    const level = this.logic.getParenthesisLevel();
    if (level > 0) {
      indicator.textContent = `( = ${level}`;
    } else {
      indicator.textContent = "";
    }
  }

  _updateCheckboxes() {
    const inv = this.win.$content.find("#inv")[0];
    const hyp = this.win.$content.find("#hyp")[0];
    if (inv) inv.checked = this.logic.isInverse;
    if (hyp) hyp.checked = this.logic.isHyperbolic;
  }

  _copyToClipboard() {
    navigator.clipboard.writeText(this.logic.currentValue).catch((err) => {
      console.error("Could not copy text: ", err);
    });
  }

  _pasteFromClipboard() {
    navigator.clipboard
      .readText()
      .then((text) => {
        if (!isNaN(parseFloat(text)) && isFinite(text)) {
          this.logic.currentValue = text;
          this.logic.isNewNumber = true;
          this._updateDisplay();
        }
      })
      .catch((err) => {
        console.error("Could not paste text: ", err);
      });
  }

  _showAboutDialog() {
    ShowDialogWindow({
      title: "About Calculator",
      text: "A Windows 98 style calculator.",
      buttons: [{ label: "OK", isDefault: true }],
    });
  }

  _onLaunch(data) {
    this.win.element.addEventListener("keydown", (e) => {
      e.preventDefault();
      this._handleKeyPress(e.key);
    });

    this.win.element.addEventListener("button-action-complete", () => {
      this._updateDisplay();
      this._updateNestingLevelDisplay();
      this._updateCheckboxes();
    });
  }

  _triggerButtonAction(key) {
    const button = buttonDefinitions[key];
    if (button && button.action) {
      this.win.element.dispatchEvent(new CustomEvent("button-action-start"));
      button.action(this);
      this.win.element.dispatchEvent(new CustomEvent("button-action-complete"));
    }
  }

  _handleKeyPress(key) {
    // Normalize key for certain inputs
    if (key === "Enter") key = "=";
    if (key === "Escape") key = "C";

    this._triggerButtonAction(key);
  }

  _openStatisticsWindow() {
    if (this.statisticsWindow && !this.statisticsWindow.closed) {
      this.statisticsWindow.focus();
      return;
    }

    this.statisticsWindow = new $Window({
      title: "Statistics Box",
      outerWidth: 200,
      outerHeight: 250,
      resizable: false,
      maximizeButton: false,
      minimizeButton: false,
      icons: ICONS.windows,
    });

    this.statisticsWindow.$content.html(`
      <div class="statistics-container" style="display: flex; flex-direction: column; height: 100%; padding: 5px;">
        <ul class="statistics-list inset-deep" style="flex-grow: 1; margin: 0; padding: 0; height: 100px;"></ul>
        <div class="statistics-buttons" style="display: flex; justify-content: space-around; margin: 5px 0;">
          <button data-action="ret">RET</button>
          <button data-action="load">LOAD</button>
          <button data-action="cd">CD</button>
          <button data-action="cad">CAD</button>
        </div>
        <div class="statistics-count" style="text-align: center;">n=0</div>
      </div>
    `);

    this._setupStatisticsEventListeners();

    this.areStatisticsButtonsActive = true;
    this.selectedStatisticsIndex =
      this.logic.statisticsData.length > 0 ? 0 : -1;
    this._updateStatisticsButtonState();
    this._updateStatisticsDisplay();

    this.statisticsWindow.onClosed = () => {
      this.areStatisticsButtonsActive = false;
      this._updateStatisticsButtonState();
      this.statisticsWindow = null;
      this.selectedStatisticsIndex = -1;
    };
  }

  _setupStatisticsEventListeners() {
    const content = this.statisticsWindow.$content;

    content.on("click", ".statistics-list li", (e) => {
      const index = $(e.currentTarget).index();
      this.selectedStatisticsIndex = index;
      this._updateStatisticsDisplay();
    });

    content.on("click", "button[data-action='ret']", () => this.win.focus());

    content.on("click", "button[data-action='load']", () => {
      if (this.selectedStatisticsIndex !== -1) {
        this.logic.currentValue =
          this.logic.statisticsData[this.selectedStatisticsIndex];
        this.logic.isNewNumber = true;
        this._updateDisplay();
      }
    });

    content.on("click", "button[data-action='cd']", () => {
      if (this.selectedStatisticsIndex !== -1) {
        this.logic.statisticsData.splice(this.selectedStatisticsIndex, 1);
        if (this.selectedStatisticsIndex >= this.logic.statisticsData.length) {
          this.selectedStatisticsIndex = this.logic.statisticsData.length - 1;
        }
        this._updateStatisticsDisplay();
      }
    });

    content.on("click", "button[data-action='cad']", () => {
      this.logic.statisticsData = [];
      this.selectedStatisticsIndex = -1;
      this._updateStatisticsDisplay();
    });

    const tooltips = {
      ret: "Return: Closes the Statistics Box and returns to the calculator.",
      load: "Load: Copies the selected number to the calculator display.",
      cd: "Clear Data: Removes the selected number from the list.",
      cad: "Clear All Data: Removes all numbers from the list.",
    };

    Object.entries(tooltips).forEach(([action, tooltipText]) => {
      const button = content.find(`button[data-action='${action}']`)[0];
      if (button) {
        $(button).on("contextmenu", (e) => {
          e.preventDefault();
          new window.ContextMenu(
            [
              {
                label: "What's this?",
                action: () => {
                  new Tooltip(tooltipText, button);
                },
              },
            ],
            e,
          );
        });
      }
    });
  }

  _updateStatisticsButtonState() {
    const buttonIds = ["Ave", "Sum", "s", "Dat"];
    buttonIds.forEach((id) => {
      const button = this.win.$content.find(`[data-id="${id}"]`)[0];
      if (button) {
        button.disabled = !this.areStatisticsButtonsActive;
      }
    });
  }

  _updateStatisticsDisplay() {
    if (!this.statisticsWindow || this.statisticsWindow.closed) return;

    const list = this.statisticsWindow.$content.find(".statistics-list");
    const countDisplay =
      this.statisticsWindow.$content.find(".statistics-count");
    const buttons = this.statisticsWindow.$content.find(
      ".statistics-buttons button",
    );

    list.empty();
    this.logic.statisticsData.forEach((num, index) => {
      const item = $(`<li>${num}</li>`);
      if (index === this.selectedStatisticsIndex) {
        item.addClass("highlighted");
      }
      list.append(item);
    });

    const count = this.logic.statisticsData.length;
    countDisplay.text(`n=${count}`);

    const hasSelection = this.selectedStatisticsIndex !== -1;
    const hasItems = count > 0;

    buttons.filter("[data-action='load']").prop("disabled", !hasSelection);
    buttons.filter("[data-action='cd']").prop("disabled", !hasSelection);
    buttons.filter("[data-action='cad']").prop("disabled", !hasItems);

    const listElement = list[0];
    if (listElement) {
      listElement.scrollTop = listElement.scrollHeight;
    }
  }
}
