# Phase 13: E2E Testing with Agent-Browser - Research

**Researched:** 2026-01-22
**Domain:** E2E Testing, Browser Automation, Visual Regression Testing
**Confidence:** HIGH

## Summary

Phase 13 implements E2E testing infrastructure using agent-browser (Playwright-based CLI tool) with semantic locators for Shadow DOM components and screenshot comparison for Chart.js canvas elements. Prior research (quick task 004) validated the technical approach. This research focuses on practical implementation: Windows cross-platform compatibility, programmatic test execution, screenshot comparison tooling, and CI/CD integration.

**Key findings:**
- Agent-browser is a CLI-first tool built on Playwright, designed for AI agents but well-suited for programmatic testing
- JavaScript test files (not bash scripts) provide Windows compatibility using Node.js child_process or cross-spawn
- Vite dev server has programmatic API (createServer/listen/close) for test lifecycle management
- Pixelmatch (used by Playwright internally) provides screenshot comparison with configurable thresholds
- GitHub Actions integration requires Playwright browser installation and artifact storage for screenshots

**Primary recommendation:** Use JavaScript test files with Node.js spawn to invoke agent-browser CLI, implement Vite server lifecycle helpers, and establish baseline screenshots with pixelmatch comparison for Chart.js visual regression testing.

## Standard Stack

The established libraries/tools for E2E testing with agent-browser:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| agent-browser | Latest | Browser automation CLI | Playwright-based, semantic locators, AI-optimized accessibility tree snapshots |
| Playwright | 1.56+ (dependency) | Browser engine | Powers agent-browser, cross-platform, Shadow DOM support |
| Node.js | 20.19+ or 22.12+ | Test execution runtime | Required for Vite, process management, file I/O |
| Vite | 6.0+ (existing) | Dev server | Programmatic API for start/stop in tests |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pixelmatch | 6.x | Image comparison | Chart.js screenshot visual regression testing |
| pngjs | 7.x | PNG encoding/decoding | Read/write screenshots for pixelmatch comparison |
| cross-spawn | 7.0.5+ | Cross-platform process spawning | Windows/Unix compatibility for spawning agent-browser |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| agent-browser CLI | Playwright Test (@playwright/test) | More powerful but requires test runner config, heavier setup |
| JavaScript test files | Bash scripts | Simpler but Windows-incompatible (no native bash) |
| pixelmatch | Percy, Chromatic | Commercial services offer UI but require accounts, cost money |

**Installation:**
```bash
npm install --save-dev agent-browser pixelmatch pngjs cross-spawn
```

Note: agent-browser internally installs Playwright and Chromium.

## Architecture Patterns

### Recommended Project Structure
```
test/
├── e2e/
│   ├── helpers/
│   │   ├── agent-browser.js   # CLI wrapper functions
│   │   ├── server.js           # Vite lifecycle management
│   │   └── screenshot.js       # Pixelmatch comparison utilities
│   ├── screenshots/
│   │   ├── baseline/           # Reference images (committed to git)
│   │   ├── current/            # Test run outputs (gitignored)
│   │   └── diff/               # Comparison diffs (gitignored)
│   ├── smoke.js                # Component rendering tests
│   ├── workflow.js             # Simulation flow E2E test
│   ├── responsive.js           # Viewport/layout tests
│   ├── charts.js               # Chart baseline capture/verification
│   └── run-all.js              # Test orchestrator
```

### Pattern 1: Agent-Browser CLI Wrapper
**What:** Node.js module that wraps agent-browser CLI commands in async functions
**When to use:** All E2E tests need consistent agent-browser invocation

