import {
  applyBusyCursor,
  clearBusyCursor,
  applyWaitCursor,
  clearWaitCursor,
} from './cursor-manager.js';

const busyStateRequesters = new Map();
const waitStateRequesters = new Map();

function requestState(
  requesterId,
  element,
  requestersMap,
  applyCursor,
) {
  if (!requesterId) {
    console.warn('A unique requesterId must be provided to request a busy/wait state.');
    return;
  }
  const requesters = requestersMap.get(element) || new Set();
  if (requesters.size === 0) {
    applyCursor(element);
  }
  requesters.add(requesterId);
  requestersMap.set(element, requesters);
}

function releaseState(
  requesterId,
  element,
  requestersMap,
  clearCursor,
) {
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

/**
 * Requests the busy cursor for a given element, tracked by a unique requester ID.
 * The busy cursor is applied only on the first request and removed only on the last release.
 * @param {string | Symbol} requesterId - A unique identifier for the component/operation requesting the state.
 * @param {HTMLElement} [element=document.body] - The element to apply the cursor to.
 */
export function requestBusyState(requesterId, element = document.body) {
  requestState(
    requesterId,
    element,
    busyStateRequesters,
    applyBusyCursor,
  );
}

/**
 * Releases the busy cursor for a given element, tracked by a unique requester ID.
 * @param {string | Symbol} requesterId - The unique identifier used when requesting the state.
 * @param {HTMLElement} [element=document.body] - The element to clear the cursor from.
 */
export function releaseBusyState(requesterId, element = document.body) {
  releaseState(
    requesterId,
    element,
    busyStateRequesters,
    clearBusyCursor,
  );
}

/**
 * Requests the wait cursor for a given element, tracked by a unique requester ID.
 * The wait cursor is applied only on the first request and removed only on the last release.
 * @param {string | Symbol} requesterId - A unique identifier for the component/operation requesting the state.
 * @param {HTMLElement} [element=document.body] - The element to apply the cursor to.
 */
export function requestWaitState(requesterId, element = document.body) {
  requestState(
    requesterId,
    element,
    waitStateRequesters,
    applyWaitCursor,
  );
}

/**
 * Releases the wait cursor for a given element, tracked by a unique requester ID.
 * @param {string | Symbol} requesterId - The unique identifier used when requesting the state.
 * @param {HTMLElement} [element=document.body] - The element to clear the cursor from.
 */
export function releaseWaitState(requesterId, element = document.body) {
  releaseState(
    requesterId,
    element,
    waitStateRequesters,
    clearWaitCursor,
  );
}
