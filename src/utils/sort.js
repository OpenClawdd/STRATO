export function getTopN(items, n, getValue, predicate) {
  if (n <= 0) return [];
  const result = [];

  for (const item of items) {
    if (predicate && !predicate(item)) {
      continue;
    }

    const value = getValue(item) || 0;

    if (result.length === n && value <= (getValue(result[n - 1]) || 0)) {
      continue;
    }

    let insertIndex = result.length;
    while (
      insertIndex > 0 &&
      value > (getValue(result[insertIndex - 1]) || 0)
    ) {
      insertIndex--;
    }

    result.splice(insertIndex, 0, item);
    if (result.length > n) {
      result.pop();
    }
  }

  return result;
}
