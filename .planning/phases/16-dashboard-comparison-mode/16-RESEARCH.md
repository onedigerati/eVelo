# Phase 16: Dashboard Comparison Mode - Research

**Researched:** 2026-01-23
**Domain:** State management, comparison UI components, responsive layouts
**Confidence:** HIGH

## Summary

Phase 16 implements a side-by-side comparison view for simulation results when switching portfolio presets. The core challenge is state management (caching previous simulation results), component architecture (comparison vs single view), and responsive layouts (desktop grid vs mobile tabs).

The existing codebase provides strong foundations:
- `results-dashboard.ts` has established patterns for data-driven updates via property setters
- `modal-dialog.ts` provides the Promise-based prompt pattern needed for comparison mode selection
- `simulation-complete` event pattern enables capturing results for caching
- CSS Grid layouts with 768px breakpoint already handle responsive design

**Primary recommendation:** Create a `comparison-state-manager.ts` service to cache previous/current results, with `comparison-dashboard.ts` component that wraps or replaces `results-dashboard.ts` based on mode. Use existing modal-dialog for prompt, CSS Grid `1fr 1fr` for desktop, ARIA tabs for mobile.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native Web Components | ES2022 | Component architecture | Already used throughout codebase |
| TypeScript | 5.x | Type safety | Project-wide standard |
| CSS Custom Properties | Native | Theming/tokens | Established in tokens.css |
| Chart.js | 4.x | Visualization | Already integrated in results-dashboard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| sessionStorage | Native | Session-only state | Cache comparison results (clears on refresh per requirements) |
| CustomEvent | Native | Component communication | preset-change, comparison-mode-enter/exit events |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| sessionStorage | Memory-only | Memory-only loses data on tab close; sessionStorage provides persistence within session, clears on refresh |
| New comparison component | Extend results-dashboard | Extending adds complexity to already large component (1700+ lines); separate component cleaner |
| CSS Grid tabs | Actual tab library | No library needed; native CSS + ARIA attributes sufficient |

**Installation:**
No new dependencies required - all patterns use native browser APIs.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/ui/
│   ├── results-dashboard.ts        # Existing - no changes needed
│   ├── comparison-dashboard.ts     # NEW - wraps results for comparison
│   ├── comparison-prompt.ts        # NEW - "Compare or Replace?" modal variant
│   ├── delta-indicator.ts          # NEW - reusable +/- indicator
│   └── trade-off-summary.ts        # NEW - plain-language assessment
├── services/
│   └── comparison-state.ts         # NEW - caches previous/current results
└── utils/
    └── delta-calculations.ts       # NEW - delta computations
```

### Pattern 1: Comparison State Manager (Singleton Service)
**What:** Centralized service managing comparison mode state
**When to use:** Any time comparison data needs to be accessed across components
**Example:**
```typescript
// Source: Based on existing codebase patterns
export interface ComparisonState {
  isComparisonMode: boolean;
  previousResult: SimulationOutput | null;
  previousConfig: SimulationConfig | null;
  previousPresetName: string;
  currentResult: SimulationOutput | null;
  currentConfig: SimulationConfig | null;
  currentPresetName: string;
}

class ComparisonStateManager {
  private state: ComparisonState = {
    isComparisonMode: false,
    previousResult: null,
    previousConfig: null,
    previousPresetName: '',
    currentResult: null,
    currentConfig: null,
    currentPresetName: '',
  };

  // Store in sessionStorage for persistence within session
  private saveToSession(): void {
    sessionStorage.setItem('comparisonState', JSON.stringify({
      ...this.state,
      // Convert Float64Array to regular array for serialization
      previousResult: this.state.previousResult ? {
        ...this.state.previousResult,
        terminalValues: Array.from(this.state.previousResult.terminalValues)
      } : null,
      currentResult: this.state.currentResult ? {
        ...this.state.currentResult,
        terminalValues: Array.from(this.state.currentResult.terminalValues)
      } : null,
    }));
  }

