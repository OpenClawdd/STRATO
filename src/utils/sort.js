/**
 * Retrieves the top N items from an array based on a numeric value returned by getValue(item).
 * Uses a bounded insertion sort (O(N) time, O(1) space).
 *
 * @param {Array} arr - The array to search.
 * @param {number} n - The maximum number of items to return.
 * @param {Function} getValue - A function that takes an item and returns a number.
 * @param {Function} [filterFn] - Optional function to filter items before insertion.
 * @returns {Array} The top N items.
 */
export function getTopN(arr, n, getValue, filterFn = null) {
  if (n <= 0) return [];
  const top = []; // Array of { item, val }

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (filterFn && !filterFn(item)) continue;

    const val = getValue(item) || 0;

    if (top.length < n) {
      // Insert in sorted order (descending)
      let j = top.length;
      top.push({ item, val });
      while (j > 0 && top[j - 1].val < val) {
        // Swap
        const temp = top[j];
        top[j] = top[j - 1];
        top[j - 1] = temp;
        j--;
      }
    } else if (val > top[top.length - 1].val) {
      // Replace the last element and bubble up
      let j = top.length - 1;
      top[j] = { item, val };
      while (j > 0 && top[j - 1].val < val) {
        // Swap
        const temp = top[j];
        top[j] = top[j - 1];
        top[j - 1] = temp;
        j--;
      }
    }
  }

  // Extract the original items
  const result = [];
  for (let i = 0; i < top.length; i++) {
    result.push(top[i].item);
  }
  return result;
}
