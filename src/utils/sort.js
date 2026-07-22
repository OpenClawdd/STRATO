/**
 * Optimized bounded insertion sort to get top N items.
 * Performs O(N) comparisons and avoids O(N log N) full sort.
 * Stores evaluated sort key to prevent redundant extraction calls.
 */
export function getTopN(array, n, extractValue) {
  if (n <= 0) return [];
  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const val = extractValue(item);

    if (top.length < n || val > top[top.length - 1].val) {
      let insertIdx = top.length;
      while (insertIdx > 0 && top[insertIdx - 1].val < val) {
        insertIdx--;
      }

      top.splice(insertIdx, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((t) => t.item);
}
