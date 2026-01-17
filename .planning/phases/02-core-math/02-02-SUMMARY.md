---
phase: 02-core-math
plan: 02
subsystem: math
tags: [correlation, cholesky, distributions, monte-carlo, box-muller]

# Dependency graph
requires:
  - phase: 02-01
    provides: Statistical functions (mean, stddev), precision utilities (sum, round, EPSILON)
provides:
  - Pearson correlation calculation
  - Correlation matrix generation
  - Cholesky decomposition for correlated sampling
  - Normal and lognormal random generators
  - Correlated sample generation for multi-asset simulation
affects: [03-simulation-engine, monte-carlo-returns, asset-correlation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Box-Muller transform for normal distribution sampling
    - Cholesky decomposition for correlated random generation
    - Matrix-vector multiplication for correlation application

key-files:
  created:
    - src/math/correlation.ts
    - src/math/distributions.ts
    - src/math/index.ts
  modified: []

key-decisions:
  - "Clamp correlation to [-1, 1] to handle floating point edge cases"
  - "Return null from Cholesky when matrix is not positive-definite"
  - "Use Cholesky-Banachiewicz algorithm (column-major) for decomposition"

patterns-established:
  - "Correlation calculation: Use sample stddev (N-1) for consistency"
  - "Correlated sampling: Cholesky factor L transforms uncorrelated Z to correlated Y = L*Z"
  - "Math module: Import from src/math barrel export for clean API"

# Metrics
duration: 2min
completed: 2026-01-17
---

# Phase 2 Plan 2: Correlation and Distributions Summary

**Correlation calculation, Cholesky decomposition, and Box-Muller normal sampling for correlated multi-asset Monte Carlo returns**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-17T22:20:31Z
- **Completed:** 2026-01-17T22:22:19Z
- **Tasks:** 3
- **Files created:** 3

## Accomplishments
- Pearson correlation coefficient with input validation and clamping
- Symmetric correlation matrix generation from asset return arrays
- Cholesky decomposition with positive-definite validation
- Box-Muller transform for standard and shifted normal distributions
- Lognormal distribution for always-positive asset prices
- Correlated sample generation preserving correlation structure
- Unified math module barrel export for clean imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create correlation functions** - `74ba09f` (feat)
2. **Task 2: Create distribution sampling functions** - `d5d5dfe` (feat)
3. **Task 3: Create math module barrel export** - `f20df2e` (feat)

## Files Created
- `src/math/correlation.ts` - pearsonCorrelation, correlationMatrix, choleskyDecomposition
- `src/math/distributions.ts` - normalRandom, lognormalRandom, correlatedSamples
- `src/math/index.ts` - Barrel export for entire math module

## Decisions Made
- **Clamping correlation values:** Edge cases in floating point arithmetic can produce values slightly outside [-1, 1]; clamping ensures valid output
- **Null return for invalid Cholesky:** Rather than throwing, return null to allow caller to handle gracefully (e.g., fall back to identity matrix)
- **EPSILON tolerance in Cholesky:** Use EPSILON (1e-10) threshold for positive-definiteness check to handle near-zero diagonal values

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Requirements SIM-07 (correlated asset returns) and CALC-06 (Pearson correlation) foundations complete
- Math module provides complete API for Phase 3 simulation engine
- All functions exportable from single entry point: `import { correlatedSamples, mean } from '@/math'`

---
*Phase: 02-core-math*
*Completed: 2026-01-17*
