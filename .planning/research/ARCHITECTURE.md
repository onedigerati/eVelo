# Architecture Research: eVelo Monte Carlo Simulation

**Researched:** 2026-01-17
**Domain:** Client-side financial Monte Carlo simulation with Web Components
**Confidence:** MEDIUM (verified patterns from multiple sources, some JavaScript-specific implementation details are synthesized)

## Executive Summary

A client-side Monte Carlo simulation system for 100,000 iterations requires a **layered architecture** with clear separation between simulation engine (computation), data layer (storage/caching), state management (coordination), and UI components (presentation). The simulation engine must run in **Web Workers** to avoid blocking the UI, using **transferable ArrayBuffers** for efficient data passing. Correlated multi-asset simulation requires **Cholesky decomposition** of the correlation matrix, applied to independent random draws.

**Primary architectural decisions:**
1. Worker pool sized to `navigator.hardwareConcurrency - 1` for parallel simulation batches
2. Transferable Float64Arrays for zero-copy data exchange between main thread and workers
3. Centralized event bus for Web Components communication (no framework state management)
4. Three-tier caching: Memory (fast) -> IndexedDB via Dexie.js (persistent) -> Network (API fallback)

## System Overview

```
+------------------+     +-------------------+     +------------------+
|   UI Layer       |<--->|   State/Events    |<--->|  Data Layer      |
|  Web Components  |     |    Event Bus      |     |  Dexie/IndexedDB |
+--------+---------+     +--------+----------+     +--------+---------+
         |                        |                         |
         v                        v                         v
+------------------+     +-------------------+     +------------------+
|  Visualization   |     | Simulation Engine |     |  API Services    |
|    Chart.js      |     |   Worker Pool     |     |  FMP/Tiingo/etc  |
+------------------+     +-------------------+     +------------------+
```

**Data flow direction:**
1. User configures simulation parameters in UI
2. Parameters dispatched via Event Bus
3. Data Layer loads historical returns (cache or API)
4. Simulation Engine receives parameters + data, runs in workers
5. Results aggregated and returned to main thread
6. Event Bus notifies UI components of results
7. Visualization layer renders charts

## Component Architecture

### Simulation Engine

The simulation engine is the computational core. It must be designed for:
- Isolation from UI thread (100% worker-based)
- Deterministic results (seeded RNG for reproducibility)
- Chunked execution (progress reporting)

#### Core Modules

| Module | Responsibility | Location |
|--------|----------------|----------|
| `SimulationCoordinator` | Orchestrates worker pool, aggregates results | Main thread |
| `SimulationWorker` | Executes simulation iterations | Worker thread |
| `CorrelationEngine` | Cholesky decomposition, correlated draws | Worker thread |
| `BootstrapSampler` | Block bootstrap resampling from historical data | Worker thread |
| `RegimeSwitcher` | Markov regime transitions (bull/bear/crash) | Worker thread |
| `SBLOCEngine` | Loan modeling, margin call detection | Worker thread |
| `StatisticsAggregator` | Percentile calculation, summary statistics | Main thread |

#### Simulation Algorithm Structure

```typescript
// Conceptual structure - worker receives this via postMessage
interface SimulationConfig {
  iterations: number;           // 1,000 - 100,000
  years: number;                // Simulation horizon
  assets: AssetConfig[];        // 2-5 assets with weights
  correlationMatrix: number[][]; // Pre-computed from historical data
  choleskyL: number[][];        // Lower triangular from Cholesky decomposition
  regimeParams: RegimeParams;   // Bull/bear/crash transition probabilities
  bootstrapBlocks: number[][];  // Pre-sampled historical return blocks
  sblocParams: SBLOCParams;     // Loan terms, LTV limits
  seed: number;                 // For reproducibility
}

// Each worker processes a batch of iterations
interface WorkerTask {
  startIteration: number;
  endIteration: number;
  config: SimulationConfig;
  transferables: ArrayBuffer[]; // Bootstrap data, results buffer
}
```

#### Correlation-Aware Multi-Asset Simulation

For correlated returns, use Cholesky decomposition:

1. **Pre-compute correlation matrix** from historical returns (Pearson coefficients)
2. **Cholesky decompose** correlation matrix: `C = L * L^T` where L is lower triangular
3. **Generate independent standard normal draws** for each asset
4. **Transform via Cholesky factor**: `correlated = L * independent`

