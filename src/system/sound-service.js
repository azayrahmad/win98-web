import { soundSchemes } from '../config/sound-schemes.js';
import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';

/**
 * SoundService handles system volume, muting, and playing sound events
 * based on the active sound scheme.
 */
export class SoundService {
  constructor(kernel) {
    this.kernel = kernel;
    this.globalVolume = getItem(LOCAL_STORAGE_KEYS.VOLUME) ?? 1.0;
    this.globalMuted = getItem(LOCAL_STORAGE_KEYS.MUTED) ?? false;
  }

  getVolume() {
    return this.globalVolume;
  }

  setVolume(volume) {
    this.globalVolume = Math.max(0, Math.min(1, volume));
    setItem(LOCAL_STORAGE_KEYS.VOLUME, this.globalVolume);
    document.dispatchEvent(new CustomEvent('system-volume-change', {
      detail: { volume: this.globalVolume, muted: this.globalMuted }
    }));
  }

  getMuted() {
    return this.globalMuted;
  }

  setMuted(muted) {
    this.globalMuted = muted;
    setItem(LOCAL_STORAGE_KEYS.MUTED, this.globalMuted);
    document.dispatchEvent(new CustomEvent('system-volume-change', {
      detail: { volume: this.globalVolume, muted: this.globalMuted }
    }));
  }

  async play(eventName) {
    if (this.globalMuted) return;

    const themeService = this.kernel.use('theme');
    const schemeName = themeService.getSoundSchemeName();
    const currentScheme = soundSchemes[schemeName];

    const soundUrl = currentScheme?.getSound(eventName) || soundSchemes.Default?.getSound(eventName);

    if (!soundUrl) return;

    return new Promise((resolve) => {
      const audio = new Audio(soundUrl);
      audio.volume = this.globalVolume;
      audio.addEventListener("ended", () => resolve());
      audio.addEventListener("error", (e) => {
        console.error("Error playing sound:", e);
        resolve();
      });
      audio.play().catch((e) => {
        console.error("Error playing sound:", e);
        resolve();
      });
    });
  }
}
