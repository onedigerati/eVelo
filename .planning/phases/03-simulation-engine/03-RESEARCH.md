# Phase 3: Simulation Engine - Research

**Researched:** 2026-01-17
**Domain:** Monte Carlo simulation with Web Workers, bootstrap resampling, regime-switching
**Confidence:** HIGH (core patterns), MEDIUM (block bootstrap), LOW (HMM libraries)

## Summary

Phase 3 implements the Monte Carlo simulation engine using Web Workers for non-blocking computation. The architecture uses **Comlink with vite-plugin-comlink** for ergonomic worker communication and **transferable ArrayBuffers** for efficient data transfer of large result sets. The simulation supports three return generation methods: simple bootstrap, block bootstrap (preserving autocorrelation), and regime-switching (bull/bear/crash periods).

**Key findings:**
1. Use **vite-plugin-comlink** for zero-boilerplate worker setup with full TypeScript inference
2. Transfer Float64Array.buffer, not the typed array itself (ArrayBuffer is transferable, typed arrays are not)
3. Block bootstrap block length selection should use the **Politis-White (2004) rule** with correction
4. No production-ready JavaScript HMM library exists - must implement regime-switching from scratch
5. Use **navigator.hardwareConcurrency** to size worker pools (default to 4 if unavailable)

**Primary recommendation:** Single worker with batched iterations; worker pool only if single worker proves insufficient. Keep complexity minimal for 100k iterations.

## Standard Stack

The established libraries and patterns for this domain.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Comlink | 4.x | Web Worker RPC | Google Chrome Labs; 1.1KB; makes workers feel like async functions |
| vite-plugin-comlink | 4.x | Vite integration | Auto-handles expose/wrap; TypeScript type inference |
| simple-statistics | 7.8.x | Statistical functions | Already in stack; provides quantile, sampleWithReplacement |
| seedrandom | 3.x | Deterministic RNG | Already in stack; reproducible simulation runs |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| workerpool | 10.x | Worker pool management | Only if single worker is insufficient for 100k iterations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| vite-plugin-comlink | Raw Comlink | More boilerplate but no plugin dependency |
| workerpool | Custom pool | More control but must manage worker lifecycle |
| simple-statistics quantile | Hand-rolled | simple-statistics already in stack, well-tested |

**Installation:**
```bash
npm install -D vite-plugin-comlink
# Note: comlink, simple-statistics, seedrandom already installed in Phase 1
```

**vite.config.ts update:**
```typescript
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { comlink } from 'vite-plugin-comlink';

export default defineConfig({
  plugins: [comlink(), viteSingleFile()],
  worker: {
    plugins: () => [comlink()],
  },
  build: {
    target: 'esnext',
    cssCodeSplit: false,
  },
});
```

**vite-env.d.ts update:**
```typescript
/// <reference types="vite/client" />
/// <reference types="vite-plugin-comlink/client" />
```

## Architecture Patterns

### Recommended Project Structure

```
src/
  simulation/
    simulation.worker.ts     # Worker entry point (exported functions)
    monte-carlo.ts           # Core simulation algorithm
    bootstrap.ts             # Simple and block bootstrap resampling
    regime-switching.ts      # Bull/bear/crash Markov model
    types.ts                 # SimulationConfig, SimulationResult types
    index.ts                 # Main thread API (creates worker, handles results)
```

### Pattern 1: Comlink Worker with vite-plugin-comlink

**What:** TypeScript workers with automatic type inference and no expose/wrap boilerplate.

**When to use:** All Web Worker scenarios in Vite projects.

**Example:**
```typescript
// src/simulation/simulation.worker.ts
import type { SimulationConfig, SimulationResult } from './types';
import { runMonteCarlo } from './monte-carlo';

export async function simulate(
  config: SimulationConfig,
  onProgress?: (percent: number) => void
): Promise<SimulationResult> {
  return runMonteCarlo(config, onProgress);
}

// src/simulation/index.ts (main thread)
const worker = new ComlinkWorker<typeof import('./simulation.worker')>(
  new URL('./simulation.worker', import.meta.url),
  { type: 'module' }
);

// Full TypeScript inference - simulate returns Promise<SimulationResult>
const results = await worker.simulate(config);
```

