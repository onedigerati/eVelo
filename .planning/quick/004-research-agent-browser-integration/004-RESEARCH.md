# Agent-Browser Integration Research for eVelo

**Date:** 2026-01-22
**Researcher:** Claude Code
**Repository:** https://github.com/vercel-labs/agent-browser
**Version analyzed:** Latest (main branch)

## Executive Summary

Agent-browser is a **well-suited tool** for eVelo UI testing with some important considerations. It can handle Shadow DOM components via Playwright's accessibility tree, but Chart.js canvas-based visualizations require screenshot-based verification rather than DOM inspection. The tool excels at testing form interactions, navigation flows, and responsive layouts.

**Verdict: HYBRID APPROACH RECOMMENDED**

---

## 1. Shadow DOM Compatibility Analysis

### How Agent-Browser Works

Agent-browser uses Playwright's `ariaSnapshot()` API under the hood. According to the source code (`snapshot.ts`), it:

1. Gets the accessibility tree from Playwright's locator
2. Parses and enhances it with ref IDs (`@e1`, `@e2`, etc.)
3. Returns both a formatted tree and a ref map for interactions

### Shadow DOM Support Assessment

**GOOD NEWS:** Playwright (and therefore agent-browser) can pierce Shadow DOM boundaries.

Key findings:
- eVelo uses `attachShadow({ mode: 'open' })` in `BaseComponent` - this is critical
- Open Shadow DOM is accessible to browser automation tools
- Playwright's accessibility tree includes elements inside open Shadow DOMs
- The `ariaSnapshot()` API traverses into shadow roots automatically

**Verification approach:**
```bash
# Start eVelo dev server
agent-browser open http://localhost:5173
agent-browser snapshot -i  # Should show elements inside web components
```

**Expected behavior:**
- `<range-slider>` internal `<input type="range">` should appear as `slider` role
- `<number-input>` internal `<input type="number">` should appear as `spinbutton` role
- Labels set via attributes should appear as accessible names

### Potential Issues

1. **Custom element refs:** The GitHub issue "some components do not have the ref tag" suggests complex component hierarchies might not always get refs
2. **Shadow boundaries in selectors:** CSS selectors like `#id` won't pierce Shadow DOM; refs (`@e1`) or semantic locators (`find role`) are required
3. **Dynamic content:** Components that re-render (via `attributeChangedCallback`) may invalidate refs

### Recommendation for Shadow DOM

**USE SEMANTIC LOCATORS AND REFS** - not CSS selectors:

```bash
# Good - uses accessibility tree
agent-browser find role slider fill 50
agent-browser find label "Portfolio Value" fill "1000000"

# Bad - won't pierce shadow DOM
agent-browser click "#portfolio-value-input"
```

---

## 2. Chart.js Testing Capabilities

### The Challenge

Chart.js renders to `<canvas>` elements. Canvas content is NOT in the DOM and NOT in the accessibility tree. This means:

- `agent-browser snapshot` will show the `<canvas>` element but not chart bars/lines/labels
- `agent-browser get text @ref` won't return chart values
- `agent-browser click @ref` on canvas won't click specific data points

### Canvas Testing Strategies

**Strategy 1: Screenshot Comparison (Primary)**
```bash
# Take baseline screenshot after simulation
agent-browser screenshot charts/baseline-histogram.png

# After code changes, compare
agent-browser screenshot charts/new-histogram.png
# Use external tool (e.g., pixelmatch) to compare
```

**Strategy 2: JavaScript Evaluation (Programmatic)**
```bash
# Get chart data via Chart.js API
agent-browser eval "document.querySelector('histogram-chart').shadowRoot.querySelector('canvas').chart.data.datasets[0].data"
```

Note: This requires Chart.js to expose the chart instance, which eVelo does via `this.chart` property.

**Strategy 3: Verify Chart Existence and Container Size**
```bash
# Verify chart container is visible
agent-browser is visible "histogram-chart"
agent-browser get box "histogram-chart"  # Returns bounding box
```

### What CAN Be Tested on Charts

