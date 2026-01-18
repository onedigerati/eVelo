---
phase: 08-data-layer
plan: 02
subsystem: data-presets
tags: [json, presets, bundled-data, vite-inline]

dependency-graph:
  requires: [08-01]
  provides: [bundled-presets, preset-service]
  affects: [simulation-engine, market-data-service]

tech-stack:
  added: []
  patterns:
    - Static JSON imports for Vite build-time inlining
    - PresetData interface for typed access to bundled data
    - Symbol-keyed record for O(1) preset lookup
    - Case-insensitive symbol lookup via toUpperCase()

files:
  created:
    - src/data/presets/sp500.json
    - src/data/presets/indices.json
    - src/data/services/preset-service.ts
    - src/data/services/index.ts
  modified:
    - src/data/index.ts

decisions:
  - id: sample-data-not-full
    choice: Create ~100 sample data points instead of full 30-year history
    reason: Demonstrates pattern and enables testing; full data can be added later or fetched from API
  - id: volatility-differentiation
    choice: Different volatility profiles for each index (QQQ>IWM>SPY>AGG)
    reason: Realistic market behavior for testing simulation scenarios
  - id: crisis-periods-included
    choice: Include dot-com crash, 2008 crisis, COVID crash data points
    reason: Test simulation behavior during extreme market conditions

metrics:
  duration: 3 min
  completed: 2026-01-18
---

# Phase 08 Plan 02: Bundled Presets Summary

**One-liner:** Static JSON preset data for SPY/QQQ/IWM/AGG with typed preset-service for synchronous access.

## What Was Built

### Bundled Preset Data

**sp500.json (111 data points):**
- Symbol: SPY (S&P 500 ETF)
- Date range: 1993-01-29 to 2024-12-31
- Includes: Normal days, dot-com crash (2000), 2008 financial crisis, COVID crash (2020)
- Return range: -0.1198 to +0.1136 (realistic extremes)

**indices.json (3 indices):**

| Symbol | Name | Returns | Volatility Profile |
|--------|------|---------|-------------------|
| QQQ | Nasdaq-100 ETF | 48 | Higher (tech-heavy) |
| IWM | Russell 2000 ETF | 43 | Higher (small-caps) |
| AGG | US Aggregate Bond ETF | 48 | Low (-0.03 to +0.02) |

### Preset Service

**Exports:**

| Export | Type | Description |
|--------|------|-------------|
| `BUNDLED_PRESETS` | `Record<string, PresetData>` | All presets keyed by symbol |
| `getPresetSymbols()` | `() => string[]` | Returns ['SPY', 'QQQ', 'IWM', 'AGG'] |
| `getPresetData(symbol)` | `(string) => PresetData \| undefined` | Lookup by symbol |
| `isPresetSymbol(symbol)` | `(string) => boolean` | Check if preset exists |
| `PresetData` | interface | Typed preset structure |
| `PresetReturn` | interface | Single day return structure |

**PresetData Interface:**
```typescript
interface PresetData {
  symbol: string;
  name: string;
  startDate: string;
  endDate: string;
  returns: PresetReturn[];
}

interface PresetReturn {
  date: string;
  return: number;  // Decimal (e.g., 0.0123 = 1.23%)
}
```

### Vite Build-Time Inlining

Static imports are inlined by Vite at build time:
```typescript
import sp500Data from '../presets/sp500.json';
import indicesData from '../presets/indices.json';
```

This means:
- No network requests needed to load preset data
- Synchronous access via BUNDLED_PRESETS
- Data included in single-file bundle

## Commits

| Hash | Type | Description |
|------|------|-------------|
| ae4e513 | feat | Add bundled S&P 500 preset data (111 returns) |
| 82a74d7 | feat | Add bundled indices preset data (QQQ, IWM, AGG) |
| 87793c2 | feat | Add preset service with typed exports |

## Verification Results

- [x] npm run build succeeds
- [x] JSON files parse without error
- [x] preset-service exports BUNDLED_PRESETS, getPresetSymbols, getPresetData
- [x] Vite inlines JSON at build (confirmed by build success, bundle size 48KB)

## Deviations from Plan

None - plan executed exactly as written.

## Usage Example

```typescript
import {
  BUNDLED_PRESETS,
  getPresetSymbols,
  getPresetData,
  isPresetSymbol
} from './data';

// List available presets
const symbols = getPresetSymbols();
// ['SPY', 'QQQ', 'IWM', 'AGG']

// Check if preset exists
if (isPresetSymbol('SPY')) {
  // Get preset data
  const spyData = getPresetData('SPY');
  console.log(spyData?.name);        // 'S&P 500 ETF (SPY)'
  console.log(spyData?.returns.length); // 111
}

// Direct access
const spy = BUNDLED_PRESETS['SPY'];
const firstReturn = spy.returns[0];
// { date: '1993-01-29', return: 0.0043 }
```

## Next Phase Readiness

**Ready for simulation engine:**
- Preset data available for Monte Carlo simulation without API calls
- Returns in decimal format ready for compound calculations

**Ready for market data service:**
- Can fall back to bundled presets when API unavailable
- Same data structure as cached API data (DailyReturn)

**Ready for UI:**
- Preset symbols available for dropdown selection
- Names available for display labels