### Pattern 2: Transferable Float64Array for Large Results

**What:** Zero-copy transfer of simulation results using ArrayBuffer transfer.

**When to use:** When returning large arrays (10k+ elements) from worker.

**Example:**
```typescript
// In worker - prepare transferable result
import * as Comlink from 'comlink';

export function simulate(config: SimulationConfig): TransferableResult {
  const terminalValues = new Float64Array(config.iterations);
  // ... fill terminalValues with simulation results

  // Transfer the underlying buffer, not the typed array
  return Comlink.transfer(
    { terminalValues, percentiles: { p10, p25, p50, p75, p90 } },
    [terminalValues.buffer]
  );
}

// In main thread - buffer is transferred, not copied
const result = await worker.simulate(config);
// result.terminalValues is a Float64Array with the transferred buffer
```

### Pattern 3: Progress Reporting via Comlink.proxy

**What:** Real-time progress updates from worker to main thread.

**When to use:** Long-running simulations (>1 second expected duration).

**Example:**
```typescript
// Main thread
const result = await worker.simulate(
  config,
  Comlink.proxy((percent: number) => {
    progressBar.value = percent;
  })
);

// Worker
export async function simulate(
  config: SimulationConfig,
  onProgress?: (percent: number) => void
): Promise<SimulationResult> {
  const batchSize = 1000;
  for (let i = 0; i < config.iterations; i += batchSize) {
    // Run batch
    await runBatch(i, Math.min(i + batchSize, config.iterations));

    // Report progress
    if (onProgress) {
      onProgress((i / config.iterations) * 100);
    }
  }
  return results;
}
```

### Pattern 4: Cancellation via AbortSignal

**What:** Allow users to cancel in-progress simulations.

**When to use:** Any simulation that might take >2 seconds.

**Example:**
```typescript
// Main thread
const controller = new AbortController();
cancelButton.onclick = () => controller.abort();

try {
  const result = await worker.simulate(config, controller.signal);
} catch (e) {
  if (e.name === 'AbortError') {
    console.log('Simulation cancelled');
  }
}

// Worker - check signal periodically
export async function simulate(
  config: SimulationConfig,
  signal?: AbortSignal
): Promise<SimulationResult> {
  for (let i = 0; i < config.iterations; i += batchSize) {
    if (signal?.aborted) {
      throw new DOMException('Simulation cancelled', 'AbortError');
    }
    await runBatch(i, Math.min(i + batchSize, config.iterations));
  }
  return results;
}
```

### Pattern 5: Block Bootstrap with Automatic Block Length

**What:** Preserve autocorrelation in resampled returns using overlapping blocks.

**When to use:** SIM-05 requirement - historical returns with serial correlation.

**Example:**
```typescript
/**
 * Politis-White (2004) automatic block length selection
 * Uses the "flat-top" lag window approach with Patton-Politis-White (2009) correction
 *
 * Simplified formula: L* = c * n^(1/3) where c depends on autocorrelation
 * For financial returns, typical block lengths are 12-24 months
 */
function optimalBlockLength(returns: number[]): number {
  const n = returns.length;

  // Calculate first-order autocorrelation
  const mean_r = mean(returns);
  let numerator = 0;
  let denominator = 0;

  for (let i = 1; i < n; i++) {
    numerator += (returns[i] - mean_r) * (returns[i - 1] - mean_r);
  }
  for (let i = 0; i < n; i++) {
    denominator += (returns[i] - mean_r) ** 2;
  }

  const rho1 = numerator / denominator;

  // Politis-White rule with correction
  // Higher autocorrelation -> larger blocks
  const g = 2 * Math.abs(rho1) / (1 - rho1 ** 2);
  const blockLength = Math.ceil(Math.pow(3 * n / 2, 1/3) * Math.pow(g, 1/3));

  // Clamp to reasonable bounds: min 3, max n/4
  return Math.max(3, Math.min(Math.floor(n / 4), blockLength));
}

/**
 * Moving Block Bootstrap - resamples overlapping blocks
 */
function blockBootstrap(
  returns: number[],
  targetLength: number,
  blockLength: number,
  rng: () => number
): number[] {
  const result: number[] = [];
  const maxStart = returns.length - blockLength;

  while (result.length < targetLength) {
    const startIdx = Math.floor(rng() * (maxStart + 1));
    for (let i = 0; i < blockLength && result.length < targetLength; i++) {
      result.push(returns[startIdx + i]);
    }
  }

  return result;
}
```

