import { kernel } from './kernel.js';

/**
 * Legacy BusyStateManager proxying to BusyService in Kernel.
 * @deprecated Use kernel.use('busy') instead.
 */

export function requestBusyState(requesterId, element = document.body) {
  return kernel.use('busy').requestBusy(requesterId, element);
}

export function releaseBusyState(requesterId, element = document.body) {
  return kernel.use('busy').releaseBusy(requesterId, element);
}

export function requestWaitState(requesterId, element = document.body) {
  return kernel.use('busy').requestWait(requesterId, element);
}

export function releaseWaitState(requesterId, element = document.body) {
  return kernel.use('busy').releaseWait(requesterId, element);
}
