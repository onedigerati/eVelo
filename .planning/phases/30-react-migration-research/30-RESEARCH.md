# Phase 30: React Migration Research - Research

**Researched:** 2026-01-30
**Domain:** Web Components to React migration, TypeScript SPA modernization
**Confidence:** MEDIUM (web search verified with official docs, limited Web Components-specific guidance)

## Summary

Migrating this 42-component Web Components + Vite application to React is technically feasible but represents a significant undertaking with substantial trade-offs. The current architecture is well-structured with clean separation of concerns (BaseComponent abstraction, Shadow DOM encapsulation, event-driven state management), making incremental migration viable.

**Key findings:**
- Current stack is framework-free by design for single-file bundling - React adds ~140KB baseline bundle size
- 42 Web Components would require individual migration (8-12 weeks effort estimate)
- Shadow DOM CSS isolation would need replacement with CSS Modules or styled-components
- Chart.js integration is straightforward (react-chartjs-2 or custom hooks)
- IndexedDB/Dexie.js work seamlessly with React hooks (useLiveQuery)
- Comlink Web Workers integrate via react-use-comlink or custom hooks
- E2E tests require minimal changes (Playwright supports both)

**Primary recommendation:** Do NOT migrate unless there's a compelling business need beyond technical curiosity. The current Web Components architecture is well-designed, performant, and maintainable. React would add complexity, bundle size, and framework lock-in without clear benefits for this use case.

## Standard Stack

The established libraries/tools for React + TypeScript + Vite migration in 2026:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react | 19.x | UI framework | Industry standard, mature ecosystem, React 19 includes Server Components and `use()` hook |
| react-dom | 19.x | DOM renderer | Required for React browser rendering |
| @types/react | 19.x | TypeScript types | Essential for type safety |
| vite | 6.x | Build tool | Already in use, excellent React support via @vitejs/plugin-react |
| @vitejs/plugin-react | 5.x | Vite React plugin | Official Vite plugin for React Fast Refresh and JSX |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zustand | 5.x | State management | Simple global state (alternative to Redux for smaller apps) |
| jotai | 2.x | Atomic state | Fine-grained state with complex dependencies |
| react-chartjs-2 | 6.x | Chart.js wrapper | If using wrapper approach (vs custom hooks) |
| dexie-react-hooks | 5.x | IndexedDB hooks | Official Dexie React integration (useLiveQuery) |
| react-use-comlink | 1.x | Web Worker hooks | Comlink + React hooks integration |
| @tanstack/react-query | 6.x | Data fetching/caching | If adding server-side data fetching |
| @testing-library/react | 16.x | Component testing | Standard for React component testing |
| vitest | 4.x | Unit test runner | Already in use, works with React Testing Library |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-chartjs-2 | Custom hooks | More control, less abstraction, ~50 LOC per chart |
| CSS Modules | styled-components | Runtime CSS-in-JS (heavier), better DX for some |
| Zustand | Redux Toolkit | More boilerplate, better for large teams/complex state |
| Incremental migration | Big-bang rewrite | Faster but riskier, longer downtime |

**Installation:**
```bash
npm install react react-dom
npm install -D @vitejs/plugin-react @types/react @types/react-dom
npm install zustand dexie-react-hooks react-use-comlink
npm install -D @testing-library/react @testing-library/jest-dom
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/          # React components (replacing src/components/ui/)
│   ├── atoms/          # Simple reusable components (Button, Input, etc.)
│   ├── molecules/      # Composite components (PortfolioCard, AssetSelector)
│   ├── organisms/      # Complex components (ResultsDashboard, PortfolioComposition)
│   └── layouts/        # Layout components (MainLayout, SidebarPanel)
├── hooks/              # Custom React hooks
│   ├── useSimulation.ts
│   ├── usePortfolio.ts
│   └── useWebWorker.ts
├── stores/             # Zustand stores (or Jotai atoms)
│   ├── portfolioStore.ts
│   ├── simulationStore.ts
│   └── themeStore.ts
├── charts/             # Chart components (Chart.js + React)
│   ├── ProbabilityCone.tsx
│   ├── Histogram.tsx
│   └── DonutChart.tsx
├── simulation/         # Business logic (unchanged)
├── data/               # IndexedDB/Dexie (unchanged)
├── math/               # Math utilities (unchanged)
└── styles/             # CSS Modules or global styles
    ├── theme.module.css
    └── globals.css
```

