/**
 * Efficiently extracts the top N elements from an array based on a numeric value.
 * Uses a bounded insertion sort approach.
 *
 * @param {Array} arr The source array
 * @param {number} n The maximum number of elements to return
 * @param {Function} getValue A function that extracts the numeric value to sort by (descending)
 * @returns {Array} The top N elements
 */
export function getTopN(arr, n, getValue) {
  if (!arr || arr.length === 0 || n <= 0) return [];

  // Store { item, val } to avoid recomputing getValue
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);

    // Skip if we have N items and this one is smaller than our smallest
    if (top.length === n && val <= top[top.length - 1].val) {
      continue;
    }

    // Find where to insert (insertion sort step)
    let insertIdx = top.length;
    while (insertIdx > 0 && top[insertIdx - 1].val < val) {
      insertIdx--;
    }

    // Insert the new item
    top.splice(insertIdx, 0, { item, val });

    // Keep bounded to size N
    if (top.length > n) {
      top.pop();
    }
  }

  // Return just the original items
  return top.map((t) => t.item);
}
