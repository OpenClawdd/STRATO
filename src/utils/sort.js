/**
 * Maintains a bounded insertion sort of the top N items.
 * O(N) time complexity, O(limit) space complexity.
 * Useful for finding top elements in large datasets without sorting the entire array.
 */
export function getTopNDescending(items, limit, getValue, filterFn = null) {
  const result = [];

  for (const item of items) {
    if (filterFn && !filterFn(item)) {
      continue;
    }

    const val = getValue(item) || 0;

    if (
      result.length < limit ||
      val > (getValue(result[result.length - 1]) || 0)
    ) {
      let i = result.length - 1;
      while (i >= 0 && val > (getValue(result[i]) || 0)) {
        i--;
      }
      result.splice(i + 1, 0, item);
      if (result.length > limit) {
        result.pop();
      }
    }
  }

  return result;
}
