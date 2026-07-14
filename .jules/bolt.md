## 2024-05-25 - Bounded Insertion Sort for Top N queries
**Learning:** Extracting the top 25 users from `store.getAll("users")` by first generating an array of objects mapping mapped fields, then calling `.sort()` and `.slice()` causes unnecessary array allocation and sorting of thousands of user objects which are then discarded.
**Action:** Use a bounded insertion sort utility function `getTopN` to maintain the top N objects during a single pass, and only do map transformations on those elements, improving backend scale and query speed.
