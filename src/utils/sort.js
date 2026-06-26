export function topNElements(arr, n, getValue) {
  if (n <= 0) return [];
  if (arr.length <= n) {
    return [...arr].sort((a, b) => getValue(b) - getValue(a));
  }

  const result = [];
  for (const item of arr) {
    const val = getValue(item);

    if (result.length < n) {
      // Insert item and keep sorted
      let i = result.length - 1;
      result.push(item);
      while (i >= 0 && getValue(result[i]) < val) {
        result[i + 1] = result[i];
        i--;
      }
      result[i + 1] = item;
    } else if (val > getValue(result[result.length - 1])) {
      // Replace last element and shift up
      let i = result.length - 2;
      while (i >= 0 && getValue(result[i]) < val) {
        result[i + 1] = result[i];
        i--;
      }
      result[i + 1] = item;
    }
  }
  return result;
}
