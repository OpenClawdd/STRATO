/**
 * Maintains a bounded list of top N elements in descending order.
 * O(N * K) time and O(K) space (where N is total items and K is top limit).
 * Handles undefined numeric properties with a fallback to 0.
 *
 * @param {Array} items - The full list of items to process
 * @param {Number} limit - The maximum size of the top list (N)
 * @param {String} key - The property key to sort by descending
 * @param {Function} [filterFn] - Optional filter function `(item) => Boolean`
 */
export function getTopNDescending(items, limit, key, filterFn = null) {
  const topList = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (filterFn && !filterFn(item)) continue;

    const val = item[key] || 0;

    if (
      topList.length < limit ||
      val > (topList[topList.length - 1][key] || 0)
    ) {
      let j = topList.length;
      while (j > 0 && val > (topList[j - 1][key] || 0)) {
        j--;
      }
      topList.splice(j, 0, item);
      if (topList.length > limit) {
        topList.pop();
      }
    }
  }
  return topList;
}
