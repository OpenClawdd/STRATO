/**
 * Bounded insertion sort to efficiently get top N items from a large array
 * without needing an O(N log N) full sort.
 * @param {Array} items - The array to extract top N from
 * @param {Function} extractValue - Function that returns a numeric sort key for an item (higher is better)
 * @param {number} limit - Number of top items to return
 * @returns {Array} - Array of top N items
 */
export function getTopN(items, extractValue, limit) {
  if (!items || !Array.isArray(items) || items.length === 0) return [];
  if (limit <= 0) return [];

  // If array is smaller than limit, just sort normally
  if (limit >= items.length) {
    return [...items].sort((a, b) => extractValue(b) - extractValue(a));
  }

  // Bounded insertion sort
  const topItems = []; // Array of { item, val }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const val = extractValue(item);

    // Fill up to the limit first
    if (topItems.length < limit) {
      topItems.push({ item, val });
      // Sort after each insertion while building initial array
      topItems.sort((a, b) => b.val - a.val);
    }
    // Once full, check if current item is better than the worst in our top N
    else if (val > topItems[topItems.length - 1].val) {
      // Find where to insert
      let insertIndex = topItems.length - 1;
      while (insertIndex > 0 && val > topItems[insertIndex - 1].val) {
        insertIndex--;
      }

      // Insert at the right spot and remove the lowest item
      topItems.splice(insertIndex, 0, { item, val });
      topItems.pop();
    }
  }

  return topItems.map((t) => t.item);
}