| Aspect | Testable | Method |
|--------|----------|--------|
| Chart exists/renders | Yes | `is visible` + `get box` |
| Container dimensions | Yes | `get box` |
| Visual appearance | Yes | `screenshot` + external comparison |
| Chart data values | Partial | `eval` with Chart.js API access |
| Legend interactions | Maybe | If legend is HTML (not canvas) |
| Tooltip content | No | Tooltips are canvas-rendered |

### Chart Testing Recommendation

For eVelo's 13+ charts:
1. **Smoke test:** Verify all chart containers render (`is visible`)
2. **Regression test:** Screenshot comparison for visual changes
3. **Data verification:** Use `eval` to check `chart.data` matches expected values

---

## 3. Specific Use Cases for eVelo

### Use Case 1: Form Interactions (HIGH VALUE)

**Components:** `range-slider`, `number-input`, `select-input`, `checkbox-input`

```bash
# Test range slider interaction
agent-browser open http://localhost:5173
agent-browser snapshot -i
# Find slider with label "Time Horizon"
agent-browser find label "Time Horizon" fill 30
# Verify value updated
agent-browser get value @e{ref}
```

**Testable aspects:**
- Input value changes
- Custom event dispatch (`change` events with `composed: true`)
- Value display updates (`.value-display` span in range-slider)
- Attribute synchronization

### Use Case 2: Simulation Workflow (HIGH VALUE)

**Flow:** Set params -> Run simulation -> Verify results appear

```bash
# Set simulation parameters
agent-browser find label "Initial Portfolio" fill 1000000
agent-browser find label "Time Horizon" fill 30
agent-browser find label "Annual Withdrawal" fill 50000

# Run simulation
agent-browser find role button click --name "Run Simulation"

# Wait for results
agent-browser wait --text "Simulation Complete"
# Or wait for specific element
agent-browser wait "results-dashboard"

# Verify key metrics appeared
agent-browser is visible "key-metrics-banner"
agent-browser get text "key-metrics-banner"  # Should have metric values
```

### Use Case 3: Dashboard Rendering (MEDIUM VALUE)

**Component:** `results-dashboard`

```bash
# After simulation, verify dashboard sections
agent-browser is visible "percentile-spectrum"
agent-browser is visible "strategy-analysis"
agent-browser is visible "salary-equivalent-section"
agent-browser is visible "recommendations-section"

# Verify specific content
agent-browser snapshot -s "results-dashboard"  # Scoped snapshot
```

### Use Case 4: Settings Panel Modal (MEDIUM VALUE)

**Component:** `settings-panel`

```bash
# Open settings
agent-browser find role button click --name "Settings"
agent-browser wait "settings-panel"

# Verify modal is visible
agent-browser is visible "settings-panel"

# Interact with settings
agent-browser find label "API Key" fill "test-key-123"
agent-browser find role button click --name "Save"

# Close modal
agent-browser press Escape
agent-browser wait --fn "!document.querySelector('settings-panel').hasAttribute('open')"
```

### Use Case 5: Toast Notifications (LOW VALUE - transient)

**Component:** `toast-notification`, `toast-container`

```bash
# Trigger an action that shows toast
agent-browser find role button click --name "Save Portfolio"

# Toast appears briefly (5s default)
agent-browser wait --text "Portfolio saved"
agent-browser is visible "toast-notification"

# Note: May need to disable auto-dismiss for reliable testing
```

### Use Case 6: Responsive Layout Testing (HIGH VALUE)

**Using `--viewport` flag:**

```bash
# Desktop (default)
agent-browser set viewport 1920 1080
agent-browser screenshot desktop.png

# Tablet
agent-browser set viewport 768 1024
agent-browser is visible "sidebar-panel"  # Should be visible
agent-browser screenshot tablet.png

# Mobile (sidebar becomes overlay)
agent-browser set viewport 375 667
agent-browser is visible "sidebar-panel"  # May be hidden initially
agent-browser screenshot mobile.png

# Test sidebar toggle on mobile
agent-browser find role button click --name "Menu"
agent-browser is visible "sidebar-panel"  # Now visible as overlay
```

### Use Case 7: Portfolio Management (HIGH VALUE)

**Components:** `portfolio-manager`, `portfolio-list`, `weight-editor`

