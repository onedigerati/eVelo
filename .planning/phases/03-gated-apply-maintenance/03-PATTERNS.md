# Phase 3: Gated Apply & Maintenance - Pattern Map

**Mapped:** 2026-10-06
**Files analyzed:** 7 planned/conditional files
**Analogs found:** 5 / 7

The phase scope is active in `.planning/STATE.md` (Phase 3 — Gated Apply & Maintenance; status planning). No `copilot-instructions.md` exists; the repository `CLAUDE.md` applies, and no project skills were found in `.github/skills/` or `.agents/skills/`. The existing stock and index preset targets are locally modified in this checkout; an apply must refuse those targets under D-03.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `scripts/maintenance/historical-returns/apply.mjs` | utility (maintenance CLI) | batch / transform | `scripts/maintenance/historical-returns/dry-run.mjs` | role-match |
| `test/maintenance/historical-returns/apply.test.mjs` | test | request-response (CLI subprocess) | `test/maintenance/historical-returns/dry-run.test.mjs` | role + flow match |
| `docs/maintenance/historical-returns/maintainer-runbook.md` (recommended name; exact name is not locked) | utility (documentation) | batch | `docs/maintenance/historical-returns/source-contract.md` | role-match |
| `test/maintenance/historical-returns/runbook.test.mjs` | test | transform (documentation contract checks) | `test/maintenance/historical-returns/schema-contract.test.mjs` | partial |
| `package.json` | config | request-response (npm command dispatch) | `package.json` existing maintenance scripts | exact |
| `src/data/presets/stocks.json` (conditional apply target) | config (bundled data) | transform | Current preset baseline; no separate implementation analog | no code analog |
| `src/data/presets/indices.json` (conditional apply target) | config (bundled data) | transform | Current preset baseline; no separate implementation analog | no code analog |

The two preset JSON paths are authorized operational write targets, not files the implementation should overwrite unconditionally. Apply only a partition whose freshly regenerated complete candidate differs from the current baseline, and only after all freshness, target-cleanliness, diff-review, and explicit-confirmation gates pass. Do not use their current working-tree content as a clean baseline: both are already locally modified.

## Pattern Assignments

### `scripts/maintenance/historical-returns/apply.mjs` (utility, batch / transform)

**Analog:** `scripts/maintenance/historical-returns/dry-run.mjs` (tracked; closest same-domain Node ESM CLI). `identify-source.mjs` is a secondary precedent for explicit input flags and wrapped read errors.

**Imports and repository-root pattern** (`dry-run.mjs`, lines 1-22):

```javascript
import { createHash } from 'node:crypto';
import {
  closeSync,
  existsSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  realpathSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { TextDecoder } from 'node:util';
import { fileURLToPath } from 'node:url';
import Papa from 'papaparse';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const presetDirectory = path.join(root, 'src/data/presets');
```

Reuse Node built-ins and derive paths from `import.meta.url`; accept selected source/manifest/candidate paths as CLI inputs rather than embedding machine-specific paths. Apply writes must use an internal fixed allow-list of `stocks.json` and `indices.json`, never caller-provided destination names.

**CLI parsing and errors** (`dry-run.mjs`, lines 25-43 and 1419-1424):

```javascript
function parseArguments(args) {
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    if (!['--source', '--manifest', '--output-dir'].includes(flag)) {
      throw new Error(`Unknown argument: ${flag}. ${usage}`);
    }
    if (Object.hasOwn(options, flag)) throw new Error(`Duplicate flag: ${flag}. ${usage}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}. ${usage}`);
    options[flag] = path.resolve(value);
  }
  for (const flag of ['--source', '--manifest', '--output-dir']) {
    if (!options[flag]) throw new Error(`Missing required ${flag}. ${usage}`);
  }
  return options;
}
```

For apply, keep unknown/duplicate/missing-argument rejection and top-level CLI diagnostics (`refresh:apply: ...`, `process.exitCode = 1`). The existing dry-run options are not themselves an apply interface: retain a separate command and a distinct explicit confirmation flag; never add mutation behavior to dry-run.

**Safe paths, candidate artifact set, and main flow** (`dry-run.mjs`, lines 1294-1315, 1361-1378, 1381-1424):

```javascript
function resolvePhysicalPath(absolutePath) {
  let ancestor = absolutePath;
  const missing = [];
  while (!existsSync(ancestor)) {
    missing.unshift(path.basename(ancestor));
    ancestor = path.dirname(ancestor);
  }
  return path.join(realpathSync(ancestor), ...missing);
}
```

