/**
 * Computes the top N items in a single pass without sorting the entire array.
 * Uses a bounded insertion sort (O(N) time, O(N) space where N is the limit).
 *
 * @param {Array} items - The dataset to process.
 * @param {number} limit - The maximum number of items to return.
 * @param {Function} getValue - Function extracting the numeric value to sort by (descending).
 * @param {Function} [filterFn] - Optional function to filter items before processing.
 * @returns {Array} The top N items.
 */
export function getTopN(items, limit, getValue, filterFn) {
  const top = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (filterFn && !filterFn(item)) continue;

    const val = getValue(item) || 0;

    // If array not full or current value is greater than the lowest value in our bounded list
    if (top.length < limit || val > (top[top.length - 1].val || 0)) {
      // Find insertion point
      let insertIdx = 0;
      while (insertIdx < top.length && top[insertIdx].val >= val) {
        insertIdx++;
      }

      // Insert item and its evaluated value
      top.splice(insertIdx, 0, { item, val });

      // Trim to limit
      if (top.length > limit) {
        top.pop();
      }
    }
  }

  // Return just the original items
  return top.map((entry) => entry.item);
}
