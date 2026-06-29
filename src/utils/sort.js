export function getTopN(array, n, scoreSelector, filterPredicate = null) {
  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];

    if (filterPredicate && !filterPredicate(item)) {
      continue;
    }

    const score = scoreSelector(item) || 0;

    if (top.length < n) {
      let j = 0;
      while (j < top.length && (scoreSelector(top[j]) || 0) >= score) {
        j++;
      }
      top.splice(j, 0, item);
    } else {
      const lowestTopScore = scoreSelector(top[top.length - 1]) || 0;
      if (score > lowestTopScore) {
        let j = 0;
        while (j < top.length && (scoreSelector(top[j]) || 0) >= score) {
          j++;
        }
        top.splice(j, 0, item);
        top.pop();
      }
    }
  }

  return top;
}
