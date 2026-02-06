import {
  getColorModes,
  getCurrentColorMode,
  setColorMode,
} from '../../../system/color-mode-manager.js';
import {
  getAvailableResolutions,
  setResolution,
  getCurrentResolutionId,
} from '../../../system/screen-manager.js';

const PALETTES = {
  16: [
    "#000000", "#0000AA", "#00AA00", "#00AAAA",
    "#AA0000", "#AA00AA", "#AA5500", "#AAAAAA",
    "#555555", "#5555FF", "#55FF55", "#55FFFF",
    "#FF5555", "#FF55FF", "#FFFF55", "#FFFFFF",
  ],
  256: (function () {
    const colors = [];
    const levels = [0, 51, 102, 153, 204, 255];
    for (let r = 0; r < levels.length; r++) {
      for (let g = 0; g < levels.length; g++) {
        for (let b = 0; b < levels.length; b++) {
          colors.push(
            `#${levels[r].toString(16).padStart(2, "0")}${levels[g]
              .toString(16)
              .padStart(2, "0")}${levels[b].toString(16).padStart(2, "0")}`,
          );
        }
      }
    }
    return colors;
  })(),
};

function updateColorSpectrum(win, modeId) {
  const $spectrum = win.$content.find("#color-spectrum-preview");
  $spectrum.empty();
  $spectrum.css("background", "none");

  if (PALETTES[modeId]) {
    PALETTES[modeId].forEach((color) => {
      const $block = $("<div>")
        .addClass("color-block")
        .css("background-color", color);
      $spectrum.append($block);
    });
  } else if (modeId === "high") {
    $spectrum.css(
      "background",
      "linear-gradient(to right, #000, #f00, #0f0, #00f, #ff0, #f0f, #0ff, #fff)",
    );
  } else if (modeId === "true") {
    $spectrum.css(
      "background",
      "linear-gradient(to right, red, orange, yellow, green, blue, indigo, violet)",
    );
  }
}

export const settingsTab = {
  init(win, app) {
    const $colorModeSelect = win.$content.find("#color-mode-select");
    const $resolutionSlider = win.$content.find("#resolution-slider");
    const $currentResolution = win.$content.find(".current-resolution");
    const $browserInfo = win.$content.find(".browser-info");

    const colorModes = getColorModes();
    Object.entries(colorModes).forEach(([id, mode]) => {
      const $option = $(`<option value="${id}">${mode.name}</option>`);
      $colorModeSelect.append($option);
    });

    const currentColorMode = getCurrentColorMode();
    $colorModeSelect.val(currentColorMode);
    app.selectedColorMode = currentColorMode;
    updateColorSpectrum(win, app.selectedColorMode);

    const resolutions = getAvailableResolutions();
    const currentResolutionId = getCurrentResolutionId();
    const currentIndex = resolutions.indexOf(currentResolutionId);
    $resolutionSlider.val(currentIndex > -1 ? currentIndex : resolutions.length - 1);
    $currentResolution.text(
      currentResolutionId === "fit"
        ? "Fit Screen"
        : `${resolutions[currentIndex]} pixels`,
    );
    app.selectedResolution = currentResolutionId;

    $browserInfo.text(navigator.userAgent);

    $colorModeSelect.on("change", (e) => {
      app.selectedColorMode = $(e.target).val();
      updateColorSpectrum(win, app.selectedColorMode);
      app._enableApplyButton(win);
    });

    $resolutionSlider.on("input", (e) => {
      const index = parseInt($(e.target).val(), 10);
      const resolution = resolutions[index];
      app.selectedResolution = resolution;
      $currentResolution.text(
        resolution === "fit" ? "Fit Screen" : `${resolution} pixels`,
      );
      app._enableApplyButton(win);
    });
  },
  applyChanges(app) {
    if (app.selectedColorMode) {
      setColorMode(app.selectedColorMode);
    }
    if (app.selectedResolution) {
      setResolution(app.selectedResolution);
    }
  },
};
