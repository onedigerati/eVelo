import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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
  assert.match(report, /Changed: QQQ\/2025/);
  assert.doesNotMatch(report, new RegExp(f.dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
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
