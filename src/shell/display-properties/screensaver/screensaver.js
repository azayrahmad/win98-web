import { SCREENSAVERS } from '../../../config/screensavers.js';
import screensaverManager from '../../../system/screensaver-utils.js';
import { setItem, LOCAL_STORAGE_KEYS } from '../../../system/local-storage.js';
import {
  requestBusyState,
  releaseBusyState,
} from '../../../system/busy-state-manager.js';

function updateScreensaverPreview(win, app) {
  const $preview = win.$content.find(".display-screensaver-preview");
  $preview.empty();

  const screensaver = SCREENSAVERS[app.selectedScreensaver];
  if (screensaver && screensaver.path) {
    const previewId = `screensaver-preview-${Date.now()}`;
    requestBusyState(previewId, win.$content[0]);
    const $iframe = $("<iframe>")
      .attr("src", `${import.meta.env.BASE_URL}${screensaver.path}`)
      .css({
        width: "100%",
        height: "100%",
        border: "none",
        "pointer-events": "none",
      })
      .on("load", () => {
        releaseBusyState(previewId, win.$content[0]);
      });
    $preview.append($iframe);
  }
}

export const screensaverTab = {
  init(win, app) {
    const $dropdown = win.$content.find("#screensaver-dropdown");
    const $previewButton = win.$content.find(".preview-button");
    const $waitTimeInput = win.$content.find("#wait-time");

    Object.keys(SCREENSAVERS).forEach((id) => {
      const screensaver = SCREENSAVERS[id];
      const $option = $(`<option value="${id}">${screensaver.name}</option>`);
      $dropdown.append($option);
    });

    $dropdown.val(app.selectedScreensaver);
    $waitTimeInput.val(app.screensaverTimeout);

    $dropdown.on("change", (e) => {
      app.selectedScreensaver = $(e.target).val();
      updateScreensaverPreview(win, app);
      app._enableApplyButton(win);
    });

    $waitTimeInput.on("change", (e) => {
      app.screensaverTimeout = parseInt($(e.target).val(), 10);
      app._enableApplyButton(win);
    });

    $previewButton.on("click", () => {
      if (app.selectedScreensaver !== "none") {
        screensaverManager.showPreview(app.selectedScreensaver);
      }
    });
  },
  applyChanges(app) {
    screensaverManager.setCurrentScreensaver(app.selectedScreensaver);
    setItem(
      LOCAL_STORAGE_KEYS.SCREENSAVER_TIMEOUT,
      app.screensaverTimeout * 60000,
    );
  },
  updatePreview: updateScreensaverPreview,
};
