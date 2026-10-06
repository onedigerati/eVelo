---
phase: 02-deterministic-validation-dry-run-diff
plan: 01
subsystem: testing
tags: [node, cli, dry-run, historical-returns]

# Dependency graph
requires:
  - phase: 01-historical-data-refresh
    provides: Identity-only source and manifest inspection CLI
provides:
  - Explicit-input reviewed CSV subset dry-run tracer with full merged candidates and report
  - Focused npm commands and CLI argument-validation regression coverage
affects: [02-02, historical-returns-maintenance]

# Actuals
actuals:
  tokens: 5918
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Maintenance CLIs remain separate Node ESM entry points with direct node:test suites."
    - "Dry-run candidates are written to an explicit external output directory; bundled presets remain read-only."

key-files:
  created:
    - scripts/maintenance/historical-returns/dry-run.mjs
    - test/maintenance/historical-returns/dry-run.test.mjs
  modified:
    - package.json

key-decisions:
  - "Keep the first plan scoped to the end-to-end reviewed CSV subset tracer; comprehensive validation and diff cases remain for later plans."
  - "Preserve Phase 1 identity commands and behavior as a separate maintenance surface."

patterns-established:
  - "Test maintenance CLIs by spawning the exact Node entry point from node:test fixtures."
  - "Assert candidate outputs and preset non-mutation at the filesystem boundary."

requirements-completed: [DATAREF-04, DATAREF-05, DATAREF-06]
coverage:
  - id: D1
    description: "A reviewed QQQ subset can produce complete merged stock/index candidates and a deterministic report without modifying bundled presets."
    verification:
      - kind: integration
        ref: "npm run test:refresh-dry-run — reviewed CSV subset produces full merged candidates"
        status: pass
    human_judgment: false
  - id: D2
    description: "Maintainers can invoke the dry-run and its focused tests through explicit npm scripts while the Phase 1 identity suite remains intact."
    verification:
      - kind: integration
        ref: "npm run test:refresh-dry-run"
        status: pass
      - kind: integration
        ref: "npm run test:refresh-identify"
        status: pass
    human_judgment: false

# Metrics
duration: 7min
completed: 2026-10-06
status: complete
---

# Phase 2 Plan 1: Reviewed CSV Subset Dry-Run Tracer Summary

**An explicit-input Node CLI now turns a reviewed QQQ CSV subset into full merged preset candidates and a provenance report without changing bundled presets.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-10-06T13:02:40Z
- **Completed:** 2026-10-06T13:09:53Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Implemented the reviewed-input tracer with source/manifest identity checks, baseline merging, deterministic candidate output, and a Markdown report in the selected output directory.
- Added tests for successful subset generation, preservation of out-of-scope assets and QQQ partition equality, preset non-mutation, and missing/duplicate/unknown CLI flags.
- Registered `refresh:dry-run` and `test:refresh-dry-run` while preserving the Phase 1 identity commands.

## Task Commits

Each task was committed atomically:

1. **Task 1: End-to-end reviewed CSV subset dry run with merged candidates** - `c2dbe79` (RED test), `4777ca2` (GREEN implementation)
2. **Task 2: Register focused dry-run commands and retain Phase 1 regression coverage** - `2acaa25` (chore)

## Files Created/Modified

- `scripts/maintenance/historical-returns/dry-run.mjs` - Maintenance-only CLI for explicit reviewed-source dry runs and candidate/report output.
- `test/maintenance/historical-returns/dry-run.test.mjs` - Spawned-CLI coverage for subset generation, output shape, non-mutation, and argument failures.
- `package.json` - Dry-run execution and direct Node test scripts.

## Decisions Made

- Kept the tracer limited to the reviewed subset happy path and basic CLI argument rejection; the complete validation matrix and coverage/diff behavior remain assigned to Plans 02-02 through 02-04.
- Kept source identity inspection and semantic dry-run behavior in separate CLI entry points.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The initial RED run reached the target spawned-CLI test and failed because the placeholder printed `{}` instead of the required status and report path. The failure was classified as valid RED evidence; the implementation then passed the same focused test.
- During implementation, a trailing-newline parsing issue was corrected and verified by the focused test.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 02-01 is complete; the tracer provides the baseline for strict semantic validation in Plan 02-02.
- The full validation, coverage/removal diagnostics, routing, and hardened output-safety requirements are intentionally not claimed as implemented by this tracer.

---
*Phase: 02-deterministic-validation-dry-run-diff*
*Completed: 2026-10-06*
