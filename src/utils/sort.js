export function getTopN(list, limit, valueExtractor) {
  const top = [];
  for (const item of list) {
    const val = valueExtractor(item);
    if (
      top.length < limit ||
      val > (top[top.length - 1]?.val ?? Number.NEGATIVE_INFINITY)
    ) {
      let i = 0;
      while (i < top.length && top[i].val > val) i++;
      top.splice(i, 0, { item, val });
      if (top.length > limit) top.pop();
    }
  }
  return top.map((x) => x.item);
}
