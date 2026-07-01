## 2024-07-01 - O(N log N) Sorts on Large Arrays
**Learning:** Found multiple places (`src/routes/leaderboard.js`, `src/routes/notifications.js`, `src/routes/admin.js`) where we are doing a full array sort (`.sort()`) on large arrays from `store.getAll()` just to get the top 10 or 25 elements. This is O(N log N) time and can cause severe CPU spikes when the user/score counts get large.
**Action:** Replace `array.sort(...).slice(0, N)` with a bounded insertion sort helper that takes O(N) time and O(1) space, since we only need the top N elements.
