/**
 * Retrieves the top N items from an array based on a numeric value,
 * using a bounded insertion sort to avoid O(N log N) full sort overhead.
 *
 * @param {Array} array - The source array.
 * @param {number} n - The maximum number of items to return.
 * @param {Function} getValue - Function to extract the sorting value (higher is better).
 * @returns {Array} Top N items.
 */
export function getTopN(array, n, getValue) {
  const top = []; // Array to store { item, val }

  for (const item of array) {
    const val = getValue(item);

    // Only process if we haven't reached N, or this item's value is greater than our smallest top value
    if (top.length < n || val > top[top.length - 1].val) {
      let i = top.length - 1;

      // Find the correct insertion point (descending order)
      while (i >= 0 && val > top[i].val) {
        i--;
      }

      // Insert the new element
      top.splice(i + 1, 0, { item, val });

      // Keep only top N items
      if (top.length > n) {
        top.pop();
      }
    }
  }

  // Map back to just the items
  return top.map((entry) => entry.item);
}
