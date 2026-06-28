/**
 * Efficiently computes the top N elements from an array based on a scoring function.
 * Uses a bounded insertion sort to maintain O(N) time and O(1) space, avoiding
 * expensive full-array sorts (O(N log N)) and unnecessary memory allocations.
 */
export function getTopNDescending(list, limit, getValue) {
  const top = [];
  for (let i = 0; i < list.length; i++) {
    const item = list[i];
    const val = getValue(item) || 0;

    if (top.length < limit || val > (getValue(top[top.length - 1]) || 0)) {
      let insertIdx = top.length;
      while (insertIdx > 0 && val > (getValue(top[insertIdx - 1]) || 0)) {
        insertIdx--;
      }
      top.splice(insertIdx, 0, item);
      if (top.length > limit) {
        top.pop();
      }
    }
  }
  return top;
}
