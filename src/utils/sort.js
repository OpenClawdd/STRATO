export function getTopN(arr, n, getValue) {
  const top = [];

  for (const item of arr) {
    const val = getValue(item);

    if (top.length < n || val > top[top.length - 1].val) {
      let i = top.length - 1;
      while (i >= 0 && val > top[i].val) {
        i--;
      }
      top.splice(i + 1, 0, { item, val });
      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map((x) => x.item);
}
