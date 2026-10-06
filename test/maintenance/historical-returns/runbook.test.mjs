import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const runbookPath = path.join(root, 'docs/maintenance/historical-returns/maintainer-runbook.md');
const runbook = readFileSync(runbookPath, 'utf8');

test('runbook uses repository-root command interfaces only', () => {
  for (const command of [
    'npm run refresh:identify -- --source "$SOURCE_PATH" --manifest "$MANIFEST_PATH"',
    'npm run refresh:dry-run -- --source "$SOURCE_PATH" --manifest "$MANIFEST_PATH" --output-dir "$REVIEWED_CANDIDATES_DIR"',
    'npm run refresh:apply -- --source "$SOURCE_PATH" --manifest "$MANIFEST_PATH" --candidates-dir "$REVIEWED_CANDIDATES_DIR"',
    'npm run refresh:apply -- --source "$SOURCE_PATH" --manifest "$MANIFEST_PATH" --candidates-dir "$REVIEWED_CANDIDATES_DIR" --confirm-apply',
    'npm --prefix . run test:refresh-identify',
    'node --test test/maintenance/historical-returns/schema-contract.test.mjs',
    'npm --prefix . run test:refresh-dry-run',
    'npm --prefix . run test:refresh-apply',
    'node --test test/maintenance/historical-returns/runbook.test.mjs',
    'npm run build',
  ]) {
    assert.match(runbook, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(runbook, /\/Users\/|\/home\/|[A-Za-z]:\\/);
});

test('runbook documents methodology, completed-year rule, and manual initiation', () => {
  for (const phrase of [
    'newly completed calendar year',
    'material source correction',
    'Do not schedule unattended runs',
    'calendar-year total returns',
    'dividends reinvested',
    'last-trading-day to last-trading-day',
    'decimal units with four-decimal precision',
    'ETF-level returns',
    'Only completed calendar years are eligible',
  ]) {
    assert.match(runbook, new RegExp(phrase, 'i'));
  }
});

test('runbook requires reviewing full artifacts and explicit apply confirmation', () => {
  for (const artifact of ['stocks.json', 'indices.json', 'dry-run-report.md']) {
    assert.match(runbook, new RegExp(`- \`${artifact.replace('.', '\\.')}\``));
  }
  assert.match(runbook, /--confirm-apply/);
  assert.match(runbook, /Preview first, then confirm explicitly/i);
  assert.match(runbook, /checksum match as reviewer authorization/i);
});

test('runbook requires pre-apply cleanliness checks and scoped rollback', () => {
  assert.match(runbook, /PRE_APPLY_COMMIT=\$\(git rev-parse HEAD\)/);
  assert.match(runbook, /git status --short -- src\/data\/presets\/stocks\.json src\/data\/presets\/indices\.json/);
  assert.match(runbook, /git --no-pager diff -- src\/data\/presets\/stocks\.json src\/data\/presets\/indices\.json/);
  assert.match(runbook, /git restore --source="\$PRE_APPLY_COMMIT" -- "\$CHANGED_PRESET_PATH"/);
  assert.match(runbook, /CHANGED_PRESET_PATH="src\/data\/presets\/stocks\.json"\s+# or "src\/data\/presets\/indices\.json"/);
  assert.match(runbook, /Path-limited restore discards current edits on restored paths/i);
  assert.doesNotMatch(runbook, /git restore --source="\$PRE_APPLY_COMMIT" -- \./);
});

test('runbook states unsupported concurrency and excluded boundaries', () => {
  for (const phrase of [
    'Run one apply process at a time; concurrent apply is unsupported',
    'Cross-file all-or-nothing writes are not guaranteed',
    'interruption can leave a partial two-file result',
    'No provider fetching',
    'No raw-price return calculation',
    'No browser IndexedDB custom-data access',
    'No silent scheduling or unattended updates',
  ]) {
    assert.match(runbook, new RegExp(phrase, 'i'));
  }
});
