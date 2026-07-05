export function getTopN(items, n, getValue, filterFn) {
  const top = [];

  for (const item of items) {
    if (filterFn && !filterFn(item)) {
      continue;
    }

    const val = getValue(item) || 0;

    if (top.length === n && val <= top[top.length - 1].val) {
      continue;
    }

    let i = top.length - 1;
    while (i >= 0 && val > top[i].val) {
      i--;
    }

    top.splice(i + 1, 0, { item, val });

    if (top.length > n) {
      top.pop();
    }
  }

  return top.map((entry) => entry.item);
}
