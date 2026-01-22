// test/e2e/run-all.js
// E2E test orchestrator - runs all tests in sequence
import spawn from 'cross-spawn';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Tests to run (in order)
const TESTS = [
  { name: 'Smoke Test', script: 'smoke.js', critical: true },
  { name: 'Workflow Test', script: 'workflow.js', critical: true },
  { name: 'Responsive Test', script: 'responsive.js', critical: false },
  // Note: charts.js excluded from CI - requires baseline capture first
  // Run manually with: npm run test:e2e:charts
];

/**
 * Run a single test script
 * @param {string} name - Test name for display
 * @param {string} script - Script filename
 * @returns {Promise<boolean>} - Whether test passed
 */
async function runTest(name, script) {
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${name}`);
    console.log('='.repeat(60));

    const testPath = join(__dirname, script);

    // Use cross-spawn for Windows compatibility
    const proc = spawn('node', [testPath], {
      stdio: 'inherit',
      cwd: process.cwd()
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log(`\n[PASS] ${name} completed successfully`);
        resolve(true);
      } else {
        console.log(`\n[FAIL] ${name} failed with exit code ${code}`);
        resolve(false);
      }
    });

    proc.on('error', (err) => {
      console.log(`\n[ERROR] ${name} failed to start: ${err.message}`);
      resolve(false);
    });
  });
}

/**
 * Run all E2E tests
 */
async function runAllTests() {
  console.log('============================================================');
  console.log('eVelo E2E Test Suite');
  console.log('============================================================');
  console.log(`Running ${TESTS.length} tests...\n`);

  const startTime = Date.now();
  const results = [];
  let criticalFailure = false;

  for (const test of TESTS) {
    const passed = await runTest(test.name, test.script);
    results.push({ name: test.name, passed, critical: test.critical });

    if (!passed && test.critical) {
      criticalFailure = true;
      // Continue running other tests to get full report
    }
  }

  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(1);

  // Print summary
  console.log('\n');
  console.log('============================================================');
  console.log('TEST SUMMARY');
  console.log('============================================================');

  for (const result of results) {
    const status = result.passed ? '[PASS]' : '[FAIL]';
    const critical = result.critical ? ' (critical)' : '';
    console.log(`${status} ${result.name}${critical}`);
  }

  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;

  console.log('------------------------------------------------------------');
  console.log(`Total: ${passCount} passed, ${failCount} failed`);
  console.log(`Duration: ${duration}s`);
  console.log('============================================================');

  // Return success if no critical failures
  // (non-critical tests like responsive can fail without blocking CI)
  if (criticalFailure) {
    console.log('\nCritical test(s) failed - CI should fail');
    return false;
  } else if (failCount > 0) {
    console.log('\nNon-critical test(s) failed - CI passes with warnings');
    return true;  // Still pass CI
  } else {
    console.log('\nAll tests passed!');
    return true;
  }
}

// Run tests
runAllTests()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Test suite error:', err);
    process.exit(1);
  });
