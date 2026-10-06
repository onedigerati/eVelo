---
phase: 02-deterministic-validation-dry-run-diff
plan: 04
subsystem: testing
tags: [node, filesystem, deterministic-output, maintenance-cli]

# Dependency graph
requires:
  - phase: 02-deterministic-validation-dry-run-diff
    provides: "Reviewed-source validation, complete coverage comparison, and stable candidate/report content"
provides:
  - "Canonical output-directory containment checks and exclusive candidate/report creation"
  - "Byte-repeatability and preset non-mutation regression coverage across all maintenance outcomes"
affects: [phase-02-verification, phase-03-gated-apply-maintenance]

# Actuals
actuals:
  tokens: 4734
  tasks: 2
  commits: 4

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Resolve the nearest existing ancestor physically before creating output, then re-check the canonical directory."
    - "Preflight every artifact name and use exclusive creation so files appearing after preflight are not replaced."
    - "Compare byte snapshots of every preset file before and after success, warning-only, and blocking runs."
    - "Compare independent candidate/report outputs byte-for-byte and require stable LF serialization with a trailing newline."

key-files:
  created: []
  modified:
    - scripts/maintenance/historical-returns/dry-run.mjs
    - test/maintenance/historical-returns/dry-run.test.mjs

key-decisions:
  - "Reject parent-traversal output segments, direct or symlinked paths into presets, and neighboring preset-prefix paths."
  - "Accept a missing output directory or an existing empty directory; reject any existing entries before processing inputs."
  - "Keep exclusive per-file writes and explicit no-overwrite behavior without claiming atomic multi-artifact transactions."
  - "The existing serializer already met deterministic byte requirements, so Task 2 needed expanded regression assertions but no production serializer rewrite."

patterns-established:
  - "Use real paths and path-relative containment for protected preset locations, never string-prefix containment alone."
  - "Use lstat-style entry checks plus wx creation for collision-safe filesystem output."
  - "Exercise the CLI with injected network and IndexedDB guards to preserve its local, non-applying boundary."

requirements-completed: [DATAREF-04, DATAREF-05, DATAREF-06]
coverage:
  - id: D1
    description: "Caller-selected outputs are created only in safe absent-or-empty destinations and cannot overwrite targets that exist before or after preflight."
    requirement: DATAREF-06
    verification:
      - kind: integration
        ref: "npm run test:refresh-dry-run — absent/empty/nonempty paths, traversal, preset/symlink containment, and raced-in collision"
        status: pass
    human_judgment: false
  - id: D2
    description: "Identical reviewed bytes produce byte-identical candidate JSON and reports; reports remain host-independent and presets remain byte-identical for successful, warning-only, and blocking runs."
    requirement: DATAREF-06
    verification:
      - kind: integration
        ref: "test/maintenance/historical-returns/dry-run.test.mjs — deterministic artifacts and all-preset non-mutation"
        status: pass
    human_judgment: false
  - id: D3
    description: "The refresh maintenance regression chain preserves Phase 1 identity/schema behavior and Phase 2 validation behavior without provider fetch, apply, raw-price calculation, or browser storage access."
    requirement: DATAREF-04
    verification:
      - kind: integration
        ref: "npm run test:refresh-identify && node --test test/maintenance/historical-returns/schema-contract.test.mjs && npm run test:refresh-dry-run"
        status: pass
    human_judgment: false

# Metrics
duration: 10min
completed: 2026-10-06
status: complete
---

# Phase 2 Plan 4: Filesystem Safety and Deterministic Output Summary

