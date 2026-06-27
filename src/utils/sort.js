/**
 * Maintains a sorted list of the top N elements using bounded insertion sort.
 * O(N) time complexity, O(1) space complexity.
 *
 * @param {Array} arr - The input array.
 * @param {Number} limit - The maximum number of elements to return.
 * @param {String} key - The property to sort by descending.
 */
export function getTopNBy(arr, limit, key) {
  const top = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = item[key] || 0;

    if (top.length < limit || val > (top[top.length - 1][key] || 0)) {
      let j = top.length;
      while (j > 0 && val > (top[j - 1][key] || 0)) {
        j--;
      }
      top.splice(j, 0, item);
      if (top.length > limit) {
        top.pop();
      }
    }
  }
  return top;
}
