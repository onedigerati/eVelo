# Phase 2: Deterministic Validation & Dry-Run Diff - Pattern Map

**Mapped:** 2026-10-05  
**Files analyzed:** 3 implementation files  
**Analogs found:** 3 / 3

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/maintenance/historical-returns/dry-run.mjs` (proposed strict validation/diff CLI) | utility | file-I/O, transform, request-response (CLI) | `scripts/maintenance/historical-returns/identify-source.mjs` | role-match; partial flow match |
| `test/maintenance/historical-returns/dry-run.test.mjs` | test | file-I/O, request-response (spawned CLI) | `test/maintenance/historical-returns/identify-source.test.mjs` | exact role; close flow match |
| `package.json` | config | request-response (npm command dispatch) | Existing `refresh:identify` and `test:refresh-identify` entries | exact |

**Inventory basis:** RESEARCH proposes a separate maintenance dry-run entry point and a `dry-run.test.mjs` suite; it also recommends adding a package script or documenting the direct `node --test` command. CONTEXT resolves the behavior those files must cover: explicit new-symbol partition choice (never infer from asset class), full subset candidate merge with out-of-scope records preserved, exact source/manifest subset equality and covered-year equality, and absent-or-empty output directory only. These are implementation/test concerns, not new source data files.

The candidate outputs are generated artifacts outside `src/data/presets`, not repository implementation files. `stocks.json` and `indices.json` are read-only baselines in this phase and must not be modified. An optional shared input helper is mentioned in RESEARCH but is not required by the locked decisions, so it is not counted as a committed file here.

## Pattern Assignments

### `scripts/maintenance/historical-returns/dry-run.mjs` (utility, file-I/O / transform / CLI request-response)

**Analog:** `scripts/maintenance/historical-returns/identify-source.mjs` (git-tracked)

Use this as the Node ESM CLI and explicit source-pairing/identity analog. Do **not** copy its fail-fast error policy for semantic validation: Phase 2 needs deterministic aggregation of independently detectable diagnostics and a Markdown report even on blocking errors.

**Imports and runtime pattern** (`identify-source.mjs`, lines 1-3):

```js
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
```

Keep the maintenance tool on Node built-ins and filesystem access. Papa Parse is already a project dependency for CSV tokenization, but wrap it with strict checks and no input normalization; the browser parser below is explicitly not a validator analog.

**CLI argument pattern** (`identify-source.mjs`, lines 11-24):

```js
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
```

Copy explicit flag parsing, duplicate/unknown-flag rejection, and resolved paths. Extend it for the dry-run options, including required `--output-dir`; no default output path or implicit source discovery.

**Source identity and physical pairing** (`identify-source.mjs`, lines 27-39, 121-132):

```js
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
```

Retain exact-byte hashing and both lexical/real-path adjacency checks from the CLI's `identify` flow (`identify-source.mjs`, lines 121-153). The new command must still validate `snapshotFilename` and `snapshotSha256` before trusting source contents. The duplicate-key scanner at lines 41-119 is also a concrete starting point for rejecting duplicate JSON keys in the source as well as the manifest.

**Error/exit pattern** (`identify-source.mjs`, lines 171-176):

```js
try {
  console.log(JSON.stringify(identify(process.argv.slice(2)), null, 2));
} catch (error) {
  console.error(`refresh:identify: ${error.message}`);
  process.exitCode = 1;
}
```

For the dry-run, adapt this top-level CLI boundary to emit concise status/output paths on success and a nonzero status on blocking validation. Semantic validation errors must instead be accumulated, stably sorted with file/row/symbol/year/field context, and rendered into the report. On blocking diagnostics write the report but no candidate files; warning-only runs may write candidates.

**Candidate shape / baseline** (`src/data/services/preset-service.ts`, lines 51-67; tracked):

```ts
export interface PresetReturn {
  date: string;
  return: number;
}

