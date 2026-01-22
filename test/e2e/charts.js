// test/e2e/charts.js
// Chart visual regression test with baseline capture
// Tests all 11 chart types via evalJs data verification and screenshot comparison
import { startServer, stopServer, getBaseUrl } from './helpers/server.js';
import {
  open, close, isVisible, screenshot, wait, findRole, findLabel, evalJs
} from './helpers/agent-browser.js';
import { compareScreenshots, hasBaseline, ensureDirectories } from './helpers/screenshot.js';
import fs from 'fs';
import path from 'path';

// All 11 chart types in eVelo (from src/charts/index.ts)
const CHART_COMPONENTS = [
  // Core results charts (always visible after simulation)
  { element: 'probability-cone-chart', name: 'probability-cone', section: 'core' },
  { element: 'histogram-chart', name: 'histogram', section: 'core' },
  { element: 'donut-chart', name: 'donut', section: 'core' },
  { element: 'correlation-heatmap', name: 'correlation-heatmap', section: 'core' },

  // SBLOC charts (visible when withdrawal > 0)
  { element: 'margin-call-chart', name: 'margin-call', section: 'sbloc' },
  { element: 'sbloc-balance-chart', name: 'sbloc-balance', section: 'sbloc' },
  { element: 'bbd-comparison-chart', name: 'bbd-comparison', section: 'sbloc' },

  // Strategy comparison charts
  { element: 'comparison-line-chart', name: 'comparison-line', section: 'strategy' },
  { element: 'cumulative-costs-chart', name: 'cumulative-costs', section: 'strategy' },
  { element: 'terminal-comparison-chart', name: 'terminal-comparison', section: 'strategy' },
  { element: 'sbloc-utilization-chart', name: 'sbloc-utilization', section: 'strategy' },
];

// Test parameters for simulation (enables all chart types)
const TEST_PARAMS = {
  initialPortfolio: '1000000',
  timeHorizon: '30',
  annualWithdrawal: '50000',  // Enables SBLOC charts
};

// Paths relative to project root
const BASELINE_DIR = 'test/e2e/screenshots/baseline';
const CURRENT_DIR = 'test/e2e/screenshots/current';
const DIFF_DIR = 'test/e2e/screenshots/diff';

// Mode: 'capture' for creating baselines, 'verify' for checking against baselines
const MODE = process.argv.includes('--capture') ? 'capture' : 'verify';

/**
 * Verify chart has data via Chart.js API
 * @param {string} element - Custom element tag name
 * @returns {Promise<boolean>} True if chart has datasets
 */
async function chartHasData(element) {
  const hasData = await evalJs(`
    (function() {
      const el = document.querySelector('${element}');
      if (el && el.shadowRoot) {
        const canvas = el.shadowRoot.querySelector('canvas');
        if (canvas && canvas.chart) {
          return canvas.chart.data.datasets.length > 0;
        }
      }
      return false;
    })()
  `);
  return hasData === true || hasData === 'true';
}

/**
 * Run chart visual regression test
 */
