/**
 * O(N) Bounded Insertion Sort to extract the top K elements
 * Prevents O(N log N) full array sorts when N is large and K is small.
 * Consolidates filtering into the same pass.
 *
 * @param {Array} array - The array to process
 * @param {number} k - The maximum number of elements to return
 * @param {function} compareFn - The comparator function (same as Array.prototype.sort)
 * @param {function} [filterFn] - Optional filter function to apply in the same pass
 * @returns {Array} - The top K elements
 */
export function getTopK(array, k, compareFn, filterFn = null) {
  if (k <= 0) return [];

  const result = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];

    if (filterFn && !filterFn(item)) {
      continue;
    }

    // If the list is full and the item is "worse" than the last element, skip it
    if (result.length === k && compareFn(item, result[k - 1]) >= 0) {
      continue;
    }

    // Find where to insert
    let insertIdx = result.length;
    while (insertIdx > 0 && compareFn(item, result[insertIdx - 1]) < 0) {
      insertIdx--;
    }

    // Insert item
    result.splice(insertIdx, 0, item);

    // Evict the last element if we exceeded k
    if (result.length > k) {
      result.pop();
    }
  }

  return result;
}