```javascript
const files = new Map([
  ['stocks.json', orderedJson(candidates.stocks)],
  ['indices.json', orderedJson(candidates.indices)],
  ['dry-run-report.md', report],
]);
preflightOutputTargets(physicalOutput, [...files.keys()]);
for (const [name, contents] of files) {
  const filename = path.join(physicalOutput, name);
  const fd = openSync(filename, 'wx');
  try {
    writeFileSync(fd, contents, 'utf8');
  } finally {
    closeSync(fd);
  }
}
```

The dry-run owns the semantic source/manifest validation and candidate generation. The apply command should invoke/reuse that implementation to regenerate into a fresh temporary output location, then byte-compare *both* full candidates and the report with the reviewed artifacts before considering a write. Determine the changed subset against the physical baseline; preflight every changed target before the first write, reject dirty Git targets, print the exact proposed diff, and mutate only after the distinct confirmation signal. Verify resulting bytes afterward. Existing code has no apply/Git-diff helper to copy, so implement these gates explicitly and do not claim cross-file transactionality absent proof.

### `test/maintenance/historical-returns/apply.test.mjs` (test, request-response)

**Analog:** `test/maintenance/historical-returns/dry-run.test.mjs` (tracked; exact same CLI integration-test style, fixtures, subprocesses, and preset-byte invariants).

**Imports, repository paths, and isolated fixtures** (`dry-run.test.mjs`, lines 1-38):

```javascript
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const command = path.join(root, 'scripts/maintenance/historical-returns/dry-run.mjs');
const presetDirectory = path.join(root, 'src/data/presets');
```

Reuse `node:test`, strict assertions, repository-relative CLI resolution, disposable temp fixtures, and child-process invocation. Existing fixture cleanup is registered with the test context; avoid applying to the real checkout in tests.

**Determinism, output and no-mutation assertions** (`dry-run.test.mjs`, lines 381-386, 388-440, 443-469):

```javascript
test('preset byte snapshots include every preset file', () => {
  assert.deepEqual(
    presetBytes().map(([name]) => name),
    readdirSync(path.join(root, 'src/data/presets')).sort(),
  );
});
```

```javascript
for (const name of ['stocks.json', 'indices.json', 'dry-run-report.md']) {
  const firstBytes = readFileSync(path.join(first.output, name));
  const secondBytes = readFileSync(path.join(second.output, name));
  assert.deepEqual(firstBytes, secondBytes, `${name} must be byte-identical`);
}
```

Make apply tests snapshot **all** preset-directory bytes and assert no changes for missing confirmation, stale/edited candidates or report, changed baseline, malformed input, dirty targets, and other refusal paths. Confirm a successful case changes only the changed authorized target(s). Include explicit output assertions for the diff and test the candidate/report three-artifact byte-match gate. The existing guard test at lines 471-489 blocks network and IndexedDB access; reuse that approach so the CLI cannot accidentally couple to provider or browser storage.

### `docs/maintenance/historical-returns/maintainer-runbook.md` (utility, batch)

**Analog:** `docs/maintenance/historical-returns/source-contract.md` (tracked; canonical policy and terminology).

**Policy sections to carry through** (`source-contract.md`, lines 225-259):

> New review remains maintainer-initiated when an explicitly reviewed snapshot represents a newly completed year or material source correction, with no unattended cadence.
>
> There is no unattended cadence, provider retrieval or raw-price calculation in this workflow.
>
> Bundled presets and browser-stored custom data have different ownership. IndexedDB custom overrides, user imports and portfolio data remain untouched. The repository maintenance workflow neither reads nor rewrites IndexedDB.

Use this existing contract as authority for the source preparation, methodology, scope, exceptions, and ownership material; document a runnable repository-relative identify → dry-run → inspect all candidate/report outputs → explicit apply → regression/build verification sequence. Add the locked D-03 precautions: refuse pre-existing local target edits, inspect the current diff before rollback, and restore only paths actually changed by apply using Git history. Do not introduce provider fetch, raw-price calculations, scheduled updates, or a second backup scheme.

### `test/maintenance/historical-returns/runbook.test.mjs` (test, transform)

**Analog:** `test/maintenance/historical-returns/schema-contract.test.mjs` (tracked; closest contract-style tests in this maintenance area; not a runbook-specific existing test).

**Test style** (`schema-contract.test.mjs`, lines 1-14):

```javascript
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import Ajv2020 from 'ajv/dist/2020.js';

const schemaUrl = name => new URL(
  `../../../docs/maintenance/historical-returns/schemas/${name}.schema.json`,
  import.meta.url
);
```

Use built-in `node:test` and read the runbook from a URL derived from `import.meta.url`; assert required documentation contract phrases/command steps rather than adding a new test framework. There is no existing tracked test specifically for documentation completeness, so this is a partial analog.

### `package.json` (config, command dispatch)

**Analog:** `package.json` lines 16-19 (existing paired maintenance CLI and direct test scripts):

