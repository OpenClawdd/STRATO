/**
 * Bounded insertion sort to get top N elements without sorting the whole array.
 * @param {Array} arr
 * @param {number} n
 * @param {Function} getValue
 * @returns {Array}
 */
export function getTopN(arr, n, getValue) {
  if (arr.length <= n) {
    return arr.slice().sort((a, b) => getValue(b) - getValue(a));
  }

  const result = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);

    if (result.length < n) {
      result.push({ item, val });
      result.sort((a, b) => b.val - a.val);
    } else if (val > result[n - 1].val) {
      // Find insertion point
      let j = n - 1;
      while (j > 0 && result[j - 1].val < val) {
        result[j] = result[j - 1];
        j--;
      }
      result[j] = { item, val };
    }
  }

  return result.map((x) => x.item);
}
