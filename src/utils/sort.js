/**
 * Keeps only the top N elements of an array according to a comparator.
 * Runs in O(N * maxItems) time and O(maxItems) space, avoiding full array sorts.
 *
 * @param {Array} arr - The source array
 * @param {Number} maxItems - Maximum number of items to return
 * @param {Function} compare - Comparator function, returns < 0 if first arg should be before second
 * @returns {Array} The top N items
 */
export function getTopN(arr, maxItems, compare) {
  const result = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (
      result.length < maxItems ||
      compare(item, result[result.length - 1]) < 0
    ) {
      let j = result.length;
      while (j > 0 && compare(item, result[j - 1]) < 0) {
        j--;
      }
      result.splice(j, 0, item);
      if (result.length > maxItems) {
        result.pop();
      }
    }
  }
  return result;
}
