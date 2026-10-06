import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const projectRoot = fileURLToPath(new URL('../../../', import.meta.url));
const dryRunSource = path.join(projectRoot, 'scripts/maintenance/historical-returns/dry-run.mjs');
const applySource = path.join(projectRoot, 'scripts/maintenance/historical-returns/apply.mjs');
const dryRunRelative = 'scripts/maintenance/historical-returns/dry-run.mjs';
const applyRelative = 'scripts/maintenance/historical-returns/apply.mjs';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function run(command, args, cwd) {
  return spawnSync(command, args, { cwd, encoding: 'utf8' });
}

function fixture(t) {
  const directory = mkdtempSync(path.join(tmpdir(), 'evelo-apply-'));
  const repository = path.join(directory, 'repo');
  const reviewedDirectory = path.join(directory, 'reviewed');
  const candidatesDirectory = path.join(directory, 'candidates');
  const presetDirectory = path.join(repository, 'src/data/presets');
  const maintenanceDirectory = path.join(repository, path.dirname(dryRunRelative));
  mkdirSync(presetDirectory, { recursive: true });
  mkdirSync(maintenanceDirectory, { recursive: true });
  mkdirSync(reviewedDirectory);
  cpSync(dryRunSource, path.join(repository, dryRunRelative));
  if (existsSync(applySource)) cpSync(applySource, path.join(repository, applyRelative));
  symlinkSync(path.join(projectRoot, 'node_modules'), path.join(repository, 'node_modules'), 'dir');

  const stocks = {
    AAPL: {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      assetClass: 'equity_stock',
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      returns: [
        { date: '2024', return: 0.15 },
        { date: '2025', return: 0.25 },
      ],
    },
  };
  const indices = {
    IWM: {
      symbol: 'IWM',
      name: 'Russell 2000 ETF',
      assetClass: 'equity_index',
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      returns: [
        { date: '2024', return: 0.1 },
        { date: '2025', return: 0.12 },
      ],
    },
  };
  const stockPath = path.join(presetDirectory, 'stocks.json');
  const indexPath = path.join(presetDirectory, 'indices.json');
  writeFileSync(stockPath, `${JSON.stringify(stocks, null, 2)}\n`);
  writeFileSync(indexPath, `${JSON.stringify(indices, null, 2)}\n`);

  const source = path.join(reviewedDirectory, 'review.csv');
  const sourceBytes = Buffer.from(
    'symbol,name,assetClass,year,return\nAAPL,Apple Inc.,equity_stock,2025,0.3000\n',
  );
  writeFileSync(source, sourceBytes);
  const manifest = `${source}.manifest.json`;
  writeFileSync(manifest, `${JSON.stringify({
    sourceAttribution: 'Reviewed local historical return snapshot',
    snapshotFilename: path.basename(source),
    snapshotSha256: hash(sourceBytes),
    methodology: {
      returnConvention: 'calendar-year total returns',
      dividendsReinvested: true,
      endpoints: 'last-trading-day to last-trading-day',
      units: 'decimal',
      decimalPlaces: 4,
      etfReturnPolicy: 'ETF-level returns',
    },
    coveredCalendarYears: [2025],
    assetScope: {
      mode: 'subset',
      symbols: ['AAPL'],
      rationale: 'Review only the declared AAPL annual-return period.',
    },
    reviewer: 'Test reviewer',
    reviewDate: '2026-01-02',
    exceptions: [{
      symbols: ['AAPL'],
      years: [2025],
      acceptedValueOrPolicy: '0.3000',
      rationale: 'Reviewer approved the corrected annual return.',
      evidence: 'Reviewed CSV record AAPL/2025 and source comparison.',
    }],
  }, null, 2)}\n`);

  const git = (...args) => {
    const result = run('git', args, repository);
    assert.equal(result.status, 0, result.stderr);
    return result;
  };
  git('init', '--quiet');
  writeFileSync(path.join(repository, '.git/info/exclude'), '\n/node_modules\n', { flag: 'a' });
  git('config', 'user.name', 'Apply Fixture');
  git('config', 'user.email', 'apply-fixture@example.invalid');
  git('add', 'src/data/presets', 'scripts/maintenance/historical-returns/dry-run.mjs');
  if (existsSync(path.join(repository, applyRelative))) git('add', applyRelative);
  git('commit', '--quiet', '-m', 'fixture baseline');

  const dryRun = run(process.execPath, [
    path.join(repository, dryRunRelative),
    '--source', source,
    '--manifest', manifest,
    '--output-dir', candidatesDirectory,
  ], repository);
  assert.equal(dryRun.status, 0, dryRun.stderr);

  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return {
    repository,
    candidatesDirectory,
    source,
    manifest,
    stockPath,
    indexPath,
    dryRunPath: path.join(repository, dryRunRelative),
    applyPath: path.join(repository, applyRelative),
    baselineStocks: readFileSync(stockPath),
    reviewedStocks: readFileSync(path.join(candidatesDirectory, 'stocks.json')),
    baselineIndices: readFileSync(indexPath),
  };
}

