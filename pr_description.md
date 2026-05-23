🎯 **What:** Removed the unused `LOGIN_HTML` constant and its synchronous `fs.readFileSync` call from `src/index.js`.
💡 **Why:** The file content was read synchronously into memory at server startup but was never actually referenced anywhere in the codebase. Removing it saves a small amount of memory, slightly improves server startup time by avoiding unnecessary file I/O, and improves code readability by eliminating dead code.
✅ **Verification:**
- Verified `LOGIN_HTML` is completely unused globally.
- Formatted with Prettier (`npx prettier --write src/index.js`).
- Ran the full test suite (`pnpm test`); all 366 tests passed successfully, confirming no regressions.
✨ **Result:** A cleaner `src/index.js` file and slightly more efficient startup process.
