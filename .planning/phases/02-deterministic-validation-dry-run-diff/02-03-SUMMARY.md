---
phase: 02-deterministic-validation-dry-run-diff
plan: 03
subsystem: testing
tags: [node, csv, json-schema, coverage, diff, presets]

# Dependency graph
requires:
  - phase: 02-deterministic-validation-dry-run-diff
    provides: Strict reviewed-source and manifest validation with deterministic diagnostics
provides:
  - Exact complete-baseline and declared-subset coverage comparison
  - Reviewed explicit routing for genuinely new symbols
  - Complete deterministic asset, period, and metadata diffs with full preset candidates
affects: [02-04, phase-03-gated-apply, historical-returns-maintenance]

# Actuals
actuals:
  tokens: 8063
  tasks: 3
  commits: 6

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Compare annual coverage by exact symbol/year identity; never merge adjacent years or fill omitted periods."
    - "Require a manifest partition route only for a symbol absent from both physical preset files."
    - "Build subset candidates by cloning complete partitions and overlaying only reviewed in-scope assets."
    - "Render deterministically sorted asset, period, and metadata sections with explicit before/after values."

key-files:
  created: []
  modified:
    - scripts/maintenance/historical-returns/dry-run.mjs
    - test/maintenance/historical-returns/dry-run.test.mjs
    - docs/maintenance/historical-returns/schemas/annual-return-review-manifest.schema.json
    - test/maintenance/historical-returns/schema-contract.test.mjs
    - docs/maintenance/historical-returns/source-contract.md

key-decisions:
  - "Complete mode blocks any missing bundled symbol or previously covered symbol/year pair; subset mode checks exact declared/source symbol and year sets."
  - "Only a reviewed newSymbolPartitions entry may place a genuinely new asset; known memberships, including QQQ in both files, remain authoritative."
  - "Reviewed metadata is preserved literally, and all out-of-scope baseline objects remain unchanged in full merged subset candidates."
  - "Report asset, period, and metadata deltas in separate deterministic sections; removals remain blocking."

patterns-established:
  - "Validate optional symbol-keyed partition maps with a closed value vocabulary and cross-check every route against source and both baseline files."
  - "Use own-property-safe candidate insertion and baseline lookup for arbitrary reviewed symbol keys."

requirements-completed: [DATAREF-05, DATAREF-06]
coverage:
  - id: D1
    description: "Complete and subset coverage use exact symbol/year sets, with explicit reviewed partition routing for new symbols and blocking stale or missing routes."
    requirement: DATAREF-05
    verification:
      - kind: integration
        ref: "npm run test:refresh-dry-run — complete/subset coverage, removals, explicit routes, and route failures"
        status: pass
      - kind: unit
        ref: "node --test test/maintenance/historical-returns/schema-contract.test.mjs"
        status: pass
    human_judgment: false
  - id: D2
    description: "Full merged candidates and deterministic reports expose added, removed, and changed assets, periods, and literal metadata while preserving untouched preset records."
    requirement: DATAREF-06
    verification:
      - kind: integration
        ref: "npm run test:refresh-dry-run — candidate merging, full diff sections, metadata literals, and QQQ parity"
        status: pass
    human_judgment: false

# Metrics
duration: 9min
completed: 2026-10-06
status: complete
---

# Phase 2 Plan 3: Coverage, Routing, and Full Diff Summary

**Dry runs now compare reviewed data against both physical preset partitions, require an explicit manifest destination for every new symbol, and produce complete diffs with full merged candidates.**

## Performance

- **Duration:** 9 min
- **Started:** 2026-10-06T13:23:33Z
- **Completed:** 2026-10-06T13:32:16Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Complete mode now blocks removed baseline assets and previously covered periods; subset mode preserves unselected baseline data and relies on exact manifest/source symbol and year equality.
- Added optional `newSymbolPartitions` manifest routing, constrained to `stocks.json` or `indices.json`; missing, stale, existing-symbol, and source-absent routes block candidate output.
- Reports separate added/removed/changed assets, periods, and metadata with before/after values; candidates retain existing memberships, merge full subsets, and keep duplicate QQQ entries equal.

