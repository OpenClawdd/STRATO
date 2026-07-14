/**
 * Bounded insertion sort to efficiently get top N items from an array
 * without sorting the entire array.
 */
export function getTopN(items, n, getValue) {
  const top = [];
  for (const item of items) {
    const val = getValue(item);
    if (top.length < n) {
      let i = 0;
      while (i < top.length && top[i].val >= val) i++;
      top.splice(i, 0, { item, val });
    } else if (val > top[top.length - 1].val) {
      let i = 0;
      while (i < top.length && top[i].val >= val) i++;
      top.splice(i, 0, { item, val });
      top.pop();
    }
  }
  return top.map((x) => x.item);
}
