/**
 * Gets the top N items from a list based on a value function using a bounded insertion sort.
 * This is O(N) time and O(1) space, rather than O(N log N) time for a full sort.
 *
 * @param {Array} list - The list to sort
 * @param {Number} n - Number of items to return
 * @param {Function} valueFn - Function extracting the numeric value to sort by (descending)
 * @param {Function} filterFn - Optional function to filter items before considering them
 * @returns {Array} The top N items
 */
export function getTopN(list, n, valueFn, filterFn = null) {
  const result = [];

  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    if (filterFn && !filterFn(item)) continue;

    const value = valueFn(item) || 0;

    // Only insert if result is not full, or value is greater than the smallest in the result
    if (
      result.length < n ||
      value > (valueFn(result[result.length - 1]) || 0)
    ) {
      let insertIndex = 0;
      while (
        insertIndex < result.length &&
        (valueFn(result[insertIndex]) || 0) >= value
      ) {
        insertIndex++;
      }
      result.splice(insertIndex, 0, item);
      if (result.length > n) {
        result.pop();
      }
    }
  }
  return result;
}
