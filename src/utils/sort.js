/**
 * O(N) bounded insertion sort for computing top N elements from a large array.
 * This avoids O(N log N) full-array sorts and minimizes temporary object allocations.
 * @param {Array} items - The array to process
 * @param {number} limit - The maximum number of elements to return (N)
 * @param {Function} getValue - A function that returns the numeric value to sort by (descending)
 * @returns {Array} - The top N elements
 */
export function getTopN(items, limit, getValue) {
  const top = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const value = getValue(item) || 0;

    // Only process if we haven't reached the limit or the value is greater than our current smallest top value
    if (top.length < limit || value > (getValue(top[top.length - 1]) || 0)) {
      let insertIndex = 0;
      // Find insertion point
      while (
        insertIndex < top.length &&
        (getValue(top[insertIndex]) || 0) >= value
      ) {
        insertIndex++;
      }
      top.splice(insertIndex, 0, item);
      if (top.length > limit) {
        top.pop();
      }
    }
  }
  return top;
}
