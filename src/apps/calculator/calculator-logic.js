export class CalculatorLogic {
  constructor() {
    this.clearAll();
    this.memory = 0;
    this.statisticsData = [];
  }

  // Clears all calculator state
  clearAll() {
    this.currentValue = "0";
    this.previousValue = null;
    this.operation = null;
    this.isNewNumber = true;
    this.base = 10; // 10, 16, 8, 2
    this.angleUnit = "degrees"; // 'degrees', 'radians', 'gradients'
    this.stateStack = [];
    this.statisticsData = [];

    // New state flags
    this.isInverse = false;
    this.isHyperbolic = false;
    this.isScientificNotation = false;
    this.inputtingExponent = false;
  }

  // Clears the current entry
  clearEntry() {
    this.currentValue = "0";
    this.isNewNumber = true;
    this.inputtingExponent = false;
  }

  // Handles digit and decimal inputs
  inputDigit(digit) {
    if (this.isNewNumber) {
      this.currentValue = digit;
      this.isNewNumber = false;
      this.inputtingExponent = false;
    } else {
      if (this.inputtingExponent) {
        // limit exponent to 4 digits
        const parts = this.currentValue.split('e+');
        if (parts.length === 2 && parts[1].length < 4) {
          this.currentValue += digit;
        }
      } else {
        if (this.currentValue === "0" && digit !== ".") {
          this.currentValue = digit;
        } else {
          this.currentValue += digit;
        }
      }
    }
  }

  inputDecimal() {
    if (this.isNewNumber) {
      this.currentValue = "0.";
      this.isNewNumber = false;
    } else if (!this.currentValue.includes(".") && !this.inputtingExponent) {
      this.currentValue += ".";
    }
  }

  // Toggles
  toggleInverse() {
    this.isInverse = !this.isInverse;
  }

  toggleHyperbolic() {
    this.isHyperbolic = !this.isHyperbolic;
  }

  toggleScientificNotation() {
    if (this.base !== 10) return;
    this.isScientificNotation = !this.isScientificNotation;
    const val = parseFloat(this.currentValue);
    if (!isNaN(val)) {
      this.currentValue = this.isScientificNotation ? val.toExponential() : String(val);
    }
  }

  _checkAutoReset() {
    // Auto-reset flags after calculation
    this.isInverse = false;
    this.isHyperbolic = false;
    this.inputtingExponent = false;
  }

  // Handles binary operations
  performOperation(nextOperation) {
    if (this.operation) {
      this.calculate();
    }

    this.previousValue = this.currentValue;
    this.operation = nextOperation;
    this.isNewNumber = true;
    // Note: Inv/Hyp usually apply to unary, but if checkAutoReset is needed for binary setup? 
    // Usually flags reset after the *calculation* triggers. Setting up operation doesn't trigger calc yet.
    this._checkAutoReset();
  }

  // Performs the calculation
  calculate() {
    if (!this.operation || this.previousValue === null) return;

    const isBitwise = ["And", "Or", "Xor", "Lsh", "Mod"].includes(
      this.operation,
    );
    let result;

    if (isBitwise) {
      const prev = parseInt(this.previousValue, this.base);
      const curr = parseInt(this.currentValue, this.base);

      switch (this.operation) {
        case "And":
          result = prev & curr;
          break;
        case "Or":
          result = prev | curr;
          break;
        case "Xor":
          result = prev ^ curr;
          break;
        case "Lsh":
          result = prev << curr;
          break;
        case "Mod":
          result = prev % curr;
          break;
      }
      this.currentValue = result.toString(this.base).toUpperCase();
    } else {
      const prev = parseFloat(this.previousValue);
      const curr = parseFloat(this.currentValue);

      switch (this.operation) {
        case "+":
          result = prev + curr;
          break;
        case "-":
          result = prev - curr;
          break;
        case "*":
          result = prev * curr;
          break;
        case "/":
          result = prev / curr;
          break;
        case "x^y":
          if (this.isInverse) {
            result = Math.pow(prev, 1 / curr); // y-th root
          } else {
            result = Math.pow(prev, curr);
          }
          break;
      }

      this._formatResult(result);
    }

    this._checkAutoReset();

    this.operation = null;
  }

  _formatResult(result) {
    if (this.isScientificNotation || (encodeURIComponent(result).length > 32) || (Math.abs(result) >= 1e32)) { // rudimentary check
      this.currentValue = result.toExponential();
    } else {
      this.currentValue = String(result);
    }
  }

  // Handles unary operations
  toggleSign() {
    // ... (existing logic handled by generic logic if simple, but here we can keep existing logic)
    if (this.base === 10) {
      this.currentValue = String(parseFloat(this.currentValue) * -1);
    }
  }

  squareRoot() {
    this.currentValue = String(Math.sqrt(parseFloat(this.currentValue)));
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  percentage() {
    if (this.previousValue !== null) {
      this.currentValue = String(
        parseFloat(this.previousValue) * (parseFloat(this.currentValue) / 100),
      );
    } else {
      this.currentValue = "0";
    }
    this._checkAutoReset();
  }

  reciprocal() {
    const value = parseFloat(this.currentValue);
    this.currentValue =
      value === 0 ? "Cannot divide by zero" : String(1 / value);
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  factorial() {
    let n = parseInt(this.currentValue);
    if (n < 0) {
      this.currentValue = "Invalid input";
      return;
    }
    let result = 1;
    for (let i = 2; i <= n; i++) {
      result *= i;
    }
    this.currentValue = String(result);
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  // Scientific functions
  pi() {
    if (this.isInverse) {
      this.currentValue = String(2 * Math.PI);
    } else {
      this.currentValue = String(Math.PI);
    }
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  _toRadians(value) {
    if (this.angleUnit === "degrees") {
      return value * (Math.PI / 180);
    } else if (this.angleUnit === "gradients") {
      return value * (Math.PI / 200);
    }
    return value;
  }

  _fromRadians(value) {
    if (this.angleUnit === "degrees") {
      return value * (180 / Math.PI);
    } else if (this.angleUnit === "gradients") {
      return value * (200 / Math.PI);
    }
    return value;
  }

  sin() {
    const val = parseFloat(this.currentValue);
    let result;
    if (this.isInverse && this.isHyperbolic) { // asinh
      result = Math.asinh(val);
    } else if (this.isInverse) { // asin
      result = this._fromRadians(Math.asin(val));
    } else if (this.isHyperbolic) { // sinh
      result = Math.sinh(val);
    } else {
      const rad = this._toRadians(val);
      result = Math.sin(rad);
    }
    this._formatResult(result);
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  cos() {
    const val = parseFloat(this.currentValue);
    let result;
    if (this.isInverse && this.isHyperbolic) { // acosh
      result = Math.acosh(val);
    } else if (this.isInverse) { // acos
      result = this._fromRadians(Math.acos(val));
    } else if (this.isHyperbolic) { // cosh
      result = Math.cosh(val);
    } else {
      const rad = this._toRadians(val);
      result = Math.cos(rad);
    }
    this._formatResult(result);
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  tan() {
    const val = parseFloat(this.currentValue);
    let result;
    if (this.isInverse && this.isHyperbolic) { // atanh
      result = Math.atanh(val);
    } else if (this.isInverse) { // atan
      result = this._fromRadians(Math.atan(val));
    } else if (this.isHyperbolic) { // tanh
      result = Math.tanh(val);
    } else {
      const rad = this._toRadians(val);
      result = Math.tan(rad);
    }
    this._formatResult(result);
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  log() {
    const val = parseFloat(this.currentValue);
    if (this.isInverse) {
      this._formatResult(Math.pow(10, val));
    } else {
      this._formatResult(Math.log10(val));
    }
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  ln() {
    const val = parseFloat(this.currentValue);
    if (this.isInverse) {
      this._formatResult(Math.exp(val));
    } else {
      this._formatResult(Math.log(val));
    }
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  x_squared() {
    const val = parseFloat(this.currentValue);
    if (this.isInverse) {
      this._formatResult(Math.sqrt(val));
    } else {
      this._formatResult(Math.pow(val, 2));
    }
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  x_cubed() {
    const val = parseFloat(this.currentValue);
    if (this.isInverse) {
      this._formatResult(Math.cbrt(val));
    } else {
      this._formatResult(Math.pow(val, 3));
    }
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  // New methods for dms and exp
  dms() {
    if (this.base !== 10) return;
    const val = parseFloat(this.currentValue);
    if (this.isInverse) {
      // Convert DMS to Deg
      // format D.MMSS...
      let valAbs = Math.abs(val);
      let d = Math.floor(valAbs);

      // Fix floating point noise: 2.3 - 2 = 0.299999... -> 0.3
      let fractional = valAbs - d;
      fractional = Math.round(fractional * 1e8) / 1e8;

      let m = Math.floor(fractional * 100);

      // Remaining part for seconds
      // 0.30 - 0.30 = 0.
      // 0.3050. m=30. frac=0.3050. remainder=0.0050.
      let remainder = fractional - (m / 100);
      remainder = Math.round(remainder * 1e8) / 1e8; // clean again

      let s = remainder * 10000;

      let res = d + m / 60 + s / 3600;
      if (val < 0) res = -res;

      this._formatResult(res);

    } else {
      // Convert Deg to DMS
      let d = Math.trunc(val);
      let rem = Math.abs(val - d);
      let m = Math.floor(rem * 60);
      let s = (rem * 60 - m) * 60;
      // compose to D.MMSS
      // If m is 30, we want .30
      // If s is 30, we want .0030
      // val = d + m/100 + s/10000

      let res = d + (val >= 0 ? 1 : -1) * (m / 100 + s / 10000);
      this._formatResult(res);
    }
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  expInput() {
    if (this.base !== 10) return;
    if (!this.currentValue.includes('e')) {
      this.currentValue += 'e+';
      this.isNewNumber = false;
      this.inputtingExponent = true;
    }
  }

  not() {
    const result = ~parseInt(this.currentValue, this.base);
    this.currentValue = result.toString(this.base).toUpperCase();
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  int() {
    if (this.base === 10) {
      this.currentValue = String(Math.trunc(parseFloat(this.currentValue)));
    }
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  // Memory functions
  memoryClear() {
    this.memory = 0;
  }
  memoryRecall() {
    this.currentValue = String(this.memory);
    this.isNewNumber = true;
  }
  memoryStore() {
    this.memory = parseFloat(this.currentValue);
  }
  memoryAdd() {
    this.memory += parseFloat(this.currentValue);
  }

  // Equals operation
  equals() {
    if (this.stateStack.length > 0) {
      return; // Don't perform equals if inside parentheses
    }
    if (this.operation) {
      this.calculate();
      this.isNewNumber = true;
      this.previousValue = null;
    }
  }

  // Backspace
  backspace() {
    if (this.isNewNumber) return;
    this.currentValue = this.currentValue.slice(0, -1);
    if (this.currentValue === "") {
      this.currentValue = "0";
      this.isNewNumber = true;
    }
  }

  // Base conversion
  setBase(newBase) {
    if (this.base === newBase) return;
    const numberValue = parseInt(this.currentValue, this.base);
    this.base = newBase;
    this.currentValue = numberValue.toString(this.base).toUpperCase();
    this.isNewNumber = true;
  }

  // Angle unit
  setAngleUnit(unit) {
    this.angleUnit = unit;
  }

  // Parenthesis
  getParenthesisLevel() {
    return this.stateStack.length;
  }

  openParenthesis() {
    this.stateStack.push({
      previousValue: this.previousValue,
      operation: this.operation,
    });
    this.currentValue = "0";
    this.previousValue = null;
    this.operation = null;
    this.isNewNumber = true;
    this.currentValue = "(".repeat(this.stateStack.length);
  }

  closeParenthesis() {
    if (this.stateStack.length === 0) {
      return;
    }

    this.calculate();

    const result = this.currentValue;
    const prevState = this.stateStack.pop();

    this.previousValue = prevState.previousValue;
    this.operation = prevState.operation;
    this.currentValue = result;
    this.isNewNumber = true;
  }

  // Statistics functions
  addToStatistics() {
    const value = parseFloat(this.currentValue);
    if (!isNaN(value)) {
      this.statisticsData.push(value);
    }
    this.isNewNumber = true;
  }

  calculateSum() {
    let sum;
    if (this.isInverse) {
      // Sum of squares
      sum = this.statisticsData.reduce((acc, val) => acc + (val * val), 0);
    } else {
      sum = this.statisticsData.reduce((acc, val) => acc + val, 0);
    }
    this.currentValue = String(sum);
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  calculateAverage() {
    if (this.statisticsData.length === 0) {
      this.currentValue = "0";
      this.isNewNumber = true;
      return;
    }

    let sum;
    if (this.isInverse) {
      // Mean of squares
      sum = this.statisticsData.reduce((acc, val) => acc + (val * val), 0);
    } else {
      sum = this.statisticsData.reduce((acc, val) => acc + val, 0);
    }

    const average = sum / this.statisticsData.length;
    this.currentValue = String(average);
    this.isNewNumber = true;
    this._checkAutoReset();
  }

  calculateStdDev() {
    if (this.statisticsData.length === 0) {
      this.currentValue = "0";
      this.isNewNumber = true;
      return;
    }

    const n = this.statisticsData.length;
    const mean = this.statisticsData.reduce((acc, val) => acc + val, 0) / n;

    // Variance
    // Standard deviation (s): default is sample (n-1). Inv is population (n).
    // Note: implementation_plan says "s default n-1. Inv n".

    // Calculate sum of squared differences
    const sumSqDiff = this.statisticsData.reduce(
      (acc, val) => acc + Math.pow(val - mean, 2),
      0,
    );

    let divisor = (this.isInverse) ? n : (n - 1);
    if (divisor <= 0) divisor = 1; // avoid /0 for single sample

    const variance = sumSqDiff / divisor;

    const stdDev = Math.sqrt(variance);
    this.currentValue = String(stdDev);
    this.isNewNumber = true;
    this._checkAutoReset();
  }
}
