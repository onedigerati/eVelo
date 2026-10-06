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

function writeManifest(source, sourceBytes, overrides = {}) {
  const manifest = {
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
      rationale: 'Review only the declared annual-return periods.',
    },
    reviewer: 'Test reviewer',
    reviewDate: '2026-01-02',
    exceptions: [{
      symbols: ['AAPL'],
      years: [2025],
      acceptedValueOrPolicy: '0.3000',
      rationale: 'Reviewer approved the corrected annual return.',
      evidence: 'Reviewed CSV records and source comparison.',
    }],
    ...overrides,
  };
  const manifestPath = `${source}.manifest.json`;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return manifestPath;
}

function fixture(t, options = {}) {
  const {
    sourceText = 'symbol,name,assetClass,year,return\nAAPL,Apple Inc.,equity_stock,2025,0.3000\n',
    manifestOverrides = {},
  } = options;
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
  cpSync(applySource, path.join(repository, applyRelative));
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
  const sourceBytes = Buffer.from(sourceText);
  writeFileSync(source, sourceBytes);
  const manifest = writeManifest(source, sourceBytes, manifestOverrides);

  const git = (...args) => {
    const result = run('git', args, repository);
    assert.equal(result.status, 0, result.stderr);
    return result;
  };
  git('init', '--quiet');
  writeFileSync(path.join(repository, '.git/info/exclude'), '\n/node_modules\n', { flag: 'a' });
  git('config', 'user.name', 'Apply Fixture');
  git('config', 'user.email', 'apply-fixture@example.invalid');
  git('add', 'src/data/presets', dryRunRelative, applyRelative);
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
    directory,
    repository,
    reviewedDirectory,
    candidatesDirectory,
    source,
    manifest,
    stockPath,
    indexPath,
    dryRunPath: path.join(repository, dryRunRelative),
    applyPath: path.join(repository, applyRelative),
  };
}

function snapshotPresets(f) {
  return {
    stocks: readFileSync(f.stockPath),
    indices: readFileSync(f.indexPath),
  };
}

function assertPresetBytesEqual(f, expected) {
  assert.deepEqual(readFileSync(f.stockPath), expected.stocks);
  assert.deepEqual(readFileSync(f.indexPath), expected.indices);
}

function runApply(f, extra = []) {
  return run(process.execPath, [
    f.applyPath,
    '--source', f.source,
    '--manifest', f.manifest,
    '--candidates-dir', f.candidatesDirectory,
    ...extra,
  ], f.repository);
}

test('confirmed apply writes only changed preset partitions', t => {
  const f = fixture(t);
  const reviewedStocks = readFileSync(path.join(f.candidatesDirectory, 'stocks.json'));
  const baseline = snapshotPresets(f);

  const result = runApply(f, ['--confirm-apply']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout,
    /diff --git a\/src\/data\/presets\/stocks\.json b\/src\/data\/presets\/stocks\.json/);
  assert.match(result.stdout, /-\s+"return": 0\.25\n\+\s+"return": 0\.3/);
  assert.deepEqual(readFileSync(f.stockPath), reviewedStocks);
  assert.deepEqual(readFileSync(f.indexPath), baseline.indices);
  const status = run('git', ['status', '--short'], f.repository);
  assert.equal(status.status, 0, status.stderr);
  assert.deepEqual(status.stdout.trimEnd().split('\n'), [' M src/data/presets/stocks.json']);
});

test('apply preview shows the proposed diff without changing preset bytes', t => {
  const f = fixture(t);
  const baseline = snapshotPresets(f);
  const result = runApply(f);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout,
    /diff --git a\/src\/data\/presets\/stocks\.json b\/src\/data\/presets\/stocks\.json/);
  assert.match(result.stdout, /-\s+"return": 0\.25\n\+\s+"return": 0\.3/);
  assert.match(result.stdout, /Preview only.*--confirm-apply/);
  assertPresetBytesEqual(f, baseline);
  const status = run('git', ['status', '--short'], f.repository);
  assert.equal(status.status, 0, status.stderr);
  assert.equal(status.stdout, '');
});

