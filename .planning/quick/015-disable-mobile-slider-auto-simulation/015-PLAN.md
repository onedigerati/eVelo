# Quick Task 015: Disable Mobile Slider Auto-Simulation

## Objective

Disable the auto-run simulation feature when adjusting slider controls on mobile view (viewport width <= 768px). This applies to all range-slider components in the eVelo Parameters section.

## Context

Currently, the `commit` event from range-slider components triggers automatic simulation execution (line 1663 in app-root.ts). This is desired behavior on desktop but can be disruptive on mobile where users may want to adjust multiple sliders before running the simulation.

## Tasks

### Task 1: Modify commit event handler in app-root.ts

**Location:** `src/components/app-root.ts` around line 1663

**Current code:**
```typescript
// Listen for 'commit' events from number-input and range-slider components
this.shadowRoot?.addEventListener('commit', triggerSimulation);
```

**Change to:**
```typescript
// Listen for 'commit' events from number-input and range-slider components
// On mobile (<=768px), disable auto-run for sliders - users adjust multiple params
this.shadowRoot?.addEventListener('commit', (e) => {
  const target = e.target as HTMLElement;
  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  // On mobile, skip auto-run for range sliders (too disruptive when adjusting multiple params)
  if (isMobile && target.tagName === 'RANGE-SLIDER') {
    return;
  }

  triggerSimulation();
});
```

**Rationale:**
- Uses the same mobile detection pattern (768px breakpoint) as main-layout.ts
- Only affects range-slider components on mobile
- number-input components still auto-run on Enter key (their commit event)
- Desktop behavior unchanged (all commit events trigger simulation)

## Verification

1. Open app on desktop - slider adjustments should auto-run simulation on mouseup
2. Open app on mobile viewport (<=768px) - slider adjustments should NOT auto-run
3. On mobile, number inputs should still auto-run on Enter key press
4. The Run Simulation button should work normally on both desktop and mobile
