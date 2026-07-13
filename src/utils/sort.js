/**
 * bounded insertion sort for performance optimization
 * returns top N elements without sorting the whole array
 */
export function getTopN(items, n, getValue) {
  const top = [];
  for (const item of items) {
    const val = getValue(item);
    if (top.length < n) {
      top.push({ item, val });
      top.sort((a, b) => b.val - a.val); // Sort descending
    } else if (val > top[top.length - 1].val) {
      // Find insertion point for the new item
      let i = top.length - 1;
      while (i > 0 && top[i - 1].val < val) {
        top[i] = top[i - 1];
        i--;
      }
      top[i] = { item, val };
    }
  }
  return top.map((t) => t.item);
}
