/**
 * Utility functions for efficient sorting
 */

/**
 * Returns the top N elements from an array based on a numeric value returned by getValue.
 * Uses a bounded insertion sort which is O(N) time and O(1) space, avoiding a full O(N log N) sort.
 *
 * @param {Array} items - The array of items to sort
 * @param {number} n - The maximum number of items to return
 * @param {Function} getValue - A function that takes an item and returns a numeric value to sort by (descending)
 * @returns {Array} The top N items
 */
export function getTopNDescending(items, n, getValue) {
  const result = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const itemVal = getValue(item) || 0;

    // Quick skip if we already have n items and current is worse than the worst in our list
    if (result.length === n && itemVal <= (getValue(result[n - 1]) || 0)) {
      continue;
    }

    let insertPos = result.length;
    while (insertPos > 0 && itemVal > (getValue(result[insertPos - 1]) || 0)) {
      insertPos--;
    }

    if (insertPos < n) {
      result.splice(insertPos, 0, item);
      if (result.length > n) {
        result.pop();
      }
    }
  }

  return result;
}
