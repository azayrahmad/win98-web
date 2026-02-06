import {
  getColorSchemes,
  getColorSchemeId,
  setColorScheme,
  loadThemeParser,
  applyCustomColorScheme,
} from '../../../system/theme-manager.js';
import {
  applyThemeToPreview,
  applyPropertiesToPreview,
} from '../theme-preview.js';
import { ShowDialogWindow } from '../../../shared/components/dialog-window.js';
import { ShowFilePicker } from '../../../shared/utils/file-picker.js';
import { getZenFSFileAsText } from '../../../system/zenfs-utils.js';
import previewHtml from "./AppearancePreview.html?raw";
import "./appearance.css";

export const appearanceTab = {
  loadedCustomScheme: null,
  init: function (win, app) {
    const self = this;
    const $tab = win.$content.find("#appearance");
    const $schemeSelect = $tab.find(".scheme-select");
    const $previewContainer = $tab.find(".preview-container");
    $previewContainer.html(previewHtml);

    // Inject a style block to map preview variables to os-gui variables
    const styleBlock = `
      <style>
        #appearance-preview-wrapper {
          --ActiveTitle: var(--preview-active-title-bar-bg);
          --GradientActiveTitle: var(--preview-gradient-active-title-bar-bg);
          --TitleText: var(--preview-active-title-bar-text);
          --InactiveTitle: var(--preview-inactive-title-bar-bg);
          --GradientInactiveTitle: var(--preview-gradient-inactive-title-bar-bg);
          --InactiveTitleText: var(--preview-inactive-title-bar-text);
          --Window: var(--preview-window-bg);
          --WindowText: var(--preview-window-text);
          --ButtonFace: var(--preview-button-face);
          --ButtonText: var(--preview-button-text);
          --ButtonHilight: var(--preview-button-highlight);
          --ButtonShadow: var(--preview-button-shadow);
          --ButtonDkShadow: var(--preview-button-dk-shadow);
          --HilightText: var(--preview-hilight-text);

          --font-family-title: var(--preview-font-family-title);
          --font-size-title: var(--preview-font-size-title);
          --font-family-menu: var(--preview-font-family-menu);
          --font-size-menu: var(--preview-font-size-menu);
          --font-family-base: var(--preview-font-family-base);
          --font-size-base: var(--preview-font-size-base);
        }
      </style>
    `;
    $previewContainer.prepend(styleBlock);

    let currentSchemeId = getColorSchemeId();
    const schemes = getColorSchemes();

    Object.entries(schemes).forEach(([id, scheme]) => {
      const $option = $("<option>").val(id).text(scheme.name);
      if (id === currentSchemeId) {
        $option.prop("selected", true);
      }
      $schemeSelect.append($option);
    });

    // Add the "Load Color Scheme..." option
    const $loadOption = $("<option>")
      .val("__load__")
      .text("Load Color Scheme...");
    if (currentSchemeId === "custom") {
      $loadOption.text("Custom");
      $loadOption.prop("selected", true);
    }
    $schemeSelect.append($loadOption);

    $schemeSelect.on("change", async () => {
      const selectedValue = $schemeSelect.val();
      if (selectedValue === "__load__") {
        // Reset the dropdown to the previous value after a brief moment
        setTimeout(() => $schemeSelect.val(currentSchemeId), 100);

        const path = await ShowFilePicker({
          title: "Load Color Scheme",
          mode: "open",
          fileTypes: [
            { label: "Theme Files (*.theme)", extensions: ["theme"] },
          ],
        });

        if (!path) return;

        app._enableApplyButton(win);

        try {
          const fileContent = await getZenFSFileAsText(path);
          await loadThemeParser();
          const colors = window.getColorsFromThemeFile(fileContent);

          if (colors) {
            const cssProperties =
              window.generateThemePropertiesFromColors(colors);
            self.loadedCustomScheme = cssProperties;
            let variables = {};
            for (const [key, value] of Object.entries(cssProperties)) {
              variables[key.replace(/^--/, "")] = value;
            }

            applyPropertiesToPreview(
              variables,
              $previewContainer.find("#appearance-preview-wrapper")[0],
            );
            // Update dropdown to show a temporary "Custom" entry
            $schemeSelect.find('option[value="__load__"]').text("Custom");
            $schemeSelect.val("__load__");
          } else {
            self.loadedCustomScheme = null;
            ShowDialogWindow({
              title: "Error",
              text: "This is not a valid theme file or it does not contain color information.",
            });
            $schemeSelect.val(currentSchemeId); // Revert to last selection
          }
        } catch (error) {
          console.error("Error parsing theme file:", error);
          self.loadedCustomScheme = null;
          ShowDialogWindow({
            title: "Error",
            text: "An error occurred while trying to load the theme file.",
          });
          $schemeSelect.val(currentSchemeId); // Revert to last selection
        }
      } else {
        currentSchemeId = selectedValue;
        self.loadedCustomScheme = null; // Clear custom scheme if a built-in one is selected
        $schemeSelect
          .find('option[value="__load__"]')
          .text("Load Color Scheme...");
        app._enableApplyButton(win);
        applyThemeToPreview(
          selectedValue,
          $previewContainer.find("#appearance-preview-wrapper")[0],
        );
      }
    });

    // Pass the wrapper element for applying styles on initial load
    applyThemeToPreview(
      $schemeSelect.val(),
      $previewContainer.find("#appearance-preview-wrapper")[0],
    );
  },

  applyChanges: function (app) {
    const $schemeSelect = app.win.$content.find("#appearance .scheme-select");
    const newSchemeId = $schemeSelect.val();

    if (newSchemeId === "__load__" && this.loadedCustomScheme) {
      applyCustomColorScheme(this.loadedCustomScheme);
    } else {
      setColorScheme(newSchemeId);
    }
  },
};