  enterComparisonMode(current: SimulationOutput, currentConfig: SimulationConfig, presetName: string): void {
    this.state.previousResult = this.state.currentResult;
    this.state.previousConfig = this.state.currentConfig;
    this.state.previousPresetName = this.state.currentPresetName;
    this.state.currentResult = current;
    this.state.currentConfig = currentConfig;
    this.state.currentPresetName = presetName;
    this.state.isComparisonMode = true;
    this.saveToSession();
    this.dispatchChange();
  }

  exitComparisonMode(): void {
    this.state.isComparisonMode = false;
    this.state.previousResult = null;
    this.state.previousConfig = null;
    this.state.previousPresetName = '';
    this.saveToSession();
    this.dispatchChange();
  }

  replaceResults(newResult: SimulationOutput, newConfig: SimulationConfig, presetName: string): void {
    this.state.currentResult = newResult;
    this.state.currentConfig = newConfig;
    this.state.currentPresetName = presetName;
    this.state.isComparisonMode = false;
    this.state.previousResult = null;
    this.saveToSession();
    this.dispatchChange();
  }

  private dispatchChange(): void {
    window.dispatchEvent(new CustomEvent('comparison-state-change', {
      detail: { ...this.state }
    }));
  }
}

export const comparisonState = new ComparisonStateManager();
```

### Pattern 2: Preset Change Detection
**What:** Detect when user switches presets after simulation has run
**When to use:** In portfolio-composition component's preset selection handler
**Example:**
```typescript
// Source: Based on portfolio-composition.ts existing pattern
private async handlePresetSelectChange(): Promise<void> {
  // Check if we have simulation results cached
  const hasExistingResults = comparisonState.getCurrentResult() !== null;

  if (hasExistingResults) {
    // Show comparison prompt
    const choice = await this.modal.show({
      title: 'Simulation Results Exist',
      subtitle: 'Would you like to compare with the new preset or replace the current results?',
      type: 'choice',
      confirmText: 'Replace',
      cancelText: 'Cancel',
      alternateText: 'Compare',
    });

    if (choice === 'cancel') {
      // Restore previous selection
      return;
    }

    if (choice === 'alternate') {
      // Enter comparison mode after new simulation
      this.pendingComparisonMode = true;
    }
    // 'confirm' = replace, proceed normally
  }

  // Load new preset...
}
```

### Pattern 3: Desktop Side-by-Side Grid
**What:** Two-panel CSS Grid layout for comparison
**When to use:** Desktop viewport (>768px)
**Example:**
```typescript
// Source: Based on MDN CSS Grid Layout Guide
// CSS in comparison-dashboard.ts
protected styles(): string {
  return `
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--spacing-lg, 24px);
    }

    .comparison-panel {
      background: var(--surface-primary, #ffffff);
      border: 1px solid var(--border-color, #e2e8f0);
      border-radius: var(--radius-lg, 8px);
      padding: var(--spacing-lg, 24px);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: var(--spacing-md, 16px);
      padding-bottom: var(--spacing-sm, 8px);
      border-bottom: 2px solid var(--color-primary, #0d9488);
    }

    .panel-title {
      font-size: var(--font-size-lg, 1.125rem);
      font-weight: 600;
    }

    /* Mobile: stack panels, show tabs */
    @media (max-width: 768px) {
      .comparison-grid {
        display: none;
      }
      .comparison-tabs {
        display: block;
      }
    }
  `;
}
```

### Pattern 4: Mobile Tabs with ARIA
**What:** Accessible tabbed interface for mobile comparison view
**When to use:** Mobile viewport (<=768px)
**Example:**
```typescript
// Source: Based on W3C ARIA Authoring Practices Guide
protected template(): string {
  return `
    <div class="comparison-tabs" role="tablist" aria-label="Comparison view">
      <button role="tab"
              id="tab-previous"
              aria-selected="true"
              aria-controls="panel-previous"
              tabindex="0">
        Previous
        <span class="badge">${this._previousPresetName}</span>
      </button>
      <button role="tab"
              id="tab-current"
              aria-selected="false"
              aria-controls="panel-current"
              tabindex="-1">
        Current
        <span class="badge">${this._currentPresetName}</span>
      </button>
      <button role="tab"
              id="tab-delta"
              aria-selected="false"
              aria-controls="panel-delta"
              tabindex="-1">
        Delta
      </button>
    </div>
    <div id="panel-previous" role="tabpanel" aria-labelledby="tab-previous">
      <!-- Previous results -->
    </div>
    <div id="panel-current" role="tabpanel" aria-labelledby="tab-current" hidden>
      <!-- Current results -->
    </div>
    <div id="panel-delta" role="tabpanel" aria-labelledby="tab-delta" hidden>
      <!-- Delta indicators -->
    </div>
  `;
}