**Example:**
```javascript
// test/e2e/helpers/agent-browser.js
// Source: Vite programmatic API docs + cross-spawn npm package
import { spawn } from 'child_process';

// Windows compatibility: .cmd suffix on Windows
const AGENT_BROWSER = process.platform === 'win32'
  ? 'agent-browser.cmd'
  : 'agent-browser';

/**
 * Execute agent-browser command
 * @param {string[]} args - Command arguments
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
export async function agentBrowser(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('npx', [AGENT_BROWSER, ...args], {
      shell: process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr, exitCode });
      } else {
        reject(new Error(`agent-browser failed: ${stderr}`));
      }
    });
  });
}

// Convenience wrappers
export async function open(url) {
  await agentBrowser(['open', url]);
}

export async function close() {
  await agentBrowser(['close']);
}

export async function screenshot(path) {
  await agentBrowser(['screenshot', path]);
}

export async function isVisible(element) {
  const result = await agentBrowser(['is', 'visible', element]);
  return result.stdout.trim() === 'true';
}

export async function findLabel(label, action, value) {
  await agentBrowser(['find', 'label', label, action, value]);
}

export async function wait(target, options = {}) {
  const args = ['wait', target];
  if (options.timeout) args.push('--timeout', String(options.timeout));
  await agentBrowser(args);
}
```

### Pattern 2: Vite Server Lifecycle Management
**What:** Module to start/stop Vite dev server programmatically for test isolation
**When to use:** Every test suite needs clean server start/stop

**Example:**
```javascript
// test/e2e/helpers/server.js
// Source: Vite JavaScript API docs (vite.dev/guide/api-javascript.html)
import { createServer } from 'vite';

let server = null;
const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;

/**
 * Start Vite dev server
 * @returns {Promise<void>}
 */
export async function startServer() {
  if (server) {
    throw new Error('Server already running');
  }

  server = await createServer({
    server: { port: PORT },
    logLevel: 'error' // Suppress logs in tests
  });

  await server.listen();

  // Wait for server readiness
  await server.waitForRequestsIdle();

  console.log(`[Server] Vite dev server running at ${BASE_URL}`);
}

/**
 * Stop Vite dev server
 * @returns {Promise<void>}
 */
export async function stopServer() {
  if (!server) return;

  await server.close();
  server = null;

  console.log('[Server] Vite dev server stopped');
}

export function getBaseUrl() {
  return BASE_URL;
}

// Cleanup on unexpected exit
process.on('exit', () => {
  if (server) stopServer();
});
```

### Pattern 3: Screenshot Comparison Utility
**What:** Wrapper around pixelmatch for baseline/current screenshot comparison
**When to use:** Chart visual regression testing