## Task Commits

Each task was committed atomically:

1. **Task 1: Enforce complete-baseline and explicit subset scope equality** - `a038a33` (RED tests), `76a019e` (implementation)
2. **Task 2: Add reviewed manifest routing for genuinely new symbols** - `e3358c2` (RED tests), `9ee874d` (implementation)
3. **Task 3: Render complete asset, period, and metadata diffs into full merged candidates** - `3a19ee6` (RED tests), `888f1d1` (implementation)

## Files Created/Modified

- `scripts/maintenance/historical-returns/dry-run.mjs` - Exact baseline coverage analysis, route checks, candidate merging, and structured deterministic diffs.
- `test/maintenance/historical-returns/dry-run.test.mjs` - Complete/subset coverage, removals, routing, safe symbol-key serialization, full diffs, literal metadata, and QQQ parity coverage.
- `docs/maintenance/historical-returns/schemas/annual-return-review-manifest.schema.json` - Optional reviewed new-symbol destination map.
- `test/maintenance/historical-returns/schema-contract.test.mjs` - Valid and invalid partition-map contract fixtures.
- `docs/maintenance/historical-returns/source-contract.md` - Routing decision and exact runtime semantics.

## Decisions Made

- A complete input must account for every physical baseline symbol and every previously covered year; no missing period is inferred or synthesized.
- Subset input affects only declared source assets and periods, while emitted candidate files remain complete preset-shaped files.
- Existing physical partition placement is authoritative. `assetClass` never determines the destination of a new symbol.
- Diff records and output sections use code-point symbol ordering and numeric year ordering for stable review output.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Protect arbitrary symbol keys from prototype behavior**
- **Found during:** Task 2 (new-symbol routing)
- **Issue:** A valid `__proto__` symbol could mutate a candidate object's prototype and trigger an inherited-property lookup in report generation.
- **Fix:** Define new candidate symbols as own enumerable properties and use own-property checks when looking up baseline assets.
- **Files modified:** `scripts/maintenance/historical-returns/dry-run.mjs`, `test/maintenance/historical-returns/dry-run.test.mjs`
- **Verification:** The focused `__proto__` candidate serialization test passes with the full dry-run suite.
- **Committed in:** `9ee874d`

**Total deviations:** 1 auto-fixed (bug). **Impact:** Necessary to preserve data-only symbol keys and prevent incorrect routing/report failures; no scope expansion.

## Issues Encountered

- The initial complete-fixture assertion compared normalized source records with raw preset objects for duplicate QQQ membership; the test helper was corrected to deduplicate by symbol before the valid RED run.
- A repository-wide `git diff --check` also reports trailing whitespace in the unrelated pre-existing `vite.config.ts` change; checks scoped to Plan 02-03 files pass.

## User Setup Required

None - no external service configuration required.

## TDD Evidence

- Task 1 RED failed because missing baseline assets and periods produced successful candidates; its GREEN commit blocks those removals.
- Task 2 RED failed because the manifest contract rejected the route field and new symbols could not be routed; its GREEN commit adds schema, runtime, and documentation support.
- Task 3 RED failed because asset/period/metadata sections were absent; its GREEN commit renders the complete deterministic diff.

## Next Phase Readiness

- Plan 02-04 can now finish filesystem output hardening and deterministic repeat-run verification against the complete diff and full candidate shape.
- DATAREF-05 and DATAREF-06 remain shared with Plan 02-04; requirement readiness returned blocked, so they are not marked complete in project requirements yet.

## Self-Check: PASSED

- `npm run test:refresh-dry-run` passed (37/37).
- `node --test test/maintenance/historical-returns/schema-contract.test.mjs` passed (203/203).
- `node --check scripts/maintenance/historical-returns/dry-run.mjs` and the Plan 02-03-scoped `git diff --check` passed.
- Added, removed, changed, subset-preservation, explicit-routing, literal-metadata, and QQQ-equality outcomes are covered by the focused suite.

---
*Phase: 02-deterministic-validation-dry-run-diff*
*Completed: 2026-10-06*
