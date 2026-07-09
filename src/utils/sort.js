/**
 * Gets the top N items from an array based on a numeric value,
 * using a bounded insertion sort (O(N) time, O(1) space).
 * @param {Array} arr The array to search
 * @param {number} n The maximum number of items to return
 * @param {Function} getValue Function to extract the numeric sort key from an item
 * @returns {Array} The top N items
 */
export function getTopN(arr, n, getValue) {
  if (n <= 0) return [];
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item) || 0;

    if (top.length < n) {
      let j = top.length - 1;
      while (j >= 0 && (top[j].val || 0) < val) {
        j--;
      }
      top.splice(j + 1, 0, { item, val });
    } else if (val > (top[top.length - 1].val || 0)) {
      let j = top.length - 2;
      while (j >= 0 && (top[j].val || 0) < val) {
        j--;
      }
      top.splice(j + 1, 0, { item, val });
      top.pop();
    }
  }

  return top.map((t) => t.item);
}
