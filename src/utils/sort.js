/**
 * Computes the top N elements from an array using a bounded insertion sort.
 * This is O(N) time and O(1) space, avoiding full array sorts (O(N log N)).
 *
 * @param {Array} array - The source array.
 * @param {number} n - The maximum number of elements to return.
 * @param {Function} getValue - Function to extract the numeric value for sorting.
 * @param {Function} [filterFn] - Optional function to filter elements before sorting.
 * @returns {Array} - The top N elements.
 */
export function getTopN(array, n, getValue, filterFn = null) {
  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];

    if (filterFn && !filterFn(item)) {
      continue;
    }

    const value = getValue(item) || 0;

    // Provide fallback for undefined values in comparisons
    if (top.length < n || value > (getValue(top[top.length - 1]) || 0)) {
      let insertIndex = top.length;
      while (insertIndex > 0 && value > (getValue(top[insertIndex - 1]) || 0)) {
        insertIndex--;
      }
      top.splice(insertIndex, 0, item);
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top;
}
