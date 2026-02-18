import { getItem, setItem, LOCAL_STORAGE_KEYS } from './local-storage.js';
import { recycleBinContent } from '../config/recyclebin.js';

/**
 * Gets all items from the Recycle Bin.
 * @returns {Array} An array of items in the Recycle Bin.
 */
export function getRecycleBinItems() {
  const items = getItem(LOCAL_STORAGE_KEYS.RECYCLE_BIN);
  if (items === null) {
    setItem(LOCAL_STORAGE_KEYS.RECYCLE_BIN, recycleBinContent);
    return recycleBinContent;
  }
  return items;
}

/**
 * Adds an item to the Recycle Bin.
 * @param {object} item - The item to add.
 */
export function addToRecycleBin(item) {
  const items = getRecycleBinItems();
  items.push(item);
  setItem(LOCAL_STORAGE_KEYS.RECYCLE_BIN, items);
}

/**
 * Removes an item from the Recycle Bin by its ID.
 * @param {string} itemId - The ID of the item to remove.
 */
export function removeFromRecycleBin(itemId) {
  const items = getRecycleBinItems();
  const newItems = items.filter(item => item.id !== itemId);
  setItem(LOCAL_STORAGE_KEYS.RECYCLE_BIN, newItems);
}

/**
 * Clears all items from the Recycle Bin.
 */
export function emptyRecycleBin() {
  setItem(LOCAL_STORAGE_KEYS.RECYCLE_BIN, []);
}
