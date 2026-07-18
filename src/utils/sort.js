/**
 * ⚡ Bolt: Bounded insertion sort to get top N items from an array efficiently.
 * Runs in O(N * K) time rather than O(N log N) of a full sort.
 * Stores evaluated sort key to avoid redundant expensive calls.
 *
 * @param {Array} arr - The array to process
 * @param {number} n - The maximum number of items to return
 * @param {Function} getValue - Function to extract the numeric value to sort by (descending)
 * @returns {Array} The top N items
 */
export function getTopN(arr, n, getValue) {
  const top = []; // Array of { item, val }

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);

    if (top.length < n || val > top[top.length - 1].val) {
      let insertIdx = 0;
      while (insertIdx < top.length && top[insertIdx].val >= val) {
        insertIdx++;
      }

      top.splice(insertIdx, 0, { item, val });

      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((t) => t.item);
}
