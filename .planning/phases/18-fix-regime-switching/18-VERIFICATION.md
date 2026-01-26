---
phase: 18-fix-regime-switching
verified: 2026-01-24T22:30:00Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: "Preset data year labels correctly represent 1995-2025 historical period in all code comments"
    status: failed
    reason: "Preset data files have correct year labels (1995-2025), but preset-service.ts comments still reference outdated years (2025-2055)"
    artifacts:
      - path: "src/data/services/preset-service.ts"
        issue: "Lines 8 and 49 still say '2025-2055' instead of '1995-2025'"
    missing:
      - "Update comment on line 8 from '2025-2055' to '1995-2025'"
      - "Update comment on line 49 from '2025-2055' to '1995-2025'"
---

# Phase 18: Fix Regime-Switching Model Verification Report

**Phase Goal:** Make regime-switching model use asset-specific historical data and implement calibration modes
**Verified:** 2026-01-24T22:30:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Regime-switching derives params from asset historical returns | VERIFIED | monte-carlo.ts lines 100-112 calibrate per-asset |
| 2 | Historical mode uses actual historical regime parameters | VERIFIED | calibrateRegimeModelWithMode returns historicalParams |
| 3 | Conservative mode uses more pessimistic parameters | VERIFIED | applyConservativeAdjustment reduces means +15-25% stddev |
| 4 | Preset data year labels corrected (1995-2025) | FAILED | Data files correct but comments say 2025-2055 |
| 5 | CAGR values reflect actual portfolio characteristics | VERIFIED | assetRegimeParams from historicalReturns |
| 6 | regimeCalibration config parameter is actually used | VERIFIED | config.regimeCalibration passed to calibration |

**Score:** 5/6 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| monte-carlo.ts | Calibration wiring | VERIFIED | Imports, calls calibrateRegimeModelWithMode |
| regime-switching.ts | Asset-specific params | VERIFIED | assetRegimeParams parameter implemented |
| regime-calibration.ts | Calibration functions | VERIFIED | All exports present and functional |
| stocks.json | Corrected year labels | VERIFIED | startDate 1995-01-01, dates 1995-2025 |
| preset-service.ts | Documentation | STUB | Comments still reference 2025-2055 |

### Key Link Verification

All key links WIRED:
- monte-carlo imports and calls calibrateRegimeModelWithMode
- assetRegimeParams passed through to generateCorrelatedRegimeReturns
- Conservative mode routes to applyConservativeAdjustment
- Asset-specific parameters used in return generation

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| preset-service.ts | 8, 49 | Outdated year comments | WARNING | Documentation inconsistency |
| monte-carlo.ts | 97-110 | console.log statements | INFO | Intentional verification logging |

### Gaps Summary

**1 documentation gap found:**

Preset data files were correctly updated to 1995-2025 in plan 18-01, but comments in preset-service.ts were not updated.

Impact: Low - actual data is correct, only documentation is inconsistent.

Fix: Update lines 8 and 49 in preset-service.ts to reference "1995-2025" instead of "2025-2055".
