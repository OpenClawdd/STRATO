/**
 * ⚡ Bolt: Bounded insertion sort to retrieve the top N items from large datasets.
 * Prevents O(N log N) computational overhead and excessive memory allocation.
 * Stores the evaluated sort key alongside the item to avoid redundant evaluation.
 */
export function getTopN(arr, n, getValue) {
  if (n <= 0) return [];
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);

    if (top.length < n) {
      let j = top.length - 1;
      while (j >= 0 && top[j].val < val) {
        j--;
      }
      top.splice(j + 1, 0, { item, val });
    } else if (val > top[top.length - 1].val) {
      let j = top.length - 2;
      while (j >= 0 && top[j].val < val) {
        j--;
      }
      top.splice(j + 1, 0, { item, val });
      top.pop();
    }
  }

  const result = [];
  for (let i = 0; i < top.length; i++) {
    result.push(top[i].item);
  }
  return result;
}
