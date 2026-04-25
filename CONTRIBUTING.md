# Contributing to STRATO

First off, thank you for considering contributing to STRATO! It's people like you that make STRATO such a great tool.

## Where do I go from here?

If you've noticed a bug or have a feature request, make sure to check our Issues page to see if someone else has already created a ticket. If not, go ahead and make one!

## Good First Issues

If you're looking for a place to start, try tackling issues labeled `good first issue`! Some suggested starter tasks might include:
- Adding additional automated tests for utilities
- Improving UI text or adding more CSS animations
- Extending documentation

## Development Setup

Make sure you're using Node.js version 18 or above. We use `pnpm` to ensure consistent dependency resolution.

1. Install dependencies:
   ```sh
   pnpm install
   ```

2. Setup `.env`:
   ```sh
   cp .env.example .env
   ```
   *Edit `.env` to set your secure password and cookie secret.*

3. Start development server:
   ```sh
   pnpm dev
   ```

## Get the test suite running

To run our test suites:

```sh
node --test tests/*.test.js
```
*(Note: use this directly rather than `npm test` to avoid server lifecycle hanging issues during test runs)*

## Implement your fix or feature

At this point, you're ready to make your changes! Feel free to ask for help; everyone is a beginner at first.

## Styleguides & Code Formatting

We use `eslint` for linting and `prettier` to format our code.

- You can run `npm run format` to automatically format your code before committing. Please be careful to only format modified files so as to avoid unnecessary diffs.
- Please ensure `npm run lint` passes without errors.

## Make a Pull Request

Then update your feature branch from your local copy of master, and push it! Finally, go to GitHub and make a Pull Request.

### PR Checklist
Before submitting a PR, please ensure you complete the following checklist:
- [ ] Tests pass locally (`node --test tests/*.test.js` or `npx playwright test` if relevant)
- [ ] No new console errors are introduced on load
- [ ] Playwright screenshots are attached for any UI changes
- [ ] CHANGELOG.md is updated
- [ ] No new dependencies have been added without justification