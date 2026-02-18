import { soundSchemes } from '../config/sound-schemes.js';
import { getSoundSchemeName } from './theme-manager.js';

/**
 * Plays a sound based on the given event name and the current sound scheme.
 * @param {string} eventName - The name of the sound event to play.
 * @returns {Promise<void>} A promise that resolves when the sound has finished playing.
 */
export function playSound(eventName) {
  return new Promise((resolve) => {
    const schemeName = getSoundSchemeName();
    const currentScheme = soundSchemes[schemeName];

    // Determine the sound file url using the class method which handles fallbacks
    const soundUrl = currentScheme?.getSound(eventName) || soundSchemes.Default?.getSound(eventName);

    // If no sound was found after all checks, resolve immediately.
    if (!soundUrl) {
      resolve();
      return;
    }

    const audio = new Audio(soundUrl);
    audio.addEventListener("ended", () => resolve());
    audio.addEventListener("error", (e) => {
      console.error("Error playing sound:", e);
      resolve(); // Resolve even on error to not block startup
    });
    audio.play().catch((e) => {
      console.error("Error playing sound:", e);
      resolve(); // Resolve even on error to not block startup
    });
  });
}
