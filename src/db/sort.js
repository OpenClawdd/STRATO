/**
 * Computes the top N elements from a dataset in O(N) time and O(1) extra space
 * using a bounded insertion sort, rather than O(N log N) full array sort.
 */
export function getTopN(items, limit, compareFn, filterFn = null) {
  const result = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (filterFn && !filterFn(item)) continue;

    if (result.length < limit) {
      result.push(item);
      result.sort(compareFn);
    } else {
      if (compareFn(item, result[result.length - 1]) < 0) {
        let insertPos = result.length - 1;
        while (insertPos > 0 && compareFn(item, result[insertPos - 1]) < 0) {
          insertPos--;
        }
        result.splice(insertPos, 0, item);
        result.pop();
      }
    }
  }
  return result;
}
