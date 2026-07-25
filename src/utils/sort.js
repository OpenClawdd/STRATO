/**
 * Optimizes retrieval of the top N items from large datasets using a bounded insertion sort.
 * Prevents O(N log N) computational overhead and excessive memory allocation from full array sorts.
 */
export function getTopN(items, n, getValue) {
  if (n <= 0) return [];
  const top = [];

  for (const item of items) {
    const val = getValue(item);

    if (top.length < n || val > top[top.length - 1].val) {
      let i = top.length - 1;
      while (i >= 0 && val > top[i].val) {
        i--;
      }
      top.splice(i + 1, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
