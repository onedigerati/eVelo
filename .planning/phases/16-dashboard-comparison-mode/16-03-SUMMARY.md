---
phase: 16
plan: 03
subsystem: ui-comparison
completed: 2026-01-23
duration: 6 min

requires:
  - phase: 16
    plan: 01
    provides: ["ComparisonMetrics", "delta-calculations"]

provides:
  - TradeOffSummary component with plain-language strategy assessment
  - Mobile-responsive tabbed interface for comparison dashboard
  - ARIA-compliant tab navigation with keyboard support
  - Delta metrics table for mobile comparison view

affects:
  - Mobile users can now effectively compare strategies on small screens
  - Trade-off summaries provide quick decision support

tech-stack:
  added: []
  patterns:
    - ARIA tab pattern (role=tablist, aria-selected, aria-controls, tabindex)
    - Responsive design (CSS media queries for mobile/desktop variants)
    - Keyboard navigation (ArrowLeft/ArrowRight for tab switching)
    - Plain-language insight generation

decisions:
  - id: mobile-tabs-pattern
    context: Mobile screens too narrow for side-by-side comparison
    decision: Use ARIA-compliant tabs (Previous/Current/Delta) instead of grid
    rationale: Tabs provide clear navigation, ARIA ensures accessibility
    date: 2026-01-23

  - id: trade-off-scoring
    context: Need objective assessment of which strategy is better
    decision: Score based on weighted metrics (final value=2, success rate=1, margin call=1, CAGR=1)
    rationale: Final value is most important outcome, other metrics provide risk context
    date: 2026-01-23

  - id: delta-tab-content
    context: Mobile delta tab needs to show comparison summary
    decision: Show delta-indicator grid + trade-off-summary component
    rationale: Indicators show numeric changes, summary provides plain-language interpretation
    date: 2026-01-23

key-files:
  created:
    - src/components/ui/trade-off-summary.ts: Plain-language comparison assessment (303 lines)
  modified:
    - src/components/ui/comparison-dashboard.ts: Added mobile tabs and delta table
    - src/components/ui/index.ts: Export TradeOffSummary
---

# Phase 16 Plan 03: Mobile Tabs & Trade-Off Summary

**One-liner:** ARIA-compliant mobile tabs with plain-language trade-off assessment for comparison dashboard

## What Was Built

### TradeOffSummary Component (Task 1)
- **Purpose:** Generate plain-language assessment of strategy comparison trade-offs
- **Scoring algorithm:**
  - Final value (median terminal value): +2 points for advantage
  - Success rate: +1 point for advantage
  - Margin call probability (lower is better): +1 point for advantage
  - CAGR: +1 point for advantage
- **Assessment states:** previous-better, current-better, similar
- **Output:**
  - Headline: Main takeaway (e.g., "Current strategy outperforms")
  - Key differences: Top 4 metric differences (sorted by magnitude)
  - Recommendation: Actionable suggestion based on assessment
- **Styling:**
  - Color-coded headlines (purple for previous, teal for current, gray for similar)
  - Bulleted difference list
  - Italic recommendation with border separator
- **Integration:** Property setters for metrics, previousName, currentName

### Mobile Tabs for ComparisonDashboard (Task 2)
- **Desktop behavior (>768px):** Side-by-side grid layout (unchanged from 16-02)
- **Mobile behavior (≤768px):** Three-tab interface
  - **Previous tab:** Shows previous-dashboard with preset name badge
  - **Current tab:** Shows current-dashboard with preset name badge
  - **Delta tab:** Shows delta metrics table + trade-off-summary
- **ARIA compliance:**
  - role="tablist" on tab container
  - role="tab" on buttons with aria-selected, aria-controls, tabindex
  - role="tabpanel" on content panels
- **Keyboard navigation:**
  - ArrowRight: Next tab
  - ArrowLeft: Previous tab
  - activateTab() manages aria-selected, tabindex, and panel visibility
- **Delta tab content:**
  - Grid of delta-indicators for key metrics (Final Value, Success Rate, CAGR, Margin Call Risk)
  - Trade-off-summary component below indicators
  - Populated with computeComparisonMetrics() data

