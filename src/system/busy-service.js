import {
  applyBusyCursor,
  clearBusyCursor,
  applyWaitCursor,
  clearWaitCursor,
} from './cursor-manager.js';

/**
 * BusyService tracks and manages the busy and wait cursor states for DOM elements.
 * It ensures cursors are only cleared when all requesters have released their hold.
 */
export class BusyService {
  constructor() {
    this.busyStateRequesters = new Map();
    this.waitStateRequesters = new Map();
  }

  requestBusy(requesterId, element = document.body) {
    this._requestState(requesterId, element, this.busyStateRequesters, applyBusyCursor);
  }

  releaseBusy(requesterId, element = document.body) {
    this._releaseState(requesterId, element, this.busyStateRequesters, clearBusyCursor);
  }

  requestWait(requesterId, element = document.body) {
    this._requestState(requesterId, element, this.waitStateRequesters, applyWaitCursor);
  }

  releaseWait(requesterId, element = document.body) {
    this._releaseState(requesterId, element, this.waitStateRequesters, clearWaitCursor);
  }

  _requestState(requesterId, element, requestersMap, applyCursor) {
    if (!requesterId) {
      console.warn('A unique requesterId must be provided.');
      return;
    }
    const requesters = requestersMap.get(element) || new Set();
    if (requesters.size === 0) {
      applyCursor(element);
    }
    requesters.add(requesterId);
    requestersMap.set(element, requesters);
  }

  _releaseState(requesterId, element, requestersMap, clearCursor) {
    const requesters = requestersMap.get(element);
    if (!requesters || !requesters.has(requesterId)) {
      return;
    }
    requesters.delete(requesterId);
    if (requesters.size === 0) {
      clearCursor(element);
      requestersMap.delete(element);
    }
  }
}
