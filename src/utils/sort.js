/**
 * Efficient bounded insertion sort for computing "top N" elements from large arrays.
 * This runs in O(N) time and O(1) extra space, avoiding the O(N log N) cost of array.sort().
 *
 * @param {Array} array - The source array.
 * @param {number} n - The maximum number of top items to return.
 * @param {Function} getScore - A function that returns a numeric score for each item.
 * @returns {Array} A new array containing up to N top items, sorted highest to lowest.
 */
export function getTopN(array, n, getScore) {
  const top = [];
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const score = getScore(item) || 0;

    // Quick reject if array is full and score is smaller than the smallest
    if (top.length === n && score <= (getScore(top[n - 1]) || 0)) {
      continue;
    }

    // Find position to insert
    let pos = 0;
    while (pos < top.length && score < (getScore(top[pos]) || 0)) {
      pos++;
    }

    // Insert
    top.splice(pos, 0, item);
    if (top.length > n) {
      top.pop();
    }
  }
  return top;
}
