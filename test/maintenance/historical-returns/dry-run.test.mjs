import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const command = path.join(root, 'scripts/maintenance/historical-returns/dry-run.mjs');
const stocksPath = path.join(root, 'src/data/presets/stocks.json');
const indicesPath = path.join(root, 'src/data/presets/indices.json');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const presetBytes = () => [stocksPath, indicesPath].map(file => readFileSync(file).toString('base64'));

function fixture(t, { extension = 'csv', sourceText, provenance: overrides = {} } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'evelo-dry-run-'));
  const source = path.join(dir, `review.${extension}`);
  const manifest = `${source}.manifest.json`;
  const output = path.join(dir, 'output');
  const sourceBytes = Buffer.from(sourceText ??
    'symbol,name,assetClass,year,return\nQQQ,Nasdaq-100 ETF,equity_index,2025,0.2078\n');
  const provenance = {
    sourceAttribution: 'Reviewed local historical return snapshot',
    snapshotFilename: path.basename(source),
    snapshotSha256: digest(sourceBytes),
    methodology: {
      returnConvention: 'calendar-year total returns',
      dividendsReinvested: true,
      endpoints: 'last-trading-day to last-trading-day',
      units: 'decimal',
      decimalPlaces: 4,
      etfReturnPolicy: 'ETF-level returns',
    },
    coveredCalendarYears: [2025],
    assetScope: { mode: 'subset', symbols: ['QQQ'], rationale: 'Review only the QQQ 2025 period.' },
    reviewer: 'Test reviewer',
    reviewDate: '2026-01-02',
    exceptions: [{
      symbols: ['QQQ'],
      years: [2025],
      acceptedValueOrPolicy: '0.2078',
      rationale: 'Reviewer approved the corrected annual return.',
      evidence: 'Reviewed CSV record QQQ/2025 and source comparison.',
    }],
    ...overrides,
  };
  writeFileSync(source, sourceBytes);
  writeFileSync(manifest, JSON.stringify(provenance, null, 2));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, source, manifest, output, provenance, sourceBytes };
}

function writeManifest(f, provenance = f.provenance) {
  const manifest = {
    ...provenance,
    snapshotFilename: path.basename(f.source),
    snapshotSha256: digest(readFileSync(f.source)),
  };
  writeFileSync(f.manifest, JSON.stringify(manifest, null, 2));
  return manifest;
}

function rowsFixture(t, records) {
  const years = [...new Set(records.map(record => Number(record[3])))].sort((left, right) => left - right);
  const symbols = [...new Set(records.map(record => record[0]))].sort();
  return fixture(t, {
    sourceText: `${[ ['symbol', 'name', 'assetClass', 'year', 'return'], ...records ]
      .map(record => record.join(',')).join('\n')}\n`,
    provenance: {
      coveredCalendarYears: years,
      assetScope: {
        mode: 'subset',
        symbols,
        rationale: 'Explicitly reviewed source selection for runtime tests.',
      },
    },
  });
}

function completeFixture(t, { omittedSymbols = [], omittedPeriods = [] } = {}) {
  const assetsBySymbol = new Map();
  for (const presetPath of [stocksPath, indicesPath]) {
    const partition = JSON.parse(readFileSync(presetPath, 'utf8'));
    for (const asset of Object.values(partition)) {
      if (assetsBySymbol.has(asset.symbol)) continue;
      assetsBySymbol.set(asset.symbol, {
        symbol: asset.symbol,
        name: asset.name,
        assetClass: asset.assetClass,
        returns: asset.returns
          .filter(item => !omittedPeriods.some(period =>
            period.symbol === asset.symbol && period.year === Number(item.date)))
          .map(item => ({ year: Number(item.date), return: item.return })),
      });
    }
  }
  const assets = [...assetsBySymbol.values()].filter(asset => !omittedSymbols.includes(asset.symbol));
  const years = [...new Set(assets.flatMap(asset => asset.returns.map(item => item.year)))]
    .sort((left, right) => left - right);
  return fixture(t, {
    extension: 'json',
    sourceText: JSON.stringify({ assets }),
    provenance: {
      coveredCalendarYears: years,
      assetScope: { mode: 'complete' },
    },
  });
}

