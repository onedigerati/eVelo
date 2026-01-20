---
phase: 11-complete-results-dashboard
plan: 12
subsystem: ui-components
tags: [recommendations, insights, considerations, risk-factors]
dependency-graph:
  requires: [11-07]
  provides: [recommendations-section, insight-generator]
  affects: []
tech-stack:
  added: []
  patterns: [insight-generation, collapsible-sections, severity-icons]
key-files:
  created:
    - src/utils/insight-generator.ts
    - src/utils/index.ts
    - src/components/ui/recommendations-section.ts
  modified:
    - src/components/ui/results-dashboard.ts
    - src/components/ui/index.ts
decisions:
  - key: insight-severity-types
    choice: warning/note/action/info types with colored icons
    rationale: Clear visual hierarchy matching reference screenshots
  - key: standard-considerations
    choice: 6 fixed risk factors always displayed
    rationale: Users should be aware of margin call, sequence, interest, behavioral, regulatory, liquidity risks
  - key: dynamic-thresholds
    choice: 15% margin call, 10% CAGR, 80% success rate thresholds
    rationale: Based on typical risk tolerance levels from reference material
metrics:
  duration: 6 min
  completed: 2026-01-20
---

# Phase 11 Plan 12: Recommendations Section Summary

Added recommendations section with actionable insights and standard considerations based on simulation results.

## One-Liner

Dynamic insight generator with 4 severity types (warning/note/action/info) plus 6 standard risk considerations always displayed.

## What Was Built

### 1. Insight Generator Utility (src/utils/insight-generator.ts)
- `generateInsights()` - Creates dynamic insights based on simulation data
- Insight types: warning (orange), note (blue), action (green), info (gray)
- Rules implemented:
  - Margin call prob > 15%: Warning with cash buffer recommendation
  - CAGR > 10%: Note about above-average growth assumption
  - Success rate < 80%: Warning about success probability
  - High LTV utilization: Warning about credit utilization
  - Regime switching: Info about return model

### 2. Standard Considerations (generateConsiderations)
Six risk factors always displayed:
1. Margin Call Risk - Dynamic value from simulation
2. Sequence of Returns Risk - Static warning
3. Interest Rate Sensitivity - Dynamic based on configured rate
4. Behavioral Factors - Static note
5. Regulatory Risk - Static note
6. Liquidity Constraints - Action with cash reserve recommendation

### 3. RecommendationsSection Component (src/components/ui/recommendations-section.ts)
- Collapsible considerations section
- Insight cards with colored left border accent
- Count badge showing number of insights
- "Action:" line for actionable recommendations
- Mobile responsive layout
- XSS prevention via escapeHtml

### 4. Dashboard Integration (src/components/ui/results-dashboard.ts)
- Added `updateRecommendationsSection()` method
- Generates insights from simulation statistics and CAGR
- Generates considerations with margin call prob and interest rate
- Section placed after visual comparison charts

## Key Technical Decisions

1. **Insight Severity System**: Four types (warning/note/action/info) matching reference UI screenshots
2. **Threshold Configuration**: Configurable via InsightConfig interface with sensible defaults
3. **Standard Considerations**: Always shown regardless of simulation results for user awareness
4. **Collapsible UI**: Considerations section expandable/collapsible to reduce visual clutter

## Commits

| Hash | Message |
|------|---------|
| ffcf24c | feat(11-12): add insight generator utility |
| 55bb2e4 | feat(11-12): add RecommendationsSection web component |
| fe0d324 | feat(11-12): integrate recommendations section into results dashboard |
| e4b98cb | feat(11-12): export RecommendationsSection from UI components barrel |

## Verification Checklist

- [x] `npm run build` succeeds
- [x] Insights generated based on simulation data
- [x] Warning shown when margin call prob high (>15%)
- [x] All 6 considerations displayed
- [x] Icons and colors match severity
- [x] Mobile responsive (flexbox layout stacks on mobile)

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

```
src/utils/insight-generator.ts (created) - 344 lines
src/utils/index.ts (created) - 17 lines
src/components/ui/recommendations-section.ts (created) - 550 lines
src/components/ui/results-dashboard.ts (modified) - +112 lines
src/components/ui/index.ts (modified) - +4 lines
```

## Next Phase Readiness

Plan 12 completes the recommendations functionality. Ready for Plan 13 (final plan in phase 11).
