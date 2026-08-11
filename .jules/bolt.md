## 2026-08-11 - Date Allocation Overhead in Loops
**Learning:** Using `new Date(str)` or `new Date(str).getTime()` inside `.sort()` or `.filter()` loops creates significant object allocation and GC pressure in Node.js/V8.
**Action:** Always use `Date.parse(str)` inside iteration loops to parse dates into timestamps efficiently without allocating new Date objects.
