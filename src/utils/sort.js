/**
 * Bounded insertion sort to find the top N elements of an array.
 * Runs in O(N) time and O(1) space, avoiding O(N log N) full array sorts
 * and intermediate array allocations from map/slice chains.
 *
 * @param {Array} array - The source array
 * @param {number} n - Number of top elements to retrieve
 * @param {Function} getValue - Function mapping an element to its numeric score
 * @param {Function} [predicate] - Optional filter function
 * @returns {Array} Array of top N elements sorted descending
 */
export function getTopN(array, n, getValue, predicate = null) {
  if (n <= 0) return [];
  const top = [];
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (predicate && !predicate(item)) continue;

    const itemVal = getValue(item) || 0;

    if (top.length === n) {
      const lastVal = getValue(top[top.length - 1]) || 0;
      if (itemVal <= lastVal) {
        continue;
      }
    }

    let insertAt = top.length;
    for (let j = 0; j < top.length; j++) {
      const topVal = getValue(top[j]) || 0;
      if (itemVal > topVal) {
        insertAt = j;
        break;
      }
    }

    if (insertAt < n) {
      top.splice(insertAt, 0, item);
      if (top.length > n) {
        top.pop();
      }
    }
  }
  return top;
}