// Tab interaction (keyboard navigation)
private handleTabKeydown(e: KeyboardEvent, tabs: HTMLElement[]): void {
  const currentIndex = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
  let newIndex = currentIndex;

  if (e.key === 'ArrowRight') {
    newIndex = (currentIndex + 1) % tabs.length;
  } else if (e.key === 'ArrowLeft') {
    newIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  }

  if (newIndex !== currentIndex) {
    this.activateTab(tabs[newIndex]);
  }
}
```

### Pattern 5: Delta Indicator Component
**What:** Reusable component showing +/- changes
**When to use:** Display metric changes in comparison view
**Example:**
```typescript
// delta-indicator.ts
export class DeltaIndicator extends BaseComponent {
  static get observedAttributes() {
    return ['value', 'previous-value', 'format', 'label'];
  }

  protected template(): string {
    const current = parseFloat(this.getAttribute('value') || '0');
    const previous = parseFloat(this.getAttribute('previous-value') || '0');
    const format = this.getAttribute('format') || 'number'; // 'currency', 'percent', 'number'
    const label = this.getAttribute('label') || '';

    const delta = current - previous;
    const percentChange = previous !== 0 ? (delta / Math.abs(previous)) * 100 : 0;
    const isPositive = delta > 0;
    const isNegative = delta < 0;

    return `
      <div class="delta-indicator ${isPositive ? 'positive' : ''} ${isNegative ? 'negative' : ''}">
        ${label ? `<span class="delta-label">${label}</span>` : ''}
        <div class="delta-values">
          <span class="delta-change">
            ${isPositive ? '+' : ''}${this.formatValue(delta, format)}
          </span>
          <span class="delta-percent">
            (${isPositive ? '+' : ''}${percentChange.toFixed(1)}%)
          </span>
        </div>
        <div class="delta-arrow">
          ${isPositive ? '&#x2191;' : isNegative ? '&#x2193;' : '&#x2194;'}
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      .delta-indicator {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        padding: var(--spacing-sm, 8px);
        border-radius: var(--radius-md, 6px);
        background: var(--surface-secondary, #f8fafc);
      }

      .delta-indicator.positive {
        background: rgba(34, 197, 94, 0.1);
        color: var(--color-success, #22c55e);
      }

      .delta-indicator.negative {
        background: rgba(239, 68, 68, 0.1);
        color: var(--color-error, #ef4444);
      }

      .delta-change {
        font-weight: 600;
        font-size: var(--font-size-lg, 1.125rem);
      }

      .delta-percent {
        font-size: var(--font-size-sm, 0.875rem);
        opacity: 0.8;
      }

      .delta-arrow {
        font-size: 1.25rem;
      }
    `;
  }
}
```

### Anti-Patterns to Avoid
- **Mutating SimulationOutput directly:** Always clone/copy data before caching; Float64Array is transferable and should not be shared
- **Mixing comparison state in results-dashboard:** Keep comparison logic in separate component/service
- **Using localStorage for session data:** Per requirements, comparison state should clear on page refresh - use sessionStorage or memory-only
- **Duplicating Chart.js instances:** Reuse existing chart components in comparison panels via property setters
- **Ignoring tab order in mobile view:** ARIA tabs require proper tabindex management and keyboard navigation

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session state persistence | Custom serialization | sessionStorage with JSON.stringify | Native API, auto-clears on tab close |
| Comparison prompts | New modal component | modal-dialog with 'choice' type | Already supports 3-button mode |
| Delta calculations | Basic math inline | Reusable utility module | Consistency, testability, edge cases |
| Responsive layout switch | Media query listeners | CSS-only with @media | Browser handles, no JS needed |
| Tab accessibility | Manual ARIA | Follow W3C APG pattern | Screen reader tested patterns |

**Key insight:** The existing codebase has most building blocks - modal-dialog, CSS Grid patterns, Chart.js integration. The main new work is orchestration via comparison-state-manager and the comparison-dashboard wrapper component.

## Common Pitfalls

### Pitfall 1: Float64Array Serialization
**What goes wrong:** JSON.stringify on SimulationOutput fails silently because Float64Array becomes empty object `{}`
**Why it happens:** Float64Array is a TypedArray, not a plain array
**How to avoid:** Convert to Array before serialization: `Array.from(result.terminalValues)`
**Warning signs:** Empty terminalValues after loading from sessionStorage

### Pitfall 2: Event Timing for Comparison Mode Entry
**What goes wrong:** User enters comparison mode before new simulation completes
**Why it happens:** Preset change triggers comparison prompt, but simulation hasn't run yet
**How to avoid:** Set `pendingComparisonMode` flag on prompt, check after `simulation-complete` event
**Warning signs:** Comparison mode with null currentResult

### Pitfall 3: Chart.js Instance Leaks in Comparison
**What goes wrong:** Memory grows with each comparison, charts render incorrectly
**Why it happens:** Creating new Chart instances without destroying old ones
**How to avoid:** Use existing results-dashboard components, set data via property setters
**Warning signs:** Canvas shows multiple overlapping datasets

### Pitfall 4: Mobile Tab Focus Management
**What goes wrong:** Screen reader users can't navigate tabs, focus trap issues
**Why it happens:** Missing tabindex=-1 on inactive tabs, no arrow key support
**How to avoid:** Follow W3C ARIA tab pattern exactly: active tab tabindex=0, inactive -1
**Warning signs:** Tab key jumps to content instead of next tab

### Pitfall 5: Inconsistent Comparison Data
**What goes wrong:** Delta shows comparison between mismatched time horizons
**Why it happens:** Caching result without config, different simulation parameters
**How to avoid:** Cache SimulationConfig alongside SimulationOutput
**Warning signs:** Delta calculations produce nonsensical percentages

## Code Examples

Verified patterns from official sources:

### Delta Calculation Service
```typescript
// Source: Standard financial calculation patterns
export interface DeltaMetrics {
  absolute: number;
  percentChange: number;
  direction: 'up' | 'down' | 'neutral';
}