```typescript
// Using ml-matrix library (CholeskyDecomposition class)
import { Matrix, CholeskyDecomposition } from 'ml-matrix';

function generateCorrelatedReturns(
  correlationMatrix: number[][],
  means: number[],
  stdDevs: number[],
  numDraws: number
): number[][] {
  const cholesky = new CholeskyDecomposition(new Matrix(correlationMatrix));
  const L = cholesky.lowerTriangularMatrix;

  const results: number[][] = [];
  for (let i = 0; i < numDraws; i++) {
    // Generate independent standard normal draws
    const independent = assets.map(() => boxMullerNormal());
    // Transform to correlated
    const correlated = L.mmul(Matrix.columnVector(independent)).to1DArray();
    // Scale by mean and std dev
    const returns = correlated.map((z, j) => means[j] + stdDevs[j] * z);
    results.push(returns);
  }
  return results;
}
```

**Source:** [Cholesky factorization for correlated simulation](https://mlisi.xyz/post/simulating-correlated-variables-with-the-cholesky-factorization/), [ml-matrix npm package](https://www.npmjs.com/package/ml-matrix)

#### Bootstrap Resampling Strategy

For time series, use **block bootstrap** to preserve autocorrelation:

| Method | Description | When to Use |
|--------|-------------|-------------|
| Moving Block Bootstrap (MBB) | Overlapping blocks of length b | General time series |
| Stationary Bootstrap | Random block lengths (geometric dist.) | Stationary series |
| Circular Block Bootstrap | Wraps around end to start | Avoid edge effects |

**Recommended approach:** Stationary bootstrap with expected block length of 12 months (for monthly returns) or 4 quarters (for quarterly). This preserves short-term autocorrelation while allowing regime transitions.

**Source:** [Bootstrapping time series data - Quantdare](https://quantdare.com/bootstrapping-time-series-data/), [Bootstrap methods for time series](https://lbelzile.github.io/timeseRies/boostrap-methods-for-time-series.html)

#### Regime Switching Implementation

Regime switching uses a hidden Markov model with 3 states:

| Regime | Characteristics | Typical Duration |
|--------|-----------------|------------------|
| Bull | High mean, low volatility | 3-7 years |
| Bear | Negative mean, high volatility | 1-2 years |
| Crash | Very negative mean, very high volatility | 0.5-1 year |

Implementation approach:
1. Define transition probability matrix (e.g., P(bull->bear) = 0.15)
2. At each simulation step, sample regime transition
3. Draw returns from regime-specific distribution OR select bootstrap blocks from regime-specific historical periods

**Source:** [Python for Regime-Switching Models](https://medium.com/@deepml1818/python-for-regime-switching-models-in-quantitative-finance-c54d2710f71b), [MATLAB Regime-Switching Models](https://www.mathworks.com/help/econ/regime-switching-models.html)

### Data Layer

Three-tier caching strategy for historical market data:

```
+-------------+     +-------------+     +-------------+
|   Memory    | --> | IndexedDB   | --> |  Network    |
|  (5 min)    |     | (permanent) |     |  (API)      |
+-------------+     +-------------+     +-------------+
     ^                    ^                   ^
     |                    |                   |
  Fastest            Persistent          Freshest
  ~0ms               ~10-50ms            ~500ms+
```

#### IndexedDB Schema (via Dexie.js)

```typescript
// Database definition with Dexie.js
import Dexie, { Table } from 'dexie';

interface HistoricalData {
  id?: number;
  symbol: string;
  source: 'FMP' | 'EODHD' | 'AlphaVantage' | 'Tiingo' | 'Yahoo' | 'bundled';
  frequency: 'daily' | 'monthly' | 'annual';
  dataPoints: { date: string; close: number; return?: number }[];
  fetchedAt: Date;
  expiresAt: Date;
}

interface Portfolio {
  id?: number;
  name: string;
  assets: { symbol: string; weight: number }[];
  createdAt: Date;
  updatedAt: Date;
}

interface SimulationResult {
  id?: number;
  portfolioId: number;
  config: SimulationConfig;
  summary: SimulationSummary;
  percentiles: PercentileData;
  runAt: Date;
}

class EveloDatabase extends Dexie {
  historicalData!: Table<HistoricalData>;
  portfolios!: Table<Portfolio>;
  simulationResults!: Table<SimulationResult>;

  constructor() {
    super('evelo');
    this.version(1).stores({
      historicalData: '++id, symbol, source, [symbol+source]',
      portfolios: '++id, name',
      simulationResults: '++id, portfolioId, runAt'
    });
  }
}
```

**Source:** [Dexie.js TypeScript Documentation](https://dexie.org/docs/Typescript), [Triple-Layered Caching Strategy](https://blog.thnkandgrow.com/triple-layer-caching-strategy-memory-indexeddb-http-improve-speed-96-percent/)

#### Data Flow: Historical to Simulation

```
1. User selects assets -> Check memory cache
2. Cache miss -> Check IndexedDB
3. IndexedDB miss/stale -> Fetch from API
4. Transform to returns: (P[t] - P[t-1]) / P[t-1]
5. Calculate correlation matrix from returns
6. Perform Cholesky decomposition
7. Generate bootstrap blocks (pre-sample for efficiency)
8. Package for worker: { returns, correlationMatrix, choleskyL, bootstrapBlocks }
```

### UI Components

Web Components architecture with Shadow DOM for encapsulation:

#### Component Hierarchy

```
<evelo-app>                          # Root application shell
  <evelo-header>                     # Logo, theme toggle, help
  <evelo-sidebar>                    # Collapsible parameters panel
    <evelo-asset-selector>           # Asset search, selection, weights
    <evelo-simulation-params>        # Iterations, years, SBLOC settings
    <evelo-run-button>               # Execute simulation
  <evelo-main>                       # Main content area
    <evelo-progress>                 # Simulation progress indicator
    <evelo-results>                  # Results container (appears after sim)
      <evelo-summary-card>           # Executive summary metrics
      <evelo-chart-panel>            # Chart container with tabs
        <evelo-probability-cone>     # Net worth over time
        <evelo-distribution>         # Terminal wealth histogram
        <evelo-composition>          # Portfolio donut chart
        <evelo-margin-risk>          # Margin call bar chart
        <evelo-correlation>          # Correlation heatmap
      <evelo-tables>                 # Data tables
        <evelo-percentile-table>     # P10, P25, P50, P75, P90
        <evelo-annual-returns>       # Expected returns by year
  <evelo-toast>                      # Notification system
  <evelo-modal>                      # Settings, export dialogs
```

#### Base Component Pattern

```typescript
// Base class for all eVelo components
abstract class EveloComponent extends HTMLElement {
  protected shadow: ShadowRoot;
  private eventCleanup: (() => void)[] = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
    this.setupEventListeners();
  }

  disconnectedCallback(): void {
    // Critical: prevent memory leaks
    this.eventCleanup.forEach(cleanup => cleanup());
    this.eventCleanup = [];
  }

  protected abstract render(): void;
  protected abstract setupEventListeners(): void;

  // Helper for subscribing to event bus with auto-cleanup
  protected subscribe(event: string, handler: (data: any) => void): void {
    eventBus.on(event, handler);
    this.eventCleanup.push(() => eventBus.off(event, handler));
  }

  // Helper for emitting events
  protected emit(event: string, data?: any): void {
    eventBus.emit(event, data);
  }
}
```

**Source:** [Web Components Communication Using an Event Bus](https://labs.thisdot.co/blog/web-components-communication-using-an-event-bus/), [Smashing Magazine - Web Components](https://www.smashingmagazine.com/2025/03/web-components-vs-framework-components/)

### Visualization Layer

Chart.js integration with performance optimizations:

#### Chart Configuration Strategy

```typescript
// Shared chart configuration
const chartDefaults = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 }, // Disable for large datasets
  plugins: {
    decimation: {
      enabled: true,
      algorithm: 'lttb', // Largest Triangle Three Buckets
      samples: 500       // Max points to display
    }
  }
};

// Theme-aware color function
function getChartColors(theme: 'light' | 'dark') {
  return {
    primary: theme === 'dark' ? '#4ade80' : '#059669',
    secondary: theme === 'dark' ? '#60a5fa' : '#2563eb',
    danger: theme === 'dark' ? '#f87171' : '#dc2626',
    grid: theme === 'dark' ? '#374151' : '#e5e7eb',
    text: theme === 'dark' ? '#f3f4f6' : '#1f2937'
  };
}
```

#### OffscreenCanvas for Worker Rendering

For extremely large datasets, Chart.js supports OffscreenCanvas in workers:

```typescript
// Main thread
const canvas = document.querySelector('canvas');
const offscreen = canvas.transferControlToOffscreen();
chartWorker.postMessage({ canvas: offscreen, data }, [offscreen]);

// Worker thread
self.onmessage = (e) => {
  const { canvas, data } = e.data;
  const chart = new Chart(canvas, {
    type: 'line',
    data: data,
    options: { animation: false }
  });
};
```

**Note:** This adds complexity. Only use if main-thread Chart.js becomes a bottleneck after optimization via decimation.

**Source:** [Chart.js Performance Documentation](https://www.chartjs.org/docs/latest/general/performance.html), [OffscreenCanvas with Chart.js](https://blog.scottlogic.com/2020/03/19/offscreen-canvas.html)

## Data Flow

### Complete Simulation Flow

```
USER ACTION                    SYSTEM RESPONSE
-----------                    ---------------
1. Configure assets      -->   Asset weights validated, stored in state
2. Set parameters        -->   Parameters validated, stored in state
3. Click "Run"           -->   Event: 'simulation:start'
                               |
                               v
4. Load historical data  <--   DataService checks cache hierarchy
                               - Memory hit? Return immediately
                               - IndexedDB hit? Load and cache to memory
                               - Miss? Fetch from API, store in IndexedDB + memory
                               |
                               v
5. Prepare simulation    <--   Calculate correlation matrix
                               Perform Cholesky decomposition
                               Generate bootstrap block indices
                               Create worker task batches
                               |
                               v
6. Execute in workers    <--   SimulationCoordinator.dispatch(tasks)
                               Workers process batches in parallel
                               Event: 'simulation:progress' (periodic)
                               |
                               v
7. Aggregate results     <--   Collect results from all workers
                               Calculate percentiles, statistics
                               Store in IndexedDB for history
                               Event: 'simulation:complete'
                               |
                               v
8. Update UI             <--   Components receive 'simulation:complete'
                               Charts render with new data
                               Summary card updates
                               Progress indicator hides
```

### Event Bus Events

| Event | Payload | Producers | Consumers |
|-------|---------|-----------|-----------|
| `asset:selected` | `{ symbol, weight }` | AssetSelector | SimulationParams, State |
| `asset:removed` | `{ symbol }` | AssetSelector | SimulationParams, State |
| `params:changed` | `{ iterations, years, ... }` | SimulationParams | State |
| `simulation:start` | `SimulationConfig` | RunButton | SimulationCoordinator |
| `simulation:progress` | `{ percent, iteration }` | Coordinator | ProgressIndicator |
| `simulation:complete` | `SimulationResult` | Coordinator | All result components |
| `simulation:error` | `{ error, context }` | Coordinator | Toast, ErrorBoundary |
| `theme:changed` | `'light' \| 'dark'` | ThemeToggle | All components |
| `data:fetching` | `{ symbol }` | DataService | LoadingIndicator |
| `data:cached` | `{ symbol, source }` | DataService | AssetSelector |

## Web Worker Strategy

### Worker Pool Architecture

**Recommendation:** Use a worker pool sized to `navigator.hardwareConcurrency - 1` (leave one core for main thread/UI).

```typescript
class WorkerPool {
  private workers: Worker[] = [];
  private queue: WorkerTask[] = [];
  private busy: Set<Worker> = new Set();

  constructor(private size: number = navigator.hardwareConcurrency - 1) {
    for (let i = 0; i < this.size; i++) {
      const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url));
      this.workers.push(worker);
    }
  }

  async dispatch(tasks: WorkerTask[]): Promise<SimulationResult[]> {
    const results: SimulationResult[] = [];

    return new Promise((resolve) => {
      let completed = 0;

      const processNext = (worker: Worker) => {
        if (this.queue.length === 0) {
          this.busy.delete(worker);
          if (this.busy.size === 0) resolve(results);
          return;
        }

        const task = this.queue.shift()!;
        this.busy.add(worker);

        worker.onmessage = (e) => {
          results.push(e.data);
          completed++;
          eventBus.emit('simulation:progress', {
            percent: (completed / tasks.length) * 100
          });
          processNext(worker);
        };

        // Use transferables for zero-copy
        worker.postMessage(task, task.transferables);
      };

      this.queue = [...tasks];
      this.workers.forEach(processNext);
    });
  }

  terminate(): void {
    this.workers.forEach(w => w.terminate());
  }
}
```

### Data Transfer Strategy

| Data Type | Transfer Method | Rationale |
|-----------|-----------------|-----------|
| Config (small) | Structured clone | Simple, low overhead |
| Historical returns | Transferable Float64Array | Zero-copy, large data |
| Bootstrap indices | Transferable Uint32Array | Zero-copy |
| Results buffer | Transferable Float64Array | Zero-copy |

**Critical insight:** Transfer the ArrayBuffer, not the TypedArray. The TypedArray wrapper must be recreated on the receiving end.

```typescript
// Sending from main thread
const returns = new Float64Array(historicalReturns);
worker.postMessage(
  { config, returns },
  [returns.buffer] // Transfer the underlying ArrayBuffer
);

// Receiving in worker
self.onmessage = (e) => {
  const { config, returns } = e.data;
  // 'returns' is already a Float64Array, ready to use
};
```

**Source:** [Transferable Objects MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects), [Communicating Large Objects with Web Workers](https://developers.redhat.com/blog/2014/05/20/communicating-large-objects-with-web-workers-in-javascript)

### Batching Strategy

For 100,000 iterations with 4 workers:

| Strategy | Batch Size | Batches per Worker | Pros | Cons |
|----------|------------|-------------------|------|------|
| Large batches | 25,000 | 1 | Simple | No progress updates |
| Medium batches | 5,000 | 5 | Good progress | Moderate overhead |
| Small batches | 1,000 | 25 | Fine progress | Higher overhead |

**Recommendation:** 5,000 iterations per batch (20 batches total). This provides:
- Progress updates every 5% completion
- Reasonable message passing overhead
- Natural work distribution across workers

### Random Number Generation in Workers

`crypto.getRandomValues()` is available in Web Workers but has overhead. For simulation, use a seeded PRNG (Mersenne Twister or xorshift128+) for:
- Reproducibility (same seed = same results)
- Performance (much faster than crypto RNG)
- Deterministic testing

```typescript
// Use a seeded PRNG like seedrandom
import seedrandom from 'seedrandom';

const rng = seedrandom(config.seed.toString());
const uniform = () => rng(); // 0-1 uniform
const normal = () => boxMuller(uniform); // Standard normal

function boxMuller(uniform: () => number): number {
  const u1 = uniform();
  const u2 = uniform();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
```

**Source:** [V8 Math.random() implementation](https://v8.dev/blog/math-random), [crypto.getRandomValues MDN](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)

## State Management

Without a framework, use a combination of:

### 1. Centralized State Store

```typescript
// Singleton state store with observer pattern
type Listener<T> = (state: T) => void;

class Store<T extends object> {
  private state: T;
  private listeners: Set<Listener<T>> = new Set();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): Readonly<T> {
    return this.state;
  }

  setState(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// Application state
interface AppState {
  assets: AssetConfig[];
  simulationParams: SimulationParams;
  simulationStatus: 'idle' | 'running' | 'complete' | 'error';
  results: SimulationResult | null;
  theme: 'light' | 'dark';
}

export const appStore = new Store<AppState>({
  assets: [],
  simulationParams: defaultParams,
  simulationStatus: 'idle',
  results: null,
  theme: 'light'
});
```

### 2. Event Bus for Component Communication

```typescript
type EventCallback = (data: any) => void;

class EventBus {
  private events: Map<string, Set<EventCallback>> = new Map();

  on(event: string, callback: EventCallback): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  off(event: string, callback: EventCallback): void {
    this.events.get(event)?.delete(callback);
  }

  emit(event: string, data?: any): void {
    this.events.get(event)?.forEach(callback => callback(data));
  }
}

export const eventBus = new EventBus();
```

### 3. Component-Local State via Class Properties

For UI-only state (expanded/collapsed, form values before submission):

```typescript
class EveloSidebar extends EveloComponent {
  private isCollapsed = false; // Local UI state

  toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    this.render(); // Re-render only this component
  }
}
```

**Pattern guidance:**
- **Global state store:** Simulation config, results, theme
- **Event bus:** Cross-component notifications, user actions
- **Local state:** UI-only concerns (animations, form drafts)

**Source:** [State Management Strategies Without Frameworks](https://namastedev.com/blog/state-management-strategies-without-frameworks-vanilla-patterns-that-scale/), [Web Apps From Scratch: State Management](https://dev.to/snickdx/web-apps-from-scratch-state-management-2h8c)

## Component Boundaries

| Component | Responsibilities | Communicates With |
|-----------|------------------|-------------------|
| **SimulationCoordinator** | Orchestrate worker pool, distribute tasks, aggregate results | Workers, EventBus, DataService |
| **SimulationWorker** | Execute iteration batches, return partial results | SimulationCoordinator (via postMessage) |
| **DataService** | Cache management, API calls, data transformation | IndexedDB, API endpoints, EventBus |
| **StateStore** | Hold application state, notify subscribers | All components (via subscription) |
| **EventBus** | Route events between components | All components |
| **EveloApp** | Application shell, routing, global error boundary | All child components |
| **EveloSidebar** | Parameter input, asset selection | StateStore, EventBus |
| **EveloResults** | Display simulation results, charts | StateStore, ChartComponents |
| **ChartComponent (base)** | Chart.js integration, theme handling | Chart.js, ThemeService |

### Dependency Direction

```
UI Components
     |
     v
Event Bus / State Store  <-- No dependencies on UI
     |
     v
Services (Data, Simulation)  <-- No dependencies on state management
     |
     v
Core (Math, Types)  <-- No dependencies
```

**Critical rule:** Dependencies flow downward. Lower layers never import from upper layers.

## Build Order

Based on dependencies, build in this order:

### Phase 1: Foundation (No dependencies)

| Module | Why First |
|--------|-----------|
| TypeScript config, build tooling | Everything depends on build |
| Core types/interfaces | All modules need type definitions |
| Mathematical utilities | Statistics, Cholesky, RNG - used by simulation |
| Event Bus | Communication backbone |
| State Store | State management backbone |

### Phase 2: Services (Depends on Foundation)

| Module | Why Second |
|--------|------------|
| IndexedDB/Dexie setup | Data layer needs database |
| DataService | Simulation needs historical data |
| API clients | DataService needs API integration |

### Phase 3: Simulation Engine (Depends on Services)

| Module | Why Third |
|--------|-----------|
| SimulationWorker | Core computation, tested in isolation |
| CorrelationEngine | Part of simulation, needs math utils |
| BootstrapSampler | Part of simulation |
| RegimeSwitcher | Part of simulation |
| SBLOCEngine | Part of simulation |
| WorkerPool | Orchestration, needs workers |
| SimulationCoordinator | Top-level, needs everything above |

### Phase 4: UI Components (Depends on Services + State)

| Module | Why Fourth |
|--------|------------|
| Base Web Component class | All UI components extend this |
| Simple components (button, input) | Used by complex components |
| Chart components | Used by results panels |
| Complex panels (sidebar, results) | Compose simple components |
| App shell | Composes all panels |

### Phase 5: Integration

| Module | Why Fifth |
|--------|-----------|
| Service Worker (PWA) | Needs static assets to cache |
| Single-file bundler | Needs all code complete |
| Export functionality | Needs all features working |

### Build Order Rationale

```
Foundation  -->  Services  -->  Simulation  -->  UI  -->  Integration
    |              |               |            |            |
  Types         Data            Workers      Components   PWA/Export
  Utils        Caching          Math          Charts      Bundling
  EventBus     API calls        Coordination  Layout
```

**Key insight:** The simulation engine can be fully built and tested before any UI exists. This enables:
- Unit testing of financial calculations in isolation
- Performance benchmarking without UI overhead
- Parallel development (backend team + frontend team)

## Testing Implications

### Testing Strategy by Layer

| Layer | Test Type | Tools | Focus |
|-------|-----------|-------|-------|
| Math utilities | Unit | Vitest | Numerical accuracy to 8 decimals |
| Simulation logic | Unit | Vitest + Worker mock | Deterministic results with seed |
| Workers | Integration | Vitest | Message passing, data transfer |
| DataService | Integration | Vitest + IndexedDB mock | Cache behavior, API fallback |
| Components | Component | Vitest + @testing-library | Rendering, event handling |
| Full system | E2E | Playwright | User flows, performance |

### Financial Calculation Testing

```typescript
// Test against Excel/known values to 8 decimal places
describe('Cholesky decomposition', () => {
  it('should decompose correlation matrix correctly', () => {
    const correlation = [
      [1.0, 0.5],
      [0.5, 1.0]
    ];
    const L = choleskyDecompose(correlation);

    // Verify L * L^T = original matrix
    const reconstructed = multiply(L, transpose(L));
    expect(reconstructed[0][0]).toBeCloseTo(1.0, 8);
    expect(reconstructed[0][1]).toBeCloseTo(0.5, 8);
  });
});

describe('Monte Carlo statistics', () => {
  it('should produce stable percentiles at 100k iterations', () => {
    const results = runSimulation({ iterations: 100000, seed: 42 });
    // With 100k iterations, percentiles should be stable
    expect(results.p50).toBeCloseTo(expectedMedian, 2); // 2 decimal precision
  });
});
```

### Testability Design Decisions

1. **Pure functions for math:** No side effects, easy to test
2. **Seeded RNG:** Deterministic results for snapshot testing
3. **Dependency injection:** Services injected, easily mocked
4. **Event-driven:** Actions and results are observable events
5. **Separated layers:** Test each layer independently

**Source:** [Jest for JavaScript Testing](https://jestjs.io/), [Testing Financial Calculations](https://github.com/travishorn/finance)

## Confidence Assessment

| Area | Confidence | Reasoning |
|------|------------|-----------|
| Worker pool strategy | HIGH | Well-documented pattern, multiple sources agree on `hardwareConcurrency - 1` |
| Transferable objects | HIGH | MDN documentation, Chrome blog confirm performance benefits |
| Cholesky for correlation | HIGH | Standard mathematical approach, verified in academic sources |
| Event bus pattern | HIGH | Multiple articles demonstrate for Web Components specifically |
| Block bootstrap | MEDIUM | Statistical approach verified, JavaScript implementation synthesized |
| Regime switching | MEDIUM | Concept verified in finance literature, JS implementation synthesized |
| Dexie.js patterns | HIGH | Official documentation provides TypeScript patterns |
| Chart.js + OffscreenCanvas | MEDIUM | Chart.js docs mention support, but complexity may not be warranted |
| Build order | MEDIUM | Logical dependency analysis, not from external source |

## Open Questions

1. **SharedArrayBuffer viability:** Requires COOP/COEP headers. Will this work with single-file HTML export? May need to fall back to transferables only.

2. **Safari `requestIdleCallback`:** Safari keeps it behind a flag. Need fallback strategy for progress updates on Safari.

3. **Exact Cholesky library choice:** ml-matrix vs math.js vs custom implementation - need to benchmark for 5x5 matrices in hot loop.

4. **Bootstrap block size optimization:** Literature suggests 12 months, but optimal for specific asset classes may vary.

## Sources

### Primary (HIGH confidence)
- [MDN Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [MDN Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
- [Chart.js Performance Documentation](https://www.chartjs.org/docs/latest/general/performance.html)
- [Dexie.js TypeScript Documentation](https://dexie.org/docs/Typescript)
- [ml-matrix npm package](https://www.npmjs.com/package/ml-matrix)

### Secondary (MEDIUM confidence)
- [Cholesky factorization for correlated simulation](https://mlisi.xyz/post/simulating-correlated-variables-with-the-cholesky-factorization/)
- [Web Components Communication Using an Event Bus](https://labs.thisdot.co/blog/web-components-communication-using-an-event-bus/)
- [State Management Strategies Without Frameworks](https://namastedev.com/blog/state-management-strategies-without-frameworks-vanilla-patterns-that-scale/)
- [Bootstrapping time series data - Quantdare](https://quantdare.com/bootstrapping-time-series-data/)
- [High-Performance JavaScript: Web Workers, SharedArrayBuffer](https://dev.to/rigalpatel001/high-performance-javascript-simplified-web-workers-sharedarraybuffer-and-atomics-3ig1)

### Tertiary (LOW confidence - needs validation)
- [Python for Regime-Switching Models](https://medium.com/@deepml1818/python-for-regime-switching-models-in-quantitative-finance-c54d2710f71b) - Python source, JS implementation synthesized
- [Triple-Layered Caching Strategy](https://blog.thnkandgrow.com/triple-layer-caching-strategy-memory-indexeddb-http-improve-speed-96-percent/) - General pattern, specific timings may vary

---

**Research date:** 2026-01-17
**Valid until:** 2026-02-17 (30 days - stable patterns)