function run(args, cwd = root) {
  return spawnSync(process.execPath, [command, ...args], { cwd, encoding: 'utf8' });
}

function fails(result, diagnostic) {
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, diagnostic);
  assert.equal(result.stdout, '', 'invalid arguments must not print a success summary');
}

function assertBlockingReport(f, reportPattern) {
  const result = run([
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', f.output,
  ]);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, '');
  const reportPath = path.join(f.output, 'dry-run-report.md');
  assert(existsSync(reportPath), `blocking validation must write a report: ${result.stderr}`);
  assert.equal(existsSync(path.join(f.output, 'stocks.json')), false);
  assert.equal(existsSync(path.join(f.output, 'indices.json')), false);
  const report = readFileSync(reportPath, 'utf8');
  assert.match(report, /blocking errors/i);
  assert.match(report, /File\s*\|\s*Row\s*\|\s*Symbol\s*\|\s*Year\s*\|\s*Field\s*\|\s*Code/i);
  assert.match(report, reportPattern);
  assert.doesNotMatch(report, new RegExp(f.dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  return report;
}

test('reviewed CSV subset produces full merged candidates and a concise report path', t => {
  const f = fixture(t);
  const before = presetBytes();
  const baselineStocks = JSON.parse(readFileSync(stocksPath, 'utf8'));
  const baselineIndices = JSON.parse(readFileSync(indicesPath, 'utf8'));

  const result = run([
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', f.output,
  ]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /dry run completed/i);
  assert.match(result.stdout, /dry-run-report\.md/);
  assert.doesNotMatch(result.stdout, /## (?:Added|Removed|Changed) assets/i);

  const stocks = JSON.parse(readFileSync(path.join(f.output, 'stocks.json'), 'utf8'));
  const indices = JSON.parse(readFileSync(path.join(f.output, 'indices.json'), 'utf8'));
  assert.equal(stocks.QQQ.returns.find(item => item.date === '2025').return, 0.2078);
  assert.equal(indices.QQQ.returns.find(item => item.date === '2025').return, 0.2078);
  assert.deepEqual(stocks.QQQ, indices.QQQ);
  assert.deepEqual(stocks.AAPL, baselineStocks.AAPL);
  assert.deepEqual(indices.IWM, baselineIndices.IWM);
  assert.equal(stocks.QQQ.returns.length, baselineStocks.QQQ.returns.length);
  assert.equal(Object.keys(stocks).length, Object.keys(baselineStocks).length);
  assert.equal(Object.keys(indices).length, Object.keys(baselineIndices).length);

  const report = readFileSync(path.join(f.output, 'dry-run-report.md'), 'utf8');
  assert.match(report, /subset/i);
  assert.match(report, /QQQ/);
  assert.match(report, /Test reviewer/);
  assert.match(report, /### Changed periods[\s\S]*QQQ\/2025: 0\.2077 → 0\.2078/);
  assert.match(report, /### Changed assets[\s\S]*QQQ/);
  assert.doesNotMatch(report, new RegExp(f.dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.deepEqual(presetBytes(), before);
});

test('complete scope blocks removed baseline assets and previously covered periods', t => {
  const f = completeFixture(t, {
    omittedSymbols: ['APD'],
    omittedPeriods: [{ symbol: 'QQQ', year: 2024 }],
  });
  const report = assertBlockingReport(f, /removed-asset/);
  assert.match(report, /removed-period/);
  assert.match(report, /\|\s*APD\s*\|/);
  assert.match(report, /\|\s*QQQ\s*\|\s*2024\s*\|/);
  assert.match(report, /### Removed assets[\s\S]*APD/);
  assert.match(report, /### Removed periods[\s\S]*QQQ\/2024/);
});

test('complete scope accepts the full physical baseline without removals', t => {
  const f = completeFixture(t);
  const result = run(['--source', f.source, '--manifest', f.manifest, '--output-dir', f.output]);
  assert.equal(result.status, 0, result.stderr);
  const report = readFileSync(path.join(f.output, 'dry-run-report.md'), 'utf8');
  assert.match(report, /Scope: complete/i);
  assert.doesNotMatch(report, /removed-asset|removed-period/);
});

test('subset scope requires exact declared symbol and year sets', t => {
  const symbolMismatch = fixture(t, {
    sourceText: 'symbol,name,assetClass,year,return\nQQQ,Nasdaq-100 ETF,equity_index,2025,0.2078\nSPY,S&P 500 ETF,equity_index,2025,0.1772\n',
  });
  writeManifest(symbolMismatch, {
    ...symbolMismatch.provenance,
    assetScope: { mode: 'subset', symbols: ['QQQ'], rationale: 'Review only QQQ for this check.' },
  });
  assertBlockingReport(symbolMismatch, /subset-symbol-mismatch/);

  const yearMismatch = fixture(t, {
    sourceText: 'symbol,name,assetClass,year,return\nQQQ,Nasdaq-100 ETF,equity_index,2024,0.2558\n',
  });
  writeManifest(yearMismatch, {
    ...yearMismatch.provenance,
    coveredCalendarYears: [2025],
  });
  assertBlockingReport(yearMismatch, /subset-years-mismatch/);
});

test('subset scope keeps adjacent calendar years as separate records', t => {
  const f = rowsFixture(t, [
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', '2024', '0.2558'],
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', '2025', '0.2078'],
  ]);
  const result = run(['--source', f.source, '--manifest', f.manifest, '--output-dir', f.output]);
  assert.equal(result.status, 0, result.stderr);
  const candidate = JSON.parse(readFileSync(path.join(f.output, 'indices.json'), 'utf8'));
  assert.deepEqual(candidate.QQQ.returns.filter(item => ['2024', '2025'].includes(item.date)), [
    { date: '2024', return: 0.2558 },
    { date: '2025', return: 0.2078 },
  ]);
});

test('a new period absent from the baseline is retained as an addition', t => {
  const f = rowsFixture(t, [
    ['IWM', 'Russell 2000 ETF', 'equity_index', '2000', '0.0178'],
  ]);
  const result = run(['--source', f.source, '--manifest', f.manifest, '--output-dir', f.output]);
  assert.equal(result.status, 0, result.stderr);
  const candidate = JSON.parse(readFileSync(path.join(f.output, 'indices.json'), 'utf8'));
  assert.deepEqual(candidate.IWM.returns.slice(0, 2), [
    { date: '2000', return: 0.0178 },
    { date: '2001', return: 0.0178 },
  ]);
  assert.match(readFileSync(path.join(f.output, 'dry-run-report.md'), 'utf8'),
    /### Added periods[\s\S]*IWM\/2000: 0\.0178/);
});

test('a genuinely new symbol uses its explicit manifest partition route', t => {
  const f = fixture(t, {
    sourceText: 'symbol,name,assetClass,year,return\nNEW,New asset,equity_index,2025,0.1250\n',
    provenance: {
      assetScope: {
        mode: 'subset',
        symbols: ['NEW'],
        rationale: 'Review the new symbol with an explicit partition decision.',
      },
      newSymbolPartitions: { NEW: 'stocks.json' },
    },
  });
  const result = run(['--source', f.source, '--manifest', f.manifest, '--output-dir', f.output]);
  assert.equal(result.status, 0, result.stderr);
  const stocks = JSON.parse(readFileSync(path.join(f.output, 'stocks.json'), 'utf8'));
  const indices = JSON.parse(readFileSync(path.join(f.output, 'indices.json'), 'utf8'));
  assert.deepEqual(stocks.NEW, {
    symbol: 'NEW',
    name: 'New asset',
    assetClass: 'equity_index',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    returns: [{ date: '2025', return: 0.125 }],
  });
  assert.equal(Object.hasOwn(indices, 'NEW'), false);
  const report = readFileSync(path.join(f.output, 'dry-run-report.md'), 'utf8');
  assert.match(report, /### Added assets[\s\S]*NEW.*stocks\.json/);
  assert.match(report, /### Added periods[\s\S]*NEW\/2025: 0\.125/);
});

test('new symbols without a route and stale routes block candidates', t => {
  const missingRoute = fixture(t, {
    sourceText: 'symbol,name,assetClass,year,return\nNEW,New asset,equity_stock,2025,0.1250\n',
    provenance: {
      assetScope: {
        mode: 'subset',
        symbols: ['NEW'],
        rationale: 'Review the new symbol without a route for this negative case.',
      },
    },
  });
  assertBlockingReport(missingRoute, /new-symbol-route-required/);

  const existingRoute = fixture(t, {
    provenance: { newSymbolPartitions: { QQQ: 'stocks.json' } },
  });
  assertBlockingReport(existingRoute, /new-symbol-route-stale/);

  const absentRoute = fixture(t, {
    provenance: { newSymbolPartitions: { ABSENT: 'stocks.json' } },
  });
  assertBlockingReport(absentRoute, /new-symbol-route-stale/);
});

test('new symbol keys are serialized as data rather than object prototypes', t => {
  const f = fixture(t, {
    sourceText: 'symbol,name,assetClass,year,return\n__proto__,Reviewed symbol,equity_stock,2025,0.1250\n',
    provenance: {
      assetScope: {
        mode: 'subset',
        symbols: ['__proto__'],
        rationale: 'Exercise safe serialization of the reviewed symbol key.',
      },
      newSymbolPartitions: JSON.parse('{"__proto__":"stocks.json"}'),
    },
  });
  const result = run(['--source', f.source, '--manifest', f.manifest, '--output-dir', f.output]);
  assert.equal(result.status, 0, result.stderr);
  const stocks = JSON.parse(readFileSync(path.join(f.output, 'stocks.json'), 'utf8'));
  assert.equal(Object.hasOwn(stocks, '__proto__'), true);
  assert.equal(stocks.__proto__.name, 'Reviewed symbol');
});

test('report and candidates preserve literal metadata and show complete period changes', t => {
  const f = fixture(t, {
    sourceText: 'symbol,name,assetClass,year,return\nQQQ,Reviewed Nasdaq fund,equity_stock,2025,0.2500\n',
  });
  const before = presetBytes();
  const result = run(['--source', f.source, '--manifest', f.manifest, '--output-dir', f.output]);
  assert.equal(result.status, 0, result.stderr);

  const stocks = JSON.parse(readFileSync(path.join(f.output, 'stocks.json'), 'utf8'));
  const indices = JSON.parse(readFileSync(path.join(f.output, 'indices.json'), 'utf8'));
  assert.equal(stocks.QQQ.name, 'Reviewed Nasdaq fund');
  assert.equal(stocks.QQQ.assetClass, 'equity_stock');
  assert.deepEqual(stocks.QQQ, indices.QQQ);

  const report = readFileSync(path.join(f.output, 'dry-run-report.md'), 'utf8');
  assert.match(report, /### Changed assets[\s\S]*QQQ/);
  assert.match(report, /### Changed periods[\s\S]*QQQ\/2025: 0\.2077 → 0\.25/);
  assert.match(report, /## Metadata changes[\s\S]*QQQ\/name: "Nasdaq-100 ETF" → "Reviewed Nasdaq fund"/);
  assert.match(report, /QQQ\/assetClass: "equity_index" → "equity_stock"/);
  assert.deepEqual(presetBytes(), before);
});

test('explicit CLI flags are required and duplicate or unknown flags are rejected', t => {
  const f = fixture(t);
  fails(run([]), /missing required --source/i);
  fails(run(['--source', f.source, '--manifest', f.manifest]), /missing required --output-dir/i);
  fails(run(['--source', f.source, '--manifest', f.manifest, '--output-dir']), /missing value for --output-dir/i);
  fails(run([
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', f.output,
    '--source', f.source,
  ]), /duplicate flag: --source/i);
  fails(run([
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', f.output,
    '--apply',
  ]), /unknown argument: --apply/i);
});

test('output directory is created when absent and accepts an existing empty directory', t => {
  const absent = fixture(t);
  const absentResult = run([
    '--source', absent.source,
    '--manifest', absent.manifest,
    '--output-dir', absent.output,
  ]);
  assert.equal(absentResult.status, 0, absentResult.stderr);
  assert.equal(existsSync(path.join(absent.output, 'dry-run-report.md')), true);

  const empty = fixture(t);
  mkdirSync(empty.output);
  const emptyResult = run([
    '--source', empty.source,
    '--manifest', empty.manifest,
    '--output-dir', empty.output,
  ]);
  assert.equal(emptyResult.status, 0, emptyResult.stderr);
  assert.equal(existsSync(path.join(empty.output, 'stocks.json')), true);
});

test('non-empty output directories are rejected without replacing entries or writing artifacts', t => {
  const f = fixture(t);
  mkdirSync(f.output);
  const existingPath = path.join(f.output, 'notes.txt');
  writeFileSync(existingPath, 'keep this file');

  const result = run([
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', f.output,
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /output directory must be absent or empty/i);
  assert.equal(readFileSync(existingPath, 'utf8'), 'keep this file');
  assert.deepEqual(
    ['stocks.json', 'indices.json', 'dry-run-report.md'].filter(name =>
      existsSync(path.join(f.output, name))),
    [],
  );
});

test('output targets appearing after preflight are never replaced', async t => {
  const f = fixture(t);
  rmSync(f.source);
  const fifo = spawnSync('mkfifo', [f.source], { encoding: 'utf8' });
  if (fifo.error || fifo.status !== 0) {
    t.skip('mkfifo is unavailable for the concurrent output collision test');
    return;
  }

  const child = spawn(process.execPath, [
    command,
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', f.output,
  ], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8').on('data', chunk => { stdout += chunk; });
  child.stderr.setEncoding('utf8').on('data', chunk => { stderr += chunk; });
  const closed = new Promise(resolve => {
    child.once('close', status => resolve({ status, stdout, stderr }));
  });

  try {
    let waited = 0;
    while (!existsSync(f.output) && waited < 5000) {
      if (child.exitCode !== null) break;
      await new Promise(resolve => setTimeout(resolve, 10));
      waited += 10;
    }
    assert.equal(existsSync(f.output), true, 'CLI should create output directory before reading source');

    const candidatePath = path.join(f.output, 'stocks.json');
    writeFileSync(candidatePath, 'preserve raced file');
    const fd = openSync(f.source, 'w');
    writeSync(fd, f.sourceBytes);
    closeSync(fd);

    const result = await closed;
    assert.equal(result.status, 1, result.stderr || result.stdout);
    assert.match(result.stderr, /output target already exists: stocks\.json/i);
    assert.equal(readFileSync(candidatePath, 'utf8'), 'preserve raced file');
    assert.equal(existsSync(path.join(f.output, 'indices.json')), false);
    assert.equal(existsSync(path.join(f.output, 'dry-run-report.md')), false);
  } finally {
    if (child.exitCode === null) {
      child.kill();
      await closed;
    }
  }
});

test('lexical traversal in output paths is rejected before directory creation', t => {
  const f = fixture(t);
  const traversingOutput = `${root}/src/data/presets/../refresh-output-${process.pid}`;
  const result = run([
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', traversingOutput,
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /output directory.*traversal/i);
  assert.equal(existsSync(path.resolve(traversingOutput)), false);
});

test('neighboring preset-prefix output paths are rejected before directory creation', t => {
  const f = fixture(t);
  const neighboringOutput = path.join(root, 'src/data/presets-output');
  const result = run([
    '--source', f.source,
    '--manifest', f.manifest,
    '--output-dir', neighboringOutput,
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /output directory.*preset/i);
  assert.equal(existsSync(neighboringOutput), false);
});

test('direct and symlinked preset output destinations are rejected without preset mutation', t => {
  const before = presetBytes();
  const direct = fixture(t);
  const directResult = run([
    '--source', direct.source,
    '--manifest', direct.manifest,
    '--output-dir', path.join(root, 'src/data/presets'),
  ]);
  assert.equal(directResult.status, 1);
  assert.match(directResult.stderr, /output directory must be outside src\/data\/presets/i);

  const symlinked = fixture(t);
  symlinkSync(path.join(root, 'src/data/presets'), symlinked.output, 'dir');
  const symlinkResult = run([
    '--source', symlinked.source,
    '--manifest', symlinked.manifest,
    '--output-dir', symlinked.output,
  ]);
  assert.equal(symlinkResult.status, 1);
  assert.match(symlinkResult.stderr, /output directory must be outside src\/data\/presets/i);
  assert.deepEqual(presetBytes(), before);
});

test('valid CSV quoting preserves embedded commas in metadata', t => {
  const f = fixture(t, {
    sourceText: 'symbol,name,assetClass,year,return\nQQQ,"Nasdaq, Inc. ETF",equity_index,2025,0.2078\n',
  });
  const result = run(['--source', f.source, '--manifest', f.manifest, '--output-dir', f.output]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(readFileSync(path.join(f.output, 'stocks.json'), 'utf8')).QQQ.name, 'Nasdaq, Inc. ETF');
});

for (const [name, sourceText, expected] of [
  ['reordered header', 'name,symbol,assetClass,year,return\nNasdaq-100 ETF,QQQ,equity_index,2025,0.2078\n', /header/i],
  ['duplicate header', 'symbol,name,assetClass,year,year\nQQQ,Nasdaq-100 ETF,equity_index,2025,2025\n', /header/i],
  ['padded header', 'symbol,name,assetClass,year,return \nQQQ,Nasdaq-100 ETF,equity_index,2025,0.2078\n', /header/i],
  ['blank record', 'symbol,name,assetClass,year,return\n\nQQQ,Nasdaq-100 ETF,equity_index,2025,0.2078\n', /blank|row/i],
  ['extra field', 'symbol,name,assetClass,year,return\nQQQ,Nasdaq-100 ETF,equity_index,2025,0.2078,extra\n', /five|column|field/i],
  ['missing field', 'symbol,name,assetClass,year,return\nQQQ,Nasdaq-100 ETF,equity_index,2025\n', /five|column|field/i],
  ['malformed quoting', 'symbol,name,assetClass,year,return\nQQQ,"Nasdaq-100 ETF,equity_index,2025,0.2078\n', /quote|CSV/i],
]) {
  test(`strict CSV parser rejects ${name} and writes a blocking report`, t => {
    const f = fixture(t, { sourceText });
    assertBlockingReport(f, expected);
  });
}

test('malformed CSV values retain source row and field context in the report', t => {
  const f = fixture(t, {
    sourceText: 'symbol,name,assetClass,year,return\nQQQ,Nasdaq-100 ETF,equity_index,2025,0.2078\nQQQ,Nasdaq-100 ETF,equity_index,2026,not-a-number\n',
  });
  const report = assertBlockingReport(f, /review\.csv\s*\|\s*3\s*\|\s*QQQ\s*\|\s*2026\s*\|\s*return/i);
  assert.match(report, /number|decimal|numeric/i);
});

test('JSON parser reports malformed syntax and nested duplicate keys', t => {
  const malformed = fixture(t, { extension: 'json', sourceText: '{"assets": [' });
  assertBlockingReport(malformed, /review\.json/i);

  const duplicate = fixture(t, {
    extension: 'json',
    sourceText: '{"assets":[{"symbol":"QQQ","name":"Nasdaq-100 ETF","assetClass":"equity_index","returns":[{"year":2025,"year":2025,"return":0.2078}]}]}',
  });
  assertBlockingReport(duplicate, /duplicate.*year|year.*duplicate/i);
});

test('JSON roots and duplicate manifest keys are rejected with blocking reports', t => {
  const sourceRoot = fixture(t, { extension: 'json', sourceText: '[]' });
  assertBlockingReport(sourceRoot, /root|object/i);

  const manifestRoot = fixture(t);
  writeFileSync(manifestRoot.manifest, '[]');
  assertBlockingReport(manifestRoot, /manifest.*object/i);

  const nullManifest = fixture(t);
  writeFileSync(nullManifest.manifest, 'null');
  assertBlockingReport(nullManifest, /manifest.*object/i);

  const duplicateManifest = fixture(t);
  const manifestText = readFileSync(duplicateManifest.manifest, 'utf8')
    .replace('"reviewer": "Test reviewer",', '"reviewer": "Test reviewer",\n  "reviewer": "Other reviewer",');
  writeFileSync(duplicateManifest.manifest, manifestText);
  assertBlockingReport(duplicateManifest, /duplicate.*reviewer/i);
});

test('JSON source rejects repeated asset symbols independently of their return periods', t => {
  const f = fixture(t, {
    extension: 'json',
    sourceText: JSON.stringify({
      assets: [
        { symbol: 'QQQ', name: 'Nasdaq-100 ETF', assetClass: 'equity_index', returns: [{ year: 2024, return: 0.1000 }] },
        { symbol: 'QQQ', name: 'Nasdaq-100 ETF', assetClass: 'equity_index', returns: [{ year: 2025, return: 0.2078 }] },
      ],
    }),
    provenance: {
      coveredCalendarYears: [2024, 2025],
      assetScope: { mode: 'subset', symbols: ['QQQ'], rationale: 'Reviewed two completed periods.' },
    },
  });
  assertBlockingReport(f, /duplicate-symbol/);
});

test('JSON source shape failures retain field context and block candidates', t => {
  const f = fixture(t, {
    extension: 'json',
    sourceText: JSON.stringify({
      unexpected: true,
      assets: [{
        symbol: ' QQQ ',
        name: '',
        assetClass: 'equity',
        returns: [{ year: '2025', return: '5%' }],
      }],
    }),
  });
  const report = assertBlockingReport(f, /symbol|name|assetClass|year|return/i);
  for (const field of ['symbol', 'name', 'assetClass', 'year', 'return', 'unexpected']) {
    assert.match(report, new RegExp(field, 'i'), `missing ${field} context`);
  }
});

test('manifest shape and provenance failures block a valid source', t => {
  const f = fixture(t);
  const invalidManifest = structuredClone(f.provenance);
  delete invalidManifest.methodology;
  invalidManifest.reviewer = 'TBD';
  invalidManifest.extra = true;
  writeManifest(f, invalidManifest);
  const report = assertBlockingReport(f, /methodology|reviewer|extra/i);
  for (const field of ['methodology', 'reviewer', 'extra']) {
    assert.match(report, new RegExp(field, 'i'), `missing ${field} context`);
  }
});

test('source and manifest validation continue independently', t => {
  const f = fixture(t, {
    sourceText: 'symbol,name,assetClass,year,return\nQQQ,Nasdaq-100 ETF,invalid_class,2025,0.2078\n',
  });
  const manifest = structuredClone(f.provenance);
  manifest.reviewer = 'TBD';
  writeManifest(f, manifest);
  const report = assertBlockingReport(f, /assetClass|reviewer/i);
  assert.match(report, /assetClass/);
  assert.match(report, /reviewer/);
});

test('duplicate periods and conflicting repeated CSV metadata are independent blocking diagnostics', t => {
  const f = rowsFixture(t, [
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', '2025', '0.2078'],
    ['QQQ', 'Different Nasdaq label', 'equity_index', '2025', '0.2080'],
  ]);
  const report = assertBlockingReport(f, /metadata-conflict/);
  assert.match(report, /duplicate-period/);
  const rowThree = report.split('\n').filter(line => line.startsWith('| review.csv | 3 |'));
  assert.deepEqual(rowThree.map(line => line.split('|')[5].trim()), ['name', 'year']);
  assert.deepEqual(rowThree.map(line => line.split('|')[6].trim()), ['metadata-conflict', 'duplicate-period']);
});

for (const [label, returnValue, code] of [
  ['NaN', 'NaN', 'return-number'],
  ['Infinity', 'Infinity', 'return-number'],
  ['trailing text', '0.2junk', 'return-number'],
  ['percent notation', '5%', 'return-number'],
  ['below total loss', '-1.0001', 'return-lower-bound'],
  ['excess precision', '0.02181', 'return-precision'],
]) {
  test(`CSV return ${label} is a blocking diagnostic`, t => {
    const f = rowsFixture(t, [
      ['QQQ', 'Nasdaq-100 ETF', 'equity_index', '2025', returnValue],
    ]);
    assertBlockingReport(f, new RegExp(code));
  });
}

test('JSON overflow-to-infinity return is blocked', t => {
  const f = fixture(t, {
    extension: 'json',
    sourceText: '{"assets":[{"symbol":"QQQ","name":"Nasdaq-100 ETF","assetClass":"equity_index","returns":[{"year":2025,"return":1e999}]}]}',
  });
  assertBlockingReport(f, /return-number/);
});

test('current UTC calendar year is blocked but the preceding completed year is accepted', t => {
  const currentYear = new Date().getUTCFullYear();
  const current = rowsFixture(t, [
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', String(currentYear), '0.0218'],
  ]);
  assertBlockingReport(current, /incomplete-calendar-year/);

  const completed = rowsFixture(t, [
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', String(currentYear - 1), '0.0218'],
  ]);
  const result = run([
    '--source', completed.source,
    '--manifest', completed.manifest,
    '--output-dir', completed.output,
  ]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(path.join(completed.output, 'stocks.json')), true);
  assert.match(readFileSync(path.join(completed.output, 'dry-run-report.md'), 'utf8'), /Blocking errors\s*\n\nNone/i);
});

test('outlier thresholds are strict and warning-only data still produces candidates', t => {
  const currentYear = new Date().getUTCFullYear();
  const f = rowsFixture(t, [
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', String(currentYear - 1), '-0.9001'],
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', String(currentYear - 2), '-0.9'],
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', String(currentYear - 3), '3.0001'],
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', String(currentYear - 4), '3.0'],
  ]);
  const before = presetBytes();
  const result = run(['--source', f.source, '--manifest', f.manifest, '--output-dir', f.output]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(path.join(f.output, 'stocks.json')), true);
  const report = readFileSync(path.join(f.output, 'dry-run-report.md'), 'utf8');
  const warningSection = report.split('## Warnings\n\n')[1].split('\n## Asset changes')[0];
  const warningRows = warningSection.split('\n').filter(line => line.startsWith('| review.csv |'));
  assert.equal(warningRows.length, 2);
  assert.deepEqual(warningRows.map(line => line.split('|')[6].trim()), ['outlier-low', 'outlier-high']);
  assert.deepEqual(presetBytes(), before);
});

test('independent diagnostics retain stable source-row and field ordering and suppress candidates', t => {
  const currentYear = new Date().getUTCFullYear();
  const f = rowsFixture(t, [
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', String(currentYear), '3.0001'],
    ['QQQ', 'Different Nasdaq label', 'equity_index', String(currentYear), '-1.0001'],
    ['QQQ', 'Nasdaq-100 ETF', 'equity_index', '2025', '0.01junk'],
  ]);
  const report = assertBlockingReport(f, /incomplete-calendar-year/);
  const blockingSection = report.split('## Blocking errors\n\n')[1].split('\n## Warnings')[0];
  const diagnosticRows = blockingSection.split('\n').filter(line => line.startsWith('| review.csv |'));
  assert.deepEqual(diagnosticRows.map(line => [
    line.split('|')[2].trim(),
    line.split('|')[5].trim(),
    line.split('|')[6].trim(),
  ]), [
    ['2', 'year', 'incomplete-calendar-year'],
    ['3', 'name', 'metadata-conflict'],
    ['3', 'return', 'return-lower-bound'],
    ['3', 'year', 'duplicate-period'],
    ['3', 'year', 'incomplete-calendar-year'],
    ['4', 'return', 'return-number'],
  ]);
  const warningSection = report.split('## Warnings\n\n')[1].split('\n## Asset changes')[0];
  assert.match(warningSection, /outlier-high/);
  assert.match(warningSection, /outlier-low/);
});
