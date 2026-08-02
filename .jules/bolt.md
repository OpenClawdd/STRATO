## 2024-05-01 - Date parsing overhead in array iterations
**Learning:** Parsing dates inside array `.filter()` or `.sort()` loops (e.g., `new Date(a.created_at)`) creates significant O(N log N) or O(N) execution overhead and excessive garbage collection.
**Action:** When dealing with ISO 8601 formatted date strings, compare them lexicographically as native strings (e.g., `a.created_at > dayAgoIso` or `a.localeCompare(b)`) instead of instantiating new Date objects.

## 2024-05-01 - Object allocation before sorting
**Learning:** Chaining `.map()` before `.sort()` and `.slice()` on large arrays allocates O(N) objects unnecessarily.
**Action:** Rearrange operations to `.sort().slice().map()` (using Schwartzian transforms if needed for the sort key) to restrict memory allocation strictly to the final subset.
