export function getTopN(arr, n, getValue) {
  const top = []; // store { item, val }
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item);

    if (top.length < n) {
      top.push({ item, val });
      top.sort((a, b) => b.val - a.val);
    } else if (val > top[top.length - 1].val) {
      let j = top.length - 1;
      while (j >= 0 && val > top[j].val) {
        j--;
      }
      top.splice(j + 1, 0, { item, val });
      top.pop();
    }
  }
  return top.map((t) => t.item);
}
