---
phase: 03-gated-apply-maintenance
plan: 02
subsystem: maintenance
tags: [node, node-test, presets, regression]
requires:
  - phase: 03-gated-apply-maintenance
    provides:
      - Explicit freshness-gated apply command and isolated fixture harness
provides:
  - Fail-closed integration coverage for artifact tampering, baseline drift, malformed inputs, and dirty targets
  - PresetData-shape validation for regenerated and written preset partitions
  - Safe repeat-run predicate coverage for stale and refreshed reviewed artifacts
affects: [historical-return-maintenance]
actuals:
  tokens: 5288
  tasks: 2
  commits: 1
tech-stack:
  added: []
  patterns:
    - "Apply regression tests use temporary Git repositories and snapshot-preservation assertions"
    - "Preset partition writes are validated against the runtime PresetData keyed contract"
key-files:
  created: []
  modified:
    - scripts/maintenance/historical-returns/apply.mjs
    - test/maintenance/historical-returns/apply.test.mjs
key-decisions:
  - "Validate fresh and written candidate partition JSON against PresetData shape before and after mutation."
  - "Treat stale reviewed artifacts as invalid after baseline changes; only freshly regenerated no-change artifacts are replay-safe."
patterns-established:
  - "Refusals for stale/tampered/malformed/dirty inputs must preserve both preset files byte-for-byte."
  - "Whole write sets are preflighted before the first write, including staged and unstaged Git edits."
requirements-completed: [DATAREF-07, DATAREF-08]
coverage:
  - id: D1
    description: "Tampered reviewed artifacts, baseline drift, malformed source input, and dirty targets fail closed without mutating preset bytes."
    requirement: DATAREF-07
    verification:
      - kind: integration
        ref: npm --prefix . run test:refresh-apply
        status: pass
    human_judgment: false
  - id: D2
    description: "Apply validates candidate/write compatibility against PresetData and supports repeat runs only through freshly regenerated artifacts."
    requirement: DATAREF-08
    verification:
      - kind: integration
        ref: npm --prefix . run test:refresh-apply
        status: pass
      - kind: integration
        ref: npm --prefix . run test:refresh-identify
        status: pass
      - kind: integration
        ref: node --test test/maintenance/historical-returns/schema-contract.test.mjs
        status: pass
      - kind: integration
        ref: npm --prefix . run test:refresh-dry-run
        status: pass
      - kind: other
        ref: npm run build
        status: pass
    human_judgment: false
duration: 10min
completed: "2026-10-06"
status: complete
---

# Phase 3 Plan 2: Apply Hardening Summary

**Apply now fails closed across stale/tampered/malformed/dirty conditions and enforces PresetData compatibility for both generated and written partitions.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-10-06T20:20:00Z
- **Completed:** 2026-10-06T20:26:14Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Expanded the isolated apply suite from 4 to 15 tests, covering each reviewed artifact tamper case, committed baseline drift, malformed source refresh failures, staged and unstaged dirty-target refusals, all-target preflight ordering, provider/browser side-effect guards, and stale-vs-refreshed repeat-run behavior.
- Added `PresetData` shape assertions in `refresh:apply` for both fresh candidate files and post-write target files.
- Verified the full regression/build chain from repository root using existing maintenance commands.

## Task Commits

1. **Task 03-02-01 + 03-02-02:** `7c005af` (`feat(03-02): harden apply failure-path and shape coverage`)

## Files Created/Modified

- `scripts/maintenance/historical-returns/apply.mjs` — adds strict candidate and written-target `PresetData` shape validation.
- `test/maintenance/historical-returns/apply.test.mjs` — adds adversarial fail-closed and repeat-run integration coverage in isolated Git fixtures.

## Decisions Made

- Candidate shape compatibility is now validated inside apply itself rather than relying solely on downstream app/build checks.
- Repeat-run safety is defined as: stale artifacts fail freshness; fresh reruns for unchanged source become no-op.

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

The local environment had non-executable `node_modules/.bin/tsc` and `vite` wrappers during the first build pass (`Permission denied`). Local executable bits were restored before rerunning the full verification chain.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

Plan 03-02 is complete. Plan 03-03 remains to finish documentation and runbook contract coverage for DATAREF-09.

## Self-Check: PASSED

- `npm --prefix . run test:refresh-apply` — 15 tests passed.
- `npm --prefix . run test:refresh-identify` — passed.
- `node --test test/maintenance/historical-returns/schema-contract.test.mjs` — passed.
- `npm --prefix . run test:refresh-dry-run` — 48 tests passed.
- `npm run build` — passed.

---
*Phase: 03-gated-apply-maintenance*
*Completed: 2026-10-06*
