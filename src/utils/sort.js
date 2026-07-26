/**
 * ⚡ Bolt Performance Optimization: Bounded Insertion Sort
 * Finds the top N elements in an array without sorting the entire array.
 * This turns an O(N log N) operation into an O(N * K) operation, where K is the bound (N).
 * For small K (e.g., top 10 or 25) and large datasets, this significantly reduces
 * CPU time and memory allocation compared to .sort().slice().
 *
 * @param {Array} arr - The array to extract top elements from
 * @param {number} n - The maximum number of elements to return
 * @param {Function} getValue - Function to extract the numeric value to sort by (descending)
 * @returns {Array} - The top N elements, sorted descending by value
 */
export function getTopN(arr, n, getValue) {
  if (!arr || arr.length === 0) return [];
  if (n <= 0) return [];

  // Store { item, val } to avoid redundant getValue calls
  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);

    // If we haven't filled our top N yet, or this item is greater than the smallest in our top N
    if (top.length < n || val > top[top.length - 1].val) {
      // Find where to insert (insertion sort step)
      let insertIdx = 0;
      while (insertIdx < top.length && top[insertIdx].val >= val) {
        insertIdx++;
      }

      // Insert at the right position
      top.splice(insertIdx, 0, { item, val });

      // Keep only top N
      if (top.length > n) {
        top.pop();
      }
    }
  }

  // Return just the original items
  return top.map((t) => t.item);
}