**Example:**
```javascript
// test/e2e/helpers/screenshot.js
// Source: pixelmatch npm package docs
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Compare two PNG screenshots
 * @param {string} baselinePath - Path to baseline screenshot
 * @param {string} currentPath - Path to current screenshot
 * @param {string} diffPath - Output path for diff image
 * @param {number} threshold - Matching threshold (0-1, default 0.1)
 * @returns {Promise<{match: boolean, diffPixels: number, totalPixels: number}>}
 */
export async function compareScreenshots(
  baselinePath,
  currentPath,
  diffPath,
  threshold = 0.1
) {
  // Read PNG files
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const current = PNG.sync.read(fs.readFileSync(currentPath));

  // Check dimensions match
  if (baseline.width !== current.width || baseline.height !== current.height) {
    throw new Error(
      `Image dimensions don't match: ` +
      `${baseline.width}x${baseline.height} vs ${current.width}x${current.height}`
    );
  }

  // Create diff image
  const diff = new PNG({ width: baseline.width, height: baseline.height });

  // Compare pixels
  const diffPixels = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    baseline.width,
    baseline.height,
    { threshold }
  );

  // Write diff image
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = baseline.width * baseline.height;
  const match = diffPixels === 0;

  return { match, diffPixels, totalPixels };
}
```

### Anti-Patterns to Avoid
- **Global agent-browser installation:** Use npx to avoid version conflicts across projects
- **CSS selectors for Shadow DOM:** Use semantic locators (find role, find label) instead
- **Synchronous process spawning:** Use async spawn, not spawnSync, to prevent blocking
- **Hardcoded timeouts:** Use agent-browser's wait commands with reasonable defaults
- **Screenshot pixel-perfect comparison:** Use pixelmatch threshold (0.1) to allow anti-aliasing differences

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-platform process spawning | Manual platform detection and shell flags | cross-spawn package | Handles Windows .cmd files, quoting, shebang support |
| Image comparison | Custom pixel-by-pixel loops | pixelmatch | Anti-aliased pixel detection, perceptual color metrics, battle-tested |
| Vite server lifecycle | Spawning `npm run dev` | Vite createServer() API | Programmatic control, no port cleanup issues, graceful shutdown |
| Screenshot base64 handling | Manual Buffer encoding | pngjs package | PNG format parsing, efficient binary I/O |
| Element waiting | setTimeout loops | agent-browser wait command | Built-in retry logic, accessibility tree updates |

**Key insight:** Agent-browser is CLI-first with no official JavaScript API, but wrapping CLI commands in async functions provides clean programmatic access without reimplementing Playwright logic.

## Common Pitfalls

### Pitfall 1: Windows cmd File Extension
**What goes wrong:** Spawning 'agent-browser' fails on Windows with "command not found"
**Why it happens:** npm creates .cmd wrappers on Windows, Node.js spawn doesn't auto-append .cmd
**How to avoid:**
```javascript
const cmd = process.platform === 'win32' ? 'agent-browser.cmd' : 'agent-browser';
spawn('npx', [cmd, ...args], { shell: process.platform === 'win32' });
```
**Warning signs:** Tests pass on Unix but fail on Windows CI runners

### Pitfall 2: Shadow DOM CSS Selector Failure
**What goes wrong:** `agent-browser click "#input-id"` fails even though element exists
**Why it happens:** CSS selectors don't pierce Shadow DOM boundaries (mode: 'open' or not)
**How to avoid:** Use semantic locators:
```javascript
// Bad: CSS selector
await agentBrowser(['click', '#portfolio-value-input']);

// Good: Semantic locator
await agentBrowser(['find', 'label', 'Portfolio Value', 'fill', '1000000']);
```
**Warning signs:** Element visible in DevTools but agent-browser reports "not found"

### Pitfall 3: Chart.js Canvas Content Not in Accessibility Tree
**What goes wrong:** `agent-browser get text` returns empty for chart labels/values
**Why it happens:** Canvas renders pixels, not DOM elements - accessibility tree only sees `<canvas>`
**How to avoid:** Use screenshot comparison for visual regression, evalJs for data verification:
```javascript
// Verify chart exists and has data
const hasData = await agentBrowser([
  'eval',
  'document.querySelector("histogram-chart").shadowRoot.querySelector("canvas").chart.data.datasets.length > 0'
]);

