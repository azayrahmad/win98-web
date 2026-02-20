// Default sounds
import chimes from "../assets/audio/CHIMES.WAV";
import chord from "../assets/audio/CHORD.WAV";
import ding from "../assets/audio/DING.WAV";
import logoff from "../assets/audio/LOGOFF.WAV";
import notify from "../assets/audio/NOTIFY.WAV";
import recycle from "../assets/audio/RECYCLE.WAV";
import start from "../assets/audio/START.WAV";
import tada from "../assets/audio/TADA.WAV";
import theMicrosoftSound from "../assets/audio/The Microsoft Sound.wav";

export class SoundItem {
  constructor(path = "") {
    this.path = path;
  }
}

export class SoundScheme {
  static ALL_EVENTS = [
    "Default",
    "AppGPFault",
    "Maximize",
    "MenuCommand",
    "MenuPopup",
    "Minimize",
    "Open",
    "Close",
    "RestoreDown",
    "RestoreUp",
    "SystemAsterisk",
    "SystemExclamation",
    "SystemExit",
    "SystemHand",
    "SystemQuestion",
    "WindowsLogon",
    "EmptyRecycleBin",
    "ChangeTheme",
    "DeviceConnect",
    "DeviceDisconnect",
    "DeviceFail",
    "LowBatteryAlarm",
    "MailBeep",
    "SystemNotification",
    "WindowsLogoff",
    "StartNavigation",
    "RingIn",
    "Ringout",
    "SystemDefault",
  ];

  constructor(name, sounds = {}) {
    this.name = name;
    this.sounds = {};

    for (const event of SoundScheme.ALL_EVENTS) {
      const soundData = sounds[event];
      const path =
        typeof soundData === "string" ? soundData : soundData?.path || "";
      this.sounds[event] = new SoundItem(path);
    }
  }

  /**
   * Gets the sound URL for a given event, falling back to the Default scheme if not found.
   * @param {string} eventName
   * @returns {string|undefined}
   */
  getSound(eventName) {
    const sound = this.sounds[eventName]?.path;
    if (sound) return sound;

    // Fallback to Default scheme if this isn't already the Default scheme
    if (this.name !== "Default") {
      return soundSchemes.Default?.getSound(eventName);
    }

    return undefined;
  }
}

export const soundSchemes = {
  Default: new SoundScheme("Default", {
    Default: ding,
    AppGPFault: "",
    Maximize: "",
    MenuCommand: "",
    MenuPopup: "",
    Minimize: "",
    Open: "",
    Close: "",
    RestoreDown: "",
    RestoreUp: "",
    SystemAsterisk: chord,
    SystemExclamation: chord,
    SystemExit: tada,
    SystemHand: chord,
    SystemQuestion: chord,
    WindowsLogon: theMicrosoftSound,
    EmptyRecycleBin: ding,
    ChangeTheme: "",
    DeviceConnect: "",
    DeviceDisconnect: "",
    DeviceFail: "",
    LowBatteryAlarm: ding,
    MailBeep: chimes,
    SystemNotification: "",
    WindowsLogoff: logoff,
    StartNavigation: start,
  }),
};
