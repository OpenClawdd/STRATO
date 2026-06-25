export function getTopN(items, limit, getValue, filterFn = null) {
  const topList = [];
  let minVal = -Infinity;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (filterFn && !filterFn(item)) continue;

    const val = getValue(item) || 0;

    if (topList.length < limit || val > minVal) {
      let insertIndex = 0;
      while (
        insertIndex < topList.length &&
        val <= (getValue(topList[insertIndex]) || 0)
      ) {
        insertIndex++;
      }

      topList.splice(insertIndex, 0, item);

      if (topList.length > limit) {
        topList.pop();
      }

      if (topList.length === limit) {
        minVal = getValue(topList[topList.length - 1]) || 0;
      }
    }
  }

  return topList;
}