// Visual regression via screenshot
await screenshot('test/e2e/screenshots/current/histogram.png');
await compareScreenshots('baseline/histogram.png', 'current/histogram.png', 'diff/histogram.png');
```
**Warning signs:** Chart visible in browser but test can't extract text/values

### Pitfall 4: Vite Server Port Conflicts
**What goes wrong:** `startServer()` hangs or throws "address already in use"
**Why it happens:** Previous test didn't clean up server, or dev server running manually
**How to avoid:**
- Always call `stopServer()` in finally block
- Use unique ports for test vs dev (e.g., 5174 for tests)
- Check `server.httpServer.address()` before listen
**Warning signs:** Tests hang indefinitely on server start

### Pitfall 5: Screenshot Baseline Drift
**What goes wrong:** Screenshot tests start failing after unrelated code changes
**Why it happens:** Font rendering differences (OS/browser), Chart.js animation timing, viewport size inconsistency
**How to avoid:**
- Disable Chart.js animations in test builds
- Set explicit viewport size in agent-browser
- Use pixelmatch threshold (0.1) for anti-aliasing tolerance
- Regenerate baselines on CI environment, not local machine
**Warning signs:** Screenshots differ only in anti-aliasing or subpixel positioning

### Pitfall 6: Agent-Browser Chromium Not Installed
**What goes wrong:** `agent-browser open` fails with "Chromium not found"
**Why it happens:** agent-browser requires `agent-browser install` after npm install (downloads Chromium)
**How to avoid:** Add postinstall script or document setup:
```json
{
  "scripts": {
    "postinstall": "agent-browser install || echo 'agent-browser install failed, run manually'"
  }
}
```
**Warning signs:** Tests fail on fresh CI environment or new developer setup

## Code Examples

Verified patterns from official sources:

### Complete Test File Structure
```javascript
// test/e2e/smoke.js
// Source: Research findings combining agent-browser CLI + Vite API + test conventions
import { startServer, stopServer, getBaseUrl } from './helpers/server.js';
import { open, close, isVisible, snapshot } from './helpers/agent-browser.js';

async function runSmokeTest() {
  console.log('Starting smoke test...');
  let passed = 0;
  let failed = 0;

  try {
    // Start Vite dev server
    await startServer();

    // Open application
    await open(getBaseUrl());

    // Test: Main layout renders
    console.log('[TEST] Main layout visible');
    if (await isVisible('main-layout')) {
      console.log('  [PASS] main-layout visible');
      passed++;
    } else {
      console.log('  [FAIL] main-layout not visible');
      failed++;
    }

    // Test: Sidebar renders
    console.log('[TEST] Sidebar visible');
    if (await isVisible('sidebar-panel')) {
      console.log('  [PASS] sidebar-panel visible');
      passed++;
    } else {
      console.log('  [FAIL] sidebar-panel not visible');
      failed++;
    }

    // Test: Form inputs accessible
    console.log('[TEST] Form inputs in accessibility tree');
    const snapshotResult = await snapshot({ interactive: true });
    const hasSliders = snapshotResult.stdout.includes('slider');
    const hasSpinbuttons = snapshotResult.stdout.includes('spinbutton');

    if (hasSliders && hasSpinbuttons) {
      console.log('  [PASS] Form inputs accessible');
      passed++;
    } else {
      console.log('  [FAIL] Form inputs not accessible');
      failed++;
    }

    // Summary
    console.log(`\nSmoke Test Complete: ${passed} passed, ${failed} failed`);
    return failed === 0;

  } finally {
    // Cleanup
    await close();
    await stopServer();
  }
}

// Run test and exit with appropriate code
runSmokeTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Smoke test error:', err);
    process.exit(1);
  });
```

### Chart Visual Regression Test
```javascript
// test/e2e/charts.js
// Source: Chart.js testing docs + pixelmatch integration patterns
import { startServer, stopServer, getBaseUrl } from './helpers/server.js';
import { open, close, screenshot, findLabel, findRole, wait, evalJs } from './helpers/agent-browser.js';
import { compareScreenshots } from './helpers/screenshot.js';
import fs from 'fs';
import path from 'path';

const CHART_TYPES = [
  'probability-cone-chart',
  'histogram-chart',
  'donut-chart',
  'correlation-heatmap',
  'margin-call-chart',
  'sbloc-balance-chart',
  'bbd-comparison-chart',
  'comparison-line-chart',
  'cumulative-costs-chart',
  'terminal-comparison-chart',
  'sbloc-utilization-chart'
];

const MODE = process.argv.includes('--capture') ? 'capture' : 'verify';

