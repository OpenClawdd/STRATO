/**
 * Bounded insertion sort to find the top N items efficiently.
 * This avoids O(N log N) sorting and multiple array allocations.
 *
 * @param {Array} items - The items to sort
 * @param {number} limit - Maximum number of items to return
 * @param {function} getValue - Function extracting the numeric value to sort by (descending)
 * @param {function} mapFn - Optional mapping function for the inserted items
 * @returns {Array} - The top N items
 */
export function topN(items, limit, getValue, mapFn = (x) => x) {
  const top = [];
  for (const item of items) {
    const val = getValue(item);
    // Include fallback to 0 if original item's value evaluates to falsy, matching how we handle undefined properties
    const lastItemVal =
      top.length > 0 ? getValue(top[top.length - 1].__originalItem) || 0 : 0;

    if (top.length < limit || val > lastItemVal) {
      const mapped = mapFn(item);
      mapped.__originalItem = item; // Store original item for comparison

      let insertIndex = top.findIndex(
        (t) => val > (getValue(t.__originalItem) || 0),
      );
      if (insertIndex === -1) insertIndex = top.length;
      top.splice(insertIndex, 0, mapped);

      if (top.length > limit) {
        top.pop();
      }
    }
  }

  // Clean up the temporary __originalItem reference
  for (const item of top) {
    delete item.__originalItem;
  }
  return top;
}