export interface PresetData {
  symbol: string;
  name: string;
  /** Asset class; when absent, treat as 'equity_stock' */
  assetClass?: PresetAssetClass;
  startDate: string;
  endDate: string;
  returns: PresetReturn[];
}
```

The CLI should compare against the checked-in JSON partitions, not `BUNDLED_PRESETS` as a merged runtime map: the runtime service merges selected indices and loses file partition information. Preserve existing partition memberships, including the identical QQQ entry in both files (`src/data/presets/stocks.json`, lines 3620-3629; `src/data/presets/indices.json`, lines 2-12). For each genuinely new symbol require an explicit reviewed destination. Do not derive its partition from `assetClass`.

For subset inputs emit full candidates by overlaying only reviewed in-scope symbols and retaining all out-of-scope baseline objects unchanged. Compare exact sets: manifest subset symbols equal source symbols, and `coveredCalendarYears` equals the source's unique years. Treat removal of a previously covered year as blocking and do not serialize candidates.

**Output handling:** No existing repository analog writes deterministic dry-run candidates/reports under a user-selected directory. Use this as a new filesystem boundary, not as permission to reuse app import/write services. Resolve/check output containment against the real preset directory, require a clean (absent or empty) directory, create it if absent, and preflight all report/candidate targets before writing. Never overwrite existing files.

### `test/maintenance/historical-returns/dry-run.test.mjs` (test, file-I/O / spawned CLI)

**Analog:** `test/maintenance/historical-returns/identify-source.test.mjs` (git-tracked)

**Imports, repository paths, and isolation** (`identify-source.test.mjs`, lines 1-14):

```js
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
```

Use native `node:test`, child-process integration, temp fixtures with cleanup, and repository-relative paths. Point the command constant at the new dry-run CLI.

**Fixture and CLI invocation** (`identify-source.test.mjs`, lines 16-45):

```js
function run(args, cwd = root) {
  return spawnSync(process.execPath, [command, ...args], { cwd, encoding: 'utf8' });
}

function fails(result, diagnostic) {
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, diagnostic);
  assert.equal(result.stdout, '', 'errors must not produce a success summary');
}
```

The existing `fixture` helper (lines 16-34) creates a `mkdtempSync` directory, registers `t.after` cleanup with `rmSync`, writes source bytes plus an adjacent `.manifest.json`, and calculates a matching digest. Retain that isolation pattern and use complete schema-valid source/manifest fixtures for both CSV and JSON, plus targeted invalid fixtures. Since Phase 2 aggregates errors, assert the complete stable report diagnostics rather than stopping at the first diagnostic as the Phase 1 identity tests do.

**Non-mutation and integration assertions** (`identify-source.test.mjs`, lines 13-14 and 52-76):

```js
const presetBytes = () => readdirSync(path.join(root, 'src/data/presets'))
  .sort().map(name => [name, readFileSync(path.join(root, 'src/data/presets', name)).toString('base64')]);

