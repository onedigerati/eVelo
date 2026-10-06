---
phase: 03-gated-apply-maintenance
plan: 01
subsystem: maintenance
tags: [node, esm, git, node-test]
requires:
  - phase: 02-deterministic-validation-dry-run-diff
    provides:
      - Deterministic reviewed candidates and dry-run reports
provides:
  - Explicit freshness-gated apply command for bundled preset partitions
  - Isolated Git-repository integration tests and npm entry points
affects: [historical-return-maintenance]
actuals:
  tokens: 4333
  tasks: 2
  commits: 3
tech-stack:
  added: []
  patterns:
    - "Node ESM maintenance CLI reuses the existing dry-run validator"
    - "Successful file-mutation tests use temporary Git repositories and synthetic presets"
key-files:
  created:
    - scripts/maintenance/historical-returns/apply.mjs
    - test/maintenance/historical-returns/apply.test.mjs
    - .planning/phases/03-gated-apply-maintenance/03-01-RED-EVIDENCE.json
  modified:
    - package.json
    - .planning/phases/03-gated-apply-maintenance/03-VALIDATION.md
key-decisions:
  - "Use --confirm-apply as the distinct mutation signal; without it, the command prints a preview only."
  - "Require one apply process at a time; do not claim locking or multi-file atomicity."
patterns-established:
  - "Regenerate candidates in a fresh temporary output directory and byte-compare both partitions plus the report before any write."
  - "Check Git cleanliness and write only changed files from the fixed stocks.json/indices.json allow-list."
requirements-completed: [DATAREF-07]
coverage:
  - id: D1
    description: "Freshness-gated apply previews and explicitly updates only changed bundled preset files."
    requirement: DATAREF-07
    verification:
      - kind: integration
        ref: test/maintenance/historical-returns/apply.test.mjs#confirmed apply writes only changed preset partitions
        status: pass
    human_judgment: false
  - id: D2
    description: "The npm apply entry point is distinct from dry-run and preview mode is non-mutating."
    requirement: DATAREF-07
    verification:
      - kind: integration
        ref: npm --prefix . run test:refresh-apply
        status: pass
      - kind: integration
        ref: npm --prefix . run test:refresh-dry-run
        status: pass
    human_judgment: false
duration: 9min
completed: "2026-10-06"
status: complete
---

# Phase 3 Plan 1: Freshness-Gated Apply CLI Summary

**A separate `refresh:apply` command now regenerates and byte-checks reviewed artifacts, previews the exact diff, and writes only explicitly confirmed changed preset partitions.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-10-06T20:11:37Z
- **Completed:** 2026-10-06T20:20:00Z
- **Tasks:** 2
- **Files modified:** 3 implementation, test, and package files

## Accomplishments

- Added `refresh:apply` with fresh dry-run regeneration, byte comparisons for both candidates and the report, a Git-cleanliness gate, exact proposed diffs, explicit confirmation, fixed write targets, and post-write byte verification.
- Added isolated synthetic-repository tests for a confirmed single-partition apply, non-mutating preview, dry-run flag separation, and serial-operation guidance.
- Preserved the TDD RED report and registered focused npm commands; the live preset files were not used for successful write tests or modified by this work.

## Task Commits

1. **Task 1 RED:** `01bcff6` (`test(03-01): add failing test for confirmed isolated preset apply`)
2. **Task 1 GREEN:** `8b24f58` (`feat(03-01): implement freshness-gated preset apply`)
3. **Task 2:** `4aeea04` (`feat(03-01): register apply and regression commands`)

## Files Created/Modified

- `scripts/maintenance/historical-returns/apply.mjs` — fresh-artifact gate, review diff, explicit apply, and narrow writes.
- `test/maintenance/historical-returns/apply.test.mjs` — temporary Git fixture and four apply-boundary tests.
- `package.json` — `refresh:apply` and `test:refresh-apply` scripts.
- `03-01-RED-EVIDENCE.json` — complete TAP report and validated RED evidence.
- `03-VALIDATION.md` — marked the two completed task checks green.

## Decisions Made

- Chose `--confirm-apply` as the separate opt-in mutation signal; a normal invocation is preview-only.
- The supported operating mode is serial apply execution. No concurrency lock or cross-file transaction is claimed.
- No browser service or provider integration is used; writes are limited to changed files from the internal preset allow-list.

## TDD Gate Compliance

- **RED:** The target test failed before implementation with exit code 1 at the expected successful-apply assertion because the fixture could not load the not-yet-created apply CLI. The evidence classifier returned `RED_EVIDENCE_OK` (`target_test_failed`); the full unchanged TAP report is in `03-01-RED-EVIDENCE.json`.
- **GREEN:** The same target test passed after the apply implementation; the feature commit follows the RED test commit.

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

The initial fixture run surfaced that its `node_modules` symlink appeared as an untracked repository path and that trimming Git status output removed its leading status column. The fixture now excludes that dependency link in its temporary Git metadata and preserves status-column whitespace with `trimEnd()`; the focused tests pass.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Plan 03-01 is complete. Plans 03-02 and 03-03 remain for Wave 2 after the Wave 1 maintenance regression and build gate.

## Self-Check: PASSED

- `node --test --test-name-pattern="confirmed apply writes only changed preset partitions" test/maintenance/historical-returns/apply.test.mjs` — passed.
- `npm --prefix . run test:refresh-apply` — 4 tests passed.
- `npm --prefix . run test:refresh-dry-run` — 48 tests passed.
- `npm --prefix . run refresh:apply` — resolved the npm script and displayed usage including the serial-operation limitation.
- The isolated apply changed only its synthetic `stocks.json`; the repository's existing local edits to bundled presets remain untouched.

---
*Phase: 03-gated-apply-maintenance*
*Completed: 2026-10-06*
