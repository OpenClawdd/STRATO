/**
 * Returns the top N elements from an array based on an extraction function,
 * using a bounded insertion sort to minimize allocations and maintain O(N) performance.
 *
 * @param {Array} arr The source array
 * @param {number} n The maximum number of elements to return
 * @param {Function} getValue Function to extract the sorting value (higher is better)
 * @returns {Array} The top N elements
 */
export function getTopN(arr, n, getValue) {
  if (!arr || arr.length === 0) return [];
  if (n <= 0) return [];

  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item) || 0;

    if (top.length < n || val > top[top.length - 1].val) {
      let insertIdx = top.length;
      while (insertIdx > 0 && val > top[insertIdx - 1].val) {
        insertIdx--;
      }

      top.splice(insertIdx, 0, { item, val });

      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((entry) => entry.item);
}
