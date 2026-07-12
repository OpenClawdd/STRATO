export function getTopN(items, n, getValue) {
  const top = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const val = getValue(item);

    if (top.length < n || val > top[top.length - 1].val) {
      let insertAt = 0;
      while (insertAt < top.length && top[insertAt].val >= val) {
        insertAt++;
      }

      top.splice(insertAt, 0, { item, val });

      if (top.length > n) {
        top.pop();
      }
    }
  }

  return top.map(entry => entry.item);
}
