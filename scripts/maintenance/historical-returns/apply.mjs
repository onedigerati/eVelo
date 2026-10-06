import {
  lstatSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const dryRunPath = path.join(repositoryRoot, 'scripts/maintenance/historical-returns/dry-run.mjs');
const usage = [
  'Usage: npm run refresh:apply -- --source SOURCE_PATH --manifest MANIFEST_PATH',
  '  --candidates-dir REVIEWED_CANDIDATES_DIR [--confirm-apply]',
  'Run one apply process at a time; concurrent apply invocations are unsupported.',
].join('\n');
const reviewedArtifacts = ['stocks.json', 'indices.json', 'dry-run-report.md'];
const targets = [
  { filename: 'stocks.json', relativePath: 'src/data/presets/stocks.json' },
  { filename: 'indices.json', relativePath: 'src/data/presets/indices.json' },
];

function parseApplyArguments(args) {
  const options = {};
  const valueFlags = new Set(['--source', '--manifest', '--candidates-dir']);
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--confirm-apply') {
      if (Object.hasOwn(options, flag)) throw new Error(`Duplicate flag: ${flag}. ${usage}`);
      options[flag] = true;
      continue;
    }
    if (!valueFlags.has(flag)) throw new Error(`Unknown argument: ${flag}. ${usage}`);
    if (Object.hasOwn(options, flag)) throw new Error(`Duplicate flag: ${flag}. ${usage}`);
    const value = args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}. ${usage}`);
    options[flag] = path.resolve(value);
  }
  for (const flag of valueFlags) {
    if (!options[flag]) throw new Error(`Missing required ${flag}. ${usage}`);
  }
  return {
    source: options['--source'],
    manifest: options['--manifest'],
    candidatesDirectory: options['--candidates-dir'],
    confirmed: options['--confirm-apply'] === true,
  };
}

function rerunDryRun(options) {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'evelo-historical-apply-'));
  try {
    const outputDirectory = path.join(temporaryDirectory, 'candidates');
    const result = spawnSync(process.execPath, [
      dryRunPath,
      '--source', options.source,
      '--manifest', options.manifest,
      '--output-dir', outputDirectory,
    ], { cwd: repositoryRoot, encoding: 'utf8' });
    if (result.error) throw new Error(`Could not run the fresh dry run: ${result.error.message}`);
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout).trim();
      throw new Error(`Fresh dry run failed${detail ? `: ${detail}` : '.'}`);
    }
    return new Map(reviewedArtifacts.map(filename => [
      filename,
      readFileSync(path.join(outputDirectory, filename)),
    ]));
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function assertReviewedArtifactsMatch(candidatesDirectory, freshArtifacts) {
  for (const filename of reviewedArtifacts) {
    let reviewedBytes;
    try {
      reviewedBytes = readFileSync(path.join(candidatesDirectory, filename));
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Reviewed artifact is missing: ${filename}.`);
      }
      throw error;
    }
    if (!reviewedBytes.equals(freshArtifacts.get(filename))) {
      throw new Error(`Fresh ${filename} does not byte-match the reviewed artifact; refusing to apply.`);
    }
  }
}

function changedTargets(freshArtifacts) {
  return targets.filter(target =>
    !readFileSync(path.join(repositoryRoot, target.relativePath))
      .equals(freshArtifacts.get(target.filename)));
}

function assertTargetsClean(changed) {
  for (const target of changed) {
    const result = spawnSync('git', [
      'status', '--porcelain=v1', '--untracked-files=all', '--', target.relativePath,
    ], { cwd: repositoryRoot, encoding: 'utf8' });
    if (result.error) throw new Error(`Could not check Git status for ${target.relativePath}: ${result.error.message}`);
    if (result.status !== 0) {
      throw new Error(`Could not check Git status for ${target.relativePath}: ${(result.stderr || '').trim()}`);
    }
    if (result.stdout) {
      throw new Error(`Refusing to apply: target has local changes: ${target.relativePath}`);
    }
    const absolutePath = path.join(repositoryRoot, target.relativePath);
    const info = lstatSync(absolutePath);
    if (!info.isFile() || info.isSymbolicLink() ||
        realpathSync(absolutePath) !== absolutePath) {
      throw new Error(`Refusing to apply: target is not a regular repository file: ${target.relativePath}`);
    }
  }
}

function renderProposedDiff(changed, freshArtifacts) {
  return changed.map(target => {
    const candidatePath = path.join(repositoryRoot, 'src/data/presets', target.filename);
    const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'evelo-apply-diff-'));
    try {
      const temporaryCandidate = path.join(temporaryDirectory, target.filename);
      writeFileSync(temporaryCandidate, freshArtifacts.get(target.filename));
      const result = spawnSync('git', [
        'diff', '--no-index', '--no-ext-diff', '--no-color', '--unified=3',
        '--', candidatePath, temporaryCandidate,
      ], { cwd: repositoryRoot, encoding: 'utf8' });
      if (result.error) throw new Error(`Could not render the proposed diff: ${result.error.message}`);
      if (result.status !== 1) {
        throw new Error(`Could not render the proposed diff for ${target.filename}: ${(result.stderr || '').trim()}`);
      }
      const lines = result.stdout.split('\n');
      for (let index = 0; index < Math.min(lines.length, 4); index++) {
        if (lines[index].startsWith('diff --git ')) {
          lines[index] = `diff --git a/${target.relativePath} b/${target.relativePath}`;
        } else if (lines[index].startsWith('--- ')) {
          lines[index] = `--- a/${target.relativePath}`;
        } else if (lines[index].startsWith('+++ ')) {
          lines[index] = `+++ b/${target.relativePath}`;
        }
      }
      return lines.join('\n');
    } finally {
      rmSync(temporaryDirectory, { recursive: true, force: true });
    }
  }).join('');
}

function writeChangedTargets(changed, freshArtifacts) {
  for (const target of changed) {
    const targetPath = path.join(repositoryRoot, target.relativePath);
    const expectedBytes = freshArtifacts.get(target.filename);
    writeFileSync(targetPath, expectedBytes);
    if (!readFileSync(targetPath).equals(expectedBytes)) {
      throw new Error(`Written bytes do not match the validated candidate: ${target.relativePath}`);
    }
  }
}

function main(args) {
  const options = parseApplyArguments(args);
  const freshArtifacts = rerunDryRun(options);
  assertReviewedArtifactsMatch(options.candidatesDirectory, freshArtifacts);
  const changed = changedTargets(freshArtifacts);
  if (!changed.length) {
    console.log('No preset changes are needed; the validated candidates already match the current baseline.');
    return;
  }
  assertTargetsClean(changed);
  console.log(renderProposedDiff(changed, freshArtifacts));
  if (!options.confirmed) {
    console.log('Preview only. Re-run with --confirm-apply to apply these reviewed changes.');
    return;
  }
  writeChangedTargets(changed, freshArtifacts);
  console.log(`Apply completed successfully. Updated: ${changed.map(target => target.filename).join(', ')}`);
}

try {
  main(process.argv.slice(2));
} catch (error) {
  console.error(`refresh:apply: ${error.message}`);
  process.exitCode = 1;
}
