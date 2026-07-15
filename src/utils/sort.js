/**
 * Retrieves the top N items from an array based on a valuation function,
 * using a bounded insertion sort to avoid O(N log N) overhead of full array sorts.
 * We store { item, val } to avoid redundant value extraction calls.
 *
 * @param {Array} arr - The array to search
 * @param {number} n - Number of top items to return
 * @param {Function} getValue - Function to extract the numeric sort key from an item
 * @returns {Array} - The top N items
 */
export function getTopN(arr, n, getValue) {
  if (n <= 0) return [];
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);

    if (top.length < n) {
      let j = top.length;
      while (j > 0 && top[j - 1].val < val) {
        j--;
      }
      top.splice(j, 0, { item, val });
    } else if (val > top[top.length - 1].val) {
      let j = top.length - 1;
      while (j > 0 && top[j - 1].val < val) {
        top[j] = top[j - 1];
        j--;
      }
      top[j] = { item, val };
    }
  }

  return top.map((x) => x.item);
}