### Pattern 6: Regime-Switching with Pre-Calibrated Transition Matrix

**What:** Model bull/bear/crash market periods with Markov chain transitions.

**When to use:** SIM-06 requirement - realistic regime sequences.

**Example:**
```typescript
// Pre-calibrated transition probabilities based on historical S&P 500 data
// Source: Academic literature on regime-switching models (Hamilton 1989, et al.)
const DEFAULT_TRANSITION_MATRIX: TransitionMatrix = {
  // From Bull: 97% stay bull, 2.5% to bear, 0.5% to crash
  bull:  { bull: 0.97, bear: 0.025, crash: 0.005 },
  // From Bear: 3% to bull, 95% stay bear, 2% to crash
  bear:  { bull: 0.03, bear: 0.95, crash: 0.02 },
  // From Crash: 10% to bull, 30% to bear, 60% stay crash
  crash: { bull: 0.10, bear: 0.30, crash: 0.60 },
};

// Regime-specific return distributions (annualized)
const REGIME_PARAMS = {
  bull:  { mean: 0.12, stddev: 0.12 }, // 12% return, 12% vol
  bear:  { mean: -0.08, stddev: 0.20 }, // -8% return, 20% vol
  crash: { mean: -0.30, stddev: 0.35 }, // -30% return, 35% vol
};

type Regime = 'bull' | 'bear' | 'crash';

function nextRegime(current: Regime, matrix: TransitionMatrix, rng: () => number): Regime {
  const probs = matrix[current];
  const r = rng();

  if (r < probs.bull) return 'bull';
  if (r < probs.bull + probs.bear) return 'bear';
  return 'crash';
}

function generateRegimeSwitchingReturns(
  years: number,
  initialRegime: Regime,
  matrix: TransitionMatrix,
  params: typeof REGIME_PARAMS,
  rng: () => number
): { returns: number[]; regimes: Regime[] } {
  const returns: number[] = [];
  const regimes: Regime[] = [];
  let regime = initialRegime;

  for (let year = 0; year < years; year++) {
    regimes.push(regime);
    const { mean, stddev } = params[regime];
    returns.push(normalRandom(mean, stddev, rng));
    regime = nextRegime(regime, matrix, rng);
  }

  return { returns, regimes };
}
```

### Anti-Patterns to Avoid

- **Creating new worker per simulation:** Workers have startup cost (~50ms). Create once, reuse.
- **Transferring then accessing:** After `Comlink.transfer()`, original array is detached (unusable).
- **Fixed block length for all series:** Different series have different autocorrelation. Calculate per-series.
- **Synchronous random in loops:** Use pre-seeded RNG passed as parameter for reproducibility.
- **Ignoring positive-definiteness:** Correlation matrices must be positive-definite for Cholesky. Math module already handles this.

## Don't Hand-Roll

Problems that look simple but have existing solutions.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Normal distribution sampling | Custom Gaussian | `normalRandom` from math module | Box-Muller already implemented in Phase 2 |
| Correlated samples | Manual correlation | `correlatedSamples` from math module | Cholesky decomposition already implemented |
| Quantile calculation | Hand-rolled percentile | `quantile` from simple-statistics | Edge cases handled, well-tested |
| Sample with replacement | Custom random selection | `sampleWithReplacement` from simple-statistics | Handles edge cases, accepts custom RNG |
| Deterministic random | Custom LCG | `seedrandom` | Already in stack, well-tested PRNG |
| Worker message passing | Raw postMessage | Comlink | Eliminates boilerplate, TypeScript support |
| Kahan summation | Naive addition | `sum` from math module | Already implemented in Phase 2 |

