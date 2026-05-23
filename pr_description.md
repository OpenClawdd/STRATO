🎯 **What:** Removed the unused `metadata` variable from the destructuring assignment in the `/api/activity` route handler.
💡 **Why:** `metadata` was destructured from `req.body` but never used within the function, violating the `no-unused-vars` linting rule. Removing it cleans up the code and improves maintainability without altering functionality.
✅ **Verification:** Verified that `metadata` is entirely unreferenced in `src/routes/notifications.js` within the scope of the POST `/api/activity` handler. Executed `npm test` successfully (366 tests passed) to confirm no regressions were introduced.
✨ **Result:** Improved code cleanliness and reduced potential confusion for developers reading this file.