export function calculateDelta(previous: number, current: number): DeltaMetrics {
  const absolute = current - previous;
  const percentChange = previous !== 0
    ? (absolute / Math.abs(previous)) * 100
    : current !== 0 ? 100 : 0;

  const direction = absolute > 0.001 ? 'up'
    : absolute < -0.001 ? 'down'
    : 'neutral';

  return { absolute, percentChange, direction };
}

export interface ComparisonMetrics {
  finalValue: DeltaMetrics;
  successRate: DeltaMetrics;
  maxDrawdown: DeltaMetrics;
  cagr: DeltaMetrics;
  marginCallProbability?: DeltaMetrics;
}

export function computeComparisonMetrics(
  previous: SimulationOutput,
  current: SimulationOutput
): ComparisonMetrics {
  return {
    finalValue: calculateDelta(previous.statistics.median, current.statistics.median),
    successRate: calculateDelta(previous.statistics.successRate, current.statistics.successRate),
    maxDrawdown: calculateDelta(
      calculateMaxDrawdown(previous.yearlyPercentiles),
      calculateMaxDrawdown(current.yearlyPercentiles)
    ),
    cagr: calculateDelta(previous.statistics.cagr || 0, current.statistics.cagr || 0),
    marginCallProbability: previous.marginCallStats && current.marginCallStats
      ? calculateDelta(
          previous.marginCallStats[previous.marginCallStats.length - 1]?.cumulativeProbability || 0,
          current.marginCallStats[current.marginCallStats.length - 1]?.cumulativeProbability || 0
        )
      : undefined,
  };
}
```

### Trade-Off Summary Generation
```typescript
// Source: Based on existing insight generation pattern
export interface TradeOffSummary {
  headline: string;
  assessment: 'previous-better' | 'current-better' | 'similar';
  keyDifferences: string[];
  recommendation: string;
}

