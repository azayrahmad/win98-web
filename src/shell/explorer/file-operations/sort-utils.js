
import { getAssociation } from '../../../system/directory.js';

/**
 * Common sorting logic for ZenExplorer
 */

export function sortFileInfos(fileInfos, sortBy, path, order = []) {
  const VIRTUAL_ORDER = [
    "My Computer",
    "My Documents",
    "Internet Explorer",
    "Network Neighborhood",
    "Recycle Bin",
  ];

  const getOrderIndex = (name) => {
    const index = order.indexOf(name);
    return index === -1 ? Infinity : index;
  };

  const sortFn = (a, b) => {
    // Special priority for specific virtual icons (regardless of sort method or order)
    const indexA = VIRTUAL_ORDER.indexOf(a.name);
    const indexB = VIRTUAL_ORDER.indexOf(b.name);
    const isSpecialA = indexA !== -1 && a.stat?.isVirtual;
    const isSpecialB = indexB !== -1 && b.stat?.isVirtual;

    if (isSpecialA || isSpecialB) {
      if (isSpecialA && isSpecialB) return indexA - indexB;
      return isSpecialA ? -1 : 1;
    }

    // Special sort for root: Drives before shell extensions
    if (path === "/" && order.length === 0) {
      const isDriveA = a.name.match(/^[A-Z]:$/i);
      const isDriveB = b.name.match(/^[A-Z]:$/i);
      if (isDriveA && !isDriveB) return -1;
      if (!isDriveA && isDriveB) return 1;
    }

    // Use order if provided
    if (order.length > 0) {
      const orderA = getOrderIndex(a.name);
      const orderB = getOrderIndex(b.name);
      if (orderA !== orderB) return orderA - orderB;
      return a.name.localeCompare(b.name);
    }

    // Folders first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    switch (sortBy) {
      case "size":
        return a.stat.size - b.stat.size || a.name.localeCompare(b.name);
      case "type":
        const associationA = getAssociation(a.name);
        const associationB = getAssociation(b.name);
        const typeA = a.isDirectory ? "" : (associationA ? (associationA.name || "") : "");
        const typeB = b.isDirectory ? "" : (associationB ? (associationB.name || "") : "");
        return typeA.localeCompare(typeB) || a.name.localeCompare(b.name);
      case "date":
        return (
          (a.stat.mtime?.getTime() || 0) - (b.stat.mtime?.getTime() || 0) ||
          a.name.localeCompare(b.name)
        );
      case "name":
      default:
        return a.name.localeCompare(b.name);
    }
  };

  return [...fileInfos].sort(sortFn);
}
