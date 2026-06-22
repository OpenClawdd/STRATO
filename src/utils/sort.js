export function getTopNByProperty(items, limit, prop, filterFn = null) {
  const result = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (filterFn && !filterFn(item)) {
      continue;
    }

    const itemVal = item[prop] || 0;

    if (result.length < limit) {
      let j = result.length;
      result.push(item);
      while (j > 0 && (result[j][prop] || 0) > (result[j - 1][prop] || 0)) {
        const temp = result[j];
        result[j] = result[j - 1];
        result[j - 1] = temp;
        j--;
      }
    } else if (itemVal > (result[limit - 1][prop] || 0)) {
      result[limit - 1] = item;
      let j = limit - 1;
      while (j > 0 && (result[j][prop] || 0) > (result[j - 1][prop] || 0)) {
        const temp = result[j];
        result[j] = result[j - 1];
        result[j - 1] = temp;
        j--;
      }
    }
  }

  return result;
}
