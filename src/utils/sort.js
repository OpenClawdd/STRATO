/**
 * Extracts the top N elements from an array using a bounded insertion sort.
 * This is O(N) time and O(1) space, significantly faster than a full array .sort() (O(N log N))
 * for large datasets where only a small number of top elements are needed.
 *
 * @param {Array} array The array to process
 * @param {number} n The maximum number of elements to return
 * @param {Function} getValue Function that extracts the numeric value to sort by (descending)
 * @returns {Array} A new array containing the top N elements
 */
export function getTopN(array, n, getValue) {
  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const value = getValue(item) || 0;

    if (top.length === n && value <= (getValue(top[n - 1]) || 0)) {
      continue;
    }

    let insertIndex = 0;
    while (
      insertIndex < top.length &&
      value <= (getValue(top[insertIndex]) || 0)
    ) {
      insertIndex++;
    }

    top.splice(insertIndex, 0, item);

    if (top.length > n) {
      top.pop();
    }
  }

  return top;
}