### Pattern 1: Web Component Wrapper (Incremental Migration)
**What:** Wrap existing Web Components in React components during incremental migration
**When to use:** Strangler pattern migration - gradually replace components while keeping old ones functional
**Example:**
```typescript
// Source: React official docs + webcomponents/react-integration pattern
import { useEffect, useRef } from 'react';
import '../components/ui/portfolio-composition'; // Import Web Component

interface PortfolioCompositionProps {
  weights: Record<string, number>;
  onPortfolioChange?: (weights: Record<string, number>) => void;
}

export function PortfolioComposition({ weights, onPortfolioChange }: PortfolioCompositionProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Set properties (not attributes)
    (element as any).setWeights(weights);

    // Listen to custom events
    const handler = (e: Event) => {
      const customEvent = e as CustomEvent;
      onPortfolioChange?.(customEvent.detail.weights);
    };
    element.addEventListener('portfolio-change', handler);

    return () => element.removeEventListener('portfolio-change', handler);
  }, [weights, onPortfolioChange]);

  return <portfolio-composition ref={ref} />;
}
```

### Pattern 2: Custom Hook for Chart.js
**What:** Direct Chart.js integration with useEffect and useRef
**When to use:** When you want full control over chart configuration without wrapper abstraction
**Example:**
```typescript
// Source: LogRocket blog + custom implementation
import { useEffect, useRef } from 'react';
import { Chart, ChartConfiguration } from 'chart.js/auto';

export function useChart(config: ChartConfiguration) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create chart
    chartRef.current = new Chart(canvasRef.current, config);

    return () => {
      // Cleanup
      chartRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    // Update chart when config changes
    if (chartRef.current) {
      chartRef.current.data = config.data;
      chartRef.current.options = config.options;
      chartRef.current.update();
    }
  }, [config]);

  return canvasRef;
}

// Usage:
function HistogramChart({ data }: { data: number[] }) {
  const canvasRef = useChart({
    type: 'bar',
    data: { labels: ['...'], datasets: [{ data }] },
    options: { responsive: true }
  });

  return <canvas ref={canvasRef} />;
}
```

### Pattern 3: Dexie React Hooks
**What:** Use useLiveQuery for reactive IndexedDB queries
**When to use:** All database access in React components
**Example:**
```typescript
// Source: Dexie official docs - https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';

function PortfolioList() {
  const portfolios = useLiveQuery(
    () => db.portfolios.toArray()
  );

  if (!portfolios) return <div>Loading...</div>;

  return (
    <ul>
      {portfolios.map(p => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}
```

### Pattern 4: Comlink Web Worker Hook
**What:** Wrap Comlink workers in React hooks for state integration
**When to use:** Running simulations or heavy computation in Web Workers
**Example:**
```typescript
// Source: react-use-comlink package
import { useState, useEffect } from 'react';
import { wrap } from 'comlink';

export function useSimulationWorker() {
  const [worker, setWorker] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const workerInstance = new Worker(
      new URL('../simulation/simulation.worker.ts', import.meta.url),
      { type: 'module' }
    );
    const wrapped = wrap(workerInstance);
    setWorker(wrapped);

    return () => workerInstance.terminate();
  }, []);

  const runSimulation = async (config: any) => {
    if (!worker) return null;
    setIsRunning(true);
    try {
      const result = await worker.runSimulation(config);
      return result;
    } finally {
      setIsRunning(false);
    }
  };

  return { runSimulation, isRunning };
}
```

