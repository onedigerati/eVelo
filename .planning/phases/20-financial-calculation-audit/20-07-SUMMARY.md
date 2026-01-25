---
phase: 20-financial-calculation-audit
plan: 07
subsystem: sbloc-engine
tags: [liquidation, ltv, configuration, margin-call]

dependency-graph:
  requires: ["20-01"]
  provides: ["Configurable liquidation target LTV multiplier"]
  affects: ["SBLOC simulation accuracy", "margin call behavior"]

tech-stack:
  patterns: ["Optional config with fallback", "Input validation with warning"]

key-files:
  modified:
    - src/sbloc/types.ts
    - src/sbloc/liquidation.ts

decisions:
  - id: "20-07-01"
    decision: "Default multiplier is 0.8 (80% of maintenance margin)"
    rationale: "Provides 20% buffer below maintenance to reduce repeat margin calls"
  - id: "20-07-02"
    decision: "Validate multiplier range as (0, 1]"
    rationale: "Multiplier > 1 would target above maintenance margin (counterproductive); <= 0 is invalid"
  - id: "20-07-03"
    decision: "Invalid multiplier triggers warning and fallback to 0.8"
    rationale: "Graceful degradation - simulation continues rather than failing"

metrics:
  duration: "2 min"
  completed: "2026-01-25"
---

# Phase 20 Plan 07: Liquidation Target LTV Configurable Summary

**One-liner:** Configurable liquidationTargetMultiplier (default 0.8) controls post-margin-call LTV target with validation.

## What Was Done

### Task 1: Add liquidationTargetMultiplier to SBLOCConfig
- Added optional `liquidationTargetMultiplier` field to `SBLOCConfig` interface
- Comprehensive JSDoc documentation explaining the formula and typical values:
  - Conservative (0.7-0.8): 30-40% buffer below maintenance
  - Moderate (0.85-0.90): 10-15% buffer
  - Aggressive (0.95+): Minimal buffer, risky
- Added default value `0.8` to `DEFAULT_SBLOC_CONFIG`

### Task 2: Update Liquidation Logic
- Updated `calculateLiquidationAmount` to use `config.liquidationTargetMultiplier ?? 0.8`
- Added validation: multiplier must be > 0 and <= 1
- Invalid values trigger console warning and fallback to 0.8
- Updated module header and function documentation to reflect configurable behavior

## Key Files Modified

| File | Change |
|------|--------|
| `src/sbloc/types.ts` | Added `liquidationTargetMultiplier` to `SBLOCConfig` and `DEFAULT_SBLOC_CONFIG` |
| `src/sbloc/liquidation.ts` | Use configurable multiplier with validation; enhanced documentation |

## Verification

- `npx tsc --noEmit` passes
- Default behavior unchanged (0.8 multiplier)
- Invalid multiplier (e.g., 1.5) triggers warning and uses default

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| 7139171 | feat(20-07): add liquidationTargetMultiplier to SBLOCConfig |
| 9f57cc4 | feat(20-07): use configurable liquidationTargetMultiplier in liquidation logic |
