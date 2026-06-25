/**
 * Keeps a sorted array of the top N elements.
 * This runs in O(M * N) time where M is items.length, which is O(M) for small fixed N.
 * It does not allocate arrays for mapping or filtering, making it very fast for large M.
 *
 * @param {Array} items - The source array.
 * @param {number} n - The maximum number of elements to keep.
 * @param {Function} getVal - Function to extract the numeric value to sort by (descending).
 * @param {Function} [filterFn] - Optional function to filter items.
 * @returns {Array} The top N elements.
 */
export function getTopN(items, n, getVal, filterFn = null) {
  const top = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (filterFn && !filterFn(item)) continue;
    const val = getVal(item) || 0;

    if (top.length < n) {
      let j = top.length - 1;
      top.push(item);
      while (j >= 0 && val > (getVal(top[j]) || 0)) {
        top[j + 1] = top[j];
        j--;
      }
      top[j + 1] = item;
    } else {
      const lastVal = getVal(top[top.length - 1]) || 0;
      if (val > lastVal) {
        let j = top.length - 2;
        while (j >= 0 && val > (getVal(top[j]) || 0)) {
          top[j + 1] = top[j];
          j--;
        }
        top[j + 1] = item;
      }
    }
  }
  return top;
}
