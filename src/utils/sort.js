/**
 * Efficiently computes the top N elements from an array based on a scoring function.
 * Uses a bounded insertion sort to achieve O(N) time and O(1) space (relative to N),
 * avoiding full array allocation and sorting (O(N log N)).
 *
 * @param {Array} array - The array to process
 * @param {number} n - The number of top elements to return
 * @param {Function} getScore - A function that returns the score for an element (higher is better)
 * @param {Function} [filterFn] - Optional function to filter elements before processing
 * @returns {Array} - The top N elements, sorted descending by score
 */
export function getTopN(array, n, getScore, filterFn = null) {
  if (!Array.isArray(array) || n <= 0) return [];
  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (filterFn && !filterFn(item)) continue;

    const score = getScore(item) || 0;

    // If list is not full, or score is strictly greater than the lowest score in our list
    if (top.length < n || score > (getScore(top[top.length - 1]) || 0)) {
      // Find correct position to insert (descending order)
      let j = 0;
      while (j < top.length && (getScore(top[j]) || 0) >= score) {
        j++;
      }

      top.splice(j, 0, item);

      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top;
}