**The dry-run CLI now constrains output to a clean caller-selected directory, refuses replacement even for raced-in targets, and has byte-level regression coverage for repeatability and preset non-mutation.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-10-06T13:33:24Z
- **Completed:** 2026-10-06T13:43:20Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added lexical traversal rejection, real-path containment checks against presets, neighboring-prefix rejection, absent-or-empty directory handling, and target preflight before source processing.
- Candidate and report writes use exclusive creation; a target introduced after preflight remains unchanged and prevents subsequent artifact writes.
- Added repeated-run byte comparisons, host-path/timestamp checks, concise-stdout assertions, all-preset byte snapshots for successful/warning/blocking outcomes, and explicit no-provider/no-IndexedDB/raw-price boundary tests.
- Ran the complete maintenance regression chain: identity tests 11/11, schema-contract tests 203/203, and dry-run tests 47/47.

## Task Commits

Each task was committed atomically:

1. **Task 1: Harden output containment, clean-directory checks, and exclusive writes** - `b4b7301` (RED tests), `d666523` (implementation)
2. **Task 2: Verify stable artifact bytes and non-mutation across all run outcomes** - `3a2b9c3` (RED tests), `3aaba54` (test coverage completion)

## Files Created/Modified

- `scripts/maintenance/historical-returns/dry-run.mjs` - Physical destination validation, traversal/prefix rejection, complete target preflight, and safe exclusive output writes.
- `test/maintenance/historical-returns/dry-run.test.mjs` - Filesystem safety, raced-in collision, byte determinism, every-preset non-mutation, and no-side-effect boundary tests.

## Decisions Made

- Reject any `..` segment in the caller-supplied output path before normalizing it, preventing lexical traversal from being hidden by `path.resolve`.
- Canonicalize and re-check the output directory after creation; write through its resolved physical path rather than a caller symlink.
- Retain exclusive creation per artifact. Interrupted runs may leave partial artifacts; no all-output transaction or cleanup guarantee is asserted.
- Keep the existing JSON/report serializer: tests confirmed sorted records, stable line endings, final newlines, no run timestamps/temporary paths, and identical bytes across independent destinations.

## Deviations from Plan

None - plan executed as specified. Task 2 confirmed the serializer already met its criteria, so no unnecessary production formatting changes were introduced.

## Issues Encountered

- The initial RED traversal test demonstrated that the prior CLI accepted the path and wrote test outputs under `src/data`; the exact temporary output directories were removed. The corrected test now verifies rejection before directory creation.
- The existing preset snapshot helper covered only `stocks.json` and `indices.json`; the RED test exposed the omitted `sp500.json`. The helper now snapshots every file in `src/data/presets`.

## User Setup Required

None - no external service configuration required.

## TDD Evidence

- **Task 1 RED:** `lexical traversal in output paths is rejected before directory creation` failed on the intended status assertion because the CLI accepted traversal and created candidate/report files. The classifier returned `RED_EVIDENCE_OK`; the implementation then rejects traversal and the test passes.
- **Task 1 GREEN:** `npm run test:refresh-dry-run` passed 43/43 after filesystem hardening; the later full suite passed 47/47.
- **Task 2 RED:** `preset byte snapshots include every preset file` failed because the helper returned only two unnamed base64 values while the preset directory contained three files. The classifier returned `RED_EVIDENCE_OK`.
- **Task 2 GREEN:** The snapshot helper now enumerates filenames and bytes for every preset file; all deterministic and non-mutation tests pass. No production serializer change was necessary because the existing implementation already satisfied the verified byte contract.

## Next Phase Readiness

- Phase 2 has no remaining plans and is ready for phase-level verification and regression gates.
- The dry-run remains separate from apply, provider fetching, raw-price calculation, and browser custom-data storage; Phase 3 still owns apply and maintenance procedures.

## Self-Check: PASSED

- `npm run test:refresh-identify` passed (11/11).
- `node --test test/maintenance/historical-returns/schema-contract.test.mjs` passed (203/203).
- `npm run test:refresh-dry-run` passed (47/47).
- `node --check` passed for the CLI and test file; scoped `git diff --check` passed.
- Test assertions cover additions, removals, changes, blocking errors, warnings, deterministic artifacts, output-path attacks/collisions, and exact preset-byte preservation.

---
*Phase: 02-deterministic-validation-dry-run-diff*
*Completed: 2026-10-06*
