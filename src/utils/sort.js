export function getTopN(array, n, getValue, filterFn = null) {
  const top = [];
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (filterFn && !filterFn(item)) continue;
    const val = getValue(item) || 0;
    if (top.length < n || val > (getValue(top[top.length - 1]) || 0)) {
      let insertIdx = 0;
      while (insertIdx < top.length && (getValue(top[insertIdx]) || 0) >= val) {
        insertIdx++;
      }
      top.splice(insertIdx, 0, item);
      if (top.length > n) top.pop();
    }
  }
  return top;
}
