export function getTopN(arr, n, getValue) {
  const result = [];

  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    const val = getValue(item) || 0;

    if (result.length < n) {
      let j = result.length - 1;
      while (j >= 0 && (getValue(result[j]) || 0) < val) {
        j--;
      }
      result.splice(j + 1, 0, item);
    } else if (val > (getValue(result[result.length - 1]) || 0)) {
      let j = result.length - 2;
      while (j >= 0 && (getValue(result[j]) || 0) < val) {
        j--;
      }
      result.splice(j + 1, 0, item);
      result.pop();
    }
  }

  return result;
}
