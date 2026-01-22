// test/e2e/helpers/screenshot.js
// Screenshot comparison utility using pixelmatch
// Source: 13-RESEARCH.md Pattern 3, pixelmatch npm docs
import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

// Default directories relative to project root
const BASELINE_DIR = 'test/e2e/screenshots/baseline';
const CURRENT_DIR = 'test/e2e/screenshots/current';
const DIFF_DIR = 'test/e2e/screenshots/diff';

/**
 * Compare two PNG screenshots
 * @param {string} baselinePath - Path to baseline screenshot
 * @param {string} currentPath - Path to current screenshot
 * @param {string} diffPath - Output path for diff image
 * @param {number} threshold - Matching threshold (0-1, default 0.1)
 * @returns {Promise<{match: boolean, diffPixels: number, totalPixels: number, diffPercent: number}>}
 */
export async function compareScreenshots(
  baselinePath,
  currentPath,
  diffPath,
  threshold = 0.1
) {
  // Check files exist
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`Baseline not found: ${baselinePath}`);
  }
  if (!fs.existsSync(currentPath)) {
    throw new Error(`Current screenshot not found: ${currentPath}`);
  }

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

  // Ensure diff directory exists
  const diffDir = path.dirname(diffPath);
  if (diffDir && !fs.existsSync(diffDir)) {
    fs.mkdirSync(diffDir, { recursive: true });
  }

  // Write diff image
  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  const totalPixels = baseline.width * baseline.height;
  const diffPercent = (diffPixels / totalPixels) * 100;
  const match = diffPixels === 0;

  return { match, diffPixels, totalPixels, diffPercent };
}

/**
 * Check if baseline exists for a given name
 * @param {string} name - Screenshot name (without path/extension)
 * @param {string} baselineDir - Baseline directory path
 * @returns {boolean}
 */
export function hasBaseline(name, baselineDir = BASELINE_DIR) {
  return fs.existsSync(path.join(baselineDir, `${name}.png`));
}

/**
 * Get paths for a named screenshot
 * @param {string} name - Screenshot name (without extension)
 * @returns {{baseline: string, current: string, diff: string}}
 */
export function getScreenshotPaths(name) {
  return {
    baseline: path.join(BASELINE_DIR, `${name}.png`),
    current: path.join(CURRENT_DIR, `${name}.png`),
    diff: path.join(DIFF_DIR, `${name}-diff.png`)
  };
}

/**
 * Compare named screenshot against baseline
 * @param {string} name - Screenshot name (without extension)
 * @param {number} threshold - Matching threshold (0-1, default 0.1)
 * @returns {Promise<{match: boolean, diffPixels: number, totalPixels: number, diffPercent: number}>}
 */
export async function compareNamed(name, threshold = 0.1) {
  const paths = getScreenshotPaths(name);
  return compareScreenshots(paths.baseline, paths.current, paths.diff, threshold);
}

/**
 * Capture baseline screenshot (copy current to baseline)
 * @param {string} name - Screenshot name (without extension)
 */
export function captureBaseline(name) {
  const paths = getScreenshotPaths(name);

  if (!fs.existsSync(paths.current)) {
    throw new Error(`Current screenshot not found: ${paths.current}`);
  }

  // Ensure baseline directory exists
  const baselineDir = path.dirname(paths.baseline);
  if (!fs.existsSync(baselineDir)) {
    fs.mkdirSync(baselineDir, { recursive: true });
  }

  fs.copyFileSync(paths.current, paths.baseline);
  console.log(`[Screenshot] Captured baseline: ${name}`);
}

/**
 * Compare or capture screenshot based on baseline existence
 * @param {string} name - Screenshot name (without extension)
 * @param {number} threshold - Matching threshold (0-1, default 0.1)
 * @returns {Promise<{match: boolean, diffPixels: number, totalPixels: number, diffPercent: number, captured: boolean}>}
 */
export async function compareOrCapture(name, threshold = 0.1) {
  if (!hasBaseline(name)) {
    captureBaseline(name);
    return { match: true, diffPixels: 0, totalPixels: 0, diffPercent: 0, captured: true };
  }

  const result = await compareNamed(name, threshold);
  return { ...result, captured: false };
}

/**
 * Ensure screenshot directories exist
 */
export function ensureDirectories() {
  [BASELINE_DIR, CURRENT_DIR, DIFF_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Clean current and diff directories
 */
export function cleanScreenshots() {
  [CURRENT_DIR, DIFF_DIR].forEach(dir => {
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        if (file !== '.gitignore') {
          fs.unlinkSync(path.join(dir, file));
        }
      });
    }
  });
}
