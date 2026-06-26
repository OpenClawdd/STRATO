export function getTopN(array, n, scoreFn, filterFn = null) {
  const top = [];
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    if (filterFn && !filterFn(item)) continue;

    const score = scoreFn(item) || 0;

    if (top.length < n) {
      let inserted = false;
      for (let j = 0; j < top.length; j++) {
        const topScore = scoreFn(top[j]) || 0;
        if (score > topScore) {
          top.splice(j, 0, item);
          inserted = true;
          break;
        }
      }
      if (!inserted) {
        top.push(item);
      }
    } else {
      const lowestScore = scoreFn(top[top.length - 1]) || 0;
      if (score > lowestScore) {
        for (let j = 0; j < top.length; j++) {
          const topScore = scoreFn(top[j]) || 0;
          if (score > topScore) {
            top.splice(j, 0, item);
            break;
          }
        }
        top.pop();
      }
    }
  }
  return top;
}