**Key insight:** The math module from Phase 2 provides all the statistical primitives. Focus Phase 3 on orchestration (worker management, batching, progress) and domain logic (bootstrap variants, regime-switching).

## Common Pitfalls

### Pitfall 1: Transferring TypedArray Instead of Buffer

**What goes wrong:** `Comlink.transfer(float64Array, [float64Array])` fails silently or throws.

**Why it happens:** TypedArrays (Float64Array, Uint8Array) are serializable but NOT transferable. Only their underlying ArrayBuffer is transferable.

**How to avoid:**
```typescript
// WRONG
Comlink.transfer(data, [data]);

// CORRECT
Comlink.transfer(data, [data.buffer]);
```

**Warning signs:** Data is copied (slow) instead of transferred, or transfer throws error.

### Pitfall 2: Accessing Transferred Array

**What goes wrong:** Reading from array after transfer throws `TypeError: Cannot perform ... on a detached ArrayBuffer`.

**Why it happens:** Transfer moves ownership. The sender loses access completely.

**How to avoid:**
- Clone data before transfer if you need to keep a copy
- Design flow so sender doesn't need the data after transfer

**Warning signs:** Intermittent errors on array access after worker returns.

### Pitfall 3: Fixed Block Length for Block Bootstrap

**What goes wrong:** Block bootstrap doesn't preserve autocorrelation for some asset classes.

**Why it happens:** Different series have different correlation structures. Monthly bonds vs daily crypto have vastly different optimal block lengths.

**How to avoid:**
- Calculate optimal block length per-series using Politis-White rule
- Provide reasonable bounds (min 3, max n/4)
- Allow user override for advanced users

**Warning signs:** Bootstrap resamples look too smooth or too choppy compared to originals.

### Pitfall 4: Worker Creation Inside Simulation Loop

**What goes wrong:** 100k iterations each create a worker, causing massive overhead and potential memory exhaustion.

**Why it happens:** Misunderstanding worker lifecycle.

**How to avoid:**
- Create worker once at app initialization
- Reuse for all simulations
- Only terminate on app close or explicit cleanup

**Warning signs:** Memory grows unbounded; simulations get slower over time.

### Pitfall 5: Not Batching Progress Updates

**What goes wrong:** Calling `onProgress` for each of 100k iterations floods the message channel and slows simulation 10x.

**Why it happens:** Each message has overhead; 100k messages is too many.

**How to avoid:**
- Batch iterations (e.g., 1000 at a time)
- Report progress per batch, not per iteration
- Use `requestAnimationFrame` on main thread for smooth UI updates

**Warning signs:** Progress bar updates consume more time than actual computation.

### Pitfall 6: Non-Positive-Definite Correlation Matrix

**What goes wrong:** Cholesky decomposition fails; correlated sampling produces NaN.

**Why it happens:** User-provided correlations may not form valid correlation matrix (e.g., rho(A,B)=0.9, rho(B,C)=0.9, rho(A,C)=-0.9 is impossible).

**How to avoid:**
- Math module's `choleskyDecomposition` returns null for invalid matrices
- Fall back to identity (uncorrelated) with warning
- Validate correlation matrices before simulation

**Warning signs:** NaN values in simulation results; simulation throws on some portfolios.

## Code Examples

Verified patterns from official sources.

### Comlink Worker Setup (vite-plugin-comlink)

```typescript
// src/simulation/simulation.worker.ts
// Source: https://github.com/mathe42/vite-plugin-comlink

import type { SimulationConfig, SimulationResult } from './types';

export async function simulate(config: SimulationConfig): Promise<SimulationResult> {
  // Worker function - becomes Promise-returning on main thread
  const terminalValues = runMonteCarlo(config);
  return { terminalValues, percentiles: calculatePercentiles(terminalValues) };
}

export function healthCheck(): string {
  return 'Worker ready';
}
```

