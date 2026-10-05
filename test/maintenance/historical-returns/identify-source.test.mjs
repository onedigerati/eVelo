import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const command = path.join(root, 'scripts/maintenance/historical-returns/identify-source.mjs');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const presetBytes = () => readdirSync(path.join(root, 'src/data/presets'))
  .sort().map(name => [name, readFileSync(path.join(root, 'src/data/presets', name)).toString('base64')]);

function fixture(t, extension = 'csv', bytes = Buffer.from('symbol,name,assetClass,year,return\r\nTEST,Test,equity_stock,2025,0.0218\r\n')) {
  const dir = mkdtempSync(path.join(tmpdir(), 'evelo-identify-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, `snapshot.${extension}`);
  const manifest = `${source}.manifest.json`;
  const provenance = {
    sourceAttribution: 'Explicitly reviewed local snapshot',
    snapshotFilename: path.basename(source),
    snapshotSha256: digest(bytes),
    methodology: { returnConvention: 'calendar-year total returns' },
    coveredCalendarYears: [2025],
    assetScope: { mode: 'subset', symbols: ['TEST'], rationale: 'Reviewed test selection' },
    reviewer: 'Test reviewer',
    reviewDate: '2026-01-02',
    exceptions: [{ rationale: 'Example provenance claim' }],
  };
  writeFileSync(source, bytes);
  writeFileSync(manifest, JSON.stringify(provenance));
  return { dir, source, manifest, bytes, provenance };
}

function run(args, cwd = root) {
  return spawnSync(process.execPath, [command, ...args], { cwd, encoding: 'utf8' });
}

function fails(result, diagnostic) {
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, diagnostic);
  assert.equal(result.stdout, '', 'errors must not produce a success summary');
}

for (const extension of ['csv', 'json']) {
  test(`explicit ${extension} pair reports exact-byte identity and provenance without writes`, t => {
    const bytes = Buffer.from(extension === 'csv'
      ? 'symbol,name,assetClass,year,return\r\nTEST,Test,equity_stock,2025,0.0218\r\n'
      : '{ "assets": [{ "symbol": "TEST", "name": "Test", "assetClass": "equity_stock", "returns": [{ "year": 2025, "return": 0.0218 }] }] }\n');
    const f = fixture(t, extension, bytes);
    const before = presetBytes();
    const filesBefore = readdirSync(f.dir).sort();
    const result = run(['--source', path.basename(f.source), '--manifest', path.basename(f.manifest)], f.dir);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const summary = JSON.parse(result.stdout);
    assert.equal(summary.sourceFormat, extension);
    assert.equal(summary.sourceFilename, path.basename(f.source));
    assert.equal(summary.sourceByteLength, bytes.length);
    assert.equal(summary.calculatedSnapshotSha256, digest(bytes));
    assert.equal(summary.declaredSnapshotSha256, f.provenance.snapshotSha256);
    assert.equal(summary.checksumMatches, true);
    assert.equal(summary.semanticValidation, 'not performed');
    assert.match(summary.notice, /identity\/provenance-only/i);
    assert.match(summary.notice, /semantic validation.*not performed/i);
    for (const key of ['sourceAttribution', 'snapshotFilename', 'snapshotSha256', 'methodology',
      'coveredCalendarYears', 'assetScope', 'reviewer', 'reviewDate']) {
      assert.deepEqual(summary.manifestProvenance[key], f.provenance[key], key);
    }
    assert.equal(summary.manifestProvenance.exceptionCount, 1);
    assert.deepEqual(presetBytes(), before);
    assert.deepEqual(readdirSync(f.dir).sort(), filesBefore);
    assert.deepEqual(readFileSync(f.source), bytes);
    assert.deepEqual(JSON.parse(readFileSync(f.manifest)), f.provenance);
  });
}

test('does not parse source records or perform semantic validation', t => {
  for (const extension of ['csv', 'json']) {
    const f = fixture(t, extension, Buffer.from('not valid source syntax, symbols, years, or returns!\n'));
    // Provenance truth/schema checks belong to Phase 2, too.
    f.provenance.coveredCalendarYears = ['unreviewed claim'];
    f.provenance.assetScope = { mode: 'unvalidated' };
    writeFileSync(f.manifest, JSON.stringify(f.provenance));
    const result = run(['--source', f.source, '--manifest', f.manifest]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).semanticValidation, 'not performed');
  }
});

