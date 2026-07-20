export function getTopN(array, n, getValue) {
  if (n <= 0) return [];
  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const val = getValue(item);

    if (top.length < n || val > top[top.length - 1].val) {
      let j = top.length - 1;
      while (j >= 0 && top[j].val < val) {
        j--;
      }
      top.splice(j + 1, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