test('confirmed apply writes only changed preset partitions', t => {
  const f = fixture(t);
  const result = run(process.execPath, [
    f.applyPath,
    '--source', f.source,
    '--manifest', f.manifest,
    '--candidates-dir', f.candidatesDirectory,
    '--confirm-apply',
  ], f.repository);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout,
    /diff --git a\/src\/data\/presets\/stocks\.json b\/src\/data\/presets\/stocks\.json/);
  assert.match(result.stdout, /-\s+"return": 0\.25\n\+\s+"return": 0\.3/);
  assert.deepEqual(readFileSync(f.stockPath), f.reviewedStocks);
  assert.deepEqual(readFileSync(f.indexPath), f.baselineIndices);
  const status = run('git', ['status', '--short'], f.repository);
  assert.equal(status.status, 0, status.stderr);
  assert.deepEqual(status.stdout.trimEnd().split('\n'), [' M src/data/presets/stocks.json']);
});

test('apply preview shows the proposed diff without changing preset bytes', t => {
  const f = fixture(t);
  const result = run(process.execPath, [
    f.applyPath,
    '--source', f.source,
    '--manifest', f.manifest,
    '--candidates-dir', f.candidatesDirectory,
  ], f.repository);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout,
    /diff --git a\/src\/data\/presets\/stocks\.json b\/src\/data\/presets\/stocks\.json/);
  assert.match(result.stdout, /-\s+"return": 0\.25\n\+\s+"return": 0\.3/);
  assert.match(result.stdout, /Preview only.*--confirm-apply/);
  assert.deepEqual(readFileSync(f.stockPath), f.baselineStocks);
  assert.deepEqual(readFileSync(f.indexPath), f.baselineIndices);
  const status = run('git', ['status', '--short'], f.repository);
  assert.equal(status.status, 0, status.stderr);
  assert.equal(status.stdout, '');
});

test('dry-run remains separate and rejects apply-only confirmation', t => {
  const f = fixture(t);
  const outputDirectory = path.join(f.repository, 'dry-run-apply-flag-output');
  const result = run(process.execPath, [
    f.dryRunPath,
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', outputDirectory,
    '--confirm-apply',
  ], f.repository);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /unknown argument: --confirm-apply/i);
  assert.equal(existsSync(outputDirectory), false);
  assert.deepEqual(readFileSync(f.stockPath), f.baselineStocks);
  assert.deepEqual(readFileSync(f.indexPath), f.baselineIndices);
});

test('apply usage discloses that concurrent invocations are unsupported', t => {
  const f = fixture(t);
  const result = run(process.execPath, [f.applyPath], f.repository);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage: npm run refresh:apply/);
  assert.match(result.stderr, /concurrent apply invocations are unsupported/i);
});
