# Contributing to STRATO

First off, thank you for considering contributing to STRATO! It's people like you that make STRATO such a great tool for students and communities everywhere. This document provides guidelines and instructions for contributing to the project.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing Requirements](#testing-requirements)
- [Pull Request Template](#pull-request-template)
- [Issue Template](#issue-template)
- [Release Process](#release-process)

---

## Code of Conduct

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.

### Our Standards

**Positive behavior includes:**

- Demonstrating empathy and kindness toward other people
- Being respectful of differing opinions, viewpoints, and experiences
- Giving and gracefully accepting constructive feedback
- Accepting responsibility and apologizing to those affected by our mistakes
- Focusing on what is best not just for us as individuals, but for the overall community

**Unacceptable behavior includes:**

- The use of sexualized language or imagery, and sexual attention or advances of any kind
- Trolling, insulting or derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information, such as a physical or email address, without their explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the project maintainers via GitHub Issues or direct message. All complaints will be reviewed and investigated promptly and fairly. Project maintainers who do not follow or enforce the Code of Conduct in good faith may face temporary or permanent repercussions.

---

## How to Contribute

### 1. Fork the Repository

Click the **Fork** button at the top right of the repository page to create your own copy of STRATO.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/STRATO.git
cd STRATO
```

### 3. Create a Branch

Always create a new branch for your work. Never work directly on `main`.

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
# or
git checkout -b docs/your-documentation-change
```

**Branch naming conventions:**

- `feature/` — New features (e.g., `feature/media-player`)
- `fix/` — Bug fixes (e.g., `fix/proxy-fallback-timer`)
- `docs/` — Documentation changes (e.g., `docs/api-reference`)
- `refactor/` — Code refactoring (e.g., `refactor/db-store-caching`)
- `perf/` — Performance improvements (e.g., `perf/game-rendering`)
- `chore/` — Maintenance tasks (e.g., `chore/update-dependencies`)

### 4. Make Your Changes

Write clean, well-documented code that follows the project's code style (see below). Make sure to test your changes locally before committing.

### 5. Commit Your Changes

Use clear, descriptive commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
feat(arcade): add game category filter by favorites
fix(proxy): resolve auto-fallback timer not clearing on load
docs(api): add WebSocket protocol documentation
refactor(store): improve atomic write reliability
perf(games): debounce search input rendering
```

**Commit message structure:**

```
type(scope): description

[optional body]

[optional footer]
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`

### 6. Push and Create a Pull Request

```bash
git push origin feature/your-feature-name
```

Then open a Pull Request on GitHub from your fork to the main repository. Fill in the PR template (see below).

---

## Development Setup

### Prerequisites

- **Node.js** 18.0.0 or later
- **pnpm** 9.x (preferred) or npm
- A modern web browser (Chrome recommended for service worker debugging)

### Install Dependencies

```bash
pnpm install
```

This runs the postinstall script (`scripts/setup-proxy.cjs`) which sets up Ultraviolet and Scramjet proxy assets.

### Configure Environment

```bash
cp .env.example .env
# Edit .env with your COOKIE_SECRET and optional proxy URLs
```

For local development, the default `COOKIE_SECRET` of `dev-secret-change-me` is fine. You don't need to set any `PROXY_*` variables unless you want to test external game URLs.

### Run Development Server

```bash
pnpm dev
```

This uses `node --watch src/index.js` for automatic restart on file changes. The server starts at `http://localhost:8080`.

### Project Architecture

STRATO is a single-process Node.js application with:

- **Express 5** for HTTP routing and middleware
- **WebSocket** (`ws`) for real-time chat at `/ws/chat`
- **Bare Server** for proxy transport at `/bare/`
- **Wisp** for proxy WebSocket transport at `/wisp/`
- **Custom JSON Store** for all persistent data in `data/`
- **Static SPA** served from `public/`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture overview.

### Key Files to Know

| File | Purpose |
|------|---------|
| `src/index.js` | Server entry point — middleware stack, route mounting, server startup |
| `src/middleware/auth.js` | Authentication middleware — TOS gate, login, CSRF, cookie validation |
| `src/websocket.js` | WebSocket chat server — rooms, messages, heartbeat, rate limiting |
| `src/db/store.js` | JSON database — CRUD operations, atomic writes, caching |
| `src/routes/*.js` | API route handlers — one file per feature domain |
| `public/js/app.js` | Main SPA logic — views, proxy, games, AI, state management |
| `public/js/chat.js` | Chat WebSocket client |
| `public/js/themes.js` | Theme studio — presets, import/export, live preview |
| `public/js/profile.js` | Profile & leaderboard client — XP, level-up, scores |
| `public/sw.js` | Service worker — caching strategies, offline support |

### Database

STRATO uses a custom JSON file store in `data/`. Each collection is a separate `.json` file. The store supports CRUD operations, querying, pagination, and atomic writes. Files are auto-created on first access.

**Collections:** `users`, `scores`, `bookmarks`, `history`, `saves`, `themes`, `extensions`, `chat_rooms`, `chat_messages`

The `data/` directory is gitignored — it's created at runtime and never committed.

### Adding a New API Route

1. Create a new file in `src/routes/` (e.g., `src/routes/widgets.js`)
2. Import `Router` from Express and define your routes
3. Import `store` from `../db/store.js` if you need database access
4. Use `res.locals.username` to get the authenticated user (set by auth middleware)
5. Export the router as default
6. Mount it in `src/index.js`: `import widgetRoutes from './routes/widgets.js'; app.use(widgetRoutes);`
7. Add any needed rate limiters in `src/index.js`

### Adding a New Frontend Module

1. Create a new file in `public/js/` (e.g., `public/js/widgets.js`)
2. Wrap everything in an IIFE: `(function() { 'use strict'; ... })();`
3. Expose a public API via `window.StratoWidgets = { ... }`
4. Add the `<script>` tag to `public/index.html`
5. Add the file to the `STATIC_ASSETS` list in `public/sw.js` for caching
6. Add any needed API routes on the backend

---

## Code Style

### ESLint

STRATO uses ESLint for code quality. Run the linter before committing:

```bash
pnpm lint
```

The ESLint configuration extends the recommended rules for ES modules and Node.js. Key rules include:

- No unused variables
- No console errors without proper error handling
- Consistent return statements
- Prefer `const` over `let` where possible

### Prettier

STRATO uses Prettier for code formatting. Format your code before committing:

```bash
# Format all source files
pnpm format

# Check formatting without changing files
pnpm format:check
```

**Prettier configuration:**

- Single quotes
- 2-space indentation
- Trailing commas (es5)
- 80 character print width
- Semicolons always

### JavaScript Style Guide

#### Backend (src/)

- Use **ES modules** (`import`/`export`) — the project has `"type": "module"` in package.json
- Use `async/await` for all asynchronous operations
- Escape all user input with `escapeHtml()` before rendering in HTML responses
- Validate all request body fields with explicit type and length checks
- Use `res.locals.username` for the authenticated user (set by auth middleware)
- Return appropriate HTTP status codes (200, 201, 400, 401, 403, 404, 409, 413, 429, 500, 503, 504)
- Include descriptive error messages in JSON responses: `{ error: 'Description of what went wrong' }`
- Use the custom JSON store (`src/db/store.js`) for all persistent data
- Validate collection names before database operations (they must be in `VALID_COLLECTIONS`)

#### Frontend (public/js/)

- Use IIFEs (`(function() { 'use strict'; ... })();`) for module encapsulation
- Expose public APIs via `window.StratoModuleName = { ... }`
- Use `escapeHtml()` (DOM-based) for all `innerHTML` rendering to prevent XSS
- Use `localStorage` with `strato-` prefixed keys for client-side persistence
- Use the `state` object in `app.js` for global application state
- Use `showToast()` for user feedback on actions
- Use `document.getElementById()` for element selection (no querySelector chains for IDs)
- Debounce search inputs (200ms) and other high-frequency events
- Use `?.` optional chaining for elements that may not be in the DOM

#### Common Patterns

```javascript
// ── Route handler pattern ──
router.get('/api/resource', async (req, res) => {
  try {
    const username = res.locals.username;
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const data = await store.getAll('resource');
    res.json({ total: data.length, data });
  } catch (err) {
    console.error('[STRATO] Resource GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch resource' });
  }
});

// ── Input validation pattern ──
if (!name || typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 50) {
  return res.status(400).json({ error: 'Name must be 1-50 characters' });
}

// ── HTML escape pattern ──
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
```

### Comment Style

Use section headers with Unicode box-drawing characters for major sections:

```javascript
// ── Section Name ──
```

Use inline comments with `//` for brief explanations. Use `/** */` for JSDoc-style function documentation when the function is complex or exported.

---

## Testing Requirements

While STRATO does not currently have an automated test suite, we require the following manual testing before submitting a PR:

### For Bug Fixes

1. Reproduce the bug on the current `main` branch
2. Verify the fix resolves the issue
3. Verify the fix doesn't introduce regressions in related functionality
4. Test with both proxy engines (Ultraviolet and Scramjet)
5. Test in both development and production-like configurations

### For New Features

1. Test all new API endpoints with curl or a REST client
2. Test the frontend UI in Chrome and at least one other browser
3. Verify proper error handling for invalid inputs
4. Verify rate limiting works correctly
5. Verify authentication is enforced on protected endpoints
6. Test the service worker caching for new static assets
7. Verify the feature works on mobile viewports
8. Verify the feature works when the AI service is offline (if applicable)

### For Documentation Changes

1. Verify all code examples are syntactically correct
2. Verify all API endpoint paths match the actual routes
3. Verify environment variable names match the actual configuration

---

## Pull Request Template

When creating a pull request, please use the following template:

```markdown
## Description

Brief description of what this PR does and why.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement

## Related Issues

Closes #XXX

## Changes Made

- Itemized list of changes

## Testing

- [ ] Tested locally with `pnpm dev`
- [ ] Tested with both UV and SJ proxy engines
- [ ] Tested on mobile viewport
- [ ] Verified error handling for invalid inputs
- [ ] Verified authentication on protected endpoints
- [ ] Checked with `pnpm lint`
- [ ] Checked with `pnpm format:check`

## Screenshots (if applicable)

Add screenshots for UI changes.

## Checklist

- [ ] My code follows the project's code style
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] My changes generate no new ESLint warnings
- [ ] I have updated documentation where applicable
- [ ] My changes are backward compatible
```

---

## Issue Template

### Bug Report

```markdown
## Bug Description

A clear description of what the bug is.

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

## Expected Behavior

What you expected to happen.

## Actual Behavior

What actually happened.

## Environment

- STRATO version: [e.g., v21.0.0]
- Node.js version: [e.g., 18.17.0]
- Browser: [e.g., Chrome 120]
- OS: [e.g., ChromeOS]
- Proxy engine: [UV / SJ / Both]

## Console Errors

Paste any relevant console errors here.

## Screenshots

If applicable, add screenshots to help explain the problem.

## Additional Context

Any other context about the problem.
```

### Feature Request

```markdown
## Feature Description

A clear description of the feature you'd like to see.

## Problem It Solves

What problem does this feature address? Why is it needed?

## Proposed Solution

How you think this feature should work.

## Alternatives Considered

Any alternative solutions you've considered.

## Additional Context

Any other context, screenshots, or references.
```

---

## Release Process

### Version Numbering

STRATO follows [Semantic Versioning](https://semver.org/) with major version numbers tied to significant feature releases:

- **Major (X.0.0)** — Major new features, UI overhauls, or breaking changes
- **Minor (21.X.0)** — New features, new API endpoints, new games
- **Patch (21.0.X)** — Bug fixes, security patches, documentation updates

### Release Checklist

1. Update `version` in `package.json`
2. Update the version banner in `src/index.js` startup message
3. Update the service worker cache name in `public/sw.js` (`CACHE_NAME` and `CACHE_VERSION`)
4. Update `CHANGELOG.md` with all changes since the last release
5. Update `README.md` if there are significant feature changes
6. Run `pnpm lint` and `pnpm format:check` — fix any issues
7. Test the full application locally with `pnpm dev`
8. Commit with message: `chore(release): v21.X.X`
9. Tag the release: `git tag v21.X.X`
10. Push: `git push origin main --tags`
11. Create a GitHub Release with the changelog entry

### Hotfix Process

For critical security or bug fixes:

1. Branch from the release tag: `git checkout -b hotfix/v21.X.Y v21.X.X`
2. Make the minimal fix
3. Update version in `package.json` (patch bump)
4. Update `CHANGELOG.md`
5. Test thoroughly
6. Commit: `fix(critical): description of the fix`
7. Tag: `git tag v21.X.Y`
8. Push: `git push origin hotfix/v21.X.Y --tags`
9. Create a GitHub Release
10. Merge back to `main`

---

Thank you for contributing to STRATO! Your efforts help make the internet more accessible for students everywhere. 🚀
