export function getTopN(array, n, getValue, predicate = null) {
  const top = [];

  for (let i = 0; i < array.length; i++) {
    const item = array[i];

    if (predicate && !predicate(item)) {
      continue;
    }

    const val = getValue(item) || 0;

    if (top.length < n) {
      let j = top.length - 1;
      top.push(item);
      while (j >= 0 && (getValue(top[j]) || 0) < val) {
        top[j + 1] = top[j];
        j--;
      }
      top[j + 1] = item;
    } else {
      const minVal = getValue(top[top.length - 1]) || 0;
      if (val > minVal) {
        let j = top.length - 2;
        while (j >= 0 && (getValue(top[j]) || 0) < val) {
          top[j + 1] = top[j];
          j--;
        }
        top[j + 1] = item;
      }
    }
  }

  return top;
}
