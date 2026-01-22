// test/e2e/helpers/agent-browser.js
// Cross-platform agent-browser CLI wrapper
// Source: 13-RESEARCH.md Pattern 1
import spawn from 'cross-spawn';

/**
 * Execute agent-browser command
 * @param {string[]} args - Command arguments
 * @param {object} options - Options (timeout)
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
export async function agentBrowser(args, options = {}) {
  const { timeout = 30000 } = options;

  return new Promise((resolve, reject) => {
    const proc = spawn('npx', ['agent-browser', ...args], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => { stdout += data.toString(); });
    proc.stderr.on('data', (data) => { stderr += data.toString(); });

    proc.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve({ stdout, stderr, exitCode });
      } else {
        reject(new Error(`agent-browser failed (code ${exitCode}): ${stderr || stdout}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`agent-browser spawn error: ${err.message}`));
    });
  });
}

// Convenience wrappers for common commands

/**
 * Open URL in browser
 * @param {string} url - URL to open
 */
export async function open(url) {
  await agentBrowser(['open', url]);
}

/**
 * Close browser
 */
export async function close() {
  await agentBrowser(['close']);
}

/**
 * Take screenshot and save to path
 * @param {string} path - File path to save screenshot
 */
export async function screenshot(path) {
  await agentBrowser(['screenshot', path]);
}

/**
 * Get page snapshot (accessibility tree)
 * @param {object} options - Options (interactive)
 * @returns {Promise<string>} Snapshot output
 */
export async function snapshot(options = {}) {
  const args = ['snapshot'];
  if (options.interactive) args.push('--interactive');
  const result = await agentBrowser(args);
  return result.stdout;
}

/**
 * Check if element is visible
 * @param {string} element - Element selector or description
 * @returns {Promise<boolean>}
 */
export async function isVisible(element) {
  try {
    const result = await agentBrowser(['is', 'visible', element]);
    return result.stdout.trim().toLowerCase() === 'true';
  } catch {
    return false;
  }
}

/**
 * Find element by ARIA role and perform action
 * @param {string} role - ARIA role
 * @param {string} action - Action to perform (click, fill, etc.)
 * @param {string} [value] - Value for action (optional)
 */
export async function findRole(role, action, value) {
  const args = ['find', 'role', role, action];
  if (value) args.push(value);
  await agentBrowser(args);
}

/**
 * Find element by label and perform action
 * @param {string} label - Label text
 * @param {string} action - Action to perform (click, fill, etc.)
 * @param {string} [value] - Value for action (optional)
 */
export async function findLabel(label, action, value) {
  const args = ['find', 'label', label, action];
  if (value) args.push(value);
  await agentBrowser(args);
}

/**
 * Wait for element or condition
 * @param {string} target - Element or condition to wait for
 * @param {object} options - Options (timeout)
 */
export async function wait(target, options = {}) {
  const args = ['wait', target];
  if (options.timeout) args.push('--timeout', String(options.timeout));
  await agentBrowser(args, { timeout: (options.timeout || 30000) + 5000 });
}

/**
 * Set browser viewport size
 * @param {number} width - Viewport width
 * @param {number} height - Viewport height
 */
export async function setViewport(width, height) {
  await agentBrowser(['set', 'viewport', String(width), String(height)]);
}

/**
 * Evaluate JavaScript in browser context
 * @param {string} code - JavaScript code to evaluate
 * @returns {Promise<any>} Evaluation result (parsed JSON if possible)
 */
export async function evalJs(code) {
  const result = await agentBrowser(['eval', code]);
  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    return result.stdout.trim();
  }
}

/**
 * Click on element by text content
 * @param {string} text - Text to find and click
 */
export async function clickText(text) {
  await agentBrowser(['click', text]);
}

/**
 * Fill input field by label
 * @param {string} label - Input label
 * @param {string} value - Value to fill
 */
export async function fill(label, value) {
  await findLabel(label, 'fill', value);
}

/**
 * Assert element exists (throws if not found)
 * @param {string} element - Element description
 */
export async function assertVisible(element) {
  const visible = await isVisible(element);
  if (!visible) {
    throw new Error(`Element not visible: ${element}`);
  }
}
