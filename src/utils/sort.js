/**
 * Retrieves the top N items from an array based on a numeric value.
 * Uses bounded insertion sort for O(N * K) performance instead of O(N log N).
 */
export function getTopN(arr, n, getValue) {
  if (n <= 0) return [];
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);

    if (top.length < n || val > top[top.length - 1].val) {
      let j = 0;
      while (j < top.length && top[j].val >= val) {
        j++;
      }
      top.splice(j, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
