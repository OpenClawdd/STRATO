# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v2.1.0] - 2026-04-21

### Added
- Phase 1: Replaced Ultraviolet proxy engine with the SPLASH proxy engine (utilizing Scramjet under the hood) for a leaner, faster stack.
- Phase 2: Integrated Phase 2 enhancements for better proxy URL encoding stability.

### Changed
- Phase 1: ESLint configuration consolidation for improved code quality tools.
- Phase 2: Refactored internal architecture for WISP backends.

### Fixed
- Phase 1: Deduplicated `index.js` imports for optimal performance.
- Phase 2: Patched minor UI glitches on lower-end devices.

### Security
- Excluded `splash.guard.js` from the proxy to keep the stack simple and avoid aggressive anti-dev protections.
- Phase 2: Hardened proxy request sanitization.

## [v2.0.1] - 2026-04-20

### Fixed
- Initial minor patches and deduplication fixes.