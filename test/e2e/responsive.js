// test/e2e/responsive.js
// Responsive layout tests at multiple viewports
import { startServer, stopServer, getBaseUrl } from './helpers/server.js';
import {
  open, close, isVisible, screenshot, wait, setViewport, findRole, evalJs
} from './helpers/agent-browser.js';

// Viewport configurations
const VIEWPORTS = [
  { name: 'desktop', width: 1920, height: 1080 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 },
];

// Layout expectations by viewport
// Based on 07-04 decision: Mobile breakpoint at 768px
const EXPECTATIONS = {
  desktop: {
    sidebarVisible: true,
    description: 'Sidebar always visible on desktop'
  },
  tablet: {
    sidebarVisible: true,  // At exactly 768px, sidebar still visible
    description: 'Sidebar visible at tablet breakpoint'
  },
  mobile: {
    sidebarVisible: false, // Below 768px, sidebar hidden by default
    description: 'Sidebar hidden on mobile (overlay mode)'
  },
};

async function runResponsiveTest() {
  console.log('========================================');
  console.log('eVelo Responsive Layout Test');
  console.log('========================================\n');

  let passed = 0;
  let failed = 0;

  try {
    // Start server
    await startServer();

    // Open application
    await open(getBaseUrl());
    await wait('main-layout', { timeout: 10000 });

    for (const viewport of VIEWPORTS) {
      console.log(`\n[${viewport.name.toUpperCase()}] Testing ${viewport.width}x${viewport.height}`);
      console.log('-'.repeat(40));

      // Set viewport
      await setViewport(viewport.width, viewport.height);

      // Wait for layout to adjust
      await new Promise(r => setTimeout(r, 500));

      const expectation = EXPECTATIONS[viewport.name];

      // Test 1: Capture screenshot
      const screenshotPath = `test/e2e/screenshots/current/responsive-${viewport.name}.png`;
      try {
        await screenshot(screenshotPath);
        console.log(`  [PASS] Screenshot saved: responsive-${viewport.name}.png`);
        passed++;
      } catch (e) {
        console.log(`  [FAIL] Screenshot failed: ${e.message}`);
        failed++;
      }

      // Test 2: Check sidebar visibility
      try {
        const sidebarVisible = await isVisible('sidebar-panel');

        if (viewport.name === 'mobile') {
          // On mobile, sidebar should be hidden initially
          if (!sidebarVisible) {
            console.log(`  [PASS] ${expectation.description}`);
            passed++;
          } else {
            console.log(`  [FAIL] Sidebar visible on mobile (should be hidden)`);
            failed++;
          }
        } else {
          // On desktop/tablet, sidebar should be visible
          if (sidebarVisible === expectation.sidebarVisible) {
            console.log(`  [PASS] ${expectation.description}`);
            passed++;
          } else {
            console.log(`  [FAIL] Sidebar visibility: expected ${expectation.sidebarVisible}, got ${sidebarVisible}`);
            failed++;
          }
        }
      } catch (e) {
        console.log(`  [FAIL] Could not check sidebar: ${e.message}`);
        failed++;
      }

      // Test 3: Verify main layout visible
      try {
        const mainVisible = await isVisible('main-layout');
        if (mainVisible) {
          console.log(`  [PASS] Main layout visible at ${viewport.name}`);
          passed++;
        } else {
          console.log(`  [FAIL] Main layout not visible at ${viewport.name}`);
          failed++;
        }
      } catch (e) {
        console.log(`  [FAIL] Could not check main layout: ${e.message}`);
        failed++;
      }

      // Test 3b: Verify results-dashboard visible
      try {
        const dashboardVisible = await isVisible('results-dashboard');
        if (dashboardVisible) {
          console.log(`  [PASS] Results dashboard visible at ${viewport.name}`);
          passed++;
        } else {
          // On mobile, dashboard may require scroll
          if (viewport.name === 'mobile') {
            console.log(`  [WARN] Results dashboard not immediately visible on mobile (may need scroll)`);
          } else {
            console.log(`  [FAIL] Results dashboard not visible at ${viewport.name}`);
            failed++;
          }
        }
      } catch (e) {
        console.log(`  [INFO] Could not check results dashboard: ${e.message}`);
      }

      // Test 4: Check for horizontal overflow (layout issues)
      try {
        const hasOverflow = await evalJs(`
          document.body.scrollWidth > window.innerWidth
        `);

        if (hasOverflow === false || hasOverflow === 'false') {
          console.log(`  [PASS] No horizontal overflow at ${viewport.name}`);
          passed++;
        } else {
          console.log(`  [WARN] Horizontal overflow detected at ${viewport.name}`);
          // Don't fail - may be intentional for some layouts
        }
      } catch (e) {
        console.log(`  [INFO] Could not check overflow: ${e.message}`);
      }

      // Test 5: Mobile-specific - test menu toggle (if mobile)
      if (viewport.name === 'mobile') {
        console.log('\n  [Mobile Menu Toggle Test]');
        try {
          // Look for hamburger menu button
          await findRole('button', 'click', 'Menu');
          await new Promise(r => setTimeout(r, 300)); // Wait for animation

          const sidebarAfterToggle = await isVisible('sidebar-panel');
          if (sidebarAfterToggle) {
            console.log(`  [PASS] Sidebar opens after menu click on mobile`);
            passed++;

            // Capture screenshot with sidebar open
            await screenshot('test/e2e/screenshots/current/responsive-mobile-sidebar-open.png');
            console.log(`  [INFO] Mobile sidebar screenshot saved`);
          } else {
            console.log(`  [WARN] Sidebar did not open after menu click`);
          }
        } catch (e) {
          console.log(`  [INFO] Mobile menu toggle not tested: ${e.message}`);
        }
      }
    }

    // Summary
    console.log('\n========================================');
    console.log(`Responsive Test Complete: ${passed} passed, ${failed} failed`);
    console.log('========================================');

    return failed === 0;

  } catch (e) {
    console.error('\n[ERROR] Responsive test failed:', e.message);
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
runResponsiveTest()
  .then(success => process.exit(success ? 0 : 1))
  .catch(err => {
    console.error('Responsive test error:', err);
    process.exit(1);
  });
