export function getTopN(items, limit, compareFn) {
  if (!items || items.length === 0) return [];
  if (limit <= 0) return [];

  const top = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (top.length < limit) {
      let j = top.length - 1;
      while (j >= 0 && compareFn(item, top[j]) < 0) {
        j--;
      }
      top.splice(j + 1, 0, item);
    } else if (compareFn(item, top[top.length - 1]) < 0) {
      let j = top.length - 2;
      while (j >= 0 && compareFn(item, top[j]) < 0) {
        j--;
      }
      top.splice(j + 1, 0, item);
      top.pop();
    }
  }

  return top;
}
