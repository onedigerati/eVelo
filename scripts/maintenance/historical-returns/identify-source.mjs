import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';

const usage = 'Usage: npm run refresh:identify -- --source SOURCE_PATH --manifest MANIFEST_PATH';
const provenanceFields = [
  'sourceAttribution', 'snapshotFilename', 'snapshotSha256', 'methodology',
  'coveredCalendarYears', 'assetScope', 'reviewer', 'reviewDate',
];

function parseArguments(args) {
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (flag !== '--source' && flag !== '--manifest') {
      throw new Error(`Unknown argument: ${flag}. ${usage}`);
    }
    if (Object.hasOwn(options, flag)) throw new Error(`Duplicate flag: ${flag}. ${usage}`);
    const value = args[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}. ${usage}`);
    options[flag] = path.resolve(value);
  }
  if (!options['--source'] || !options['--manifest']) throw new Error(usage);
  return options;
}

function readInput(filename, label) {
  try {
    return { bytes: readFileSync(filename), realPath: realpathSync(filename) };
  } catch (error) {
    throw new Error(`Cannot read ${label} ${filename}: ${error.message}`, { cause: error });
  }
}

function requirePair(source, manifest) {
  if (manifest !== `${source}.manifest.json`) {
    throw new Error(`Manifest must be adjacent to the source and named ${path.basename(source)}.manifest.json`);
  }
}

function identify(args) {
  const options = parseArguments(args);
  const source = options['--source'];
  const manifestPath = options['--manifest'];
  const extension = path.extname(source);
  if (extension !== '.csv' && extension !== '.json') {
    throw new Error(`Unsupported source extension: ${extension || '(none)'}. Select .csv or .json.`);
  }
  requirePair(source, manifestPath);
  const input = readInput(source, 'source');
  const manifestInput = readInput(manifestPath, 'manifest');
  requirePair(input.realPath, manifestInput.realPath);

  let manifest;
  try {
    manifest = JSON.parse(manifestInput.bytes.toString('utf8'));
  } catch (error) {
    throw new Error(`Manifest ${manifestPath} is not readable JSON: ${error.message}`, { cause: error });
  }
  if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
    throw new Error(`Manifest ${manifestPath} must be a JSON object.`);
  }

  const sourceFilename = path.basename(source);
  const calculatedSnapshotSha256 = createHash('sha256').update(input.bytes).digest('hex');
  if (manifest.snapshotFilename !== sourceFilename) {
    throw new Error(`Manifest snapshotFilename mismatch: expected ${JSON.stringify(sourceFilename)}, declared ${JSON.stringify(manifest.snapshotFilename)}.`);
  }
  if (manifest.snapshotSha256 !== calculatedSnapshotSha256) {
    throw new Error(`Snapshot SHA-256 mismatch: calculated ${calculatedSnapshotSha256}, declared ${JSON.stringify(manifest.snapshotSha256)}.`);
  }

  const unreportedProvenanceFields = provenanceFields.filter(key => !Object.hasOwn(manifest, key));
  if (!Array.isArray(manifest.exceptions)) unreportedProvenanceFields.push('exceptions');
  return {
    notice: 'Identity/provenance-only: semantic validation is not performed. Manifest provenance is unvalidated reviewer-provided claims; missing fields are reported explicitly.',
    semanticValidation: 'not performed',
    sourceFormat: extension.slice(1),
    sourceFilename,
    sourceByteLength: input.bytes.length,
    calculatedSnapshotSha256,
    declaredSnapshotSha256: manifest.snapshotSha256,
    checksumMatches: true,
    manifestProvenance: {
      ...Object.fromEntries(provenanceFields.map(key => [key, Object.hasOwn(manifest, key) ? manifest[key] : null])),
      exceptionCount: Array.isArray(manifest.exceptions) ? manifest.exceptions.length : null,
    },
    unreportedProvenanceFields,
  };
}

try {
  console.log(JSON.stringify(identify(process.argv.slice(2)), null, 2));
} catch (error) {
  console.error(`refresh:identify: ${error.message}`);
  process.exitCode = 1;
}
