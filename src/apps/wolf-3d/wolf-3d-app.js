import { DosBoxApp } from '../dosbox/dosbox-app.js';
import { ICONS } from '../../config/icons.js';

export class Wolf3DApp extends DosBoxApp {
  static config = {
    id: "wolf-3d",
    title: "Wolfenstein 3D",
    description: "Play the classic first-person shooter Wolfenstein 3D.",
    icon: ICONS.msdos,
    width: 640,
    height: 480,
    resizable: true,
    maximizable: true,
  };

  constructor(config) {
    super(config);
  }

  _createWindow() {
    return super._createWindow("/C:/Games/Wolf3D/WOLF3D.EXE");
  }

  _onLaunch() {
    this.win.focus();
  }
}
