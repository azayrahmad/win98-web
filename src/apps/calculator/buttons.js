// src/apps/calculator/buttons.js
import { CalculatorButton } from "./CalculatorButton.js";

const red = { color: "red" };
const blue = { color: "blue" };
const magenta = { color: "magenta" };
const scientificControlStyle = { width: "40px", color: "blue" };

const buttonDefinitions = {
  // --- Standard Buttons ---

  // Memory Functions
  MC: new CalculatorButton({
    id: "MC",
    label: "MC",
    style: red,
    tooltip: "Memory Clear: Clears any number stored in memory.",
    action: (app) => {
      app.logic.memoryClear();
      app._updateMemoryIndicator();
    },
  }),
  MR: new CalculatorButton({
    id: "MR",
    label: "MR",
    style: red,
    tooltip:
      "Memory Recall: Recalls the number stored in memory and uses it as the current entry.",
    action: (app) => app.logic.memoryRecall(),
  }),
  MS: new CalculatorButton({
    id: "MS",
    label: "MS",
    style: red,
    tooltip:
      "Memory Store: Stores the currently displayed number in memory, overwriting any previous value.",
    action: (app) => {
      app.logic.memoryStore();
      app._updateMemoryIndicator();
    },
  }),
  "M+": new CalculatorButton({
    id: "M+",
    label: "M+",
    style: red,
    tooltip:
      "Memory Add: Adds the currently displayed number to the number in memory.",
    action: (app) => {
      app.logic.memoryAdd();
      app._updateMemoryIndicator();
    },
  }),

  // Control Functions
  Backspace: new CalculatorButton({
    id: "Backspace",
    label: "Backspace",
    style: red,
    tooltip: "Deletes the last digit of the displayed number.",
    action: (app) => app.logic.backspace(),
  }),
  CE: new CalculatorButton({
    id: "CE",
    label: "CE",
    style: red,
    tooltip: "Clear Entry: Clears the current entry.",
    action: (app) => app.logic.clearEntry(),
  }),
  Clear: new CalculatorButton({
    id: "Clear",
    label: "C",
    style: red,
    tooltip: "Clear: Clears the current calculation.",
    action: (app) => app.logic.clearAll(),
  }),

  // Digits
  ...Object.fromEntries(
    Array.from({ length: 10 }, (_, i) => [
      i.toString(),
      new CalculatorButton({
        id: i.toString(),
        label: i.toString(),
        style: blue,
        tooltip:
          "Puts this number in the calculator display.\n\nKeyboard equivalent = 0-9",
        action: (app) => app.logic.inputDigit(i.toString()),
      }),
    ]),
  ),

  // Operators
  "/": new CalculatorButton({
    id: "/",
    label: "/",
    style: red,
    tooltip:
      "Division: Divides the previous number by the next.\n**Example:** 8 / 2 = 4.",
    action: (app) => app.logic.performOperation("/"),
  }),
  "*": new CalculatorButton({
    id: "*",
    label: "*",
    style: red,
    tooltip: "Multiplication: Multiplies two numbers.\n**Example:** 2 * 3 = 6.",
    action: (app) => app.logic.performOperation("*"),
  }),
  "-": new CalculatorButton({
    id: "-",
    label: "-",
    style: red,
    tooltip:
      "Subtraction: Subtracts the next number from the previous.\n**Example:** 5 - 2 = 3.",
    action: (app) => app.logic.performOperation("-"),
  }),
  "+": new CalculatorButton({
    id: "+",
    label: "+",
    style: red,
    tooltip: "Addition: Adds two numbers.\n**Example:** 2 + 3 = 5.",
    action: (app) => app.logic.performOperation("+"),
  }),
  "=": new CalculatorButton({
    id: "=",
    label: "=",
    style: red,
    tooltip: "Equals: Performs the calculation.",
    action: (app) => app.logic.equals(),
  }),

  // Other Standard Functions
  sqrt: new CalculatorButton({
    id: "sqrt",
    label: "sqrt",
    style: blue,
    tooltip:
      "Square Root: Calculates the square root of the displayed number.\n**Example:** sqrt(9) = 3.",
    action: (app) => app.logic.squareRoot(),
  }),
  "%": new CalculatorButton({
    id: "%",
    label: "%",
    style: blue,
    tooltip:
      "Percentage: Calculates a percentage of a number.\n**Example:** 100 * 5% = 5.",
    action: (app) => app.logic.percentage(),
  }),
  "1/x": new CalculatorButton({
    id: "1/x",
    label: "1/x",
    style: blue,
    tooltip:
      "Reciprocal: Calculates the reciprocal of the displayed number.\n**Example:** 1/4 = 0.25.",
    action: (app) => app.logic.reciprocal(),
  }),
  "+/-": new CalculatorButton({
    id: "+/-",
    label: "+/-",
    style: blue,
    tooltip: "Toggle Sign: Changes the sign of the displayed number.",
    action: (app) => app.logic.toggleSign(),
  }),
  ".": new CalculatorButton({
    id: ".",
    label: ".",
    style: blue,
    tooltip: "Decimal Point: Adds a decimal point to the number.",
    action: (app) => app.logic.inputDecimal(),
  }),

  // --- Scientific Buttons ---
  Sta: new CalculatorButton({
    id: "Sta",
    label: "Sta",
    style: scientificControlStyle,
    tooltip: "Opens the Statistics Box to view and manage your data.",
    action: (app) => app._openStatisticsWindow(),
  }),
  "F-E": new CalculatorButton({
    id: "F-E",
    label: "F-E",
    style: magenta,
    tooltip:
      "Turns scinetific notaation on and off. Numbers larger than 10^32 are always displayed exponentially. You can use F-E only with the decimal number system.",
    action: (app) => app.logic.toggleScientificNotation(),
  }),
  "(": new CalculatorButton({
    id: "(",
    label: "(",
    style: magenta,
    tooltip: "Starts a new level of parentheses.",
    action: (app) => app.logic.openParenthesis(),
  }),
  ")": new CalculatorButton({
    id: ")",
    label: ")",
    style: magenta,
    tooltip: "Closes a level of parentheses.",
    action: (app) => app.logic.closeParenthesis(),
  }),
  Mod: new CalculatorButton({
    id: "Mod",
    label: "Mod",
    style: red,
    tooltip: "Displays the remainder of a division.",
    action: (app) => app.logic.performOperation("Mod"),
  }),
  And: new CalculatorButton({
    id: "And",
    label: "And",
    style: red,
    tooltip: "Performs a bitwise AND operation.",
    action: (app) => app.logic.performOperation("And"),
  }),
  Ave: new CalculatorButton({
    id: "Ave",
    label: "Ave",
    style: scientificControlStyle,
    tooltip: "Calculates the average of the numbers in the Statistics Box.",
    action: (app) => app.logic.calculateAverage(),
  }),
  dms: new CalculatorButton({
    id: "dms",
    label: "dms",
    style: magenta,
    tooltip:
      "Converts the displayed number to degree-minute-second format (assuming that the displayed number is in degrees). To convert the displayed number to degrees (assuming that the displayed number is in degree-minute-second format), use Inv+dms. You can use dms only with the decimal number system.",
    action: (app) => app.logic.dms(),
  }),
  Exp: new CalculatorButton({
    id: "Exp",
    label: "Exp",
    style: magenta,
    tooltip:
      "Allows entry of scientific-notation numbers. The exponent is limited to four digits. You can use only decimal digits (keys 0 through 9) in the exponent. You can use Exp only with the decimal number system.",
    action: (app) => app.logic.expInput(),
  }),
  ln: new CalculatorButton({
    id: "ln",
    label: "ln",
    style: magenta,
    tooltip: "Calculates the natural (base e) logarithm.",
    action: (app) => app.logic.ln(),
  }),
  Or: new CalculatorButton({
    id: "Or",
    label: "Or",
    style: red,
    tooltip: "Performs a bitwise OR operation.",
    action: (app) => app.logic.performOperation("Or"),
  }),
  Xor: new CalculatorButton({
    id: "Xor",
    label: "Xor",
    style: red,
    tooltip: "Performs a bitwise exclusive OR operation.",
    action: (app) => app.logic.performOperation("Xor"),
  }),
  Sum: new CalculatorButton({
    id: "Sum",
    label: "Sum",
    style: scientificControlStyle,
    tooltip: "Calculates the sum of the numbers in the Statistics Box.",
    action: (app) => app.logic.calculateSum(),
  }),
  sin: new CalculatorButton({
    id: "sin",
    label: "sin",
    style: magenta,
    tooltip: "Calculates the sine of the number.",
    action: (app) => app.logic.sin(),
  }),
  "x^y": new CalculatorButton({
    id: "x^y",
    label: "x^y",
    style: magenta,
    tooltip: "Raises a number to the power of another number.",
    action: (app) => app.logic.performOperation("x^y"),
  }),
  log: new CalculatorButton({
    id: "log",
    label: "log",
    style: magenta,
    tooltip: "Calculates the common (base 10) logarithm.",
    action: (app) => app.logic.log(),
  }),
  Lsh: new CalculatorButton({
    id: "Lsh",
    label: "Lsh",
    style: red,
    tooltip: "Performs a bitwise left shift.",
    action: (app) => app.logic.performOperation("Lsh"),
  }),
  Not: new CalculatorButton({
    id: "Not",
    label: "Not",
    style: red,
    tooltip: "Performs a bitwise NOT operation.",
    action: (app) => app.logic.not(),
  }),
  s: new CalculatorButton({
    id: "s",
    label: "s",
    style: scientificControlStyle,
    tooltip: "Calculates the population standard deviation of the numbers in the Statistics Box.",
    action: (app) => app.logic.calculateStdDev(),
  }),
  cos: new CalculatorButton({
    id: "cos",
    label: "cos",
    style: magenta,
    tooltip: "Calculates the cosine of the number.",
    action: (app) => app.logic.cos(),
  }),
  "x^3": new CalculatorButton({
    id: "x^3",
    label: "x^3",
    style: magenta,
    tooltip: "Calculates the cube of the number.",
    action: (app) => app.logic.x_cubed(),
  }),
  "n!": new CalculatorButton({
    id: "n!",
    label: "n!",
    style: magenta,
    tooltip: "Calculates the factorial of the number.",
    action: (app) => app.logic.factorial(),
  }),
  Int: new CalculatorButton({
    id: "Int",
    label: "Int",
    style: red,
    tooltip: "Displays the integer part of a number.",
    action: (app) => app.logic.int(),
  }),
  Dat: new CalculatorButton({
    id: "Dat",
    label: "Dat",
    style: scientificControlStyle,
    tooltip: "Adds the current number to the Statistics Box.",
    action: (app) => {
      app.logic.addToStatistics();
      app._updateStatisticsDisplay();
    },
  }),
  tan: new CalculatorButton({
    id: "tan",
    label: "tan",
    style: magenta,
    tooltip: "Calculates the tangent of the number.",
    action: (app) => app.logic.tan(),
  }),
  "x^2": new CalculatorButton({
    id: "x^2",
    label: "x^2",
    style: magenta,
    tooltip: "Calculates the square of the number.",
    action: (app) => app.logic.x_squared(),
  }),
  pi: new CalculatorButton({
    id: "pi",
    label: "pi",
    style: blue,
    tooltip: "Displays the value of PI.",
    action: (app) => app.logic.pi(),
  }),
  ...Object.fromEntries(
    ["A", "B", "C", "D", "E", "F"].map((hex) => [
      hex,
      new CalculatorButton({
        id: hex,
        label: hex,
        style: blue,
        tooltip: "Enters a hexadecimal digit.",
        action: (app) => app.logic.inputDigit(hex),
      }),
    ]),
  ),
};

export default buttonDefinitions;
