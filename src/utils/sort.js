/**
 * Computes the top N items from an array using a bounded insertion sort.
 * O(N) time and O(1) space, avoiding full array O(N log N) sorts.
 *
 * @param {Array} items - The array of items to sort
 * @param {number} n - The maximum number of items to return
 * @param {Function} getValue - A function that extracts the numerical sort key from an item
 * @returns {Array} The top N items
 */
export function getTopN(items, n, getValue) {
  if (n <= 0) return [];
  const top = []; // Array of { item, val }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const val = getValue(item) || 0;

    // Skip if array is full and current val is not strictly greater than the lowest val
    if (top.length === n && val <= (top[top.length - 1].val || 0)) {
      continue;
    }

    // Find insertion index
    let insertIdx = top.length;
    while (insertIdx > 0 && val > (top[insertIdx - 1].val || 0)) {
      insertIdx--;
    }

    // Insert item
    top.splice(insertIdx, 0, { item, val });

    // Keep bounded
    if (top.length > n) {
      top.pop();
    }
  }

  return top.map((t) => t.item);
}
