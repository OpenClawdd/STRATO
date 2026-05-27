## 2024-05-24 - [Defer Map Operations after Sort/Slice]
**Learning:** Deferring `.map()` until after `.filter()`, `.sort()`, and `.slice()` reduces memory overhead and avoids O(N) short-lived garbage object allocations, especially when handling data from an in-memory cache like `store.getAll()`. Also, ensuring shallow copies with `[...arr]` prior to sort prevents mutating cached data.
**Action:** Always check the order of array methods. Wait to map until the final subset of items is filtered and sliced down.
