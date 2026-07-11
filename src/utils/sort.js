/**
 * Efficiently finds the top N elements in an array without sorting the entire array.
 * Uses a bounded insertion sort which is O(N * k) where N is array length and k is top N size.
 *
 * @param {Array} array - The array to extract from
 * @param {number} n - The number of top elements to return
 * @param {Function} extractValue - Function to extract the numeric value to sort by (descending)
 * @returns {Array} The top N elements
 */
export function getTopN(array, n, extractValue) {
  const topList = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const val = extractValue(item) || 0;

    if (topList.length < n) {
      let inserted = false;
      for (let j = 0; j < topList.length; j++) {
        if (val > (topList[j].val || 0)) {
          topList.splice(j, 0, { item, val });
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        topList.push({ item, val });
      }
    } else if (val > (topList[topList.length - 1].val || 0)) {
      for (let j = 0; j < topList.length; j++) {
        if (val > (topList[j].val || 0)) {
          topList.splice(j, 0, { item, val });
          topList.pop();
          break;
        }
      }
    }
  }

  return topList.map(entry => entry.item);
}
