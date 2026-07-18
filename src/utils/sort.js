/**
 * O(N * k) bounded insertion sort optimization to retrieve top N items
 * without the O(N log N) overhead of full array sorting.
 * Caches the extracted value to prevent redundant getValue calls.
 */
export function getTopN(arr, n, getValue) {
  if (n <= 0) return [];
  const top = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);
    if (top.length < n || val > top[top.length - 1].val) {
      let insertIdx = top.length;
      while (insertIdx > 0 && val > top[insertIdx - 1].val) {
        insertIdx--;
      }
      top.splice(insertIdx, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }
  const result = new Array(top.length);
  for (let i = 0; i < top.length; i++) {
    result[i] = top[i].item;
  }
  return result;
}
