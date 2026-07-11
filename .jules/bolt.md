## 2025-01-01 - [Avoid full array `.map` before sorting for Top N]
**Learning:** Calling `.map` to reshape large datasets before extracting the top N elements forces Javascript to create thousands of intermediate objects that are immediately thrown away. Bounded insertion sorts are only effective if we defer heavy mapping operations to *after* the target N subset is extracted.
**Action:** Implement bounded extraction algorithms like `getTopN` first, and apply mapping shapes only to the resulting small subset.
