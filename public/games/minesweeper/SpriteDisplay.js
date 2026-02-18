const numbersSprite = "assets/minesweeper-numbers.png"; // Hardcoded path

const CHAR_MAP = {
  "0": 0,
  "1": 1,
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "-": 10,
};

const DIGIT_WIDTH = 13;
const DIGIT_COUNT = 3;

class SpriteDisplay {
  constructor() {
    this.element = document.createElement("div");
    this.element.classList.add("sprite-display");

    this.digitElements = [];
    for (let i = 0; i < DIGIT_COUNT; i++) {
      const digitEl = document.createElement("div");
      digitEl.classList.add("digit");
      digitEl.style.backgroundImage = `url("${numbersSprite}")`;
      this.element.appendChild(digitEl);
      this.digitElements.push(digitEl);
    }

    this.setValue(0); // Initialize with a default value
  }

  setValue(number) {
    let chars;
    if (number < 0) {
      // Handle negative: take the last 2 digits of the absolute value
      const absStr = Math.abs(number).toString().slice(-2).padStart(2, "0");
      chars = ["-", ...absStr];
    } else {
      // Handle positive: take the last 3 digits
      const str = number.toString().slice(-3).padStart(3, "0");
      chars = [...str];
    }

    for (let i = 0; i < DIGIT_COUNT; i++) {
      const char = chars[i];
      const index = CHAR_MAP[char];
      const xPos = -index * DIGIT_WIDTH;
      this.digitElements[i].style.backgroundPosition = `${xPos}px 0`;
    }
  }
}
