import { kernel } from './kernel.js';

/**
 * Legacy SoundManager proxying to SoundService in Kernel.
 * @deprecated Use kernel.use('sound') instead.
 */

export function getVolume() {
  return kernel.use('sound').getVolume();
}

export function setVolume(volume) {
  return kernel.use('sound').setVolume(volume);
}

export function getMuted() {
  return kernel.use('sound').getMuted();
}

export function setMuted(muted) {
  return kernel.use('sound').setMuted(muted);
}

export function playSound(eventName) {
  return kernel.use('sound').play(eventName);
}
