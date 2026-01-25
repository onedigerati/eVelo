---
phase: 23
plan: 02
subsystem: simulation-engine
tags: [regime-switching, markov-model, market-regimes, monte-carlo]

dependencies:
  requires: []
  provides:
    - 4-regime market model (bull, bear, crash, recovery)
    - Updated transition matrices for historical and conservative modes
    - Recovery regime detection and classification
  affects:
    - 23-03 (will use 4-regime transitions)
    - 23-04 (will use recovery regime parameters)

tech-stack:
  added: []
  patterns:
    - 4-state Markov chain for regime transitions
    - Recovery state detection in historical classification

key-files:
  created: []
  modified:
    - src/simulation/types.ts
    - src/simulation/regime-switching.ts
    - src/simulation/regime-calibration.ts

decisions:
  - decision: "Use 4-regime system with recovery state"
    rationale: "Reference application shows recovery regime captures post-crash rebound dynamics more accurately than 3-regime model"
    impact: "More realistic simulation of market transitions after crashes"

  - decision: "Recovery regime transitions primarily to bull (80%)"
    rationale: "Historical data shows markets typically return to normal bull conditions after recovery period"
    impact: "Models typical V-shaped recovery pattern following crashes"

  - decision: "Crashes transition to recovery (70%) rather than directly to bull"
    rationale: "Post-crash periods typically have elevated volatility even with positive returns"
    impact: "Captures the turbulent recovery period following market crashes"

metrics:
  duration: 297 seconds
  completed: 2026-01-25
---

# Phase 23 Plan 02: 4-Regime System with Recovery State Summary

**One-liner:** Extended regime-switching model from 3 regimes (bull/bear/crash) to 4 regimes including recovery state for accurate post-crash dynamics

## What Was Built

Implemented a 4-regime market model that includes a recovery state between crashes and normal bull markets. This aligns with the reference application's methodology and more accurately captures real market behavior following crashes.

### Key Changes

1. **MarketRegime Type Extension**
   - Added 'recovery' to MarketRegime union type
   - Updated TransitionMatrix interface for 4x4 transitions
   - Added recovery row and column to all regime transitions

2. **Default Transition Matrices**
   - Updated DEFAULT_TRANSITION_MATRIX for 4-regime historical mode
   - Added CONSERVATIVE_TRANSITION_MATRIX for stress testing
   - All matrix rows sum to 1.0 (validated)

3. **Regime Parameters**
   - Added recovery regime parameters: mean 0.20 (20%), stddev 0.25 (25%)
   - Recovery has strong positive returns but high volatility
   - Updated all regime-related types and functions

4. **Regime Classification**
   - Enhanced classifyRegimes to detect recovery periods
   - Recovery identified by positive returns following crash/bear periods
   - Also includes 70th-85th percentile returns (strong rebounds)

5. **Validation Function**
   - Added validateTransitionMatrix helper
   - Checks non-negative probabilities
   - Verifies each row sums to 1.0 within tolerance

## Transition Matrix Design

### DEFAULT_TRANSITION_MATRIX (Historical Mode)
- **Bull → Bull:** 96.5% (persistent, stable markets)
- **Bear → Recovery:** 3% (gradual exits from downturns)
- **Crash → Recovery:** 70% (typical post-crash pattern)
- **Recovery → Bull:** 80% (return to normal conditions)

### CONSERVATIVE_TRANSITION_MATRIX (Stress Testing)
- Lower bull persistence (94% vs 96.5%)
- Higher bear persistence (94% vs 92%)
- Higher crash probability from all states
- Slower recovery to bull (70% vs 80%)

## Recovery Regime Characteristics

**Mean Return:** 20% annualized
- Higher than normal bull markets (12%)
- Reflects strong rebounds following crashes
- Based on historical V-shaped recovery patterns

**Volatility:** 25% standard deviation
- Higher than bull markets (12%)
- Lower than crashes (35%)
- Captures elevated uncertainty during recovery

**Transition Behavior:**
- Primarily transitions to bull (80%)
- Can fall back to bear/crash (10% total)
- Some persistence to stay in recovery (10%)

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 23-03:** Export transition matrices and regime constants
- DEFAULT_TRANSITION_MATRIX is ready for export
- CONSERVATIVE_TRANSITION_MATRIX is ready for export
- All regimes include recovery state

**Ready for 23-04:** Regime parameter validation and calibration
- Recovery regime included in calibration
- Classification detects recovery periods
- Conservative adjustment includes recovery

**No blockers:** Build succeeds, all tests pass

## Technical Notes

### Row Sum Validation
All transition matrix rows sum to 1.0:
- DEFAULT bull/bear/crash/recovery: ✓
- CONSERVATIVE bull/bear/crash/recovery: ✓

### Recovery Detection Algorithm
```typescript
// Recovery is detected when:
1. Return >= 70th percentile (strong positive), OR
2. Positive return following negative period
```

This captures both:
- Strong rebounds (high percentile returns)
- Transitional periods (first positive year after downturn)

### Conservative Adjustments for Recovery
- Mean reduced by 2pp (20% → 18%)
- Volatility increased by 20% (25% → 30%)
- Matches stress-testing approach for other regimes

## Commits

| Commit | Message | Files |
|--------|---------|-------|
| c583fb5 | feat(23-02): extend MarketRegime type to 4-regime system with recovery | src/simulation/types.ts |
| fabefca | feat(23-02): update regime-calibration for recovery regime | src/simulation/regime-calibration.ts |

Note: regime-switching.ts updates were included in first commit.

## Files Modified

**src/simulation/types.ts**
- Extended MarketRegime type to include 'recovery'
- Updated TransitionMatrix interface for 4x4 transitions
- Added DEFAULT_TRANSITION_MATRIX with recovery transitions
- Added CONSERVATIVE_TRANSITION_MATRIX for stress testing
- Updated DEFAULT_REGIME_PARAMS to include recovery parameters
- Updated SBLOCDebugStats interface to include recovery in regime parameters

**src/simulation/regime-switching.ts**
- Updated nextRegime function for 4-state cumulative probability selection
- Added validateTransitionMatrix helper function

**src/simulation/regime-calibration.ts**
- Updated ClassifiedReturns interface to include recovery array
- Updated classifyRegimes to detect recovery periods
- Updated estimateRegimeParams to include recovery parameters
- Updated calculatePortfolioRegimeParams to iterate over 4 regimes
- Updated applyConservativeAdjustment to include recovery adjustments

## Verification

- [x] Build succeeds: `npm run build` ✓
- [x] All tests pass: `npm run test` ✓ (66/66 tests passed)
- [x] MarketRegime includes 'recovery'
- [x] TransitionMatrix has 4x4 structure
- [x] DEFAULT_TRANSITION_MATRIX rows sum to 1.0
- [x] CONSERVATIVE_TRANSITION_MATRIX rows sum to 1.0
- [x] Regime classification detects recovery periods
- [x] Recovery parameters included in all regime functions
