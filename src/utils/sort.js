export function getTopN(arr, n, getValue) {
  if (n <= 0) return [];
  if (arr.length <= n) {
    return [...arr].sort((a, b) => (getValue(b) || 0) - (getValue(a) || 0));
  }

  const top = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item) || 0;

    if (top.length < n || val > (top[top.length - 1].val || 0)) {
      let insertAt = top.length;
      while (insertAt > 0 && val > (top[insertAt - 1].val || 0)) {
        insertAt--;
      }

      top.splice(insertAt, 0, { item, val });

      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((entry) => entry.item);
}
