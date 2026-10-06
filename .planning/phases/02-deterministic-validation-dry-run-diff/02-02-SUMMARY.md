---
phase: 02-deterministic-validation-dry-run-diff
plan: 02
subsystem: testing
tags: [node, csv, json-schema, validation, diagnostics]

# Dependency graph
requires:
  - phase: 01-source-contract-review-governance
    provides: Canonical reviewed-source schemas and identity-only input contract
provides:
  - Strict non-mutating source and manifest validation for CSV and JSON
  - Stable aggregate blocking diagnostics and nonblocking outlier warnings
affects: [02-03, 02-04, historical-returns-maintenance]

# Actuals
actuals:
  tokens: 15836
  tasks: 2
  commits: 3

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Validate explicit CSV/JSON input against the canonical closed schemas without coercion or normalization."
    - "Sort row-aware diagnostics by source, row, symbol, numeric year, field, and code before reporting."
    - "Write a report but no candidate JSON when any blocking diagnostic exists."

key-files:
  created: []
  modified:
    - scripts/maintenance/historical-returns/dry-run.mjs
    - test/maintenance/historical-returns/dry-run.test.mjs

key-decisions:
  - "Treat schema and semantic violations as blocking independently from the existing strict -0.9 and 3.0 outlier-warning thresholds."
  - "Reject current and future UTC calendar years; only completed annual periods may proceed."
  - "Keep validation diagnostics path-independent and deterministic for stable review output."

patterns-established:
  - "Use Papa Parse only for CSV tokenization; validate exact headers and raw field values in the maintenance CLI."
  - "Scan source and manifest JSON for duplicate keys before parsing, then continue independent validation when a parsed object is available."

requirements-completed: [DATAREF-04]
coverage:
  - id: D1
    description: "Strict CSV/JSON source and review-manifest contracts reject malformed, duplicate, ambiguous, and schema-invalid input without normalization."
    requirement: DATAREF-04
    verification:
      - kind: integration
        ref: "npm run test:refresh-dry-run — strict source, manifest, and CSV parser cases"
        status: pass
      - kind: unit
        ref: "node --test test/maintenance/historical-returns/schema-contract.test.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Independent validation errors are reported in stable order, blockers suppress candidate files, and warning-only outliers retain successful candidates."
    requirement: DATAREF-04
    verification:
      - kind: integration
        ref: "npm run test:refresh-dry-run — aggregate diagnostics, warning boundaries, and year cutoff"
        status: pass
    human_judgment: false

# Metrics
duration: 8min
completed: 2026-10-06
status: complete
---

# Phase 2 Plan 2: Strict Validation and Aggregate Diagnostics Summary

**The dry-run CLI now validates reviewed CSV/JSON inputs against closed source and manifest contracts, aggregates deterministic diagnostics, and gates candidates on blocking errors.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-10-06T13:13:04Z
- **Completed:** 2026-10-06T13:21:22Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added exact CSV header/row checks, raw-value validation, JSON duplicate-key scanning, and non-mutating source and manifest shape checks aligned with the canonical schemas.
- Added row-aware diagnostics for duplicate symbols/periods, inconsistent CSV metadata, invalid years/returns, current-year records, and malformed provenance.
- Blocking runs now write a Markdown report without candidate JSON; warnings below -0.9 or above 3.0 remain nonblocking, with exact threshold values accepted without warnings.

## Task Commits

Each task was committed atomically:

1. **Task 1: Enforce strict CSV/JSON parsing and source/manifest shape contracts** - `b61b33f` (RED tests), `61000b4` (implementation)
2. **Task 2: Aggregate semantic diagnostics and preserve warning-only success** - `9115782` (implementation and focused regression coverage)

## Files Created/Modified

- `scripts/maintenance/historical-returns/dry-run.mjs` - Strict parser, contract validation, diagnostic collection/rendering, completed-year and warning checks, and fail-closed report behavior.
- `test/maintenance/historical-returns/dry-run.test.mjs` - Runtime validation, duplicate-key, deterministic diagnostics, warning threshold, and year-cutoff regression coverage.

## Decisions Made

- Kept CSV tokenization separate from validation and preserved the source literals rather than applying importer normalization.
- Applied the existing app thresholds as warnings only; values below a total loss and all other contract violations remain blocking.
- Used a stable, locale-independent sort tuple: source basename, row, symbol, numeric year, field, then diagnostic code.

## Deviations from Plan

None - plan executed as written.

## Issues Encountered

- The first aggregate-order assertion included warning rows while checking the blocking section; the test was corrected to assert each report section independently.
- A null manifest root initially escaped the non-object guard; a regression test exposed it and the CLI now reports it as a blocking manifest-root error.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Strict parsing and fail-closed validation are complete; Plan 02-03 can add complete/subset coverage comparison, asset/period diffs, and explicit new-symbol partition routing.
- Phase 1 identity behavior remains separate and passed its regression suite.

## Self-Check: PASSED

- Plan task verification: focused dry-run tests passed (28/28).
- Canonical schema contract tests passed (198/198); Phase 1 identity regression tests passed (11/11).
- The acceptance criteria were exercised for strict raw CSV handling, closed source/manifest contracts, duplicate keys in both JSON inputs, stable contextual diagnostics, blocker-only reports, warning-only candidates, and the UTC completed-year cutoff.
- The implementation and test files listed above exist; no dependency was added.

---
*Phase: 02-deterministic-validation-dry-run-diff*
*Completed: 2026-10-06*
