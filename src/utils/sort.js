/**
 * Bounded insertion sort to efficiently get the top N items from a dataset.
 * Avoids O(N log N) overhead and memory allocations of `.sort().slice()`.
 *
 * @param {Array} arr - The array to extract top N from.
 * @param {number} n - Number of items to return.
 * @param {Function} getVal - Function to extract the sorting value (higher is better).
 * @returns {Array} Top N items.
 */
export function getTopN(arr, n, getVal) {
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getVal(item);

    // Quick skip if we have n items and the current value is worse than our worst top item
    if (top.length === n && val <= top[n - 1].val) {
      continue;
    }

    // Find where to insert (insertion sort)
    let insertIdx = top.length;
    while (insertIdx > 0 && val > top[insertIdx - 1].val) {
      insertIdx--;
    }

    top.splice(insertIdx, 0, { item, val });

    if (top.length > n) {
      top.pop();
    }
  }

  // Return just the original items
  return top.map((t) => t.item);
}