## Technical Implementation

### Component Architecture
```
ComparisonDashboard
├── Desktop (>768px)
│   ├── comparison-grid (side-by-side panels)
│   │   ├── previous-dashboard
│   │   └── current-dashboard
│   └── delta-summary (placeholder)
└── Mobile (≤768px)
    ├── comparison-tabs (tablist)
    │   ├── tab-previous
    │   ├── tab-current
    │   └── tab-delta
    └── tab-panels
        ├── panel-previous (mobile-previous-dashboard)
        ├── panel-current (mobile-current-dashboard)
        └── panel-delta
            ├── delta-table (delta-indicators)
            └── trade-off-summary
```

### State Management
- **_activeTab:** Tracks current tab ('previous' | 'current' | 'delta')
- **setupTabNavigation():** Wires click and keyboard handlers
- **activateTab():** Updates ARIA attributes and panel visibility
- Mobile dashboards receive same data as desktop dashboards (parallel instances)

### Trade-Off Summary Algorithm
1. Calculate score difference based on metric improvements
2. Determine assessment (current-better, previous-better, similar)
3. Generate difference sentences with formatted values
4. Sort by magnitude, take top 4
5. Generate headline and recommendation based on assessment

## Verification Checklist

- [x] TradeOffSummary generates appropriate text based on metrics
- [x] Mobile tabs appear at ≤768px viewport (CSS media query)
- [x] Desktop grid appears at >768px viewport (comparison-grid)
- [x] Tab keyboard navigation works (ArrowLeft/ArrowRight implemented)
- [x] ARIA attributes correct (verified: role=tablist, aria-selected, aria-controls, tabindex)
- [x] Delta panel shows metrics table and trade-off summary
- [x] TypeScript compiles without errors (npx tsc --noEmit passed)

## Success Criteria Met

✅ TradeOffSummary displays headline, differences, and recommendation
✅ Mobile view shows tabs instead of side-by-side panels
✅ Keyboard navigation between tabs works
✅ Screen readers can navigate comparison (ARIA compliant)
✅ Delta tab shows metric comparisons and trade-off summary

## Deviations from Plan

None - plan executed exactly as written. Plan 16-02 had already created the base comparison-dashboard.ts and delta-indicator.ts files, so Task 2 focused on editing the existing file to add mobile tabs (as expected per plan context note).

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | abc6e39 | feat(16-03): create TradeOffSummary component |
| 2 | 7f29bf4 | feat(16-03): add mobile tabs to ComparisonDashboard |

## Next Phase Readiness

**Ready for:** Plan 16-04 (if exists) or Phase 16 completion

**Blockers:** None

**Dependencies satisfied:**
- ✅ ComparisonMetrics from 16-01
- ✅ DeltaIndicator from 16-02
- ✅ ComparisonDashboard base from 16-02

**Integration points:**
- Mobile users: Navigate tabs to compare strategies
- Delta tab: See numeric changes and plain-language assessment
- Keyboard users: Full ARIA support for screen readers and keyboard-only navigation

## Performance & Quality

**TypeScript:** Clean compilation (0 errors)
**Accessibility:** ARIA-compliant tab pattern
**Responsive:** Mobile-first tabs, desktop grid
**Code quality:** Follows BaseComponent pattern, proper typing throughout

**File metrics:**
- trade-off-summary.ts: 303 lines (exceeds 100-line minimum)
- comparison-dashboard.ts: Enhanced with ~200 additional lines for mobile support

## Key Insights

1. **Mobile comparison UX:** Tabs are more effective than trying to shrink side-by-side panels on small screens
2. **Plain-language summaries:** Trade-off assessment helps users make quick decisions without analyzing raw numbers
3. **ARIA compliance:** Proper tab pattern ensures keyboard navigation and screen reader compatibility
4. **Dual dashboard instances:** Mobile and desktop dashboards are separate instances to avoid complex responsive logic within results-dashboard component
5. **Weighted scoring:** Final value weighted 2x because it's the primary outcome; other metrics provide risk context