export function generateTradeOffSummary(
  metrics: ComparisonMetrics,
  previousName: string,
  currentName: string
): TradeOffSummary {
  const differences: string[] = [];
  let previousScore = 0;
  let currentScore = 0;

  // Final value
  if (metrics.finalValue.direction === 'up') {
    differences.push(`${currentName} produces ${formatCurrency(metrics.finalValue.absolute)} higher median terminal value`);
    currentScore += 2;
  } else if (metrics.finalValue.direction === 'down') {
    differences.push(`${previousName} produces ${formatCurrency(Math.abs(metrics.finalValue.absolute))} higher median terminal value`);
    previousScore += 2;
  }

  // Success rate
  if (Math.abs(metrics.successRate.absolute) > 1) {
    if (metrics.successRate.direction === 'up') {
      differences.push(`${currentName} has ${metrics.successRate.absolute.toFixed(1)}% higher success rate`);
      currentScore += 1;
    } else {
      differences.push(`${previousName} has ${Math.abs(metrics.successRate.absolute).toFixed(1)}% higher success rate`);
      previousScore += 1;
    }
  }

  // Risk metrics
  if (metrics.marginCallProbability && Math.abs(metrics.marginCallProbability.absolute) > 1) {
    if (metrics.marginCallProbability.direction === 'down') {
      differences.push(`${currentName} has ${Math.abs(metrics.marginCallProbability.absolute).toFixed(1)}% lower margin call risk`);
      currentScore += 1;
    } else {
      differences.push(`${previousName} has ${Math.abs(metrics.marginCallProbability.absolute).toFixed(1)}% lower margin call risk`);
      previousScore += 1;
    }
  }

  const assessment = currentScore > previousScore ? 'current-better'
    : previousScore > currentScore ? 'previous-better'
    : 'similar';

  const headlines = {
    'current-better': `${currentName} shows improved risk-adjusted returns`,
    'previous-better': `${previousName} maintains better overall profile`,
    'similar': 'Both strategies show comparable performance',
  };

  const recommendations = {
    'current-better': `Based on ${differences.length} key metrics, switching to ${currentName} could improve your outcomes.`,
    'previous-better': `${previousName} offers advantages in ${differences.length} areas. Consider staying with this allocation.`,
    'similar': `The differences are marginal. Consider other factors like diversification and personal preference.`,
  };

  return {
    headline: headlines[assessment],
    assessment,
    keyDifferences: differences.slice(0, 4), // Top 4 differences
    recommendation: recommendations[assessment],
  };
}
```

### User Flow Integration Points
```typescript
// Source: Based on existing app-root.ts patterns

