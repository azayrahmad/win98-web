const DEFAULTS = {
  displayMessagesOnIllegalMoves: false,
  quickPlay: false,
  doubleClickToFreeCell: false,
};

const STORAGE_KEY = "freecell_options";

export class OptionsManager {
  constructor() {
    this.options = this._load();
  }

  _load() {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Ensure all keys are present, falling back to defaults if a new option was added.
        return { ...DEFAULTS, ...parsed };
      }
    } catch (error) {
      console.error("Failed to load options from localStorage:", error);
    }
    return { ...DEFAULTS };
  }

  get(key) {
    return this.options[key];
  }

  set(key, value) {
    this.options[key] = value;
  }

  save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.options));
    } catch (error) {
      console.error("Failed to save options to localStorage:", error);
    }
  }

  getAll() {
    return { ...this.options };
  }

  setAll(newOptions) {
    this.options = { ...this.options, ...newOptions };
  }
}
