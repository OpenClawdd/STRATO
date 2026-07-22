/**
 * Retrieves the top N items from an array based on a computed value.
 * Uses a bounded insertion sort to avoid O(N log N) full array sort overhead.
 *
 * @param {Array} items - The array to process.
 * @param {number} n - The maximum number of items to return.
 * @param {Function} getValue - A function that takes an item and returns its sort value (higher is better).
 * @returns {Array} The top N items.
 */
export function getTopN(items, n, getValue) {
  const top = [];

  for (const item of items) {
    const val = getValue(item);

    if (top.length < n || val > top[top.length - 1].val) {
      let i = top.length - 1;
      while (i >= 0 && top[i].val < val) {
        i--;
      }
      top.splice(i + 1, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
