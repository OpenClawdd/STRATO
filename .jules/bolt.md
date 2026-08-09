## 2024-08-09 - Avoid Date Instantiation in Loop and Map Optimization
**Learning:** Instantiating `new Date()` within `.filter()` and `.sort()` callbacks on large arrays creates severe O(N) or O(N log N) overhead and garbage collection pressure. Date string comparison native operators are much faster for ISO 8601 strings. Additionally, mapping a large data set before `.slice()` causes unnecessary object allocation.
**Action:** Always prefer native string `<` and `>` operators for date comparisons. Ensure arrays are sorted and sliced before running `.map()` for object allocation on subset.
