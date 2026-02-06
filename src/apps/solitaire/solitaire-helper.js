/**
 * Finds the best drop target based on the largest overlapping area.
 * @param {DOMRect} draggedRect - The bounding rectangle of the element being dragged.
 * @param {HTMLElement[]} targets - An array of potential drop target elements.
 * @returns {HTMLElement|null} The target element with the largest overlap, or null if no targets are provided.
 */
export function findBestDropTarget(draggedRect, targets) {
  let bestTarget = null;
  let maxOverlap = 0;

  for (const target of targets) {
    const targetRect = target.getBoundingClientRect();

    const overlapX = Math.max(
      0,
      Math.min(draggedRect.right, targetRect.right) -
        Math.max(draggedRect.left, targetRect.left),
    );
    const overlapY = Math.max(
      0,
      Math.min(draggedRect.bottom, targetRect.bottom) -
        Math.max(draggedRect.top, targetRect.top),
    );

    const overlapArea = overlapX * overlapY;

    if (overlapArea > maxOverlap) {
      maxOverlap = overlapArea;
      bestTarget = target;
    }
  }

  return bestTarget;
}
