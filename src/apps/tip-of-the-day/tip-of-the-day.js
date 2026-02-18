import './tipOfTheDay.css';
import tipOfTheDayHTML from './tipOfTheDay.html?raw';
import tipIconUrl from '../../assets/icons/RNAUI_106.ico';

export const tipOfTheDayContent = tipOfTheDayHTML.replace('TIP_ICON_PLACEHOLDER', tipIconUrl);