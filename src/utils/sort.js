/**
 * Utility for bounded insertion sort.
 * Retrieves the top N items from a dataset without performing a full O(N log N) sort.
 */
export function getTopN(items, n, getValue) {
  if (!items || items.length === 0) return [];
  if (n <= 0) return [];

  const top = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const val = getValue(item);

    if (top.length < n) {
      let inserted = false;
      for (let j = 0; j < top.length; j++) {
        if (val > top[j].val) {
          top.splice(j, 0, { item, val });
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        top.push({ item, val });
      }
    } else if (val > top[top.length - 1].val) {
      let j = top.length - 1;
      while (j > 0 && top[j - 1].val < val) {
        j--;
      }
      top.splice(j, 0, { item, val });
      top.pop();
    }
  }

  return top.map((t) => t.item);
}