### Anti-Patterns to Avoid
- **Using React for everything from day 1:** This is a big-bang migration that's high-risk. Use incremental/Strangler pattern instead.
- **Ignoring CSS isolation:** React doesn't have Shadow DOM. Plan for CSS Modules or styled-components to prevent style collisions.
- **Recreating event-driven architecture:** React encourages props drilling and lifting state up. Embrace the paradigm shift or use Zustand/Jotai for global state.
- **Over-optimizing early:** Don't prematurely memoize with useMemo/useCallback. Measure first, optimize later.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Chart rendering | Custom canvas rendering | react-chartjs-2 or custom hooks | Chart.js handles accessibility, animations, tooltips, responsiveness |
| IndexedDB queries | Raw IndexedDB API | dexie-react-hooks (useLiveQuery) | Automatic reactivity, query optimization, error handling |
| Web Worker communication | postMessage/onmessage | react-use-comlink | Type-safe API, automatic cleanup, React lifecycle integration |
| State management | Context + useReducer | Zustand or Jotai | Less boilerplate, better performance, DevTools, middleware |
| Form validation | Manual validation | React Hook Form or Formik | Field tracking, error messages, submission handling |
| CSS isolation | Global CSS with BEM | CSS Modules | Build-time scoping, no runtime overhead, TypeScript support |

**Key insight:** React's ecosystem is mature. Don't rebuild what's been battle-tested. Focus effort on business logic migration, not plumbing.

## Common Pitfalls

### Pitfall 1: Ignoring Shadow DOM CSS Isolation Loss
**What goes wrong:** After migrating, styles bleed between components or global styles break components
**Why it happens:** Web Components use Shadow DOM for CSS encapsulation; React components don't have this by default
**How to avoid:**
- Adopt CSS Modules (scoped classes) from day 1: `import styles from './Component.module.css'`
- Or use styled-components: `const Button = styled.button\`...\``
- Avoid global CSS except for design tokens
**Warning signs:** Components look different in different contexts, styles randomly override each other

### Pitfall 2: Event System Mismatch
**What goes wrong:** Custom events from Web Components don't propagate to React event handlers
**Why it happens:** React's synthetic event system doesn't listen to CustomEvents on the capture phase
**How to avoid:**
- During migration, manually attach event listeners with addEventListener in useEffect
- For new React components, use standard props callbacks instead of CustomEvents
**Warning signs:** onClick handlers work but portfolio-change events don't fire

### Pitfall 3: Property vs Attribute Confusion
**What goes wrong:** When wrapping Web Components, passing complex props as attributes fails (objects become "[object Object]")
**Why it happens:** React passes everything as HTML attributes by default; Web Components expect properties for complex data
**How to avoid:**
- Access DOM element via ref and set properties directly: `ref.current.propertyName = value`
- Don't rely on JSX attributes for objects/arrays when wrapping Web Components
**Warning signs:** Portfolio weights show as "[object Object]", charts don't render

### Pitfall 4: Over-Componentization
**What goes wrong:** Breaking components too small leads to prop drilling hell and performance issues
**Why it happens:** Coming from Web Components (which are isolated), developers create too many small React components
**How to avoid:**
- Colocate state close to where it's used
- A component with 5-10 props is okay; 15+ suggests wrong boundaries
- Use Zustand/Jotai for truly global state instead of prop drilling
**Warning signs:** Passing simulationResult through 6 component layers, excessive re-renders

### Pitfall 5: Forgetting to Cleanup Side Effects
**What goes wrong:** Memory leaks, event listeners not removed, workers not terminated
**Why it happens:** React's useEffect cleanup is easy to forget, especially when migrating from disconnectedCallback
**How to avoid:**
- Every useEffect that creates a subscription/listener must return a cleanup function
- Check for console warnings about setting state on unmounted components
**Warning signs:** Memory usage grows over time, "Can't perform a React state update on unmounted component" warnings

### Pitfall 6: Not Planning for Single-File Build
**What goes wrong:** After migration, can't create portable single-file HTML builds anymore
**Why it happens:** React's architecture expects code splitting; vite-plugin-singlefile may not work well with React's chunks
**How to avoid:**
- Test single-file build early in migration
- Consider if this requirement is still needed (could ship PWA instead)
- May need to configure Rollup manually for single-file output
**Warning signs:** Build creates multiple JS files, single-file build >5MB (uncompressed)

## Code Examples

Verified patterns from official sources:

### Migrating BaseComponent to React Hooks
```typescript
// Source: React patterns + Web Components migration best practices

// OLD (Web Components):
export class MyComponent extends BaseComponent {
  private data: string = '';

  protected template() { return `<div>${this.data}</div>`; }
  protected styles() { return `div { color: red; }`; }

  connectedCallback() {
    this.render();
    this.addEventListener('click', this.handleClick);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleClick);
  }
}

// NEW (React):
import { useState, useEffect } from 'react';
import styles from './MyComponent.module.css';

export function MyComponent() {
  const [data, setData] = useState('');

  useEffect(() => {
    // Equivalent to connectedCallback
    const handleClick = () => console.log('clicked');
    document.addEventListener('click', handleClick);

    // Equivalent to disconnectedCallback (cleanup)
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return <div className={styles.container}>{data}</div>;
}

// CSS Module (MyComponent.module.css):
.container {
  color: red;
}
```

### State Management with Zustand
```typescript
// Source: Zustand official docs - https://zustand.docs.pmnd.rs/

// stores/simulationStore.ts
import { create } from 'zustand';
import type { SimulationOutput, SimulationConfig } from '../simulation/types';

interface SimulationStore {
  result: SimulationOutput | null;
  config: SimulationConfig | null;
  isRunning: boolean;
  setResult: (result: SimulationOutput, config: SimulationConfig) => void;
  setRunning: (running: boolean) => void;
}

export const useSimulationStore = create<SimulationStore>((set) => ({
  result: null,
  config: null,
  isRunning: false,
  setResult: (result, config) => set({ result, config }),
  setRunning: (isRunning) => set({ isRunning }),
}));

// Usage in component:
function ResultsDashboard() {
  const { result, isRunning } = useSimulationStore();

  if (isRunning) return <LoadingSpinner />;
  if (!result) return <EmptyState />;

  return <div>Results: {result.statistics.median}</div>;
}
```