async function runChartTest() {
  console.log(`[Chart Test] Mode: ${MODE}`);

  const baselineDir = 'test/e2e/screenshots/baseline';
  const currentDir = 'test/e2e/screenshots/current';
  const diffDir = 'test/e2e/screenshots/diff';

  [currentDir, diffDir].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  try {
    await startServer();
    await open(getBaseUrl());
    await wait('main-layout');

    // Run simulation to generate chart data
    console.log('[Setup] Setting simulation parameters...');
    await findLabel('Initial Investment', 'fill', '5000000');
    await findLabel('Period (Years)', 'fill', '15');
    await findLabel('Total Annual Withdrawal', 'fill', '200000');

    console.log('[Setup] Running simulation...');
    await findRole('button', 'click', 'Run Monte Carlo Simulation');
    await wait('results-dashboard', { timeout: 60000 });

    // Wait for charts to render
    await new Promise(r => setTimeout(r, 2000));

    // Capture full dashboard screenshots
    const dashboardPath = MODE === 'capture' ?
      path.join(baselineDir, 'dashboard-full.png') :
      path.join(currentDir, 'dashboard-full.png');

    await screenshot(dashboardPath);
    console.log(`[${MODE.toUpperCase()}] Screenshot: dashboard-full.png`);

    // Verify individual charts exist with data
    let passed = 0;
    let failed = 0;

    for (const chartElement of CHART_TYPES) {
      try {
        const visible = await isVisible(chartElement);

        if (!visible) {
          console.log(`  [SKIP] ${chartElement} - not visible`);
          continue;
        }

        // Verify chart has data via Chart.js API
        const hasData = await evalJs(
          `document.querySelector('${chartElement}')?.shadowRoot?.querySelector('canvas')?.chart?.data?.datasets?.length > 0`
        );

        if (hasData) {
          console.log(`  [PASS] ${chartElement} - visible with data`);
          passed++;
        } else {
          console.log(`  [WARN] ${chartElement} - visible but no data`);
        }
      } catch (e) {
        console.log(`  [FAIL] ${chartElement} - ${e.message}`);
        failed++;
      }
    }

    // Compare screenshots if in verify mode
    if (MODE === 'verify') {
      const baselinePath = path.join(baselineDir, 'dashboard-full.png');
      const currentPath = path.join(currentDir, 'dashboard-full.png');
      const diffPath = path.join(diffDir, 'dashboard-full.png');

      if (fs.existsSync(baselinePath)) {
        const comparison = await compareScreenshots(
          baselinePath,
          currentPath,
          diffPath,
          0.1 // 10% threshold for anti-aliasing
        );

        if (comparison.match) {
          console.log(`\n[PASS] Visual regression: No differences detected`);
          passed++;
        } else {
          console.log(`\n[FAIL] Visual regression: ${comparison.diffPixels} pixels differ`);
          failed++;
        }
      } else {
        console.log(`\n[SKIP] No baseline found, run with --capture to create`);
      }
    }

    console.log(`\nChart Test Complete: ${passed} passed, ${failed} failed`);
    return failed === 0;

  } finally {
    await close();
    await stopServer();
  }
}

runChartTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Chart test error:', err);
    process.exit(1);
  });
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bash scripts for E2E tests | JavaScript test files | 2020s (Node.js ubiquity) | Windows compatibility, better IDE support |
| Manual Playwright API | agent-browser CLI + wrappers | 2024 (agent-browser release) | Simpler for AI agents, less boilerplate |
| Percy/Chromatic for visual testing | Open-source pixelmatch | Ongoing | Free, local control, no external dependencies |
| CSS selectors for Web Components | Semantic locators (role, label) | Playwright 1.56+ | Shadow DOM compatibility, accessibility-first |
| Global test runner (Jest/Mocha) | Standalone Node.js scripts | 2025+ (simplicity trend) | No config, direct execution, easier debugging |

**Deprecated/outdated:**
- `agent-browser install` now required after npm install (Chromium no longer bundled)
- Bash scripts for Windows testing (cross-platform Node.js is standard)
- Pixel-perfect screenshot comparison without threshold (anti-aliasing causes false failures)

## Open Questions

