/**
 * Computes the top N items from an array in O(N) time and O(1) space
 * using a bounded insertion sort, instead of the O(N log N) full sort.
 *
 * @param {Array} items - The array of items
 * @param {number} n - The maximum number of items to return
 * @param {Function} getValue - Function to extract the numeric value to sort by (descending)
 * @returns {Array} - The top N items
 */
export function getTopNDescending(items, n, getValue) {
  if (!items || items.length === 0) return [];
  const top = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const val = getValue(item) || 0;

    const lastVal =
      top.length > 0 ? getValue(top[top.length - 1]) || 0 : -Infinity;

    // Check if we should insert the item
    if (top.length < n || val > lastVal) {
      let insertIndex = top.length;
      while (insertIndex > 0 && val > (getValue(top[insertIndex - 1]) || 0)) {
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
