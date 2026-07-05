export function getTopN(array, n, valueExtractor) {
  if (n <= 0) return [];

  const top = [];
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const val = valueExtractor(item) || 0;

    if (top.length < n) {
      top.push({ item, val });
      top.sort((a, b) => b.val - a.val);
    } else if (val > (top[top.length - 1].val || 0)) {
      top[top.length - 1] = { item, val };
      top.sort((a, b) => b.val - a.val);
    }
  }
  return top.map((x) => x.item);
}
