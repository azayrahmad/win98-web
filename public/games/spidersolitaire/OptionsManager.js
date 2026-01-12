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

function getOption(key) {
  const value = getItem(key);
  if (value === null) {
    return DEFAULTS[key];
  }
  return value;
}

function setOption(key, value) {
  setItem(key, value);
}

const options = {
  get animateDealing() {
    return getOption(OPTIONS_KEYS.ANIMATE_DEALING);
  },
  set animateDealing(value) {
    setOption(OPTIONS_KEYS.ANIMATE_DEALING, value);
  },

  get autoSaveOnExit() {
    return getOption(OPTIONS_KEYS.AUTO_SAVE_ON_EXIT);
  },
  set autoSaveOnExit(value) {
    setOption(OPTIONS_KEYS.AUTO_SAVE_ON_EXIT, value);
  },

  get autoOpenOnStartup() {
    return getOption(OPTIONS_KEYS.AUTO_OPEN_ON_STARTUP);
  },
  set autoOpenOnStartup(value) {
    setOption(OPTIONS_KEYS.AUTO_OPEN_ON_STARTUP, value);
  },

  get promptOnSave() {
    return getOption(OPTIONS_KEYS.PROMPT_ON_SAVE);
  },
  set promptOnSave(value) {
    setOption(OPTIONS_KEYS.PROMPT_ON_SAVE, value);
  },

  get promptOnOpen() {
    return getOption(OPTIONS_KEYS.PROMPT_ON_OPEN);
  },
  set promptOnOpen(value) {
    setOption(OPTIONS_KEYS.PROMPT_ON_OPEN, value);
  },
};

function getAllOptions() {
    return {
        animateDealing: options.animateDealing,
        autoSaveOnExit: options.autoSaveOnExit,
        autoOpenOnStartup: options.autoOpenOnStartup,
        promptOnSave: options.promptOnSave,
        promptOnOpen: options.promptOnOpen,
    };
}

function setAllOptions(newOptions) {
    if (newOptions.animateDealing !== undefined) options.animateDealing = newOptions.animateDealing;
    if (newOptions.autoSaveOnExit !== undefined) options.autoSaveOnExit = newOptions.autoSaveOnExit;
    if (newOptions.autoOpenOnStartup !== undefined) options.autoOpenOnStartup = newOptions.autoOpenOnStartup;
    if (newOptions.promptOnSave !== undefined) options.promptOnSave = newOptions.promptOnSave;
    if (newOptions.promptOnOpen !== undefined) options.promptOnOpen = newOptions.promptOnOpen;
}
