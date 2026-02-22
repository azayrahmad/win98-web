import { kernel } from './kernel.js';

/**
 * Legacy ColorModeManager proxying to DisplayService in Kernel.
 * @deprecated Use kernel.use('display') instead.
 */

export function setColorMode(mode) {
  return kernel.use('display').setColorMode(mode);
}

export function getCurrentColorMode() {
  return kernel.use('display').getCurrentColorMode();
}

export function getColorModes() {
  return kernel.use('display').getColorModes();
}

export function initColorModeManager(element) {
  return kernel.use('display').init(element);
}
