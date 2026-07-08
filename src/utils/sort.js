/**
 * Computes the top N items from an array based on a numeric value extraction function
 * using a bounded insertion sort. Time complexity: O(N * K) where N is array length and K is top N.
 * Space complexity: O(K).
 *
 * @template T
 * @param {T[]} items The items to search
 * @param {number} n The maximum number of top items to return
 * @param {(item: T) => number} getValue Function to extract the numeric value to sort by (descending)
 * @returns {T[]} The top N items
 */
export function getTopN(items, n, getValue) {
  if (items.length === 0 || n <= 0) return [];

  const topList = [];

  for (const item of items) {
    const val = getValue(item);

    // Skip if we already have n items and the current value is less than or equal to the smallest in our top list
    if (topList.length === n && val <= (topList[n - 1].val || 0)) {
      continue;
    }

    // Find insertion index
    let insertIdx = 0;
    while (insertIdx < topList.length && val <= (topList[insertIdx].val || 0)) {
      insertIdx++;
    }

    // Insert into the bounded list
    topList.splice(insertIdx, 0, { item, val });

    // Keep it bounded
    if (topList.length > n) {
      topList.pop();
    }
  }

  return topList.map((t) => t.item);
}
