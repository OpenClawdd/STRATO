export function getTopN(array, n, getValue) {
  if (n <= 0) return [];
  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const val = getValue(item) || 0; // Handle potentially undefined numerical properties

    // If we haven't filled top N, or this value is greater than the smallest in top N
    if (top.length < n || val > top[top.length - 1].val) {
      // Find insertion point
      let insertAt = top.length;
      while (insertAt > 0 && val > top[insertAt - 1].val) {
        insertAt--;
      }

      // Insert item
      top.splice(insertAt, 0, { item, val });

      // Keep only top N
      if (top.length > n) {
        top.pop();
      }
    }
  }

  // Extract original items
  return top.map((x) => x.item);
}
