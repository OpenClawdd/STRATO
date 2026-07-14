/**
 * Gets the top N elements from an array based on a value extraction function,
 * using a bounded insertion sort to avoid sorting the entire array.
 *
 * @param {Array} array - The array to process
 * @param {Number} n - The maximum number of elements to return
 * @param {Function} getValue - Function to extract the numeric value to sort by (descending)
 * @returns {Array} The top N elements
 */
export function getTopN(array, n, getValue) {
  if (n <= 0) return [];
  const top = []; // Will store objects like { item, val }

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const val = getValue(item);

    // If the top array isn't full yet or this item is larger than the smallest in top
    if (top.length < n || val > (top[top.length - 1]?.val ?? -Infinity)) {
      // Find insertion point
      let j = top.length - 1;
      while (j >= 0 && top[j].val < val) {
        j--;
      }

      // Insert item
      top.splice(j + 1, 0, { item, val });

      // Keep only top N
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