for (const filename of ['stocks.json', 'indices.json', 'dry-run-report.md']) {
  test(`edited reviewed ${filename} fails closed before mutation`, t => {
    const f = fixture(t);
    const baseline = snapshotPresets(f);
    const editedPath = path.join(f.candidatesDirectory, filename);
    writeFileSync(editedPath, `${readFileSync(editedPath, 'utf8')}\n#tamper\n`);

    const result = runApply(f, ['--confirm-apply']);

    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`Fresh ${filename} does not byte-match`, 'i'));
    assertPresetBytesEqual(f, baseline);
  });
}

test('stale reviewed artifacts are rejected after baseline changes, while fresh reruns become no-op', t => {
  const f = fixture(t);
  const firstRun = runApply(f, ['--confirm-apply']);
  assert.equal(firstRun.status, 0, firstRun.stderr);
  const appliedBytes = snapshotPresets(f);

  const staleRetry = runApply(f, ['--confirm-apply']);
  assert.equal(staleRetry.status, 1);
  assert.match(staleRetry.stderr, /does not byte-match the reviewed artifact/i);
  assertPresetBytesEqual(f, appliedBytes);

  const refreshedCandidates = path.join(f.reviewedDirectory, 'refreshed');
  const dryRun = run(process.execPath, [
    f.dryRunPath,
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', refreshedCandidates,
  ], f.repository);
  assert.equal(dryRun.status, 0, dryRun.stderr);

  const rerun = run(process.execPath, [
    f.applyPath,
    '--source', f.source,
    '--manifest', f.manifest,
    '--candidates-dir', refreshedCandidates,
    '--confirm-apply',
  ], f.repository);
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.match(rerun.stdout, /No preset changes are needed/i);
  assertPresetBytesEqual(f, appliedBytes);
});

test('baseline drift committed after review is rejected before writes', t => {
  const f = fixture(t);
  const baseline = snapshotPresets(f);
  const modifiedStocks = JSON.parse(baseline.stocks.toString('utf8'));
  modifiedStocks.AAPL.returns.find(item => item.date === '2024').return = 0.1111;
  writeFileSync(f.stockPath, `${JSON.stringify(modifiedStocks, null, 2)}\n`);
  const add = run('git', ['add', 'src/data/presets/stocks.json'], f.repository);
  assert.equal(add.status, 0, add.stderr);
  const commit = run('git', ['commit', '--quiet', '-m', 'baseline drift'], f.repository);
  assert.equal(commit.status, 0, commit.stderr);
  const drifted = snapshotPresets(f);

  const result = runApply(f, ['--confirm-apply']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /does not byte-match the reviewed artifact/i);
  assertPresetBytesEqual(f, drifted);
});

test('fresh dry-run input failures stop apply without changing preset bytes', t => {
  const f = fixture(t);
  const baseline = snapshotPresets(f);
  writeFileSync(f.source, 'invalid source contents\n');
  const sourceBytes = readFileSync(f.source);
  const brokenManifest = JSON.parse(readFileSync(f.manifest, 'utf8'));
  brokenManifest.snapshotSha256 = hash(sourceBytes);
  writeFileSync(f.manifest, `${JSON.stringify(brokenManifest, null, 2)}\n`);

  const result = runApply(f, ['--confirm-apply']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Fresh dry run failed/i);
  assertPresetBytesEqual(f, baseline);
});

test('dirty unstaged target files are refused before apply writes', t => {
  const f = fixture(t);
  const baseline = snapshotPresets(f);
  writeFileSync(f.stockPath, `${readFileSync(f.stockPath, 'utf8')}\n`);

  const result = runApply(f, ['--confirm-apply']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /target has local changes: src\/data\/presets\/stocks\.json/i);
  assertPresetBytesEqual(f, {
    stocks: readFileSync(f.stockPath),
    indices: baseline.indices,
  });
});

test('dirty staged target files are refused before apply writes', t => {
  const f = fixture(t);
  const baseline = snapshotPresets(f);
  writeFileSync(f.stockPath, `${readFileSync(f.stockPath, 'utf8')}\n`);
  const add = run('git', ['add', 'src/data/presets/stocks.json'], f.repository);
  assert.equal(add.status, 0, add.stderr);

  const result = runApply(f, ['--confirm-apply']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /target has local changes: src\/data\/presets\/stocks\.json/i);
  assert.deepEqual(readFileSync(f.indexPath), baseline.indices);
});

