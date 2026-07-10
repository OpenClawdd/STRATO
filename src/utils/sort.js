export function getTopN(array, n, valueExtractor, filterPredicate = null) {
  if (n <= 0) return [];
  const topList = []; // stores { item, val }

  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (filterPredicate && !filterPredicate(item)) {
      continue;
    }

    const val = valueExtractor(item) || 0;

    // Fast reject: if list is full and new val is smaller than or equal to the smallest item
    if (topList.length === n && val <= (topList[topList.length - 1].val || 0)) {
      continue;
    }

    // Insert into sorted position
    let insertIndex = 0;
    while (
      insertIndex < topList.length &&
      val <= (topList[insertIndex].val || 0)
    ) {
      insertIndex++;
    }

    topList.splice(insertIndex, 0, { item, val });

    // Enforce size limit
    if (topList.length > n) {
      topList.pop();
    }
  }

  // Extract just the original items
  return topList.map((entry) => entry.item);
}
