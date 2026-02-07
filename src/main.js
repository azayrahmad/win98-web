import "./shared/styles/cursors.css";
import "./shared/styles/file-picker.css";
import "./shared/styles/main.css";
import "./shared/styles/splash.css";
import "./shell/shutdown-screen.css";
import "./shared/styles/mobile.css";

import { initializeOS } from './system/os-init.js';
import { MobileManager } from './system/mobile-manager.js';

MobileManager.init();
initializeOS();
