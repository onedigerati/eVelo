---
phase: 16-dashboard-comparison-mode
plan: 02
subsystem: ui-components
tags: [web-components, comparison-mode, delta-indicators, responsive-design]

requires:
  - 16-01-comparison-state-foundation

provides:
  - DeltaIndicator component for metric comparison visualization
  - ComparisonDashboard component for side-by-side results display
  - Desktop comparison view foundation

affects:
  - 16-03-mobile-comparison-mode (mobile-specific comparison UI)

tech-stack:
  added: []
  patterns:
    - "Composition pattern (ComparisonDashboard wraps two results-dashboard instances)"
    - "Event-driven state sync (listens to comparison-state-change events)"
    - "Attribute-based component configuration (observed attributes for DeltaIndicator)"

key-files:
  created:
    - src/components/ui/delta-indicator.ts
    - src/components/ui/comparison-dashboard.ts
  modified:
    - src/components/ui/index.ts

decisions:
  - decision: "DeltaIndicator uses observed attributes for reactive updates"
    rationale: "Enables declarative usage in HTML with automatic re-rendering on attribute changes"
    alternatives: ["Property setters only"]
    tradeoffs: "More verbose template code but better HTML-first developer experience"

  - decision: "ComparisonDashboard uses composition (not duplication) of results-dashboard"
    rationale: "Avoids code duplication, maintains single source of truth for dashboard rendering"
    alternatives: ["Duplicate dashboard rendering logic"]
    tradeoffs: "Requires proper data passing to child components, but ensures consistency"

  - decision: "Map delta direction to color classes (up→positive, down→negative)"
    rationale: "CSS class names are more semantic than delta directions for styling purposes"
    alternatives: ["Use delta direction directly as CSS class"]
    tradeoffs: "Extra mapping step but clearer intent in styles"

  - decision: "Hide comparison-container on mobile via CSS (@media max-width: 768px)"
    rationale: "Phase 16-03 will handle mobile-specific comparison UI separately"
    alternatives: ["Build responsive comparison layout now"]
    tradeoffs: "Two-phase approach but cleaner separation of desktop/mobile concerns"

metrics:
  duration: 8min
  completed: 2026-01-23

notes: |
  Smooth execution. Both components built according to plan with proper integration
  into existing architecture. DeltaIndicator provides reusable delta visualization,
  ComparisonDashboard enables side-by-side comparison on desktop viewports.
---

# Phase 16 Plan 02: Desktop Comparison View Components Summary

**One-liner:** DeltaIndicator and ComparisonDashboard components enable side-by-side simulation comparison on desktop with color-coded change indicators.

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Create DeltaIndicator component | a96006d | ✓ Complete |
| 2 | Create ComparisonDashboard component | b462597 | ✓ Complete |

## What Was Built

### DeltaIndicator Component

Reusable Web Component for displaying metric changes between comparisons:

**Features:**
- Three format types: `currency`, `percent`, `number`
- Automatic color coding based on delta direction:
  - Green (positive): rgba(34, 197, 94, 0.1) background, #22c55e text
  - Red (negative): rgba(239, 68, 68, 0.1) background, #ef4444 text
  - Gray (neutral): rgba(148, 163, 184, 0.1) background, #94a3b8 text
- Displays absolute change and percentage change
- Arrow indicator (↑↓→) for visual feedback
- Integrates with `calculateDelta` from utils/delta-calculations.ts
- Observed attributes for reactive updates

**Usage:**
```html
<delta-indicator
  value="1200000"
  previous-value="1000000"
  format="currency"
  label="Median Value">
</delta-indicator>
```

**Output:** `+$200K (+20.0%) ↑` in green

### ComparisonDashboard Component

Container for side-by-side comparison of two simulation results:

**Features:**
- Two-column grid layout (1fr 1fr) with 24px gap
- Panel headers with colored left borders:
  - Previous panel: 3px solid #8b5cf6 (purple)
  - Current panel: 3px solid #0d9488 (teal)
- Exit Comparison button (outlined teal, hover filled)
- Composition approach: wraps two `<results-dashboard>` instances
- Listens to `comparison-state-change` events for automatic updates
- Falls back to single dashboard when not in comparison mode
- Mobile hidden (@media max-width: 768px) - Phase 16-03 handles mobile

**Public API:**
```javascript
// Enter comparison mode
dashboard.enterComparisonMode(
  previousOutput, currentOutput,
  previousConfig, currentConfig,
  'Previous Preset', 'Current Preset'
);

// Exit comparison mode
dashboard.exitComparisonMode(); // Dispatches 'exit-comparison-mode' event

// Single mode
dashboard.data = simulationOutput;
```

**Event-driven sync:**
Component listens to global `comparison-state-change` events from ComparisonStateManager singleton, enabling automatic UI updates when comparison state changes from any source.

## Technical Implementation

### Component Architecture

**DeltaIndicator (149 lines):**
- Extends BaseComponent
- Observed attributes: `value`, `previous-value`, `format`, `label`
- Private method: `formatValue(value, format)` using Intl.NumberFormat
- Maps delta direction to CSS classes in template
- Registered: `customElements.define('delta-indicator', DeltaIndicator)`

**ComparisonDashboard (371 lines):**
- Extends BaseComponent
- Private state: `_isComparisonMode`, `_previousData`, `_currentData`, config/name fields
- Dual templates: `comparisonTemplate()` for side-by-side, `singleTemplate()` for single view
- Event listener: `handleStateChange` for comparison-state-change events
- afterRender wires exit button click and passes data to child dashboards
- XSS protection: `escapeHtml()` helper for preset names
- Registered: `customElements.define('comparison-dashboard', ComparisonDashboard)`

### Integration Points

**With 16-01 foundation:**
- DeltaIndicator imports `calculateDelta` from utils/delta-calculations.ts
- ComparisonDashboard imports `comparisonState` from services/comparison-state.ts
- ComparisonDashboard imports `computeComparisonMetrics` (not yet used, reserved for delta-summary)

**With existing UI:**
- Both components exported from src/components/ui/index.ts
- ComparisonDashboard imports './results-dashboard' to register it
- Follows BaseComponent pattern from Phase 01

### Responsive Design

Desktop-only for this phase:
- Grid layout works at >768px viewport
- `@media (max-width: 768px)` hides `.comparison-container`
- Phase 16-03 will implement mobile-specific comparison UI

## Verification Results

✓ TypeScript compiles without errors (`npx tsc --noEmit`)
✓ Both components registered via customElements.define
✓ DeltaIndicator shows correct colors for positive/negative/neutral
✓ ComparisonDashboard grid layout implemented (2-column)
✓ Exit button dispatches event and returns to single mode
✓ Components exported from src/components/ui/index.ts
✓ Artifacts meet minimum line requirements (DeltaIndicator: 149 > 80, ComparisonDashboard: 371 > 150)
✓ Key links verified:
  - comparison-dashboard → comparisonState ✓
  - comparison-dashboard → `<results-dashboard` ✓
  - delta-indicator → calculateDelta ✓

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps

Phase 16-03 will:
1. Create mobile comparison view (vertical stacking, swipe between panels)
2. Wire comparison mode into app-root
3. Add "Compare" button to trigger comparison mode
4. Implement mobile-specific comparison UI patterns

## Dependencies Ready

- ✓ ComparisonStateManager (16-01) provides state persistence
- ✓ calculateDelta (16-01) provides delta calculation logic
- ✓ results-dashboard (Phase 11) provides individual dashboard rendering
- ✓ BaseComponent (Phase 01) provides Web Component foundation

All dependencies satisfied. Ready for Phase 16-03.
