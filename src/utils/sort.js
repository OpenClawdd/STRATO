/**
 * Bounded insertion sort to efficiently find the top N elements of a collection
 * without needing to sort the entire array (O(N) vs O(N log N)).
 */
export function getTopN(arr, n, getValue) {
  if (n <= 0 || !arr.length) return [];
  const top = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);
    if (top.length < n || val > top[top.length - 1].val) {
      let insertIdx = 0;
      while (insertIdx < top.length && top[insertIdx].val >= val) {
        insertIdx++;
      }
      top.splice(insertIdx, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }
  return top.map((t) => t.item);
}
