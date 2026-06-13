/**
 * O(N) Bounded Insertion Sort
 * Useful for finding top-K elements from large arrays without calling full Array.sort()
 *
 * @param {Array} arr - The array to sort
 * @param {number} k - The number of top elements to keep
 * @param {Function} valFunc - A function that returns the numeric value to sort by (descending)
 * @returns {Array} - The top K elements, sorted descending
 */
export function getTopK(arr, k, valFunc) {
  const topK = [];
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = valFunc(item);

    // Only attempt insertion if we haven't reached K elements,
    // or if the value is greater than the smallest currently kept.
    if (topK.length < k || val > valFunc(topK[topK.length - 1])) {
      let inserted = false;
      for (let j = 0; j < topK.length; j++) {
        if (val > valFunc(topK[j])) {
          topK.splice(j, 0, item);
          inserted = true;
          break;
        }
      }
      if (!inserted && topK.length < k) {
        topK.push(item);
      }
      if (topK.length > k) {
        topK.pop();
      }
    }
  }
  return topK;
}
