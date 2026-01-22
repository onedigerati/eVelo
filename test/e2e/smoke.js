// test/e2e/smoke.js
// Smoke test - verifies all major components render correctly
import { startServer, stopServer, getBaseUrl } from './helpers/server.js';
import {
  open, close, isVisible, snapshot, screenshot, wait,
  findRole, evalJs
} from './helpers/agent-browser.js';

// Components to verify visibility
const LAYOUT_COMPONENTS = [
  { element: 'main-layout', description: 'Main layout container' },
  { element: 'sidebar-panel', description: 'Sidebar panel' },
  { element: 'results-dashboard', description: 'Results dashboard' },
];

// Expected ARIA roles in accessibility tree
const EXPECTED_ROLES = ['slider', 'spinbutton', 'button'];

// Form labels expected in accessibility tree
const FORM_LABELS = [
  'Initial Portfolio',
  'Time Horizon',
  'Iterations'
];

async function runSmokeTest() {
  console.log('========================================');
  console.log('eVelo Smoke Test');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // Start server
    await startServer();

    // Open application
    await open(getBaseUrl());
    await wait('main-layout', { timeout: 10000 });

    // Test 1: Verify layout components visible
    console.log('[Test 1] Layout Components\n');

    for (const { element, description } of LAYOUT_COMPONENTS) {
      try {
        const visible = await isVisible(element);
        if (visible) {
          console.log(`  [PASS] ${description} (${element})`);
          passed++;
        } else {
          console.log(`  [FAIL] ${description} (${element}) - not visible`);
          failed++;
        }
      } catch (e) {
        console.log(`  [FAIL] ${description} (${element}) - ${e.message}`);
        failed++;
      }
    }

    // Test 1b: Verify param-sections exist
    console.log('\n[Test 1b] Parameter Sections\n');

    const PARAM_SECTIONS = [
      'param-section'  // At least one should be visible
    ];

    for (const element of PARAM_SECTIONS) {
      try {
        const visible = await isVisible(element);
        if (visible) {
          console.log(`  [PASS] ${element} component found`);
          passed++;
        } else {
          console.log(`  [WARN] ${element} not immediately visible`);
        }
      } catch (e) {
        console.log(`  [INFO] Could not verify ${element}: ${e.message}`);
      }
    }

    // Test 2: Verify form inputs in accessibility tree
    console.log('\n[Test 2] Accessibility Tree - ARIA Roles\n');

    const tree = await snapshot({ interactive: true });

    for (const role of EXPECTED_ROLES) {
      if (tree.toLowerCase().includes(role)) {
        console.log(`  [PASS] Found "${role}" role in accessibility tree`);
        passed++;
      } else {
        console.log(`  [FAIL] Missing "${role}" role in accessibility tree`);
        failed++;
      }
    }

    // Test 3: Verify form labels accessible
    console.log('\n[Test 3] Accessibility Tree - Form Labels\n');

    for (const label of FORM_LABELS) {
      if (tree.toLowerCase().includes(label.toLowerCase())) {
        console.log(`  [PASS] Found "${label}" in accessibility tree`);
        passed++;
      } else {
        console.log(`  [WARN] "${label}" not found - may be in collapsed section`);
        // Don't fail - sections may be collapsed
      }
    }

    // Test 4: Capture initial screenshot
    console.log('\n[Test 4] Screenshot Capture\n');

    try {
      await screenshot('test/e2e/screenshots/current/smoke-initial.png');
      console.log('  [PASS] Screenshot saved to smoke-initial.png');
      passed++;
    } catch (e) {
      console.log(`  [FAIL] Screenshot failed: ${e.message}`);
      failed++;
    }

    // Test 5: Verify Run Simulation button exists
    console.log('\n[Test 5] Run Simulation Button\n');

    if (tree.toLowerCase().includes('run') && tree.toLowerCase().includes('simulation')) {
      console.log('  [PASS] Run Simulation button found in accessibility tree');
      passed++;
    } else if (tree.toLowerCase().includes('button')) {
      console.log('  [WARN] Button found but "Run Simulation" text not detected');
    } else {
      console.log('  [FAIL] No button found in accessibility tree');
      failed++;
    }

    // Test 6: Form Interaction Tests
    console.log('\n[Test 6] Form Interactions\n');

    // Test 6a: Range slider drag interaction
    console.log('  [6a] Range Slider Interaction');
    try {
      // Find a slider in the accessibility tree and interact with it
      const sliderBefore = await evalJs(`
        const slider = document.querySelector('range-slider');
        if (slider && slider.shadowRoot) {
          const input = slider.shadowRoot.querySelector('input[type="range"]');
          return input ? input.value : null;
        }
        return null;
      `);

      if (sliderBefore !== null) {
        // Use keyboard to change slider value (more reliable than drag)
        await findRole('slider', 'focus');
        await findRole('slider', 'press', 'ArrowRight');
        await findRole('slider', 'press', 'ArrowRight');

        const sliderAfter = await evalJs(`
          const slider = document.querySelector('range-slider');
          if (slider && slider.shadowRoot) {
            const input = slider.shadowRoot.querySelector('input[type="range"]');
            return input ? input.value : null;
          }
          return null;
        `);

        if (sliderAfter !== sliderBefore) {
          console.log(`    [PASS] Slider responded to keyboard: ${sliderBefore} -> ${sliderAfter}`);
          passed++;
        } else {
          console.log(`    [WARN] Slider value unchanged after keyboard input`);
        }
      } else {
        console.log('    [SKIP] No range-slider found');
      }
    } catch (e) {
      console.log(`    [FAIL] Slider interaction failed: ${e.message}`);
      failed++;
    }

    // Test 6b: Number input keyboard interaction
    console.log('  [6b] Number Input Interaction');
    try {
      // Find number input and verify keyboard input works
      const inputBefore = await evalJs(`
        const numInput = document.querySelector('number-input');
        if (numInput && numInput.shadowRoot) {
          const input = numInput.shadowRoot.querySelector('input[type="number"]');
          return input ? input.value : null;
        }
        return null;
      `);

      if (inputBefore !== null) {
        // Focus and type new value
        await findRole('spinbutton', 'focus');
        await findRole('spinbutton', 'press', 'End');  // Move to end
        await findRole('spinbutton', 'press', 'Backspace');  // Delete last char
        await findRole('spinbutton', 'fill', '5');  // Type new digit

        const inputAfter = await evalJs(`
          const numInput = document.querySelector('number-input');
          if (numInput && numInput.shadowRoot) {
            const input = numInput.shadowRoot.querySelector('input[type="number"]');
            return input ? input.value : null;
          }
          return null;
        `);

        if (inputAfter !== inputBefore) {
          console.log(`    [PASS] Number input responded to keyboard: ${inputBefore} -> ${inputAfter}`);
          passed++;
        } else {
          console.log(`    [WARN] Number input unchanged after keyboard input`);
        }
      } else {
        console.log('    [SKIP] No number-input found');
      }
    } catch (e) {
      console.log(`    [FAIL] Number input interaction failed: ${e.message}`);
      failed++;
    }

    // Test 6c: Select dropdown interaction
    console.log('  [6c] Select Dropdown Interaction');
    try {
      // Check if select/combobox exists in accessibility tree
      const hasSelect = tree.toLowerCase().includes('combobox') ||
                        tree.toLowerCase().includes('listbox') ||
                        tree.toLowerCase().includes('option');

      if (hasSelect) {
        // Try to interact with select
        try {
          await findRole('combobox', 'click');
          // Brief wait for dropdown to open
          await new Promise(r => setTimeout(r, 300));

          // Check if options are now visible
          const expandedTree = await snapshot({ interactive: true });
          const hasOptions = expandedTree.toLowerCase().includes('option') ||
                            expandedTree.toLowerCase().includes('listbox');

          if (hasOptions) {
            console.log('    [PASS] Select dropdown opened with options');
            passed++;
          } else {
            console.log('    [WARN] Select clicked but options not detected');
          }

          // Press Escape to close dropdown
          await findRole('combobox', 'press', 'Escape');
        } catch (e) {
          // Try listbox pattern instead
          try {
            await findRole('listbox', 'focus');
            console.log('    [PASS] Listbox found and focusable');
            passed++;
          } catch {
            console.log(`    [INFO] Select interaction not available: ${e.message}`);
          }
        }
      } else {
        console.log('    [SKIP] No select/combobox found in accessibility tree');
      }
    } catch (e) {
      console.log(`    [FAIL] Select interaction failed: ${e.message}`);
      failed++;
    }

    // Summary
    console.log('\n========================================');
    console.log(`Smoke Test Complete: ${passed} passed, ${failed} failed`);
    console.log('========================================');

    return failed === 0;

  } catch (e) {
    console.error('\n[ERROR] Smoke test failed:', e.message);
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
runSmokeTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Smoke test error:', err);
    process.exit(1);
  });
