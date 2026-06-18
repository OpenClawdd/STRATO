/**
 * Utility to find the top N elements in an array without full sorting.
 * Bounded insertion sort takes O(N) time and O(1) space.
 *
 * @param {Array} array The array to sort
 * @param {number} n The maximum number of elements to return
 * @param {Function} getValue Function that takes an item and returns its numeric value for sorting
 * @returns {Array} The top N items
 */
export function getTopN(array, n, getValue) {
  if (n <= 0) return [];
  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const val = getValue(item) || 0;

    if (top.length < n || val > (getValue(top[top.length - 1]) || 0)) {
      let j = top.length - 1;

      if (top.length < n) {
        top.push(item);
        j++;
      }

      while (j > 0 && val > (getValue(top[j - 1]) || 0)) {
        top[j] = top[j - 1];
        j--;
      }
      top[j] = item;
    }
  }

  return top;
}
