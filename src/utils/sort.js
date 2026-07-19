export function getTopN(items, n, evaluateFunc) {
  const top = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const val = evaluateFunc(item);

    // Insert into sorted array
    let inserted = false;
    for (let j = 0; j < top.length; j++) {
      if (val > top[j].val) {
        top.splice(j, 0, { item, val });
        inserted = true;
        break;
      }
    }

    if (!inserted && top.length < n) {
      top.push({ item, val });
    }

    if (top.length > n) {
      top.pop();
    }
  }

  return top.map((x) => x.item);
}
