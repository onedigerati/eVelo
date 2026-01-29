---
phase: 28
plan: 01
subsystem: user-experience
tags: [onboarding, first-run, modal, portfolio]
dependency-graph:
  requires: [phase-27, modal-dialog]
  provides: [first-time-experience, demo-portfolio, portfolio-setWeights-api]
  affects: [phase-28-02, user-onboarding]
tech-stack:
  added: []
  patterns: [choice-modal, progressive-disclosure, demo-mode]
key-files:
  created: []
  modified:
    - src/components/ui/portfolio-composition.ts
    - src/components/app-root.ts
decisions:
  - id: demo-portfolio
    choice: "60% SPY / 40% AGG for demo"
    rationale: "Classic balanced portfolio, widely recognized, demonstrates multi-asset simulation"
  - id: modal-flow
    choice: "Choice modal with three options (demo, create, cancel)"
    rationale: "Gives users clear decision point without overwhelming, matches existing modal-dialog API"
metrics:
  duration: 4 min
  completed: 2026-01-28
---

# Phase 28 Plan 01: First-Time Simulation Experience Summary

Choice-based modal for first-time users offering demo run or custom portfolio creation.

## What Was Done

### Task 1: setWeights() Public Method
- Added `setWeights(weights: Record<string, number>)` to PortfolioComposition class
- Clears existing selection and programmatically sets new portfolio weights
- Assigns unique colors from ASSET_COLORS palette
- Triggers UI updates and dispatches portfolio-change event

### Task 2: Choice Modal Flow
- Replaced quick-start handler with choice modal using existing modal-dialog component
- Three options: "Run Demo (60/40)", "Create My Portfolio", "Cancel"
- Demo flow: loads 60% SPY / 40% AGG, shows toast, runs simulation
- Create flow: hides welcome, scrolls to portfolio section with highlight animation
- Cancel flow: returns to welcome screen with no side effects

### Task 3: Accessibility & Mobile
- Added 100ms delay before scroll on mobile to allow welcome screen hide animation
- Added highlight-pulse keyframe animation with reduced motion preference support
- Modal keyboard accessibility already handled by modal-dialog.ts (Enter/Escape)

## Technical Details

### New Public API
```typescript
// portfolio-composition.ts
public setWeights(weights: Record<string, number>): void
```

### Modal Integration
```typescript
const result = await modal.show({
  type: 'choice',
  title: 'Run Your First Simulation',
  confirmText: 'Create My Portfolio',
  alternateText: 'Run Demo (60/40)',
  cancelText: 'Cancel'
});
// result: 'confirm' | 'alternate' | 'cancel'
```

### CSS Animation
```css
@keyframes highlight-pulse {
  0%, 100% { box-shadow: none; }
  50% { box-shadow: 0 0 0 4px rgba(13, 148, 136, 0.4); }
}
```

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 08e1fe5 | feat | Add setWeights() public method to portfolio-composition |
| 887bbd1 | feat | Implement choice modal for first-time simulation |

## Deviations from Plan

None - plan executed exactly as written. Task 3's accessibility features were incorporated into Task 2's implementation.

## Next Phase Readiness

Ready for Phase 28-02 (if planned). The setWeights() API can be reused for:
- Preset portfolio quick-loads
- URL parameter portfolio initialization
- Tutorial/guided experience

## Verification Checklist

- [x] Build succeeds: `npm run build`
- [x] portfolio-composition.ts has setWeights() public method
- [x] app-root.ts shows choice modal on 'quick-start' event
- [x] "Run Demo (60/40)" option available in modal
- [x] "Create My Portfolio" option available in modal
- [x] "Cancel" option returns to welcome screen
- [x] Toast notifications explain what's happening
- [x] Keyboard accessible (modal handles Enter/Escape)
- [x] Reduced motion preference respected