test('all pending targets are preflighted before any write when both partitions change', t => {
  const f = fixture(t, {
    sourceText: [
      'symbol,name,assetClass,year,return',
      'AAPL,Apple Inc.,equity_stock,2025,0.3000',
      'IWM,Russell 2000 ETF,equity_index,2025,0.2222',
      '',
    ].join('\n'),
    manifestOverrides: {
      coveredCalendarYears: [2025],
      assetScope: {
        mode: 'subset',
        symbols: ['AAPL', 'IWM'],
        rationale: 'Review both changed partitions.',
      },
      exceptions: [{
        symbols: ['AAPL', 'IWM'],
        years: [2025],
        acceptedValueOrPolicy: '0.3000 and 0.2222',
        rationale: 'Reviewer approved both annual return corrections.',
        evidence: 'Reviewed both CSV records and source comparison.',
      }],
    },
  });
  const baseline = snapshotPresets(f);
  writeFileSync(f.stockPath, `${readFileSync(f.stockPath, 'utf8')}\n`);

  const result = runApply(f, ['--confirm-apply']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /target has local changes: src\/data\/presets\/stocks\.json/i);
  assertPresetBytesEqual(f, {
    stocks: readFileSync(f.stockPath),
    indices: baseline.indices,
  });
});

test('apply does not access provider/network APIs or IndexedDB globals', t => {
  const f = fixture(t);
  const guard = path.join(f.directory, 'guard.cjs');
  writeFileSync(guard, [
    "const http = require('node:http');",
    "const https = require('node:https');",
    "http.request = http.get = https.request = https.get = () => { throw new Error('unexpected network access'); };",
    "globalThis.fetch = () => { throw new Error('unexpected provider fetch'); };",
    "Object.defineProperty(globalThis, 'indexedDB', { configurable: true, get() { throw new Error('unexpected IndexedDB access'); } });",
    '',
  ].join('\n'));

  const result = run(process.execPath, [
    '--require', guard,
    f.applyPath,
    '--source', f.source,
    '--manifest', f.manifest,
    '--candidates-dir', f.candidatesDirectory,
    '--confirm-apply',
  ], f.repository);

  assert.equal(result.status, 0, result.stderr);
});

test('apply rejects fresh candidate files that break the PresetData shape', t => {
  const f = fixture(t);
  const baseline = snapshotPresets(f);
  writeFileSync(f.dryRunPath, [
    "import { mkdirSync, writeFileSync } from 'node:fs';",
    "import path from 'node:path';",
    "const args = process.argv.slice(2);",
    "const outputDir = path.resolve(args[args.indexOf('--output-dir') + 1]);",
    "mkdirSync(outputDir, { recursive: true });",
    "writeFileSync(path.join(outputDir, 'stocks.json'), JSON.stringify({AAPL:{symbol:'WRONG',name:'Apple Inc.',startDate:'2024-01-01',endDate:'2025-12-31',returns:[{date:2025,return:0.3}]}}));",
    "writeFileSync(path.join(outputDir, 'indices.json'), JSON.stringify({IWM:{symbol:'IWM',name:'Russell 2000 ETF',assetClass:'equity_index',startDate:'2024-01-01',endDate:'2025-12-31',returns:[{date:'2025',return:0.12}]}}));",
    "writeFileSync(path.join(outputDir, 'dry-run-report.md'), '# report\\n');",
    "console.log('mock dry run');",
    '',
  ].join('\n'));

  const result = runApply(f, ['--confirm-apply']);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid PresetData shape in stocks\.json/i);
  assertPresetBytesEqual(f, baseline);
});

test('dry-run remains separate and rejects apply-only confirmation', t => {
  const f = fixture(t);
  const baseline = snapshotPresets(f);
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
  assertPresetBytesEqual(f, baseline);
});

test('apply usage discloses that concurrent invocations are unsupported', t => {
  const f = fixture(t);
  const result = run(process.execPath, [f.applyPath], f.repository);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage: npm run refresh:apply/);
  assert.match(result.stderr, /concurrent apply invocations are unsupported/i);
});
