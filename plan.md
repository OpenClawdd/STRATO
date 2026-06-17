1. **Implement custom bounded insertion sort utility (`src/utils/sort.js`)**
   - Implement `getTopNDescending(items, limit, key, filterFn = null)` to calculate the top N elements in an array by a numerical key descending, maintaining a bounded list using insertion sort (O(N) time, O(K) space).
   - This prevents doing a full `Array.prototype.sort()` which is O(N log N) on the entire array before slicing.

2. **Optimize global and game leaderboards (`src/routes/leaderboard.js`)**
   - Update `GET /api/leaderboard/:gameId` to replace chained `filter()`, `sort()`, and `slice()` with the new `getTopNDescending` bounded insertion sort function.
   - Update `GET /api/leaderboard` to replace mapping, sorting, and slicing all users with `getTopNDescending` on the original users array, only mapping the top 25 users afterwards.
   - Import `getTopNDescending` from `src/utils/sort.js`.

3. **Verify functionality and performance**
   - Run `pnpm test tests/routes/leaderboard.test.js` to verify functionality.
   - Ensure `getTopNDescending` works with proper edge case handling like `undefined` numerical properties falling back to `0`.

4. **Add performance journal entry**
   - Add a journal entry to `.jules/bolt.md` recording the optimization pattern to replace `Array.prototype.sort` with a single-pass bounded insertion sort.

5. **Complete pre-commit steps to ensure proper testing, verification, review, and reflection are done.**
   - Run linter, tests, validation scripts, and final review check.

6. **Submit changes**
   - Create a Pull Request formatted with title "⚡ TURBO: Optimize leaderboards with bounded insertion sort".
