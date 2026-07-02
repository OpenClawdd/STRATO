/**
 * Bounded insertion sort to find the top N elements in O(N) time and O(1) space.
 *
 * @param {Array} arr - The array to process
 * @param {number} n - The maximum number of elements to return
 * @param {Function} getValue - Function to extract the sorting value (higher is better)
 * @param {Function} [filterFn] - Optional function to filter items before considering them
 * @returns {Array} - The top N items
 */
export function getTopN(arr, n, getValue, filterFn) {
  if (n <= 0) return [];
  if (!arr || !arr.length) return [];

  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];

    if (filterFn && !filterFn(item)) continue;

    const val = getValue(item) || 0;

    if (top.length < n) {
      let j = top.length;
      while (j > 0 && (top[j - 1].val || 0) < val) {
        top[j] = top[j - 1];
        j--;
      }
      top[j] = { item, val };
    } else if (val > (top[top.length - 1].val || 0)) {
      let j = top.length - 1;
      while (j > 0 && (top[j - 1].val || 0) < val) {
        top[j] = top[j - 1];
        j--;
      }
      top[j] = { item, val };
    }
  }

  const result = new Array(top.length);
  for (let i = 0; i < top.length; i++) {
    result[i] = top[i].item;
  }
  return result;
}
