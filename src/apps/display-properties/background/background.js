import { wallpapers } from '../../../config/wallpapers.js';
import { setItem, LOCAL_STORAGE_KEYS } from '../../../system/local-storage.js';
import { ShowFilePicker } from '../../../shared/utils/file-picker.js';
import { getZenFSFileAsBlob } from '../../../system/zenfs-utils.js';

function populateWallpaperList(win, app) {
  const $wallpaperList = win.$content.find(".wallpaper-list");
  const wallpapersToDisplay = wallpapers.default.map((w) => {
    const formattedName = w.id
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
    return { name: formattedName, path: w.src };
  });

  const tableBody = $("<tbody></tbody>");
  const noneRow = $('<tr data-path="none"><td>(None)</td></tr>');
  tableBody.append(noneRow);

  wallpapersToDisplay.forEach(({ name, path }) => {
    const tableRow = $(`<tr data-path=\"${path}\"><td>${name}</td></tr>`);
    tableBody.append(tableRow);
  });

  $wallpaperList.empty().append(tableBody);

  $wallpaperList.on("click", "tr", (e) => {
    const $selectedRow = $(e.currentTarget);
    app.selectedWallpaper = $selectedRow.data("path");
    updatePreview(win, app);
    app._enableApplyButton(win);

    $wallpaperList.find(".highlighted").removeClass("highlighted");
    $selectedRow.addClass("highlighted");
  });
}

function updatePreview(win, app) {
  const $preview = win.$content.find(".display-wallpaper-preview");

  if (app.selectedWallpaper && app.selectedWallpaper !== "none") {
    const img = new Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const scaledWidth = naturalWidth / 5;
      const scaledHeight = naturalHeight / 5;
      const cssProps = {
        "background-image": `url(${app.selectedWallpaper})`,
        "background-repeat": "no-repeat",
        "background-position": "center center",
      };

      switch (app.selectedWallpaperMode) {
        case "stretch":
          cssProps["background-size"] = "100% 100%";
          break;
        case "center":
          cssProps["background-size"] = `${scaledWidth}px ${scaledHeight}px`;
          break;
        case "tile":
          cssProps["background-size"] = `${scaledWidth}px ${scaledHeight}px`;
          cssProps["background-repeat"] = "repeat";
          cssProps["background-position"] = "0 0";
          break;
        default:
          cssProps["background-size"] = "100% 100%";
          break;
      }
      $preview.css(cssProps);
    };
    img.onerror = () => {
      $preview.css({
        "background-image": "none",
        "background-size": "auto",
        "background-repeat": "no-repeat",
        "background-position": "center center",
      });
    };
    img.src = app.selectedWallpaper;
  } else {
    $preview.css({
      "background-image": "none",
      "background-size": "auto",
      "background-repeat": "no-repeat",
      "background-position": "center center",
    });
  }
}

async function browseForWallpaper(win, app) {
  const path = await ShowFilePicker({
    title: "Browse for Wallpaper",
    mode: "open",
    initialPath: "/C:/WINDOWS/Web/Wallpaper",
    fileTypes: [
      {
        label: "Image Files",
        extensions: ["jpg", "jpeg", "png", "gif", "bmp"],
      },
      { label: "All Files", extensions: ["*"] },
    ],
  });

  if (path) {
    try {
      const blob = await getZenFSFileAsBlob(path);
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        app.selectedWallpaper = readerEvent.target.result;
        updatePreview(win, app);
        app._enableApplyButton(win);
      };
      reader.readAsDataURL(blob);
    } catch (e) {
      console.error("Error loading wallpaper from ZenFS:", e);
    }
  }
}

export const backgroundTab = {
  init(win, app) {
    populateWallpaperList(win, app);
    updatePreview(win, app);
    win.$content.find("#display-mode").val(app.selectedWallpaperMode);

    win.$content.find(".browse-button").on("click", () => browseForWallpaper(win, app));

    win.$content.find("#display-mode").on("change", (e) => {
      app.selectedWallpaperMode = $(e.target).val();
      app._enableApplyButton(win);
      updatePreview(win, app);
    });
  },
  applyChanges(app) {
    if (app.selectedWallpaper === "none") {
      setItem(LOCAL_STORAGE_KEYS.WALLPAPER, null);
    } else {
      setItem(LOCAL_STORAGE_KEYS.WALLPAPER, app.selectedWallpaper);
    }
    setItem(LOCAL_STORAGE_KEYS.WALLPAPER_MODE, app.selectedWallpaperMode);
    document.dispatchEvent(new CustomEvent("wallpaper-changed"));
  },
};
