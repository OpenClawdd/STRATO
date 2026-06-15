export function getTopNDescending(items, limit, getValue, filterFn = null) {
  const top = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (filterFn && !filterFn(item)) {
      continue;
    }

    const value = getValue(item) || 0;

    if (top.length === limit && value <= (getValue(top[top.length - 1]) || 0)) {
      continue;
    }

    let insertIndex = top.length;
    while (insertIndex > 0 && value > (getValue(top[insertIndex - 1]) || 0)) {
      insertIndex--;
    }

    if (insertIndex < limit) {
      top.splice(insertIndex, 0, item);
      if (top.length > limit) {
        top.pop();
      }
    }
  }
  return top;
}