```typescript
// src/simulation/index.ts
// Source: https://github.com/mathe42/vite-plugin-comlink

// ComlinkWorker is globally available via vite-plugin-comlink
const simulationWorker = new ComlinkWorker<typeof import('./simulation.worker')>(
  new URL('./simulation.worker', import.meta.url),
  { type: 'module' }
);

// Usage - full type inference
export async function runSimulation(config: SimulationConfig): Promise<SimulationResult> {
  await simulationWorker.healthCheck(); // Verify worker is ready
  return simulationWorker.simulate(config);
}
```

### Transferable Result Pattern

```typescript
// Source: MDN Transferable Objects + Comlink documentation
import * as Comlink from 'comlink';

interface TransferableResult {
  terminalValues: Float64Array;
  statistics: { mean: number; median: number; p10: number; p90: number };
}

export function simulate(config: SimulationConfig): TransferableResult {
  const terminalValues = new Float64Array(config.iterations);

  // Fill array with simulation results
  for (let i = 0; i < config.iterations; i++) {
    terminalValues[i] = runSingleIteration(config);
  }

  const stats = {
    mean: mean(Array.from(terminalValues)),
    median: quantile(Array.from(terminalValues), 0.5),
    p10: quantile(Array.from(terminalValues), 0.1),
    p90: quantile(Array.from(terminalValues), 0.9),
  };

  // Transfer buffer ownership - array becomes detached in worker after this
  return Comlink.transfer(
    { terminalValues, statistics: stats },
    [terminalValues.buffer]
  );
}
```

### simple-statistics sampleWithReplacement

```typescript
// Source: https://simple-statistics.github.io/docs/
import { sampleWithReplacement, quantile } from 'simple-statistics';
import seedrandom from 'seedrandom';

function simpleBootstrap(
  historicalReturns: number[],
  targetYears: number,
  seed: string
): number[] {
  const rng = seedrandom(seed);

  // sampleWithReplacement(array, count, randomSource)
  return sampleWithReplacement(
    historicalReturns,
    targetYears,
    rng  // Custom RNG for reproducibility
  );
}

// Percentile calculation
function calculatePercentiles(values: number[]): Percentiles {
  return {
    p10: quantile(values, 0.1),
    p25: quantile(values, 0.25),
    p50: quantile(values, 0.5),
    p75: quantile(values, 0.75),
    p90: quantile(values, 0.9),
  };
}
```

### Navigator.hardwareConcurrency for Worker Sizing

```typescript
// Source: MDN Navigator.hardwareConcurrency

function getOptimalWorkerCount(): number {
  // Returns number of logical processors, or 4 as safe default
  const cores = navigator.hardwareConcurrency || 4;

  // Leave 1-2 cores for main thread and OS
  return Math.max(1, cores - 1);
}

// Usage: Only needed if implementing worker pool
// For single worker approach (recommended), this isn't needed
```

## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw postMessage | Comlink | 2019 stable | Worker code 90% cleaner |
| Structured clone | Transferable objects | Always existed but underused | 10-100x faster for large arrays |
| Fixed block length | Politis-White automatic | Academic standard since 2004 | More accurate bootstrap |
| Manual worker lifecycle | vite-plugin-comlink | 2023+ | Zero boilerplate in Vite |

**New patterns to consider:**
- **SharedArrayBuffer + Atomics:** True shared memory between threads. Requires COOP/COEP headers. Consider only if transferable proves insufficient.
- **OffscreenCanvas:** If adding real-time charting in worker. Not needed for batch simulation.

**Deprecated/outdated:**
- **Worker.terminate() for cancellation:** Loses all state. Use AbortSignal instead.
- **importScripts():** Use ESM imports in workers (Vite handles this).
- **callback-based worker communication:** Use Comlink's async/await.

## Open Questions

Things that couldn't be fully resolved.

1. **JavaScript HMM libraries for regime-switching**
   - What we know: `hidden-markov-model` npm package exists but is archived (May 2022) and only provides Forward algorithm, not training
   - What's unclear: Whether to use it or implement from scratch
   - **Recommendation:** Implement simple regime-switching from scratch. The pre-calibrated transition matrix approach doesn't require HMM training. If dynamic calibration needed later, consider porting Python `hmmlearn` patterns.

2. **Optimal batch size for progress reporting**
   - What we know: Batch too small = message overhead; batch too large = choppy progress
   - What's unclear: Exact optimal batch size varies by hardware
   - **Recommendation:** Start with 1000 iterations per batch. Adjust based on measured performance.

