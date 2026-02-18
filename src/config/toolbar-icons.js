import browseUiIcons from '../assets/icons/browse-ui-icons.png';
import browseUiIconsGrayscale from '../assets/icons/browse-ui-icons-grayscale.png';

export const BROWSE_UI_ICONS = browseUiIcons;
export const BROWSE_UI_ICONS_GRAYSCALE = browseUiIconsGrayscale;

const ICON_SIZE = 20; // Each icon is 20x20
const ICON_COUNT = 63;

export const TOOLBAR_ICON_CONFIG = {};

for (let i = 0; i < ICON_COUNT; i++) {
  const iconName = `icon${i + 1}`;
  TOOLBAR_ICON_CONFIG[iconName] = {
    position: `-${i * ICON_SIZE}px 0px`,
  };
}