```bash
# Create new portfolio
agent-browser find role button click --name "New Portfolio"
agent-browser find label "Portfolio Name" fill "Test Portfolio"

# Add assets
agent-browser find role checkbox check --name "SPY"
agent-browser find role checkbox check --name "AGG"

# Adjust weights
agent-browser find label "SPY" fill 70
agent-browser find label "AGG" fill 30

# Save
agent-browser find role button click --name "Save"
agent-browser wait --text "Portfolio saved"
```

---

## 4. Integration Approach

### Installation

```bash
# Install globally
npm install -g agent-browser
agent-browser install  # Download Chromium

# Or locally in eVelo
npm install --save-dev agent-browser
```

### Project Setup

Create test scripts in `test/e2e/` directory:

```
eVelo/
  test/
    e2e/
      smoke.sh          # Basic rendering tests
      simulation.sh     # End-to-end workflow tests
      responsive.sh     # Viewport testing
      screenshots/      # Baseline screenshots
```

### Example Test Script: `test/e2e/smoke.sh`

```bash
#!/bin/bash
set -e

# Start server in background (assumes npm run dev)
npm run dev &
DEV_PID=$!
sleep 3  # Wait for server

# Run tests
agent-browser open http://localhost:5173

# Test main layout renders
agent-browser is visible "main-layout"
agent-browser is visible "sidebar-panel"

# Test form inputs accessible
agent-browser snapshot -i | grep -q "slider"
agent-browser snapshot -i | grep -q "spinbutton"

# Take screenshot
agent-browser screenshot test/e2e/screenshots/smoke-$(date +%Y%m%d).png

# Cleanup
agent-browser close
kill $DEV_PID
```

### CI/CD Integration

```yaml
# .github/workflows/e2e.yml
- name: Install agent-browser
  run: |
    npm install -g agent-browser
    agent-browser install

- name: Run E2E tests
  run: |
    npm run dev &
    sleep 5
    bash test/e2e/smoke.sh
```

### Headed Mode for Debugging

```bash
# Watch tests run visually
agent-browser open http://localhost:5173 --headed
agent-browser snapshot -i
# Pause and inspect before continuing
```

---

## 5. Limitations and Alternatives

### What Agent-Browser Cannot Do Well

| Limitation | Impact on eVelo | Workaround |
|------------|-----------------|------------|
| Canvas content inspection | Can't verify chart data points | Use `eval` + Chart.js API |
| Pixel-perfect comparison | Built-in screenshot lacks diff | External tool (pixelmatch) |
| Complex drag operations | Weight editor might need work | Use keyboard input instead |
| Web Worker communication | Can't inspect worker directly | Test via UI results |
| Performance profiling | No built-in perf metrics | Use Lighthouse separately |

### Alternative Tools Comparison

**Playwright Direct (via @playwright/test)**
- Pros: More control, built-in assertions, parallel execution, trace viewer
- Cons: More complex setup, requires test code (not just CLI)
- Use when: Need programmatic assertions, complex test logic

**@testing-library/dom**
- Pros: Unit test-style, fast, no browser needed
- Cons: Can't test real rendering, Shadow DOM support limited
- Use when: Testing component logic without visual rendering

**Cypress**
- Pros: Great DX, time-travel debugging, automatic waits
- Cons: Different browser engine, Shadow DOM support requires plugins
- Use when: Team prefers Cypress ecosystem

**Storybook + Chromatic**
- Pros: Visual regression built-in, component isolation
- Cons: Requires Storybook setup, paid for visual testing
- Use when: Building component library, need visual regression

### Recommended Tool Stack for eVelo

| Testing Need | Recommended Tool |
|--------------|------------------|
| Quick smoke tests | agent-browser |
| Simulation workflow | agent-browser |
| Responsive layouts | agent-browser |
| Chart visual regression | agent-browser + pixelmatch |
| Complex assertions | Playwright (if needed later) |
| Unit tests | Vitest (already in stack) |

---

## 6. Recommendation

### Verdict: INTEGRATE (Hybrid Approach)

**Rationale:**