```json
"refresh:identify": "node scripts/maintenance/historical-returns/identify-source.mjs",
"test:refresh-identify": "node --test test/maintenance/historical-returns/identify-source.test.mjs",
"refresh:dry-run": "node scripts/maintenance/historical-returns/dry-run.mjs",
"test:refresh-dry-run": "node --test test/maintenance/historical-returns/dry-run.test.mjs",
```

Add a separate `refresh:apply` script for the new CLI and a focused apply-test script if desired. The phase validation strategy invokes the new apply and runbook test files directly with `node --test`; no dependency or test-framework addition is indicated.

### Conditional targets: `src/data/presets/stocks.json` and `indices.json`

**Compatibility analog:** `src/data/services/preset-service.ts`, lines 15-18, 51-73. This is a shape/consumer reference, not a file-writing implementation.

```typescript
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

const typedStocksData = stocksData as unknown as Record<string, PresetData>;
const typedIndicesData = indicesData as unknown as Record<string, PresetData>;
```

Keep generated candidates compatible with this keyed record shape, including string `date` and numeric `return` values, and run `npm run build`. Do not route the apply CLI through this application service: its imports include browser custom-data functions. In particular, `src/data/services/custom-data-service.ts` lines 8-10 and 20-38 import the IndexedDB `db` and perform writes; the maintenance CLI must not import or invoke it.

## Shared Patterns

### Local Node ESM maintenance boundary

**Sources:** `scripts/maintenance/historical-returns/dry-run.mjs` lines 1-22, 25-43; `package.json` lines 16-19.
**Apply to:** apply CLI and its tests. Use Node built-ins, repository-root-relative paths, explicit flags, and direct `node:test` suites. Avoid network APIs and browser/runtime service imports.

### Exact, deterministic artifact integrity

**Sources:** `scripts/maintenance/historical-returns/dry-run.mjs` lines 1361-1378; `test/maintenance/historical-returns/dry-run.test.mjs` lines 388-440.
**Apply to:** apply CLI and apply tests. Compare byte buffers (not parsed JSON equality) for `stocks.json`, `indices.json`, and `dry-run-report.md`; regenerated bytes must equal all reviewed bytes. Detect the changed preset partition(s) from fresh candidates and restrict writes to the fixed two-path allow-list.

### Preflight, non-destructive refusal, and verification

**Sources:** `test/maintenance/historical-returns/dry-run.test.mjs` lines 443-469; locked decisions D-01 through D-03 in `03-CONTEXT.md`.
**Apply to:** apply CLI and tests. Resolve/restrict physical targets; finish freshness and target-cleanliness checks for every pending path before the first write. Missing confirmation is non-mutating. Show the exact diff before mutation; verify bytes after writes. Existing analogs do not implement Git cleanliness checks or an apply diff, so these are new required behaviors, not patterns to assume already exist.

### No browser custom-data mutation

**Sources:** `src/data/services/custom-data-service.ts` lines 8-10, 20-38; `test/maintenance/historical-returns/dry-run.test.mjs` lines 471-489.
**Apply to:** apply CLI and tests. Remain a local filesystem operation targeting only bundled preset JSON; do not access IndexedDB, provider APIs, or the custom-data service. Reuse network/IndexedDB guards in subprocess coverage.

### Runbook content and tests

**Sources:** `docs/maintenance/historical-returns/source-contract.md` lines 225-259; `test/maintenance/historical-returns/schema-contract.test.mjs` lines 1-14.
**Apply to:** runbook and its static contract test. Preserve existing source/methodology/scope decisions, spell out review and rollback steps, and test that required operator guidance remains present.

## No Analog Found

| File / concern | Role | Data Flow | Reason |
|----------------|------|-----------|--------|
| Apply-specific Git dirty-target refusal, explicit confirmation, exact proposed diff and bounded mutation in `apply.mjs` | utility | batch / transform | No existing tracked maintenance command applies reviewed artifacts or checks Git target status. Reuse dry-run validation and build these gates explicitly. |
| `runbook.test.mjs` as a documentation completeness suite | test | transform | Existing schema tests validate structured contracts, but no tracked test currently checks a maintainer runbook. |
| Direct implementation pattern for writing `stocks.json` / `indices.json` | config | transform | Preset JSON files are data, and the current dry-run intentionally writes only external output. Do not copy its output writer as an apply implementation. |

## Metadata

**Analog search scope:** `scripts/maintenance/historical-returns/`, `test/maintenance/historical-returns/`, `docs/maintenance/historical-returns/`, `src/data/services/`, plus `package.json` and phase planning artifacts.
**Tracked-source gate:** Every named code/documentation analog was verified with `git ls-files`; no ignored runtime mirror paths are referenced.
**Current target status:** Both authorized preset JSON targets have local modifications in this checkout; the apply implementation must refuse until clean.
**Pattern extraction date:** 2026-10-06