const before = presetBytes();
const result = run(['--source', f.source, '--manifest', f.manifest]);
assert.equal(result.status, 0, result.stderr);
assert.deepEqual(presetBytes(), before);
```

Adapt the pattern to run with explicit temporary `--output-dir`, compare repeated report/candidate bytes, and snapshot preset bytes for both successful and blocking runs. Cover invalid source/manifest, diagnostics ordering/context, warning-only behavior, scope/year exact equality, additions/removals/metadata changes, explicit new-symbol routing, QQQ synchronization, subset preservation, clean directory/overwrite rejection, preset-path and symlink guards, and “report but no candidates” on blocking errors.

**Schema contract reference** (`test/maintenance/historical-returns/schema-contract.test.mjs`, tracked): it uses Ajv with strict mode, `allErrors: true`, and coercion/default/removal disabled (lines 8-13), and snapshots objects to ensure validation does not mutate them (`expectFixture`, lines 125-131). Reuse those constraints if selecting Ajv for runtime validation, but note RESEARCH warns Ajv is not a direct package dependency. The test's existing schema contract is useful reference; it is not a substitute for runtime semantic/coverage tests.

### `package.json` (config, npm CLI dispatch)

**Analog:** Existing `refresh:identify` and `test:refresh-identify` scripts (`package.json`, lines 16-17):

```json
"refresh:identify": "node scripts/maintenance/historical-returns/identify-source.mjs",
"test:refresh-identify": "node --test test/maintenance/historical-returns/identify-source.test.mjs",
```

Follow the existing naming and direct Node execution convention with a dry-run script and a focused `node --test` script. Keep Node ESM (`"type": "module"`, line 4); do not route maintenance `.mjs` tests through the application Vitest config.

## Shared Patterns

### Explicit input pairing and identity
**Source:** `scripts/maintenance/historical-returns/identify-source.mjs`, lines 11-39 and 121-153  
**Apply to:** dry-run CLI

Resolve caller-supplied paths, require an adjacent matching manifest, verify physical paths, and hash exact source bytes. A matching digest establishes source identity only, not semantic validity.

### Strict, non-mutating contract validation
**Sources:** `docs/maintenance/historical-returns/source-contract.md`, lines 50-101 and 144-159; `test/maintenance/historical-returns/schema-contract.test.mjs`, lines 8-13 and 125-131  
**Apply to:** CLI and dry-run tests

Keep exact headers/values and metadata literals. Do not trim, uppercase, coerce, fill gaps, default fields, or silently repair inputs. Add semantic cross-record checks for unique symbols and symbol/year pairs, consistent repeated CSV metadata, finite values, complete-year cutoff, exact coverage, and explicit scope agreement. Aggregate stable diagnostics. Outlier thresholds `< -0.9` and `> 3.0` remain warnings only; contract violations such as a return below `-1` remain blocking.

### Preset format and partition preservation
**Sources:** `src/data/services/preset-service.ts`, lines 51-90; `src/data/presets/stocks.json` and `indices.json`  
**Apply to:** CLI and candidate regression tests

The runtime object maps each annual source `year` to preset return `date`; this is representation conversion only, not a value correction. Use the physical partition files for routing. Preserve known memberships and the synchronized QQQ duplicate. New symbols need explicit reviewed `stocks.json`/`indices.json` partition selection, never an `assetClass` heuristic.

### Read-only filesystem ownership
**Sources:** `test/maintenance/historical-returns/identify-source.test.mjs`, lines 13-14 and 52-76; `02-CONTEXT.md`, decisions “Candidate & report outputs”  
**Apply to:** CLI and tests

Bundled presets and browser IndexedDB are not write targets. Generate deterministic candidates and Markdown only in required, explicit output location outside `src/data/presets`. Use byte snapshots to verify tracked preset non-mutation.

### CSV importer is not the maintenance validator
**Source:** `src/data/validation/data-validator.ts`, lines 95-100, 138-175 and 180-195 (tracked; read as an anti-pattern)  
**Apply to:** CLI implementation choices

The app importer uses `skipEmptyLines`, normalizes headers, trims values, and `parseFloat`s return strings. `src/data/services/bulk-import-service.ts`, lines 55-60, 87-115 and 135-180 additionally normalizes symbols and skips/massages malformed rows. These patterns conflict with strict fail-closed maintenance semantics. Reuse Papa Parse only as a tokenizer with normalization disabled and explicit checks around every raw field; do not reuse the importer or any custom-data write path.

## No Analog Found

| File/Concern | Role | Data Flow | Reason |
|--------------|------|-----------|--------|
| Dry-run candidate/report writer and output-directory guard | utility | file-I/O | No existing local CLI performs deterministic review artifact writes with clean-directory enforcement, no-overwrite semantics, and a guard against writing into tracked presets. Implement from the locked ownership/output decisions; do not borrow browser import persistence. |

## Metadata

**Analog search scope:** `scripts/maintenance/historical-returns/`, `test/maintenance/historical-returns/`, `docs/maintenance/historical-returns/`, `src/data/services/`, `src/data/validation/`, `src/data/presets/`, and `package.json`. All named code analogs were verified with `git ls-files`; no ignored runtime mirrors were used.  
**Files scanned:** 9 focused source/test/config files plus the contract and preset-shape references.  
**Pattern extraction date:** 2026-10-05
