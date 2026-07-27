/**
 * Bounded insertion sort to find the top N items in an array.
 * This is O(N * K) where K is the bound, which is faster than
 * a full O(N log N) sort for large datasets.
 */
export function getTopN(array, n, getValue) {
  if (n <= 0) return [];

  const top = []; // stores objects { item, val } sorted descending by val

  for (const item of array) {
    const val = getValue(item);

    // Quick skip if the array is full and the value is smaller than or equal to the smallest we have
    if (top.length === n && val <= top[top.length - 1].val) {
      continue;
    }

    // Find insertion index
    let i = 0;
    while (i < top.length && top[i].val > val) {
      i++;
    }

    // Insert at index i
    if (i < n) {
      top.splice(i, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
