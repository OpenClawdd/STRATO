export function boundedInsertionSort(list, item, maxLen, prop) {
  const score = item[prop] || 0;
  if (list.length < maxLen || score > (list[list.length - 1][prop] || 0)) {
    let j = list.length - 1;
    while (j >= 0 && score > (list[j][prop] || 0)) {
      j--;
    }
    list.splice(j + 1, 0, item);
    if (list.length > maxLen) {
      list.pop();
    }
  }
}
