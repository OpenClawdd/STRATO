export function getTopN(array, n, getValue) {
  const top = [];
  for (const item of array) {
    const value = getValue(item) || 0;
    if (top.length < n) {
      insertSorted(top, item, value, getValue);
    } else if (value > (getValue(top[top.length - 1]) || 0)) {
      top.pop();
      insertSorted(top, item, value, getValue);
    }
  }
  return top;
}

function insertSorted(array, item, value, getValue) {
  let low = 0;
  let high = array.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if ((getValue(array[mid]) || 0) < value) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }
  array.splice(low, 0, item);
}
