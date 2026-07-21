/**
 * Computes the top N items in an array based on a numeric value.
 * This is an O(N * k) bounded insertion sort (where k is the limit),
 * which is significantly faster than O(N log N) full array sort for small k and large N.
 *
 * @param {Array} arr - The array to sort
 * @param {number} limit - The maximum number of items to return
 * @param {Function} getValue - A function that extracts the numeric sorting value from an item
 * @param {boolean} [ascending=false] - If true, returns smallest values. If false (default), returns largest.
 * @returns {Array} The top N items
 */
export function getTopN(arr, limit, getValue, ascending = false) {
  if (limit <= 0) return [];
  if (arr.length <= limit) {
    // If the array is smaller than the limit, just sort normally to save overhead
    return [...arr].sort((a, b) =>
      ascending ? getValue(a) - getValue(b) : getValue(b) - getValue(a),
    );
  }

  // Pre-evaluate the sort key for the first 'limit' elements
  const top = arr
    .slice(0, limit)
    .map((item) => ({ item, val: getValue(item) }));
  top.sort((a, b) => (ascending ? a.val - b.val : b.val - a.val));

  for (let i = limit; i < arr.length; i++) {
    const val = getValue(arr[i]);
    const isBetter = ascending
      ? val < top[limit - 1].val
      : val > top[limit - 1].val;

    if (isBetter) {
      // Find where to insert using linear scan (fast enough for small limits)
      let insertIndex = limit - 1;
      while (
        insertIndex > 0 &&
        (ascending
          ? val < top[insertIndex - 1].val
          : val > top[insertIndex - 1].val)
      ) {
        insertIndex--;
      }

      // Shift elements down
      for (let j = limit - 1; j > insertIndex; j--) {
        top[j] = top[j - 1];
      }
      top[insertIndex] = { item: arr[i], val };
    }
  }

  return top.map((t) => t.item);
}