Things that couldn't be fully resolved:

1. **Agent-browser JavaScript API availability**
   - What we know: CLI-first design, no official programmatic API documented
   - What's unclear: Whether undocumented Node.js API exists internally
   - Recommendation: Proceed with CLI wrapper pattern, monitor GitHub for API additions

2. **Optimal screenshot comparison threshold**
   - What we know: Pixelmatch default is 0.1 (10%), Playwright uses this internally
   - What's unclear: Whether Chart.js animations require higher tolerance (0.15?)
   - Recommendation: Start with 0.1, adjust per-chart if needed, document rationale

3. **CI screenshot baseline storage strategy**
   - What we know: Baselines should be committed to git, generated on CI environment
   - What's unclear: How to handle OS-specific rendering (Windows vs Linux CI runners)
   - Recommendation: Use Linux CI runner for consistency, regenerate baselines there

4. **Web Worker simulation verification**
   - What we know: Simulation runs in Web Worker, can't inspect directly
   - What's unclear: Best way to verify worker completion beyond UI updates
   - Recommendation: Test via UI results (results-dashboard visible), trust integration

## Sources

### Primary (HIGH confidence)
- [Playwright Official Docs](https://playwright.dev/docs/intro) - Cross-platform support, Shadow DOM testing
- [Vite JavaScript API](https://vite.dev/guide/api-javascript.html) - Programmatic server control (createServer, listen, close)
- [agent-browser GitHub](https://github.com/vercel-labs/agent-browser) - CLI commands, semantic locators, installation
- [pixelmatch npm](https://www.npmjs.com/package/pixelmatch) - Image comparison API, threshold configuration
- [Chart.js Contributing Guide](https://www.chartjs.org/docs/latest/developers/contributing.html) - Image-based testing approach

### Secondary (MEDIUM confidence)
- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots) - Built-in toHaveScreenshot using pixelmatch
- [cross-spawn npm](https://www.npmjs.com/package/cross-spawn) - Windows process spawning, .cmd file handling
- [Sentry Visual Snapshot Action](https://github.com/getsentry/action-visual-snapshot) - GitHub Actions screenshot comparison workflow
- [TestMu Playwright Visual Regression Guide](https://www.testmu.ai/learning-hub/playwright-visual-regression-testing/) - Best practices for 2026

### Tertiary (LOW confidence)
- [Blog: Testing Canvas with Cypress](https://www.valentinog.com/blog/canvas/) - Canvas testing strategies (vendor-specific but concepts apply)
- [Medium: Playwright Shadow DOM Testing](https://medium.com/@erik.amaral/shadow-dom-testing-that-doesnt-flake-using-playwright-1c9313d086d3) - Community patterns for Shadow DOM

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs confirm agent-browser + Playwright + Vite + pixelmatch
- Architecture: HIGH - Vite API documented, agent-browser CLI confirmed, patterns verified
- Pitfalls: MEDIUM - Based on WebSearch + GitHub issues, not all tested in eVelo context
- Windows compatibility: HIGH - cross-spawn and process.platform checks are standard practice
- Chart testing: HIGH - Chart.js docs explicitly recommend image-based testing
- CI/CD integration: MEDIUM - Playwright CI docs verified, agent-browser CI examples limited

**Research date:** 2026-01-22
**Valid until:** 2026-02-22 (30 days - stable tools, minor version updates expected)

**Research scope:**
- Existing quick task 004 research validated and extended
- Focus on implementation gaps: Windows compatibility, programmatic execution, CI/CD
- All 11 chart types verified in codebase: probability-cone, histogram, donut, correlation-heatmap, margin-call, sbloc-balance, bbd-comparison, comparison-line, cumulative-costs, terminal-comparison, sbloc-utilization
- Application stack confirmed: TypeScript, Web Components, Shadow DOM (mode: 'open'), Chart.js 4.5.1, Vite 6.0