3. **Worker pool vs single worker for 100k iterations**
   - What we know: CourseCast achieved sub-second with workers; Wix uses generic-pool + Comlink for production
   - What's unclear: Whether single worker suffices for 100k iterations
   - **Recommendation:** Start with single worker. Profile. Add pool only if needed. The workerpool library is ready if required.

## Sources

### Primary (HIGH confidence)

- [GitHub: Comlink](https://github.com/GoogleChromeLabs/comlink) - Official Google Chrome Labs Web Worker RPC library
- [GitHub: vite-plugin-comlink](https://github.com/mathe42/vite-plugin-comlink) - Vite integration for Comlink
- [MDN: Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects) - Authoritative reference on what can be transferred
- [MDN: Navigator.hardwareConcurrency](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/hardwareConcurrency) - CPU core detection API
- [Vite: Features - Web Workers](https://vite.dev/guide/features) - Official Vite worker documentation
- [simple-statistics GitHub](https://github.com/simple-statistics/simple-statistics) - Official documentation
- [simple-statistics docs](https://simple-statistics.github.io/docs/) - API reference

### Secondary (MEDIUM confidence)

- [johnnyreilly: Web Workers, Comlink, Vite and TanStack Query](https://johnnyreilly.com/web-workers-comlink-vite-tanstack-query) - Complete implementation pattern
- [Politis & White 2004: Automatic Block-Length Selection](https://mathweb.ucsd.edu/~politis/SBblock-revER.pdf) - Academic paper on block bootstrap
- [GitHub: workerpool](https://github.com/josdejong/workerpool) - Worker pool library documentation
- [DEV Community: CourseCast 600x faster with Web Workers](https://dev.to/somedood/simulating-course-schedules-600x-faster-with-web-workers-in-coursecast-41ma) - Monte Carlo case study
- [Wix: How Wix Applied Multi-threading](https://openjsf.org/blog/openjs-in-action-how-wix-applied-multi-threading-to-node-js) - Production Comlink + generic-pool pattern

### Tertiary (LOW confidence)

- [GitHub: hidden-markov-model](https://github.com/miguelmota/hidden-markov-model) - Archived JavaScript HMM library (needs validation)
- [Medium: Markov Regime Switching](https://medium.com/@cemalozturk/a-markov-regime-switching-approach-to-characterizing-financial-time-series-a5226298f8e1) - Transition matrix calibration concepts (Python examples)
- [R package blocklength](https://alecstashevsky.com/r/blocklength/) - Block length selection methods (R, not JS)

## Metadata

**Confidence breakdown:**
- Web Worker patterns: HIGH - Official documentation, multiple production examples
- Transferable objects: HIGH - MDN authoritative source
- Comlink/vite-plugin-comlink: HIGH - Well-maintained, TypeScript-first
- Block bootstrap: MEDIUM - Algorithm well-documented, but JavaScript implementation needed
- Regime-switching: MEDIUM - Concepts established, but no JS library; must implement
- HMM libraries: LOW - Only archived/limited packages available

**Research date:** 2026-01-17
**Valid until:** ~30 days (stable patterns, low churn in Web Worker APIs)

---

## Appendix: Math Module Dependencies

Phase 3 simulation engine depends on these functions from Phase 2 math module:

| Function | From | Used For |
|----------|------|----------|
| `mean` | statistics.ts | Average returns, regime parameters |
| `stddev` | statistics.ts | Return volatility |
| `percentile` | statistics.ts | P10, P25, P50, P75, P90 calculation |
| `sum` | precision.ts | Kahan-accurate portfolio value sums |
| `normalRandom` | distributions.ts | Regime-switching return generation |
| `correlatedSamples` | distributions.ts | Multi-asset correlated returns |
| `choleskyDecomposition` | correlation.ts | Used internally by correlatedSamples |
| `correlationMatrix` | correlation.ts | Asset correlation from historical data |

All functions available via: `import { mean, stddev, normalRandom, correlatedSamples } from '@/math'`
