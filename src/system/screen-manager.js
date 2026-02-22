import { kernel } from './kernel.js';

/**
 * Legacy ScreenManager proxying to DisplayService in Kernel.
 * @deprecated Use kernel.use('display') instead.
 */

export function initScreenManager() {
  // Usually called in os-init, but we'll proxy it if needed.
  // DisplayService.init is called in os-init now.
}

export function getAvailableResolutions() {
  return kernel.use('display').getAvailableResolutions();
}

export function setResolution(resolutionId) {
  return kernel.use('display').setResolution(resolutionId);
}

export function getCurrentResolutionId() {
  return kernel.use('display').getCurrentResolutionId();
}
