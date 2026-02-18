export const LOCAL_STORAGE_KEYS = {
  ACTIVE_THEME: 'activeTheme',
  CUSTOM_THEMES: 'customThemes',
  CUSTOM_APPS: 'customApps',
  SHOW_TIPS_AT_STARTUP: 'showTipsAtStartup',
  CLIPPY_AGENT_NAME: 'clippyAgentName',
  CLIPPY_TTS_ENABLED: 'clippyTTSEnabled',
  NOTEPAD_THEME: 'notepad-theme',
  NOTEPAD_WORD_WRAP: 'notepad-word-wrap',
  WALLPAPER: 'wallpaper',
  WALLPAPER_MODE: 'wallpaperMode',
  ICON_POSITIONS: 'iconPositions',
  EXPLORER_ICON_POSITIONS: 'explorerIconPositions',
  EXPLORER_AUTO_ARRANGE: 'explorerAutoArrange',
  AUTO_ARRANGE_ICONS: 'autoArrangeIcons',
  MONITOR_TYPE: 'monitorType',
  RECYCLE_BIN: 'recycleBin',
  SCREENSAVER_TIMEOUT: 'screensaverTimeout',
  SCREENSAVER: 'screensaver',
  COLOR_SCHEME: 'colorScheme',
  CURSOR_SCHEME: 'cursorScheme',
  ICON_SCHEME: 'iconScheme',
  SOUND_SCHEME: 'soundScheme',
  COLOR_MODE: 'colorMode',
  SCREEN_RESOLUTION: 'screenResolution',
  DROPPED_FILES: 'droppedFiles',
  SOLITAIRE_CARD_BACK: 'solitaire:cardBack',
  SOLITAIRE_DRAW_OPTION: 'solitaireDrawOption',
  SOLITAIRE_TIMED_GAME: "solitaireTimedGame",
  SOLITAIRE_SCORING: 'solitaireScoring',
  SOLITAIRE_OUTLINE_DRAGGING: "solitaireOutlineDragging",
  SOLITAIRE_SHOW_STATUS_BAR: "solitaireShowStatusBar",
  SOLITAIRE_KEEP_SCORE: "solitaireKeepScore",
};

export function getItem(key) {
  const item = localStorage.getItem(key);
  try {
    return JSON.parse(item);
  } catch (e) {
    return item;
  }
}

export function setItem(key, value) {
  if (typeof value === 'object') {
    localStorage.setItem(key, JSON.stringify(value));
  } else {
    localStorage.setItem(key, value);
  }
}

export function removeItem(key) {
    localStorage.removeItem(key)
}
