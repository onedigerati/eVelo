---
phase: 13
plan: 03
subsystem: testing
tags: [e2e, workflow, simulation, semantic-locators, shadow-dom]
dependencies:
  requires: [13-01]
  provides: [workflow-test, simulation-e2e-coverage]
  affects: [13-06]
tech-stack:
  added: []
  patterns: [accessibility-tree-verification, evaljs-chart-inspection]
key-files:
  created:
    - test/e2e/workflow.js
  modified: []
decisions:
  - context: Form value verification approach
    choice: Use accessibility tree snapshot to verify values
    rationale: Confirms semantic locators and composed:true events work across Shadow DOM
  - context: Simulation completion detection
    choice: Wait for key-metrics-banner with 60s timeout
    rationale: Banner appears after simulation completes; 60s allows for slow first-run compilation
  - context: Chart data verification
    choice: Use evalJs to inspect Chart.js data.datasets
    rationale: Canvas rendering not in accessibility tree; must query Chart.js API directly
metrics:
  duration: 3 min
  completed: 2026-01-22
---

# Phase 13 Plan 03: Simulation Workflow Test Summary

End-to-end workflow test verifying complete user journey: set params via semantic locators, run simulation via button click, verify results via component visibility and Chart.js data inspection.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create simulation workflow test | a75091e | test/e2e/workflow.js |
| 2 | Add form value verification | c6deee9 | test/e2e/workflow.js |

## Key Decisions Made

### 1. Accessibility tree verification for form values
- **Choice:** Use snapshot({ interactive: true }) to verify input values
- **Rationale:** Confirms that semantic locators successfully set values and that custom events (composed: true) cross Shadow DOM boundary
- **Pattern:** Check if TEST_PARAMS values appear in accessibility tree after form fill

### 2. Phase-based test structure
- **Choice:** Organize test into distinct phases (1: params, 1b: verify, 2: run, 3: results, 4: chart data)
- **Rationale:** Clear progression matches user journey; easier to identify failure points
- **Pattern:** Each phase logs status and captures screenshots at key moments

### 3. Chart.js data verification via evalJs
- **Choice:** Query Chart.js API directly through evalJs
- **Rationale:** Canvas elements render pixels, not DOM - accessibility tree only sees `<canvas>` element
- **Pattern:** `document.querySelector('probability-cone-chart').shadowRoot.querySelector('canvas').chart.data.datasets`

## Artifacts Created

### test/e2e/workflow.js (211 lines)
Complete simulation workflow E2E test with:
- **Phase 1:** Set simulation parameters via findLabel
  - Initial Portfolio ($1,000,000)
  - Time Horizon (30 years)
  - Annual Withdrawal ($50,000)
- **Phase 1b:** Verify form values via accessibility tree snapshot
- **Phase 2:** Run simulation via findRole button click
- **Phase 3:** Verify result components visible
  - probability-cone-chart
  - histogram-chart
  - percentile-spectrum
- **Phase 4:** Verify Chart.js has data via evalJs

### Screenshots captured
- `workflow-01-initial.png` - Initial state before changes
- `workflow-02-params-set.png` - After parameter configuration
- `workflow-03-results.png` - After simulation completes

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. test/e2e/workflow.js exists with 211 lines (exceeds minimum 100)
2. No syntax errors (node --check passes)
3. Test sets parameters, runs simulation, verifies results
4. Test captures screenshots at each phase (initial, params-set, results)
5. Test uses semantic locators (findLabel, findRole) for Shadow DOM interaction
6. Test verifies chart data via evalJs

## Next Phase Readiness

Workflow test ready for:
- **13-04:** Responsive layout tests (different viewports affect workflow)
- **13-05:** Chart visual regression tests (workflow provides populated charts)
- **13-06:** Test runner integration (executes workflow.js with other tests)

No blockers identified.
