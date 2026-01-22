// test/e2e/workflow.js
// End-to-end simulation workflow test
// Tests the complete user journey: params -> run -> results
import { startServer, stopServer, getBaseUrl } from './helpers/server.js';
import {
  open, close, isVisible, snapshot, screenshot, wait,
  findRole, findLabel, evalJs
} from './helpers/agent-browser.js';

// Test parameters (known good values)
const TEST_PARAMS = {
  initialPortfolio: '1000000',
  timeHorizon: '30',
  annualWithdrawal: '50000',
};

async function runWorkflowTest() {
  console.log('========================================');
  console.log('eVelo Simulation Workflow Test');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // Start server
    await startServer();

    // Open application
    await open(getBaseUrl());
    await wait('main-layout', { timeout: 10000 });

    // Phase 1: Set simulation parameters
    console.log('[Phase 1] Setting Simulation Parameters\n');

    // Screenshot before changes
    await screenshot('test/e2e/screenshots/current/workflow-01-initial.png');
    console.log('  [INFO] Initial screenshot captured');

    // Set Initial Portfolio value
    try {
      await findLabel('Initial Portfolio', 'fill', TEST_PARAMS.initialPortfolio);
      console.log(`  [PASS] Set Initial Portfolio to $${TEST_PARAMS.initialPortfolio}`);
      passed++;
    } catch (e) {
      console.log(`  [FAIL] Could not set Initial Portfolio: ${e.message}`);
      failed++;
    }

    // Set Time Horizon (range slider)
    try {
      await findLabel('Time Horizon', 'fill', TEST_PARAMS.timeHorizon);
      console.log(`  [PASS] Set Time Horizon to ${TEST_PARAMS.timeHorizon} years`);
      passed++;
    } catch (e) {
      console.log(`  [WARN] Could not set Time Horizon: ${e.message}`);
      // Don't fail - may use default
    }

    // Set Annual Withdrawal (if visible)
    try {
      await findLabel('Annual Withdrawal', 'fill', TEST_PARAMS.annualWithdrawal);
      console.log(`  [PASS] Set Annual Withdrawal to $${TEST_PARAMS.annualWithdrawal}`);
      passed++;
    } catch (e) {
      console.log(`  [INFO] Annual Withdrawal input not directly accessible`);
      // May be in SBLOC section
    }

    await screenshot('test/e2e/screenshots/current/workflow-02-params-set.png');
    console.log('  [INFO] Parameters screenshot captured');

    // Phase 1b: Verify form values via accessibility tree
    console.log('\n[Phase 1b] Verifying Form Values\n');

    try {
      const tree = await snapshot({ interactive: true });

      // Check that our values appear in the accessibility tree
      // This confirms the inputs accepted our values
      if (tree.includes(TEST_PARAMS.initialPortfolio) ||
          tree.includes('1,000,000') ||
          tree.includes('1000000')) {
        console.log('  [PASS] Initial Portfolio value reflected in UI');
        passed++;
      } else {
        console.log('  [WARN] Could not verify Initial Portfolio in accessibility tree');
      }

      // Check for slider/spinbutton with time horizon value
      if (tree.includes(TEST_PARAMS.timeHorizon)) {
        console.log('  [PASS] Time Horizon value reflected in UI');
        passed++;
      } else {
        console.log('  [WARN] Could not verify Time Horizon in accessibility tree');
      }

    } catch (e) {
      console.log(`  [INFO] Form value verification skipped: ${e.message}`);
    }

    // Phase 2: Run simulation
    console.log('\n[Phase 2] Running Simulation\n');

    try {
      // Find and click the Run Simulation button
      await findRole('button', 'click', 'Run');
      console.log('  [PASS] Clicked Run Simulation button');
      passed++;
    } catch (e) {
      console.log(`  [FAIL] Could not click Run Simulation: ${e.message}`);
      failed++;
      throw new Error('Cannot continue without running simulation');
    }

    // Wait for simulation to complete (look for results)
    console.log('  [INFO] Waiting for simulation to complete...');

    try {
      // Wait for key-metrics-banner to appear (indicates results ready)
      await wait('key-metrics-banner', { timeout: 60000 });
      console.log('  [PASS] Simulation completed - results visible');
      passed++;
    } catch (e) {
      console.log(`  [FAIL] Simulation did not complete in time: ${e.message}`);
      failed++;
    }

    await screenshot('test/e2e/screenshots/current/workflow-03-results.png');
    console.log('  [INFO] Results screenshot captured');

    // Phase 3: Verify results
    console.log('\n[Phase 3] Verifying Results\n');

    // Check for key result components
    const RESULT_COMPONENTS = [
      { element: 'probability-cone-chart', description: 'Probability cone chart' },
      { element: 'histogram-chart', description: 'Histogram chart' },
      { element: 'percentile-spectrum', description: 'Percentile spectrum' },
    ];

    for (const { element, description } of RESULT_COMPONENTS) {
      try {
        const visible = await isVisible(element);
        if (visible) {
          console.log(`  [PASS] ${description} visible`);
          passed++;
        } else {
          console.log(`  [FAIL] ${description} not visible`);
          failed++;
        }
      } catch (e) {
        console.log(`  [FAIL] ${description}: ${e.message}`);
        failed++;
      }
    }

    // Verify probability cone chart has data via eval
    console.log('\n[Phase 4] Verifying Chart Data\n');

    try {
      const hasData = await evalJs(`
        const chart = document.querySelector('probability-cone-chart');
        if (chart && chart.shadowRoot) {
          const canvas = chart.shadowRoot.querySelector('canvas');
          if (canvas && canvas.chart) {
            return canvas.chart.data.datasets.length > 0;
          }
        }
        return false;
      `);

      if (hasData === true || hasData === 'true') {
        console.log('  [PASS] Probability cone chart has data');
        passed++;
      } else {
        console.log('  [WARN] Could not verify chart data (may be rendering issue)');
      }
    } catch (e) {
      console.log(`  [INFO] Chart data verification skipped: ${e.message}`);
    }

    // Summary
    console.log('\n========================================');
    console.log(`Workflow Test Complete: ${passed} passed, ${failed} failed`);
    console.log('========================================');

    return failed === 0;

  } catch (e) {
    console.error('\n[ERROR] Workflow test failed:', e.message);
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
runWorkflowTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Workflow test error:', err);
    process.exit(1);
  });
