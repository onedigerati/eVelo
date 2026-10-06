import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

function fixture(t) {
  const dir = mkdtempSync(path.join(tmpdir(), 'evelo-dry-run-'));
  const source = path.join(dir, 'review.csv');
  const manifest = `${source}.manifest.json`;
  const output = path.join(dir, 'output');
  const sourceBytes = Buffer.from(
    'symbol,name,assetClass,year,return\nQQQ,Nasdaq-100 ETF,equity_index,2025,0.2077\n',
  );
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
    exceptions: [],
  };
  writeFileSync(source, sourceBytes);
  writeFileSync(manifest, JSON.stringify(provenance, null, 2));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return { dir, source, manifest, output, provenance };
}

function run(args, cwd = root) {
  return spawnSync(process.execPath, [command, ...args], { cwd, encoding: 'utf8' });
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
  assert.deepEqual(stocks.QQQ, baselineStocks.QQQ);
  assert.deepEqual(indices.QQQ, baselineIndices.QQQ);
  assert.deepEqual(stocks.QQQ, indices.QQQ);
  assert.deepEqual(stocks.AAPL, baselineStocks.AAPL);
  assert.deepEqual(indices.IWM, baselineIndices.IWM);
  assert.equal(Object.keys(stocks).length, Object.keys(baselineStocks).length);
  assert.equal(Object.keys(indices).length, Object.keys(baselineIndices).length);

  const report = readFileSync(path.join(f.output, 'dry-run-report.md'), 'utf8');
  assert.match(report, /subset/i);
  assert.match(report, /QQQ/);
  assert.match(report, /Test reviewer/);
  assert.doesNotMatch(report, new RegExp(f.dir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.deepEqual(presetBytes(), before);
});
