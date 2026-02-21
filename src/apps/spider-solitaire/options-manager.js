const OPTIONS_KEYS = {
  ANIMATE_DEALING: "spidersolitaire.options.animateDealing",
  AUTO_SAVE_ON_EXIT: "spidersolitaire.options.autoSaveOnExit",
  AUTO_OPEN_ON_STARTUP: "spidersolitaire.options.autoOpenOnStartup",
  PROMPT_ON_SAVE: "spidersolitaire.options.promptOnSave",
  PROMPT_ON_OPEN: "spidersolitaire.options.promptOnOpen",
};

const DEFAULTS = {
  [OPTIONS_KEYS.ANIMATE_DEALING]: true,
  [OPTIONS_KEYS.AUTO_SAVE_ON_EXIT]: false,
  [OPTIONS_KEYS.AUTO_OPEN_ON_STARTUP]: false,
  [OPTIONS_KEYS.PROMPT_ON_SAVE]: true,
  [OPTIONS_KEYS.PROMPT_ON_OPEN]: true,
};

export class OptionsManager {
  constructor(settings) {
    this.settings = settings;
  }

  getOption(key) {
    return this.settings.get(key, DEFAULTS[key]);
  }

  setOption(key, value) {
    this.settings.set(key, value);
  }

  get animateDealing() {
    return this.getOption(OPTIONS_KEYS.ANIMATE_DEALING);
  }
  set animateDealing(value) {
    this.setOption(OPTIONS_KEYS.ANIMATE_DEALING, value);
  }

  get autoSaveOnExit() {
    return this.getOption(OPTIONS_KEYS.AUTO_SAVE_ON_EXIT);
  }
  set autoSaveOnExit(value) {
    this.setOption(OPTIONS_KEYS.AUTO_SAVE_ON_EXIT, value);
  }

  get autoOpenOnStartup() {
    return this.getOption(OPTIONS_KEYS.AUTO_OPEN_ON_STARTUP);
  }
  set autoOpenOnStartup(value) {
    this.setOption(OPTIONS_KEYS.AUTO_OPEN_ON_STARTUP, value);
  }

  get promptOnSave() {
    return this.getOption(OPTIONS_KEYS.PROMPT_ON_SAVE);
  }
  set promptOnSave(value) {
    this.setOption(OPTIONS_KEYS.PROMPT_ON_SAVE, value);
  }

  get promptOnOpen() {
    return this.getOption(OPTIONS_KEYS.PROMPT_ON_OPEN);
  }
  set promptOnOpen(value) {
    this.setOption(OPTIONS_KEYS.PROMPT_ON_OPEN, value);
  }

  getAllOptions() {
    return {
      animateDealing: this.animateDealing,
      autoSaveOnExit: this.autoSaveOnExit,
      autoOpenOnStartup: this.autoOpenOnStartup,
      promptOnSave: this.promptOnSave,
      promptOnOpen: this.promptOnOpen,
    };
  }

  setAllOptions(newOptions) {
    if (newOptions.animateDealing !== undefined) this.animateDealing = newOptions.animateDealing;
    if (newOptions.autoSaveOnExit !== undefined) this.autoSaveOnExit = newOptions.autoSaveOnExit;
    if (newOptions.autoOpenOnStartup !== undefined) this.autoOpenOnStartup = newOptions.autoOpenOnStartup;
    if (newOptions.promptOnSave !== undefined) this.promptOnSave = newOptions.promptOnSave;
    if (newOptions.promptOnOpen !== undefined) this.promptOnOpen = newOptions.promptOnOpen;
  }
}
