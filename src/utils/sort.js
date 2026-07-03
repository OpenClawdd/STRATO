/**
 * Gets the top N elements from an array based on a value function,
 * using a bounded insertion sort. This is O(N) instead of O(N log N)
 * for the full array sort, and prevents large object allocations.
 */
export function getTopN(arr, limit, valueFn) {
  if (!arr || arr.length === 0 || limit <= 0) return [];

  const top = [];

  for (const item of arr) {
    const rawVal = valueFn(item);
    const val = typeof rawVal === "number" ? rawVal : 0;

    // If we haven't reached the limit yet, or the current value is greater than the smallest in our top list
    if (top.length < limit || val > top[top.length - 1].val) {
      // Find insertion point
      let i = 0;
      while (i < top.length && top[i].val >= val) {
        i++;
      }

      // Insert
      top.splice(i, 0, { item, val });

      // Keep bounded
      if (top.length > limit) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
