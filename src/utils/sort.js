export function getTopN(items, n, getValue, filterFn) {
  const top = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (filterFn && !filterFn(item)) continue;

    const val = getValue(item) || 0;
    if (top.length < n || val > (top[top.length - 1].val || 0)) {
      let insertIdx = top.length;
      while (insertIdx > 0 && val > (top[insertIdx - 1].val || 0)) {
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
