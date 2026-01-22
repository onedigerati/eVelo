---
phase: 13
plan: 01
subsystem: testing
tags: [e2e, agent-browser, pixelmatch, vite, cross-platform]
dependencies:
  requires: []
  provides: [e2e-infrastructure, agent-browser-wrapper, screenshot-comparison]
  affects: [13-02, 13-03, 13-04, 13-05, 13-06]
tech-stack:
  added: [agent-browser, pixelmatch, pngjs, cross-spawn]
  patterns: [cli-wrapper, programmatic-server, visual-regression]
key-files:
  created:
    - test/e2e/helpers/agent-browser.js
    - test/e2e/helpers/server.js
    - test/e2e/helpers/screenshot.js
    - test/e2e/screenshots/baseline/.gitkeep
    - test/e2e/screenshots/current/.gitignore
    - test/e2e/screenshots/diff/.gitignore
  modified:
    - package.json
decisions:
  - context: agent-browser CLI execution
    choice: Use cross-spawn with npx for Windows compatibility
    rationale: Handles .cmd files on Windows, avoids global install issues
  - context: Test server port
    choice: Port 5174 (not 5173)
    rationale: Avoid conflicts with development server
  - context: Screenshot threshold
    choice: 0.1 (10%) default threshold
    rationale: Tolerance for anti-aliasing differences
metrics:
  duration: 4 min
  completed: 2026-01-22
---

# Phase 13 Plan 01: E2E Testing Infrastructure Summary

E2E testing foundation with agent-browser CLI wrapper using cross-spawn, Vite programmatic server on port 5174, and pixelmatch screenshot comparison with 0.1 threshold.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install dependencies and create directory structure | 504d2da | package.json, test/e2e/screenshots/* |
| 2 | Create agent-browser CLI wrapper helper | a022036 | test/e2e/helpers/agent-browser.js |
| 3 | Create Vite server lifecycle helper | afdd48e | test/e2e/helpers/server.js |
| 4 | Create screenshot comparison utility | 731338b | test/e2e/helpers/screenshot.js |

## Key Decisions Made

### 1. Cross-platform agent-browser execution
- **Choice:** Use cross-spawn with npx
- **Rationale:** cross-spawn handles Windows .cmd files automatically; npx ensures local package installation works without global npm install
- **Pattern:** `spawn('npx', ['agent-browser', ...args])`

### 2. Vite server management
- **Choice:** Programmatic createServer() API on port 5174
- **Rationale:** Direct API control (vs spawning npm run dev) enables clean start/stop; port 5174 avoids conflict with dev server (5173)
- **Pattern:** `createServer({ server: { port: 5174, strictPort: true } })`

### 3. Screenshot comparison threshold
- **Choice:** 0.1 (10%) default threshold for pixelmatch
- **Rationale:** Provides tolerance for anti-aliasing and subpixel rendering differences while still catching significant visual changes

## Artifacts Created

### test/e2e/helpers/agent-browser.js (176 lines)
Cross-platform agent-browser CLI wrapper with convenience functions:
- `open(url)`, `close()`, `screenshot(path)` - Browser lifecycle
- `findRole()`, `findLabel()`, `clickText()` - Element interaction
- `wait()`, `isVisible()`, `assertVisible()` - Synchronization
- `setViewport()`, `evalJs()` - Configuration and evaluation

### test/e2e/helpers/server.js (127 lines)
Vite server lifecycle management:
- `startServer()`, `stopServer()` - Server control
- `getBaseUrl()`, `getPort()` - Configuration access
- `waitForReady()` - Server availability check
- Process cleanup handlers for SIGINT, SIGTERM, uncaught exceptions

### test/e2e/helpers/screenshot.js (173 lines)
Pixelmatch-based screenshot comparison:
- `compareScreenshots()` - Direct file comparison
- `compareNamed()`, `compareOrCapture()` - Named screenshot workflow
- `captureBaseline()` - Initial baseline creation
- `cleanScreenshots()` - Test run cleanup

### Directory Structure
```
test/e2e/
  helpers/
    agent-browser.js
    server.js
    screenshot.js
  screenshots/
    baseline/     # Reference images (committed)
    current/      # Test outputs (gitignored)
    diff/         # Comparison diffs (gitignored)
```

### npm Scripts Added
- `test:e2e` - Run all E2E tests
- `test:e2e:smoke` - Smoke tests
- `test:e2e:workflow` - Workflow tests
- `test:e2e:responsive` - Responsive layout tests
- `test:e2e:charts` - Chart visual regression tests
- `test:e2e:charts:capture` - Capture chart baselines
- `postinstall` - Install agent-browser Chromium

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. Dependencies installed: agent-browser@0.6.0, pixelmatch@7.1.0, pngjs@7.0.0, cross-spawn@7.0.6
2. Directory structure created with proper .gitkeep and .gitignore files
3. All helper files pass syntax check (`node --check`)
4. npm scripts defined in package.json
5. Artifacts exceed minimum line counts (176, 127, 173 vs 60, 40, 30)

## Next Phase Readiness

Foundation ready for:
- **13-02:** Smoke tests (uses all three helpers)
- **13-03:** Workflow tests (agent-browser + server)
- **13-04:** Responsive tests (agent-browser setViewport + server)
- **13-05:** Chart tests (all helpers + baseline capture)
- **13-06:** Test runner integration (orchestrates all tests)

No blockers identified.
