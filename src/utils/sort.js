/**
 * O(N) bounded insertion sort to find the top N elements in an array.
 * This avoids O(N log N) full array sorts and reduces memory allocations
 * compared to chaining .map().sort().slice().
 */
export function getTopN(array, n, getValue) {
  if (!array || array.length === 0) return [];
  if (n <= 0) return [];

  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    // Fallback to 0 for undefined/null numerical properties
    const val = getValue(item) || 0;

    if (top.length < n || val > (top[top.length - 1].val || 0)) {
      // Find insertion point (descending order)
      let insertIdx = 0;
      while (insertIdx < top.length && (top[insertIdx].val || 0) >= val) {
        insertIdx++;
      }

      top.splice(insertIdx, 0, { item, val });

      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
