/**
 * Bounded insertion sort to find the top N elements in O(N) time.
 * Avoids full array sorting (O(N log N)) for large datasets.
 */
export function getTopN(items, n, getValue) {
  if (n <= 0) return [];
  const top = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const val = getValue(item) || 0;

    if (top.length < n || val > (top[top.length - 1].val || 0)) {
      let j = 0;
      while (j < top.length && (top[j].val || 0) >= val) {
        j++;
      }
      top.splice(j, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((t) => t.item);
}
