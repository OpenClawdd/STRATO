/**
 * Retrieves the top N elements from an array based on a numeric value,
 * using a bounded insertion sort (O(N) time, O(1) extra space limit).
 *
 * @param {Array} array - The source array.
 * @param {number} n - The maximum number of elements to return.
 * @param {Function} getValue - Function extracting the numeric value to sort by descending.
 * @param {Function} [filterFn] - Optional function to filter items.
 * @returns {Array} The top N elements.
 */
export function getTopN(array, n, getValue, filterFn = null) {
  if (!array || array.length === 0 || n <= 0) return [];

  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (filterFn && !filterFn(item)) continue;

    const value = getValue(item) || 0;

    if (top.length < n || value > (getValue(top[top.length - 1]) || 0)) {
      let insertIndex = top.length;
      for (let j = 0; j < top.length; j++) {
        if (value > (getValue(top[j]) || 0)) {
          insertIndex = j;
          break;
        }
      }

      top.splice(insertIndex, 0, item);
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top;
}