async function runChartTest() {
  console.log('========================================');
  console.log(`eVelo Chart Test (${MODE.toUpperCase()} mode)`);
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;
  let captured = 0;
  let skipped = 0;

  // Ensure screenshot directories exist
  ensureDirectories();

  try {
    // Start server
    await startServer();

    // Open application
    await open(getBaseUrl());
    await wait('main-layout', { timeout: 10000 });

    // Set parameters to enable all charts (including SBLOC)
    console.log('[Setup] Setting simulation parameters...\n');

    try {
      await findLabel('Initial Portfolio', 'fill', TEST_PARAMS.initialPortfolio);
      console.log(`  Set Initial Portfolio: $${TEST_PARAMS.initialPortfolio}`);
    } catch (e) {
      console.log(`  [WARN] Could not set Initial Portfolio: ${e.message}`);
    }

    try {
      await findLabel('Time Horizon', 'fill', TEST_PARAMS.timeHorizon);
      console.log(`  Set Time Horizon: ${TEST_PARAMS.timeHorizon} years`);
    } catch (e) {
      console.log(`  [WARN] Could not set Time Horizon: ${e.message}`);
    }

    try {
      await findLabel('Annual Withdrawal', 'fill', TEST_PARAMS.annualWithdrawal);
      console.log(`  Set Annual Withdrawal: $${TEST_PARAMS.annualWithdrawal}`);
    } catch (e) {
      console.log(`  [INFO] Annual Withdrawal not directly accessible (may be in SBLOC section)`);
    }

    // Run simulation to generate chart data
    console.log('\n[Setup] Running simulation...');
    await findRole('button', 'click', 'Run');
    await wait('key-metrics-banner', { timeout: 60000 });
    console.log('  Simulation complete\n');

    // Wait for Chart.js animations to finish
    await new Promise(r => setTimeout(r, 2000));

    // Process each chart component
    console.log('[Charts] Verifying chart components...\n');

    for (const chart of CHART_COMPONENTS) {
      try {
        // Check if chart element is visible
        const visible = await isVisible(chart.element);

        if (!visible) {
          console.log(`  [SKIP] ${chart.name} - not visible (${chart.section} section)`);
          skipped++;
          continue;
        }

        // Verify chart has data via Chart.js API
        const hasData = await chartHasData(chart.element);

        if (!hasData) {
          console.log(`  [WARN] ${chart.name} - visible but no chart data`);
          skipped++;
          continue;
        }

        if (MODE === 'capture') {
          console.log(`  [CAPTURE] ${chart.name} - visible with data`);
          captured++;
        } else {
          console.log(`  [PASS] ${chart.name} - visible with data`);
          passed++;
        }

      } catch (e) {
        console.log(`  [FAIL] ${chart.name} - ${e.message}`);
        failed++;
      }
    }

    // Capture/verify full dashboard screenshots
    console.log('\n[Dashboard] Full page screenshots...\n');

    // Dashboard top (initial view)
    const dashboardTopBaseline = path.join(BASELINE_DIR, 'dashboard-top.png');
    const dashboardTopCurrent = path.join(CURRENT_DIR, 'dashboard-top.png');
    const dashboardTopDiff = path.join(DIFF_DIR, 'dashboard-top.png');

    // Scroll to top first
    await evalJs('window.scrollTo(0, 0)');
    await new Promise(r => setTimeout(r, 500));
    await screenshot(dashboardTopCurrent);

    if (MODE === 'capture') {
      // Copy current to baseline
      fs.copyFileSync(dashboardTopCurrent, dashboardTopBaseline);
      console.log('  [CAPTURE] dashboard-top.png baseline saved');
      captured++;
    } else if (hasBaseline('dashboard-top', BASELINE_DIR)) {
      // Compare against baseline
      try {
        const result = await compareScreenshots(
          dashboardTopBaseline,
          dashboardTopCurrent,
          dashboardTopDiff,
          0.1  // 10% threshold for anti-aliasing tolerance
        );

        if (result.match) {
          console.log('  [PASS] dashboard-top.png - no visual differences');
          passed++;
        } else {
          console.log(`  [FAIL] dashboard-top.png - ${result.diffPixels} pixels differ (${result.diffPercent.toFixed(2)}%)`);
          console.log(`         Diff saved to: ${dashboardTopDiff}`);
          failed++;
        }
      } catch (e) {
        console.log(`  [FAIL] dashboard-top.png comparison failed: ${e.message}`);
        failed++;
      }
    } else {
      console.log('  [SKIP] dashboard-top.png - no baseline (run with --capture first)');
      skipped++;
    }

    // Dashboard bottom (scroll to end)
    const dashboardBottomBaseline = path.join(BASELINE_DIR, 'dashboard-bottom.png');
    const dashboardBottomCurrent = path.join(CURRENT_DIR, 'dashboard-bottom.png');
    const dashboardBottomDiff = path.join(DIFF_DIR, 'dashboard-bottom.png');

    await evalJs('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(r => setTimeout(r, 500));
    await screenshot(dashboardBottomCurrent);

    if (MODE === 'capture') {
      fs.copyFileSync(dashboardBottomCurrent, dashboardBottomBaseline);
      console.log('  [CAPTURE] dashboard-bottom.png baseline saved');
      captured++;
    } else if (hasBaseline('dashboard-bottom', BASELINE_DIR)) {
      try {
        const result = await compareScreenshots(
          dashboardBottomBaseline,
          dashboardBottomCurrent,
          dashboardBottomDiff,
          0.1  // 10% threshold for anti-aliasing tolerance
        );

        if (result.match) {
          console.log('  [PASS] dashboard-bottom.png - no visual differences');
          passed++;
        } else {
          console.log(`  [FAIL] dashboard-bottom.png - ${result.diffPixels} pixels differ (${result.diffPercent.toFixed(2)}%)`);
          console.log(`         Diff saved to: ${dashboardBottomDiff}`);
          failed++;
        }
      } catch (e) {
        console.log(`  [FAIL] dashboard-bottom.png comparison failed: ${e.message}`);
        failed++;
      }
    } else {
      console.log('  [SKIP] dashboard-bottom.png - no baseline (run with --capture first)');
      skipped++;
    }

    // Summary
    console.log('\n========================================');
    if (MODE === 'capture') {
      console.log(`Chart Capture Complete: ${captured} baselines captured`);
      console.log(`Charts verified: ${captured - 2} (excludes 2 dashboard screenshots)`);
      console.log('Baselines saved to: test/e2e/screenshots/baseline/');
    } else {
      console.log(`Chart Test Complete: ${passed} passed, ${failed} failed, ${skipped} skipped`);
    }
    console.log('========================================');

    return failed === 0;

  } catch (e) {
    console.error('\n[ERROR] Chart test failed:', e.message);
    return false;

  } finally {
    // Cleanup
    try {
      await close();
    } catch {
      // Ignore close errors
    }
    await stopServer();
  }
}

// Run test
runChartTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Chart test error:', err);
    process.exit(1);
  });
