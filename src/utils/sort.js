/**
 * Utility functions for bounded sorting of large datasets.
 * These functions reduce O(N log N) time complexity to O(N log K) or O(N * K).
 * Especially useful when N is large and K is small (e.g. top 10 leaderboard).
 */

/**
 * Returns the top N items from an array based on a valuation function.
 * Uses a simple bounded insertion sort.
 *
 * @param {Array} arr - The array to sort
 * @param {number} n - The maximum number of items to return
 * @param {Function} valFunc - A function that returns a numerical value for an item.
 *                             Higher values are sorted first (descending).
 * @returns {Array} The top N items.
 */
export function getTopN(arr, n, valFunc) {
  if (!arr || arr.length === 0) return [];
  if (n <= 0) return [];

  // We'll store objects of { item, val } to avoid recomputing valFunc
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = valFunc(item);

    // If the array isn't full yet, or this item is better than the worst item
    if (top.length < n || val > top[top.length - 1].val) {
      // Find where to insert
      let insertIdx = top.length;
      while (insertIdx > 0 && val > top[insertIdx - 1].val) {
        insertIdx--;
      }

      // Insert it
      top.splice(insertIdx, 0, { item, val });

      // Keep it bounded
      if (top.length > n) {
        top.pop();
      }
    }
  }

  // Map back to just the items
  return top.map((t) => t.item);
}
