---
last_mapped_commit: 481cebe91be1bd85692db4830b6fb645f1e0b5d0
last_mapped_at: 2026-10-05
---
# Testing Patterns

**Analysis Date:** 2026-10-05

## Test Framework

**Observed practice:**
- The project uses Vitest as its primary unit test runner (`package.json` declares `"test": "vitest run"` and `"test:watch": "vitest"`).
- UI-level test support is enabled via `@vitest/ui` and the `"test:ui": "vitest --ui"` script in `package.json`.
- There is no dedicated `vitest.config.*` file in the repo root; the test runner is configured via package scripts and defaults rather than a formal config file.
- Browser automation commands are also present: `npm run test:e2e`, `npm run test:e2e:smoke`, `npm run test:e2e:workflow`, `npm run test:e2e:responsive`, and `npm run test:e2e:charts` in `package.json`.

**Gaps / not yet standardized:**
- No explicit coverage thresholds or coverage script are configured in `package.json`.
- There is no centralized `vitest.config.ts` to codify reporters or environment settings.

## Test File Organization

**Observed practice:**
- Unit tests live next to the source under `__tests__/` folders, for example `src/calculations/__tests__/integration.test.ts`, `src/simulation/__tests__/bootstrap.test.ts`, and `src/sbloc/__tests__/validation.test.ts`.
- Browser automation tests live under `test/e2e/`, with files such as `test/e2e/smoke.js`, `test/e2e/workflow.js`, `test/e2e/responsive.js`, and `test/e2e/charts.js`.
- The naming pattern is mostly `*.test.ts` for source-adjacent unit tests and `*.js` for end-to-end harnesses; `*.spec.*` files were not the dominant pattern.

**Gaps / not yet standardized:**
- There is not a single cross-project naming rule beyond the established `__tests__` and `test/e2e` directories.

## Test Structure

**Observed practice:**
- Vitest test blocks use `describe()`/`it()`/`test()` with `expect()` assertions. Examples appear in `src/simulation/__tests__/bootstrap.test.ts` and `src/calculations/__tests__/sell-strategy.test.ts`.
- Tests often include local helper functions to generate deterministic inputs instead of using fixture directories, such as `createSeededRng` and `calculateCorrelation` in `src/simulation/__tests__/bootstrap.test.ts`.
- Assertions are explicit and check values and invariants, e.g., `expect(result.successRate).toBeLessThan(100);`, `expect(result.terminalNetWorth).toBeGreaterThan(0);`, and `expect(() => simpleBootstrap([], 10, rng)).toThrow('Cannot bootstrap from empty returns array');`.
- Test names are descriptive and behavior-first (`should preserve positive correlation`, `success means terminal > initial (not just > 0)`).

**Gaps / not yet standardized:**
- There is no standard test template or shared helper library under a common `test/utils/` area; helper logic is embedded in each file.

## Mocking and Test Doubles

**Observed practice:**
- The repo does not appear to use a mocking framework such as `vi.mock`, `sinon`, or `jest.mock`; instead, tests construct minimal deterministic stand-ins locally.
- Examples of local factories include `createMockPercentiles` in `src/calculations/__tests__/sell-strategy.test.ts` and `createSeededRng` in `src/simulation/__tests__/bootstrap.test.ts`.
- For end-to-end work, the harness uses helper modules in `test/e2e/helpers/`, such as `agent-browser.js`, `server.js`, and `screenshot.js`, rather than general-purpose mocks.

**Gaps / not yet standardized:**
- There is no centralized mock pattern or shared mock library; each test file creates its own small input builders.
- Browser automation tests are script-based and not built on a dedicated framework like Playwright or Cypress, so there is no common component-mocking layer.

## Fixtures and Factories

**Observed practice:**
- Fixtures are mostly created inline in tests; no dedicated `fixtures/` directory was observed in the repository structure.
- Deterministic factory patterns are preferred over static JSON fixtures when the test only needs a small mathematical dataset.
- `src/calculations/__tests__/sell-strategy.test.ts` generates percentiles in code; `src/simulation/__tests__/bootstrap.test.ts` generates seeded random data and correlation checks in code.

**Gaps / not yet standardized:**
- There is no repo-wide convention for external fixture files or a shared test-data generator directory.

## CI and Automation Practices

**Observed practice:**
- GitHub Actions runs E2E tests in `.github/workflows/e2e.yml` on pull requests. The workflow installs dependencies with `npm ci`, verifies `agent-browser`, and then runs `npm run test:e2e` with `NODE_OPTIONS=--max-old-space-size=4096`.
- The workflow uploads screenshots and logs on failure, which reflects a direct visual-debugging pattern: `test/e2e/screenshots/current/` and `test/e2e/screenshots/diff/` are attached as artifacts.
- Deployment automation in `.github/workflows/deploy-pages.yml` builds the PWA with `npm run build` and the portable build with `npm run build:portable` before publishing to GitHub Pages.
- The E2E orchestrator `test/e2e/run-all.js` runs a sequence of smoke, workflow, and responsive tests, marks some as non-critical, and continues after failures so a full report is produced.

**Gaps / not yet standardized:**
- CI is focused on E2E and deployment, not on unit-test coverage gates or a lint gate on pull requests.
- Visual regression tests are script-driven but not enforced as a required baseline update policy.

## Common Test Patterns

**Observed practice:**
- Tests focus on deterministic numeric behavior, edge conditions, and invariants rather than broad UI assertions.
- `src/simulation/__tests__/bootstrap.test.ts` checks correlation preservation, invariant lengths, and rejection conditions; `src/sbloc/__tests__/validation.test.ts` validates state-level failure scenarios.
- Browser tests are task-oriented: `test/e2e/run-all.js` orchestrates critical and non-critical checks and prints a pass/fail summary without stopping on non-critical failures.

**Gaps / not yet standardized:**
- There is no explicit snapshot-test or semantic end-to-end assertion pattern beyond screenshot comparison and custom scripts.

## Coverage and Quality Gates

**Observed practice:**
- The project runs `npm run build` as a compile check (`package.json` script `"build": "tsc && vite build"`).
- Unit tests and E2E tests are the primary quality checks; coverage is not codified as a threshold.
- Build and test automation read as a pragmatic workflow, but it is not a full gate system by repository config alone.

**Gaps / not yet standardized:**
- No repo-level `coverage` configuration or `test:coverage` script is present.
- No linter or formatter check runs in CI based on repository configuration.

---

*Testing analysis: 2026-10-05*
