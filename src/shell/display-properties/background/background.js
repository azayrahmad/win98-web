import { setItem, LOCAL_STORAGE_KEYS } from '../../../system/local-storage.js';
import { ShowFilePicker } from '../../../shared/utils/file-picker.js';
import { getZenFSFileAsBlob, isZenFSPath, getZenFSFileUrl } from '../../../system/zenfs-utils.js';
import { fs } from "@zenfs/core";
import { getIconObjForFile } from '../../../shell/explorer/interface/file-icon-renderer.js';

function formatWallpaperName(filename) {
  let name = filename.replace(/\.[^/.]+$/, ""); // Remove extension
  name = name.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space between camelCase
  name = name.replace(/([A-Z])([A-Z][a-z])/g, '$1 $2'); // Add space between acronyms
  name = name.replace(/[_-]/g, ' '); // Replace separators
  // Capitalize
  return name.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
}

let currentPreviewBlobUrl = null;

async function populateWallpaperList(win, app) {
  const $wallpaperList = win.$content.find(".wallpaper-list");
  const wallpaperDir = "/C:/WINDOWS";

  let files = [];
  try {
    files = await fs.promises.readdir(wallpaperDir);
  } catch (e) {
    console.error("Failed to read wallpaper directory", e);
  }

  const imageExtensions = ['bmp', 'jpg', 'jpeg', 'png', 'gif'];
  const wallpaperFiles = files.filter(f => {
    const ext = f.split('.').pop().toLowerCase();
    return imageExtensions.includes(ext);
  });

  const wallpapersToDisplay = wallpaperFiles.map((filename) => {
    const path = `${wallpaperDir}/${filename}`;
    const iconObj = getIconObjForFile(filename, false);
    return { name: formatWallpaperName(filename), path, icon16: iconObj[16] };
  });

  const tableBody = $("<tbody></tbody>");
  const noneRow = $('<tr data-path="none"><td>(None)</td></tr>');
  tableBody.append(noneRow);

  wallpapersToDisplay.forEach(({ name, path, icon16 }) => {
    const tableRow = $(`
      <tr data-path="${path}">
        <td style="display: flex; align-items: center; gap: 4px;">
          <img src="${icon16}" width="16" height="16" draggable="false" />
          <span>${name}</span>
        </td>
      </tr>
    `);
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

async function updatePreview(win, app) {
  const $preview = win.$content.find(".display-wallpaper-preview");

  if (currentPreviewBlobUrl) {
    URL.revokeObjectURL(currentPreviewBlobUrl);
    currentPreviewBlobUrl = null;
  }

  if (app.selectedWallpaper && app.selectedWallpaper !== "none") {
    let wallpaperUrl = app.selectedWallpaper;
    if (isZenFSPath(wallpaperUrl)) {
      try {
        wallpaperUrl = await getZenFSFileUrl(wallpaperUrl);
        currentPreviewBlobUrl = wallpaperUrl;
      } catch (e) {
        console.error("Failed to load ZenFS wallpaper for preview:", e);
      }
    }

    const img = new Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      const scaledWidth = naturalWidth / 5;
      const scaledHeight = naturalHeight / 5;
      const cssProps = {
        "background-image": `url(${wallpaperUrl})`,
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
    img.src = wallpaperUrl;
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
    initialPath: "/C:/WINDOWS",
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
  async init(win, app) {
    await populateWallpaperList(win, app);
    await updatePreview(win, app);
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
