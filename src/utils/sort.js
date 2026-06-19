/**
 * Maintains a bounded list of top N elements from an array.
 * @param {Array} arr - The array to process
 * @param {number} limit - The maximum number of elements to keep
 * @param {Function} getScore - Function to extract the numerical score from an element
 * @param {Function} [filterFn] - Optional function to filter elements
 * @returns {Array} - The top N elements, sorted descending by score
 */
export function getTopN(arr, limit, getScore, filterFn = null) {
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    if (filterFn && !filterFn(item)) {
      continue;
    }

    const score = getScore(item) || 0;

    if (top.length < limit || score > (top[top.length - 1].score || 0)) {
      let j = top.length - 1;
      while (j >= 0 && score > (top[j].score || 0)) {
        j--;
      }

      top.splice(j + 1, 0, { item, score });

      if (top.length > limit) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