### Chart Component with react-chartjs-2
```typescript
// Source: react-chartjs-2 GitHub - https://github.com/reactchartjs/react-chartjs-2

import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement } from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement);

interface HistogramProps {
  data: number[];
  binSize: number;
}

export function Histogram({ data, binSize }: HistogramProps) {
  const chartData = {
    labels: data.map((_, i) => `Bin ${i}`),
    datasets: [{
      label: 'Distribution',
      data: data,
      backgroundColor: 'rgba(13, 148, 136, 0.5)',
    }]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div style={{ height: '400px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class components | Function components + hooks | React 16.8 (2019) | Web Components migration must target hooks, not classes |
| Redux everywhere | Zustand/Jotai for app state | 2021-2023 | Much less boilerplate, simpler mental model |
| styled-components runtime | CSS Modules (build-time) | 2024-2026 trend | Better performance, no runtime CSS-in-JS overhead |
| Create React App | Vite + React | 2022-2026 | CRA deprecated, Vite is now standard for new projects |
| Manual Web Worker setup | Comlink + hooks | 2020+ | Type-safe API, automatic cleanup |
| Imperative Chart.js | react-chartjs-2 + hooks | 2023+ | Declarative, React lifecycle integration |

**Deprecated/outdated:**
- Create React App: Officially deprecated as of 2023, use Vite instead
- React.FC type: Removed from recommended patterns in 2023 (causes issues with generics)
- Class components: Still supported but not recommended for new code

## Open Questions

Things that couldn't be fully resolved:

1. **Single-file build compatibility with React**
   - What we know: vite-plugin-singlefile works with React but produces large bundles
   - What's unclear: Can we maintain <5MB single-file HTML builds? Current app might be close to limit
   - Recommendation: Test early with a prototype; React's baseline ~140KB + dependencies may push over size budget

2. **Migration effort multiplier for complex components**
   - What we know: Simple components = 1-2 hours, complex = 8-16 hours (estimates)
   - What's unclear: ResultsDashboard (1,937 LOC) with 20+ child components - could be 2-4 weeks alone
   - Recommendation: Prototype 3 components (simple, medium, complex) before committing to full migration

3. **Performance comparison: Web Components vs React reconciliation**
   - What we know: Web Components have lower CPU overhead for simple UIs, React better for dynamic UIs
   - What's unclear: For this specific app (Monte Carlo results, charts, forms), which is actually faster?
   - Recommendation: Build parallel implementation of ResultsDashboard and benchmark

4. **PWA compatibility with single-file build**
   - What we know: PWA (vite-plugin-pwa) and single-file (vite-plugin-singlefile) may conflict
   - What's unclear: Current app has both build modes - can React support both?
   - Recommendation: Clarify if both modes are required; may need to choose PWA OR portable build

5. **Event system migration complexity**
   - What we know: Current app uses ~30+ custom events for component communication
   - What's unclear: How much refactoring needed to convert to React patterns (props, callbacks, state management)?
   - Recommendation: Map all CustomEvents and their consumers before starting migration

## Sources

### Primary (HIGH confidence)
- React v19 official blog: https://react.dev/blog/2024/12/05/react-19
- Vite official guide: https://vite.dev/guide/
- Dexie React Hooks docs: https://dexie.org/docs/dexie-react-hooks/useLiveQuery()
- Zustand comparison page: https://zustand.docs.pmnd.rs/getting-started/comparison
- Playwright Testing Library migration: https://playwright.dev/docs/testing-library

### Secondary (MEDIUM confidence)
- Complete Guide to Setting Up React with TypeScript and Vite (2026): https://medium.com/@robinviktorsson/complete-guide-to-setting-up-react-with-typescript-and-vite-2025-468f6556aaf2
- State Management in 2025 comparison: https://dev.to/hijazi313/state-management-in-2025-when-to-use-context-redux-zustand-or-jotai-2d2k
- React Chartjs-2 GitHub: https://github.com/reactchartjs/react-chartjs-2
- Integrating web workers in React with Comlink: https://blog.logrocket.com/integrating-web-workers-in-a-react-app-with-comlink/
- Vite Plugin PWA guide: https://vite-pwa-org.netlify.app/guide/

### Tertiary (LOW confidence - needs verification)
- Web Components vs React performance: https://medium.com/@spkamboj/web-components-basics-and-performance-benefits-f7537c908075
- Strangler pattern for frontend: https://medium.com/@felipegaiacharly/strangler-pattern-for-frontend-865e9a5f700f
- Mercari Web Components to React migration: https://engineering.mercari.com/en/blog/entry/20221207-web-design-system-migrating-web-components-to-react/

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - React 19, Vite 6, Dexie hooks are well-documented with official sources
- Architecture: MEDIUM - Patterns verified but Web Components → React migration has limited official guidance
- Pitfalls: MEDIUM - Based on general React migration experience and LogRocket/DEV Community articles, not eVelo-specific

**Research date:** 2026-01-30
**Valid until:** 90 days (React ecosystem stable, but tooling evolves quarterly)

---

## Final Recommendation

**DO NOT MIGRATE** unless there's a concrete business requirement that React uniquely solves.

**Reasons to stay with Web Components:**
1. ✅ Current architecture is clean, well-structured, maintainable
2. ✅ No framework lock-in - can adopt any library without version conflicts
3. ✅ Single-file portable build works perfectly (critical requirement per BUILD-04)
4. ✅ Smaller bundle size (~100-200KB vs ~300-400KB with React)
5. ✅ Shadow DOM provides true CSS encapsulation without build tools
6. ✅ Team already understands the codebase

**Valid reasons to migrate:**
- Need to hire React developers (larger talent pool)
- Plan to add complex real-time UI features (React reconciliation is optimized for this)
- Want to use React-specific libraries (though most have vanilla JS alternatives)
- Moving to Next.js for SSR/SEO requirements

**If you do migrate:**
- Use incremental/Strangler pattern (3-6 month timeline)
- Start with leaf components (no children): range-slider, number-input, checkbox-input
- Move to molecules: asset-selector, modal-dialog
- Finally tackle organisms: results-dashboard, portfolio-composition
- Keep simulation/, data/, math/ folders unchanged (pure TS, framework-agnostic)
- Budget 8-12 weeks engineer time for 42 components (assuming 1 senior dev)
