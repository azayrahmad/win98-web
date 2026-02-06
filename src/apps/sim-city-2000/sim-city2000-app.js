import { DosBoxApp } from '../dosbox/dosbox-app.js';
import { ICONS } from '../../config/icons.js';

export class SimCity2000App extends DosBoxApp {
  static config = {
    id: "sim-city-2000",
    title: "SimCity 2000",
    description: "Play SimCity 2000.",
    icon: ICONS.simcity2000,
    width: 640,
    height: 480,
    resizable: true,
    maximizable: true,
    isSingleton: true,
  };

  async _createWindow() {
    return super._createWindow("/C:/Games/SimCity2000/SC2000.EXE");
  }

  async _onLaunch() {
    return super._onLaunch("/C:/Games/SimCity2000/SC2000.EXE");
  }
}