test('missing, incomplete, duplicate, or unknown flags fail clearly', t => {
  const f = fixture(t);
  for (const args of [[], ['--source', f.source], ['--manifest', f.manifest],
    ['--source'], ['--source', '--manifest', f.manifest],
    ['--source', f.source, '--manifest']]) {
    fails(run(args), /--source.*--manifest|missing value/i);
  }
  fails(run(['--source', f.source, '--manifest', f.manifest, '--apply']), /unknown argument.*--apply/i);
  fails(run(['--source', f.source, '--source', f.source, '--manifest', f.manifest]), /duplicate.*--source/i);
});

test('unreadable source and manifest paths fail with the selected path', t => {
  const f = fixture(t);
  const missing = path.join(f.dir, 'missing.csv');
  fails(run(['--source', missing, '--manifest', `${missing}.manifest.json`]), /source.*missing\.csv.*ENOENT/i);
  rmSync(f.manifest);
  fails(run(['--source', f.source, '--manifest', f.manifest]), /manifest.*ENOENT/i);
});

test('unsupported source extensions and wrong manifest pairing fail', t => {
  const f = fixture(t, 'txt');
  fails(run(['--source', f.source, '--manifest', f.manifest]), /unsupported source extension/i);
  const csv = fixture(t);
  const wrongName = path.join(csv.dir, 'review.json');
  writeFileSync(wrongName, JSON.stringify(csv.provenance));
  fails(run(['--source', csv.source, '--manifest', wrongName]), /adjacent.*snapshot\.csv\.manifest\.json/i);
  const otherDir = path.join(csv.dir, 'other');
  mkdirSync(otherDir);
  const nonAdjacent = path.join(otherDir, path.basename(csv.manifest));
  writeFileSync(nonAdjacent, JSON.stringify(csv.provenance));
  fails(run(['--source', csv.source, '--manifest', nonAdjacent]), /adjacent/i);
});

test('symlinked inputs cannot disguise non-adjacent physical files', async t => {
  const { symlinkSync } = await import('node:fs');
  const f = fixture(t);
  const elsewhere = fixture(t);
  rmSync(f.manifest);
  symlinkSync(elsewhere.manifest, f.manifest);
  fails(run(['--source', f.source, '--manifest', f.manifest]), /adjacent/i);
});

test('invalid manifest JSON and non-object roots fail explicitly', t => {
  const f = fixture(t);
  for (const text of ['{broken', 'null', '[]', '42']) {
    writeFileSync(f.manifest, text);
    fails(run(['--source', f.source, '--manifest', f.manifest]), /manifest.*JSON object|manifest.*JSON/i);
  }
});

test('filename and checksum mismatches fail, including a change to whitespace bytes', t => {
  const f = fixture(t);
  f.provenance.snapshotFilename = 'different.csv';
  writeFileSync(f.manifest, JSON.stringify(f.provenance));
  fails(run(['--source', f.source, '--manifest', f.manifest]), /snapshotFilename.*mismatch/i);
  f.provenance.snapshotFilename = path.basename(f.source);
  f.provenance.snapshotSha256 = '0'.repeat(64);
  writeFileSync(f.manifest, JSON.stringify(f.provenance));
  fails(run(['--source', f.source, '--manifest', f.manifest]), /SHA-256.*mismatch/i);
  f.provenance.snapshotSha256 = digest(f.bytes);
  writeFileSync(f.manifest, JSON.stringify(f.provenance));
  writeFileSync(f.source, Buffer.concat([f.bytes, Buffer.from('\n')]));
  fails(run(['--source', f.source, '--manifest', f.manifest]), /SHA-256.*mismatch/i);
});

test('missing identity cannot be reported as identified; missing provenance stays visibly unvalidated', t => {
  const f = fixture(t);
  for (const key of ['snapshotFilename', 'snapshotSha256']) {
    const manifest = { ...f.provenance };
    delete manifest[key];
    writeFileSync(f.manifest, JSON.stringify(manifest));
    fails(run(['--source', f.source, '--manifest', f.manifest]), /mismatch/i);
  }
  writeFileSync(f.manifest, JSON.stringify({
    snapshotFilename: path.basename(f.source),
    snapshotSha256: digest(f.bytes),
  }));
  const result = run(['--source', f.source, '--manifest', f.manifest]);
  assert.equal(result.status, 0, result.stderr);
  const summary = JSON.parse(result.stdout);
  assert.deepEqual(summary.unreportedProvenanceFields, [
    'sourceAttribution', 'methodology', 'coveredCalendarYears', 'assetScope', 'reviewer', 'reviewDate', 'exceptions',
  ]);
  assert.equal(summary.manifestProvenance.exceptionCount, null);
});