// In app-root.ts or comparison-manager.ts
private setupComparisonIntegration(): void {
  // 1. Listen for simulation completion
  this.addEventListener('simulation-complete', (e: CustomEvent) => {
    const { result, config, presetName } = e.detail;

    if (this._pendingComparisonMode) {
      // Enter comparison mode with previous result
      comparisonState.enterComparisonMode(result, config, presetName);
      this._pendingComparisonMode = false;
    } else {
      // Normal flow - replace results
      comparisonState.replaceResults(result, config, presetName);
    }
  });

  // 2. Listen for comparison state changes
  window.addEventListener('comparison-state-change', (e: CustomEvent) => {
    const state = e.detail;
    const dashboard = this.$('#results') as ComparisonDashboard;

    if (state.isComparisonMode) {
      dashboard.enterComparisonMode(
        state.previousResult,
        state.currentResult,
        state.previousPresetName,
        state.currentPresetName
      );
    } else {
      dashboard.exitComparisonMode();
    }
  });

  // 3. Listen for exit comparison button
  this.addEventListener('exit-comparison-mode', () => {
    comparisonState.exitComparisonMode();
  });

  // 4. Listen for "Run from comparison" - uses current config
  this.addEventListener('run-from-comparison', async () => {
    // Simulation runs with current parameters
    // On complete, replaces comparison mode with new single result
    await this.runSimulation();
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| React/Vue for state | Native Web Components + Events | Established | Framework-free, smaller bundle |
| Media query JS listeners | CSS @media only | CSS3 | Browser-native, no JS overhead |
| localStorage | sessionStorage | HTML5 | Session-scoped data, clears on refresh |
| Custom modal code | Promise-based modal-dialog | Phase 09 | Consistent UX, reusable |

**Deprecated/outdated:**
- None for this phase - all patterns are current

## Open Questions

Things that couldn't be fully resolved:

1. **Chart.js animation during comparison**
   - What we know: Chart.js supports animation configuration
   - What's unclear: Should animations be disabled during comparison toggle for performance?
   - Recommendation: Default to enabled, add disable option if performance issues arise

2. **Float64Array memory footprint**
   - What we know: 100K iterations = ~800KB per result
   - What's unclear: Acceptable to cache 2 results in sessionStorage (1.6MB)?
   - Recommendation: Test on low-end devices; consider only caching statistics + percentiles if needed

3. **Comparison mode on mobile scrolling**
   - What we know: 768px is existing breakpoint
   - What's unclear: Optimal tab panel height for comparing charts
   - Recommendation: Use fixed viewport height for panels, internal scroll

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `results-dashboard.ts`, `portfolio-composition.ts`, `modal-dialog.ts`, `app-root.ts`
- [MDN CSS Grid Layout](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout/Basic_concepts_of_grid_layout) - Grid patterns
- [W3C ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) - Tab accessibility patterns

### Secondary (MEDIUM confidence)
- [CSS-Tricks Grid Guide](https://css-tricks.com/css-grid-layout-guide/) - Responsive patterns
- [Deque A11y Support for ARIA Tab Panels](https://www.deque.com/blog/a11y-support-series-part-1-aria-tab-panel-accessibility/) - Screen reader considerations
- [FasterCapital Delta Percentage](https://fastercapital.com/content/Delta-Percentage--Delta-Percentage--Understanding-Shifts-in-Financial-Indicators.html) - Financial delta calculations

### Tertiary (LOW confidence)
- [SAP Fiori Comparison Pattern](https://www.sap.com/design-system/fiori-design-web/v1-120/ui-elements/comparison-pattern/) - Enterprise UX patterns
- [Pixel Free Studio State Management](https://blog.pixelfreestudio.com/how-to-implement-state-management-in-web-components/) - Web Component state patterns

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses established codebase patterns
- Architecture: HIGH - Follows existing component/service patterns
- Pitfalls: HIGH - Based on known JavaScript/TypedArray issues and existing code review
- Delta calculations: HIGH - Standard financial formulas
- Mobile accessibility: MEDIUM - Based on W3C standards, needs testing

**Research date:** 2026-01-23
**Valid until:** 30 days (stable patterns, no external API dependencies)
