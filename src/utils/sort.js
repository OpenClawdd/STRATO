/**
 * Keeps track of the top N elements of a sequence according to an extraction function,
 * avoiding the overhead of sorting the entire sequence or creating unnecessary intermediate objects.
 *
 * @param {Array} array - The input array.
 * @param {Number} n - The maximum number of elements to return.
 * @param {Function} extractor - Function to extract the numeric value for comparison.
 * @returns {Array} - The top N elements.
 */
export function getTopN(array, n, extractor) {
  const top = [];

  for (const item of array) {
    const val = extractor(item) || 0;

    // Fast path: if we haven't filled top N yet, or it's larger than the smallest in top
    if (top.length < n || val > top[top.length - 1].val) {
      // Find insertion point
      let insertIndex = top.length;
      while (insertIndex > 0 && val > top[insertIndex - 1].val) {
        insertIndex--;
      }

      // Insert and maintain size
      top.splice(insertIndex, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map(t => t.item);
}
