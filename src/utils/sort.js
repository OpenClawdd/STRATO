/**
 * Efficiently gets the top N elements from an array without sorting the entire array.
 * Uses a bounded array to keep track of the top elements, reducing O(N log N) to O(N).
 *
 * @param {Array} list - The list of items to process
 * @param {number} n - The maximum number of items to return
 * @param {Function} getValue - A function that takes an item and returns a numeric value used for sorting (descending)
 * @param {Function} [filterFn] - Optional function to filter items before considering them
 * @returns {Array} The top N items
 */
export function getTopN(list, n, getValue, filterFn) {
  const top = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];

    if (filterFn && !filterFn(item)) continue;

    // Fallback to 0 if the value is undefined (to prevent functional regressions as per rules)
    const val = getValue(item) || 0;

    if (top.length < n) {
      top.push({ item, val });
      top.sort((a, b) => b.val - a.val);
    } else if (val > (top[top.length - 1].val || 0)) {
      top[top.length - 1] = { item, val };
      top.sort((a, b) => b.val - a.val);
    }
  }

  return top.map((x) => x.item);
}
