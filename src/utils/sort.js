/**
 * Extracts the top N elements from an array based on a numeric value,
 * with an optional filter, using a bounded insertion sort (O(N) time, O(K) space).
 *
 * @param {Array} arr - The array to process.
 * @param {number} limit - The maximum number of elements to return.
 * @param {Function} getValueFn - Function to get the numeric value to sort by (descending).
 * @param {Function} [filterFn] - Optional function to filter elements before evaluating them.
 * @returns {Array} - The top N elements.
 */
export function getTopNDescending(arr, limit, getValueFn, filterFn = null) {
  if (limit <= 0) return [];
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (filterFn && !filterFn(item)) continue;

    const val = getValueFn(item) || 0;

    // Skip if we are full and the new value is worse than or equal to the lowest in the top array
    if (top.length === limit) {
      const lowestVal = getValueFn(top[top.length - 1]) || 0;
      if (val <= lowestVal) continue;
    }

    // Insert into sorted position
    let insertIdx = top.length;
    while (insertIdx > 0) {
      const prevVal = getValueFn(top[insertIdx - 1]) || 0;
      if (val <= prevVal) break;
      insertIdx--;
    }

    top.splice(insertIdx, 0, item);

    if (top.length > limit) {
      top.pop();
    }
  }

  return top;
}
