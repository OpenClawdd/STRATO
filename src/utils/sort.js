export function getTopN(items, n, getValue, predicate = null) {
  const top = [];
  for (const item of items) {
    if (predicate && !predicate(item)) continue;

    const val = getValue(item) || 0;

    if (top.length < n || val > (top[top.length - 1]?.val || 0)) {
      let i = top.length - 1;
      while (i >= 0 && val > (top[i]?.val || 0)) {
        i--;
      }
      top.splice(i + 1, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }
  return top.map((entry) => entry.item);
}