1. **Shadow DOM works** - eVelo's `mode: 'open'` ensures accessibility tree includes internal elements
2. **Form testing is excellent** - Semantic locators handle range-slider, number-input, select-input perfectly
3. **Workflow testing is natural** - CLI approach matches AI-assisted development workflow
4. **Low barrier to entry** - No test framework configuration, just bash scripts
5. **Chart limitation is manageable** - Screenshot comparison + eval covers most needs

### Prioritized Use Cases

**Phase 1 (Immediate Value)**
1. Smoke test: All major components render
2. Simulation workflow: Full end-to-end flow
3. Responsive layout: Desktop/tablet/mobile screenshots

**Phase 2 (When Stability Needed)**
4. Chart visual regression: Baseline screenshots for all 13 charts
5. Settings persistence: API key storage, CORS proxy selection

**Phase 3 (As Needed)**
6. Portfolio CRUD operations
7. Toast notification verification
8. Error state handling

### Next Steps

1. **Install agent-browser:**
   ```bash
   npm install -g agent-browser
   agent-browser install
   ```

2. **Create test directory:**
   ```bash
   mkdir -p test/e2e/screenshots
   ```

3. **Write first smoke test:**
   - Copy `smoke.sh` example from Section 4
   - Run: `bash test/e2e/smoke.sh`

4. **Establish baseline screenshots:**
   - Run simulation with known inputs
   - Capture screenshots for all chart types
   - Store in `test/e2e/screenshots/baseline/`

5. **Add to CI (optional):**
   - Add GitHub Actions workflow
   - Run smoke tests on PR

---

## Appendix A: Agent-Browser Command Quick Reference

```bash
# Navigation
agent-browser open <url>
agent-browser close

# Snapshot (critical for eVelo)
agent-browser snapshot -i      # Interactive elements only
agent-browser snapshot -s "results-dashboard"  # Scoped

# Interactions
agent-browser find role slider fill <value>
agent-browser find label "<label>" fill "<value>"
agent-browser find role button click --name "<name>"

# Verification
agent-browser is visible <element>
agent-browser get text @e1
agent-browser get value @e1

# Waiting
agent-browser wait <element>
agent-browser wait --text "<text>"
agent-browser wait --load networkidle

# Screenshots
agent-browser screenshot <path>
agent-browser screenshot --full <path>  # Full page

# Viewport
agent-browser set viewport <width> <height>
agent-browser set device "iPhone 14"

# JavaScript (for Chart.js)
agent-browser eval "<js>"

# Debugging
agent-browser open <url> --headed  # Show browser
agent-browser console              # View console logs
```

## Appendix B: eVelo Component Inventory

| Component | Type | Testable via agent-browser |
|-----------|------|---------------------------|
| `range-slider` | Form input | Yes - slider role |
| `number-input` | Form input | Yes - spinbutton role |
| `select-input` | Form input | Yes - combobox role |
| `checkbox-input` | Form input | Yes - checkbox role |
| `param-section` | Collapsible | Yes - details/summary |
| `sidebar-panel` | Layout | Yes - visibility |
| `main-layout` | Layout | Yes - visibility |
| `results-dashboard` | Container | Yes - visibility |
| `settings-panel` | Modal | Yes - dialog role |
| `toast-notification` | Transient | Partial - timing sensitive |
| `portfolio-manager` | CRUD UI | Yes - form interactions |
| `portfolio-list` | Display | Yes - list role |
| `weight-editor` | Form input | Yes - slider/spinbutton |
| `key-metrics-banner` | Display | Yes - text content |
| `percentile-spectrum` | Display | Yes - text content |
| `strategy-analysis` | Display | Yes - text content |
| `recommendations-section` | Display | Yes - text content |
| All Chart Components | Canvas | Partial - screenshot only |

## Appendix C: Known Limitations for eVelo

1. **Chart.js canvas content** - Not in accessibility tree; use screenshot comparison
2. **Toast auto-dismiss** - 5-second timeout may cause flaky tests; consider test mode
3. **Web Worker results** - Can't directly inspect; test via UI verification
4. **Dynamic refs** - After component re-render, refs may change; re-snapshot
5. **Shadow DOM CSS selectors** - Use `find role/label` instead of CSS selectors
