# Phase 2: Deterministic Validation & Dry-Run Diff — Research

**Researched:** 2026-10-05  
**Domain:** Node.js maintenance CLI, strict annual-return validation, deterministic preset comparison  
**Confidence:** MEDIUM overall; HIGH for existing contracts and repository behavior, MEDIUM for implementation recommendations with unresolved routing policy

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:16-34]

#### Validation & diagnostics
- On blocking validation errors, write a complete diagnostic report, create no candidate files, and exit nonzero.
- Aggregate all independently detectable errors in deterministic order with file, row, symbol, year, and field context instead of stopping at the first error.
- Preserve the existing app's `return < -0.9` and `return > 3.0` checks as nonblocking outlier warnings; do not reuse its looser importer as the maintenance validator. Objective contract and semantic violations remain blocking.
- Warning-only inputs may produce candidate files and exit successfully, with warnings clearly identified in the report.

#### Coverage & change handling
- Full bundled-asset coverage is the default; a subset is accepted only when explicitly declared and reported as required by Phase 1.
- A valid new symbol not currently bundled is reported as an added asset and included in the candidate; Phase 2 never applies it.
- A newly completed year beyond the bundled end is reported as an added period and included in the candidate.
- If a previously covered year disappears from an asset, report the removal, fail coverage, and create no candidate unless a future explicit removal policy is approved.
- Reviewed name or asset-class changes are carried into the candidate and shown as explicit metadata changes. Never normalize or alter source metadata silently.

#### Candidate & report outputs
- Require an explicit `--output-dir`; reject any output destination inside `src/data/presets`.
- Candidate files mirror the bundled `stocks.json` and `indices.json` shapes and partitions. Preserve established file decisions, including the synchronized QQQ duplicate in `indices.json`.
- Write deterministic candidate JSON files and a deterministic Markdown report; stdout contains a concise status and output paths.
- Refuse to overwrite any existing target file; require a clean output directory.
- Dry run remains non-mutating with respect to tracked presets and IndexedDB. Applying reviewed candidates belongs to Phase 3.

### the agent's Discretion [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:36-39]
- Choose the strict parser/validator implementation, diagnostic codes, stable sort details, candidate/report filenames, and internal comparison helpers.
- Reuse existing project conventions where compatible, but do not reuse import paths that normalize inputs or write browser custom data.
- Keep manifest identity and source-selection behavior consistent with the Phase 1 contract.

### Deferred Ideas (OUT OF SCOPE) [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:73-77]
- Applying candidates to tracked preset files remains Phase 3 work.
- Provider retrieval, unattended refreshes, raw-price return calculations, and changes to IndexedDB remain out of scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATAREF-04 | The refresh tool validates schema, symbols, unique periods, finite return values, and required metadata, and fails closed on malformed or ambiguous input without silently filling or correcting data. | Phase 1 source and manifest schemas, strict CSV contract, semantic gaps, and adversarial test matrix below. [VERIFIED: .planning/REQUIREMENTS.md:15-19; docs/maintenance/historical-returns/source-contract.md:50-101] |
| DATAREF-05 | The default dry run checks the complete bundled asset set, reports missing or unexpected assets and periods, and allows a subset only when the maintainer explicitly identifies its scope. | Compare exact symbol/year sets against the two imported preset maps; validate and display manifest scope; do not infer scope. [VERIFIED: .planning/REQUIREMENTS.md:15-19; src/data/services/preset-service.ts:15-18,83-90; docs/maintenance/historical-returns/source-contract.md:144-159] |
| DATAREF-06 | The dry run produces deterministic candidate preset files outside the tracked preset directory and a complete human-readable report of added, removed, and changed assets and periods without modifying bundled presets. | Keep candidates as preset-shaped JSON, serialize stable sorted output, and assert byte-for-byte non-mutation of bundled presets. [VERIFIED: .planning/REQUIREMENTS.md:15-19; src/data/services/preset-service.ts:51-67; test/maintenance/historical-returns/identify-source.test.mjs:13-14,52-76] |
</phase_requirements>

## Summary

Phase 1 deliberately stops at exact-byte source identity; it does not parse source records or validate manifest semantics. Phase 2 therefore needs its own strict validation path while preserving Phase 1's explicit `--source`/`--manifest` pair, adjacency, and digest behavior. The existing source schemas and contract already define most field-level constraints, but cross-record uniqueness, CSV metadata consistency, finite-value handling, completed-year policy, manifest/source consistency, and coverage comparison remain semantic work. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:3-21,40-56,96-101,230-236; scripts/maintenance/historical-returns/identify-source.mjs:11-39,121-132]

Use a maintenance-only Node ESM CLI and keep browser import services out of this path. A strict parser should preserve exact inputs, collect stable diagnostics, compare source and baseline sets before serialization, and only write candidate JSON when there are no blocking diagnostics. A blocking run still writes its complete Markdown diagnostic report, exits nonzero, and emits no candidate files; a warning-only run may write candidates. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:16-20,29-39; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:52-61]

**Primary recommendation:** Keep `refresh:identify` identity-only and add a separate dry-run command, sharing a small source-selection/hash helper if needed. Build strict schema and semantic checks around the Phase 1 contracts; compare exact assets and per-asset year sets; preserve untouched baseline assets for declared subsets; then generate the two preset partitions and report only after output-path and overwrite preflight. The exact new-symbol file-routing policy remains an explicit planning decision (see Open Questions). [ASSUMED]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Select source/manifest, hash exact source bytes | Maintenance CLI / Node process | Local filesystem | Phase 1 already accepts explicit paths, checks adjacency, and hashes source bytes; retain the identity boundary. [VERIFIED: scripts/maintenance/historical-returns/identify-source.mjs:11-39,121-132] |
| Parse and validate reviewed records and provenance | Maintenance CLI / Node process | Local filesystem | Schemas describe the JSON contracts; semantic checks are explicitly assigned to Phase 2. [VERIFIED: docs/maintenance/historical-returns/schemas/annual-return-source.schema.json:5-55; docs/maintenance/historical-returns/source-contract.md:96-101,230-236] |
| Compare asset/period sets and produce a diff | Maintenance CLI / Node process | Bundled JSON baseline | `preset-service.ts` imports `stocks.json` and `indices.json` and constructs `BUNDLED_PRESETS` from them. [VERIFIED: src/data/services/preset-service.ts:15-18,72-90] |
| Write candidate JSON and review report | Local filesystem | Maintenance CLI / Node process | Output is explicitly selected, must be outside the bundled preset directory, and must refuse overwrites. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:29-34] |
| Update browser custom data or apply bundled changes | — | — | Neither belongs to Phase 2; IndexedDB is outside repository maintenance ownership and apply is Phase 3. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:230-240; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:29-34,73-77] |

## Project Constraints (from repository instructions)

- The repository instructions give `npm run build`, `npm run test:e2e`, and `npm run test:e2e:smoke` as build/test commands; use the focused maintenance tests as the phase's primary gate, with build as a broader check if implementation touches shared TypeScript. [VERIFIED: CLAUDE.md:7-13]
- `package.json` is ESM (`"type": "module"`) and already has the identity command/test scripts; maintain Node ESM and `node:test` conventions for maintenance tooling. [VERIFIED: package.json:2-4,16-17]
- No project-specific instruction was found in `copilot-instructions.md` during discovery. This is an observation from the current checkout, not a directive. [ASSUMED]

## Standard Stack

### Core

| Library / Runtime | Version | Purpose | Why Standard |
|-------------------|---------|---------|--------------|
| Node.js ESM and built-ins (`node:crypto`, `node:fs`, `node:path`) | Environment probe: Node `v22.23.2`; no added package | CLI, exact-byte SHA-256, explicit path handling, serialization, filesystem output | Phase 1 uses these built-ins and the project declares `"type": "module"`. [VERIFIED: scripts/maintenance/historical-returns/identify-source.mjs:1-3; package.json:2-4; `node --version`] |
| Papa Parse | Repo range `^5.5.3` / installed `5.5.3`; registry latest `5.7.0`, published 2026-08-24 | CSV tokenization only; retain exact header/value validation in the maintenance layer | Existing project dependency supports CSV parsing; strict code must not reuse the browser importer's header/value normalization. Official documentation describes parsing strings and exposes configuration including `transformHeader` and `skipEmptyLines`. [VERIFIED: package.json:41-48; `npm ls papaparse --depth=0`; `npm view papaparse version`; package-legitimacy result OK; CITED: https://www.papaparse.com/docs] |
| `node:test` | Built into Node; environment Node `v22.23.2` | CLI integration and maintenance-contract tests | Existing maintenance tests are ESM `node:test` suites launched with `node --test`. [VERIFIED: test/maintenance/historical-returns/identify-source.test.mjs:1-8,37-45; package.json:16-17; `node --version`] |

**CSV parser rule:** Treat Papa Parse as a tokenizer, not the maintenance validator. Do not normalize headers, silently skip blank rows, coerce values, or use the application importer to construct preset objects; explicitly validate the exact header and all parsed fields. Official docs show `Papa.parse(csvString[, config])` and document `transformHeader` / `skipEmptyLines`; test the selected options against quoted commas, malformed quoting, duplicate headers, and blank lines before relying on them. [CITED: https://www.papaparse.com/docs; VERIFIED: docs/maintenance/historical-returns/source-contract.md:58-69; src/data/validation/data-validator.ts:91-101,113-127; LOW seam confidence for the webfetch lookup]

### Supporting

| Existing Asset | Purpose | When to Use |
|---------------|---------|-------------|
| `annual-return-source.schema.json` and `annual-return-review-manifest.schema.json` | Canonical JSON shape, closed object rules, field constraints, methodology, scope, and exception shape | Use as contract for source/manifest validation; add semantic and cross-record checks not expressible in the schemas. [VERIFIED: docs/maintenance/historical-returns/schemas/annual-return-source.schema.json:1-55; docs/maintenance/historical-returns/schemas/annual-return-review-manifest.schema.json:1-139] |
| `identify-source.mjs` | Existing explicit source and manifest selection, exact-byte digest, adjacency checks, duplicate-key scanner for manifest JSON | Preserve identity behavior; extract a small reusable helper or keep the identity CLI unchanged and add the dry-run entry point separately. [VERIFIED: scripts/maintenance/historical-returns/identify-source.mjs:11-39,41-119,121-153] |
| `PresetData`, `PresetReturn`, `PRESET_ASSET_CLASSES`, `BUNDLED_PRESETS` | Runtime shape and baseline asset maps | Build candidates from the imported bundled JSON data, not browser import services. [VERIFIED: src/data/services/preset-service.ts:25-35,51-67,72-90] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reusing `data-validator.ts` / `bulk-import-service.ts` | Strict maintenance-only validation | The existing import path trims/lowercases headers, uses `parseFloat`, uppercases symbols, maps asset classes, and can interact with custom-data services; those behaviors conflict with no normalization and dry-run-only ownership. [VERIFIED: src/data/validation/data-validator.ts:91-101,138-160,181-195; src/data/services/bulk-import-service.ts:43-99,134-191; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:37-39] |
| Adding a new parser/schema package | Existing built-in JSON parsing plus declared Papa Parse for CSV tokenization | No new package is required for the recommended architecture. The schema test currently imports `ajv/dist/2020.js`, but Ajv is not listed among package.json's direct dependencies; do not make production CLI behavior depend on that incidental dependency without a separate package decision and legitimacy check. [VERIFIED: test/maintenance/historical-returns/schema-contract.test.mjs:1-14; package.json:26-48] |

**Installation:** No package installation is recommended; use the existing project dependency set. [ASSUMED]

### Package Legitimacy Audit

No new package is proposed for installation. Papa Parse was checked because the research recommends reusing the already-declared CSV parser. [VERIFIED: package.json:41-48]

| Package | Registry | Version / Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|---------------|-----------|-------------|---------|-------------|
| `papaparse` | npm | Latest `5.7.0`; published 2026-08-24 | 19,874,585 weekly | github.com/mholt/PapaParse | OK | Already declared in the project; use only for strict parsing primitives, no install/upgrade implied. [VERIFIED: npm registry; package-legitimacy result OK] |

No packages were removed or flagged as suspicious. The legitimacy result reported no `postinstall` script. [VERIFIED: package-legitimacy result for `papaparse`]

## Architecture Patterns

### System Architecture Diagram

```text
explicit reviewed CSV/JSON + adjacent manifest
                 │
                 ▼
   source pair / exact-byte identity check
                 │
                 ▼
 strict parse ──► schema + record + provenance diagnostics
                 │                         │
                 │                  blocking diagnostics?
                 │                    ┌────┴────┐
                 │                   yes       no
                 │                    │         │
                 ▼                    ▼         ▼
 read bundled stocks/indices     Markdown   compare source scope
 baseline (read-only)             report     and year sets
                                           │
                                           ▼
                              stable asset / period / metadata diff
                                           │
                                           ▼
                              explicit output-dir preflight
                                           │
                               ┌───────────┴───────────┐
                               ▼                       ▼
                         candidate JSON         Markdown report
                         outside presets        (deterministic)
```

The entry point, processing order, branch on blocking errors, local baseline boundary, and explicit output boundary are recommended from the locked decisions and Phase 1 interface. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:16-34; scripts/maintenance/historical-returns/identify-source.mjs:11-39; docs/maintenance/historical-returns/source-contract.md:18-43] The graph is an implementation recommendation rather than an existing architecture diagram. [ASSUMED]

### Recommended Project Structure

```text
scripts/maintenance/historical-returns/
├── identify-source.mjs          # Preserve Phase 1 identity-only behavior
├── <dry-run-cli>.mjs            # New strict validate / diff / output entry point
└── <shared-input-helper>.mjs    # Optional shared explicit pairing/hash logic

test/maintenance/historical-returns/
├── identify-source.test.mjs     # Existing identity contract
├── schema-contract.test.mjs     # Existing schema contract
└── <dry-run-cli>.test.mjs       # Proposed CLI and determinism tests
```

The two existing directories and tests are verified; angle-bracket files above are proposed names, not existing paths. [VERIFIED: scripts/maintenance/historical-returns/identify-source.mjs; test/maintenance/historical-returns/identify-source.test.mjs; test/maintenance/historical-returns/schema-contract.test.mjs] [ASSUMED]

### Pattern 1: Validate first, then compare and write

**What:** Parse source and manifest without mutation; collect schema, provenance, record, and coverage diagnostics; sort them by a stable key; write only the Markdown diagnostics report if any blocking issue exists; otherwise compare baseline and source, serialize candidates, and write the Markdown change report. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:16-20,29-34]

**When to use:** Every dry run, including warning-only runs and explicitly scoped subsets. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:20,23-34]

**Example flow:**

```text
read exact inputs → collect errors/warnings → compare valid records to baseline
  if blocking errors: report only + nonzero exit
  otherwise: deterministic candidates + complete Markdown diff
```

The branch outcome is locked; exact diagnostic sort keys and internal helper boundaries remain implementation choices. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:16-20,29-39] [ASSUMED]

### Pattern 2: Compare literal identity and per-symbol year sets

Use exact symbol strings and exact metadata strings. Build the baseline as a map of symbol → metadata + year → return, and compare sets rather than inferring a continuous range from each asset's start/end dates. That makes additions, changed return values, missing covered years, metadata changes, and new symbols independently reportable; do not fill omitted periods. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:58-69,96-101,218-224; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:22-27]

For a declared subset, the recommended safe behavior is to merge only explicitly scoped reviewed records over the baseline and preserve every out-of-scope bundled record unchanged in the full candidate output. Confirm this as the planned subset-candidate policy; the current context locks declared scope but does not specify whether the artifact contains a full merged baseline or a partial patch. [ASSUMED]

### Anti-Patterns to Avoid

- **Do not promote the current app importer to maintenance validation.** It normalizes headers/symbols, coerces values permissively, and sits on the custom-import path. [VERIFIED: src/data/validation/data-validator.ts:91-101,138-160; src/data/services/bulk-import-service.ts:43-99,134-191]
- **Do not treat Phase 1's matching digest as semantic approval.** The source is not parsed by `refresh:identify`; a malformed source can still receive an identity summary. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:40-43; test/maintenance/historical-returns/identify-source.test.mjs:80-85]
- **Do not auto-correct case, whitespace, units, class, or symbol aliases, or synthesize missing periods.** Corrected reviewed input or an explicitly documented reviewer-approved exception is required. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:218-224]
- **Do not add an apply mode, remote retrieval, return calculation, or IndexedDB access.** These cross Phase boundaries. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:206-214,230-240; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:29-39,73-77]
- **Do not revive the historical raw-archive ledger-check command surfaced in older phase-init data.** The accepted sanitized-evidence substitute supersedes that command. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:52-56]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| RFC-style CSV tokenization | A bespoke quote/comma/escape parser | The already-declared Papa Parse tokenizer, with strict wrapper checks and normalization disabled | Source records allow standard quoting for embedded commas/quotes; parser behavior still needs exact-header and failure tests. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:58-61; package.json:41-48] [CITED: https://www.papaparse.com/docs] |
| Preset data schema | A second divergent candidate object schema | `PresetData` / `PresetReturn` source types and actual `stocks.json` / `indices.json` shapes | Runtime types specify `symbol`, `name`, optional `assetClass`, `startDate`, `endDate`, and `returns`; each return uses `date` and `return`. [VERIFIED: src/data/services/preset-service.ts:51-67; src/data/presets/stocks.json:2-12; src/data/presets/indices.json:2-12] |
| Browser custom data handling | Reusing import/save helpers | Keep the maintenance CLI filesystem-only | Import helpers can query or update custom data, which is outside the phase's ownership boundary. [VERIFIED: src/data/services/bulk-import-service.ts:134-191; docs/maintenance/historical-returns/source-contract.md:238-240] |
| Exact-byte snapshot identity | A normalized re-serialization hash | Existing Node SHA-256 over selected source bytes | The source contract binds the digest to original bytes, not parsed/normalized records. [VERIFIED: scripts/maintenance/historical-returns/identify-source.mjs:1,130-132; docs/maintenance/historical-returns/source-contract.md:181-184] |

**Key insight:** The hard part is not JSON serialization; it is preserving source meaning while distinguishing syntax/schema errors, semantic errors, warnings, scope changes, and candidate changes. Reuse the Phase 1 contract and existing preset shapes, but do not reuse transformations from the browser import path. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:50-101,230-240; src/data/validation/data-validator.ts:91-101,138-160]

## Common Pitfalls

### Pitfall 1: `parseFloat` accepts malformed numeric prefixes

**What goes wrong:** Values like `0.1junk` can be accepted as a numeric prefix by the current importer rather than rejected as malformed.  
**Why it happens:** Existing validation calls `parseFloat` on trimmed input.  
**How to avoid:** Validate the whole raw CSV field against a numeric decimal form before numeric range/precision checks; reject empty, `NaN`, `Infinity`, trailing text, and percent strings. For JSON, reject parse failures and require finite numbers.  
**Warning signs:** A test with trailing letters or a percent suffix is accepted.  
[VERIFIED: src/data/validation/data-validator.ts:160-175; docs/maintenance/historical-returns/source-contract.md:63-69; ASSUMED]

### Pitfall 2: Schema validation is mistaken for cross-record validation

**What goes wrong:** Every individual record can pass shape checks while symbol duplication, duplicate symbol/year pairs, conflicting repeated CSV metadata, or manifest/source coverage mismatch goes unnoticed.  
**How to avoid:** Add independent semantic passes after per-object shape checks; report each independently detectable violation with deterministic record context.  
**Warning signs:** Duplicate row or cross-record fixtures pass the schema-contract suite but fail to produce a runtime diagnostic.  
[VERIFIED: docs/maintenance/historical-returns/source-contract.md:96-101; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:16-18]

### Pitfall 3: A warning threshold masks a contract error

**What goes wrong:** The app's outlier warning can be mistaken for permission to accept any value outside the normal range. A return below total loss violates the source schema even though it is also below the app warning threshold.  
**How to avoid:** Apply objective schema/semantic checks as blocking independently from app-compatible warnings; an invalid return remains blocking even if an outlier warning is also reported.  
**Warning signs:** A value less than `-1` appears only as a warning.  
[VERIFIED: docs/maintenance/historical-returns/schemas/annual-return-source.schema.json:47-51; src/data/validation/data-validator.ts:180-192; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:17-20]

### Pitfall 4: Subset input accidentally erases unreviewed assets

**What goes wrong:** A candidate built from only the selected subset silently drops all unselected baseline assets.  
**How to avoid:** Preserve out-of-scope baseline data when producing a full preset-shaped candidate, or explicitly define a patch artifact format; the locked candidate requirement currently expects preset shapes, so full merge is the safer recommendation.  
**Warning signs:** Candidate key count is reduced to the scope symbol list.  
[VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:22-34; ASSUMED]

### Pitfall 5: Class is used as the file partition rule

**What goes wrong:** New-symbol routing cannot be inferred safely from asset class alone: QQQ is an `equity_index` asset in both bundled files. The source files also hold duplicate QQQ records, and inspection confirmed the parsed objects currently match.  
**How to avoid:** Preserve known symbols' current partition membership and explicitly settle a routing rule for new symbols before candidate generation; do not infer it silently from asset class.  
**Warning signs:** A single new `equity_index` asset changes which JSON file receives the record depending on incidental sort order.  
[VERIFIED: `"QQQ": {` and `"assetClass": "equity_index"` in src/data/presets/stocks.json:3620-3625 and src/data/presets/indices.json:2-7; parsed-object equality check; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:29-33] [ASSUMED]

### Pitfall 6: Output guard is lexical, not physical

**What goes wrong:** A path that looks outside the preset directory can resolve through a symlink into it; string-prefix checks can also confuse neighboring paths.  
**How to avoid:** Resolve the output destination and check path-segment containment against the repository's actual preset directory; preflight every candidate and report target before writing, and refuse any existing target.  
**Warning signs:** A symlinked output directory or path containing `..` bypasses the guard.  
[ASSUMED]

## Code Examples

### Preset candidate shape

The existing TypeScript contracts are the target shape; convert source `year` to the preset return's `date` only as a representation mapping, not by modifying a return value:

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

This example is verbatim from the in-repo runtime type definition. [VERIFIED: src/data/services/preset-service.ts:51-67] The JSON source uses `year` and `return`, and its schema permits asset classes `"equity_index"`, `"equity_stock"`, `"bond"`, and `"commodity"`. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:71-95; docs/maintenance/historical-returns/schemas/annual-return-source.schema.json:21-51]

### Warning compatibility and objective bounds

```ts
if (returnVal < -0.9) {
  // nonblocking warning, per existing app behavior
} else if (returnVal > 3.0) {
  // nonblocking warning, per existing app behavior
}
```

The threshold expressions are copied verbatim from the importer. Keep the source-contract `"minimum": -1` and `"multipleOf": 0.0001` checks blocking and independent from warnings. [VERIFIED: src/data/validation/data-validator.ts:181-192; docs/maintenance/historical-returns/schemas/annual-return-source.schema.json:47-51; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:17-20]

## State of the Art

| Existing / prior behavior | Phase 2 behavior | Impact |
|---------------------------|------------------|--------|
| Phase 1 verifies explicit source identity and reports manifest claims without semantic validation. | Phase 2 adds strict source/manifest checks, coverage comparison, and deterministic preview artifacts while retaining identity checks. | A checksum match alone must not authorize candidate generation. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:18-43,230-236] |
| Browser import path normalizes and permissively parses inputs. | Maintenance validation preserves literals and rejects ambiguous/malformed inputs. | Do not share browser import transformations. [VERIFIED: src/data/validation/data-validator.ts:91-101,138-160; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:37-39] |
| Updating bundled presets is not part of Phase 2. | Candidates are written outside presets; apply is separately gated in Phase 3. | Keep dry run non-mutating and avoid exposing an apply flag. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:230-240; .planning/ROADMAP.md:53-61] |

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Maintenance CLI and `node:test` | ✓ | `v22.23.2` | None needed in this environment. [VERIFIED: `node --version`] |
| npm | Existing project test scripts | ✓ | `12.2.0` | None needed in this environment. [VERIFIED: `npm --version`] |
| Papa Parse | Strict CSV tokenization | ✓ | Installed `5.5.3`; project range `^5.5.3` | Do not hand-roll CSV tokenization; if dependency unavailable in a normal checkout, install the project's lockfile dependencies. [VERIFIED: `npm ls papaparse --depth=0`; package.json:41-48] |

**Missing dependencies with no fallback:** None observed. [VERIFIED: environment probes above]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Built-in Node `node:test`; current runtime `v22.23.2`. [VERIFIED: test/maintenance/historical-returns/identify-source.test.mjs:1-8; `node --version`] |
| Config file | `vitest.config.ts` is for `src/**/*.{test,spec}.{ts,tsx}`; the maintenance `.mjs` suites are run directly with Node. [VERIFIED: vitest.config.ts:1-25; package.json:16-17] |
| Existing identity suite | `npm run test:refresh-identify` [VERIFIED: package.json:16-17; docs/maintenance/historical-returns/source-contract.md:45-48] |
| Existing schema suite | `node --test test/maintenance/historical-returns/schema-contract.test.mjs` [VERIFIED: docs/maintenance/historical-returns/source-contract.md:45-48] |
| Proposed quick phase command | `node --test test/maintenance/historical-returns/dry-run.test.mjs` [ASSUMED: proposed test file/command] |
| Broader check | `npm run build` [VERIFIED: CLAUDE.md:7-13] |

Both existing maintenance suites were run during research and exited successfully. [VERIFIED: `npm run test:refresh-identify`; `node --test test/maintenance/historical-returns/schema-contract.test.mjs`]

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command / Surface | File Exists? |
|--------|----------|-----------|-----------------------------|--------------|
| DATAREF-04 | JSON schema and manifest constraints: required/unknown keys, exact types, valid date, enums, digest shape, methodology, scope, exceptions; no coercion/defaulting. | Unit / contract | Existing schema contract suite; add runtime-vs-schema parity cases. [VERIFIED: test/maintenance/historical-returns/schema-contract.test.mjs] | Yes for schema contract; ❌ runtime tests to add |
| DATAREF-04 | CSV exact header/quoting; malformed CSV/JSON; duplicate JSON keys; blank/missing metadata; invalid or unsupported symbols; conflicting repeated metadata; duplicate symbol/year; non-finite, below-total-loss, precision/unit errors; completed-year cutoff. | Unit / CLI integration | Proposed `dry-run.test.mjs` with isolated CSV/JSON fixtures. Include CSV `NaN`/`Infinity` and trailing text, JSON overflow-to-infinity input, fractional/string years, repeated metadata, and duplicate period cases. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:58-101; ASSUMED: test path] | ❌ Wave 0 |
| DATAREF-04 | Aggregate independent diagnostics with file/row/symbol/year/field and deterministic order; warnings below `-0.9` and above `3.0` do not block valid records. | Unit / CLI integration | Assert exact stable diagnostic array/report and exit code; test threshold boundary and invalid `< -1` remains blocking. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:16-20; src/data/validation/data-validator.ts:181-192] | ❌ Wave 0 |
| DATAREF-05 | Complete coverage compares full baseline; missing/unexpected symbols and per-asset periods are reported; only explicit subset mode is accepted and visible. | Integration | Fixture manifests with complete/subset scope; verify subset symbols and year coverage, absent assets, unexpected additions, removed prior years, and no implicit fill. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:144-159; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:22-27] | ❌ Wave 0 |
| DATAREF-06 | Candidate partition and preset shape; newly added symbols/years, removed/changed periods, changed metadata, QQQ synchronization. | Integration / regression | Compare candidate JSON objects with `PresetData`; assert QQQ equality across both files. [VERIFIED: src/data/services/preset-service.ts:51-67; src/data/presets/indices.json:2-12; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:24-32] | ❌ Wave 0 |
| DATAREF-06 | Same input yields byte-identical candidates/report in fresh output dirs; refuse overwrite; explicit output path cannot resolve inside presets; errors create report but no candidates; bundled preset bytes unchanged. | CLI integration | Spawn child process twice with same fixtures and compare output bytes; snapshot preset bytes before/after; test existing targets, dirty output dir, traversal, and symlink destinations. [VERIFIED: test/maintenance/historical-returns/identify-source.test.mjs:13-14,37-45,52-76; ASSUMED: new cases] | ❌ Wave 0 |

### Sampling Rate and Wave 0 Gaps

- **Per task commit:** `node --test test/maintenance/historical-returns/dry-run.test.mjs` (proposed focused suite). [ASSUMED]
- **Per wave merge:** `npm run test:refresh-identify && node --test test/maintenance/historical-returns/schema-contract.test.mjs && node --test test/maintenance/historical-returns/dry-run.test.mjs`. Existing command components are verified; final combined command is proposed. [VERIFIED: package.json:16-17; docs/maintenance/historical-returns/source-contract.md:45-48] [ASSUMED]
- **Phase gate:** Focused maintenance suites green; run `npm run build` if shared TypeScript/app code is changed. [VERIFIED: CLAUDE.md:7-13] [ASSUMED]
- [ ] Add proposed `test/maintenance/historical-returns/dry-run.test.mjs` for strict parser, diagnostics, coverage, output collision/path safety, deterministic bytes, and preset non-mutation. [ASSUMED]
- [ ] Add a package script for the dry-run suite or document the direct `node --test` command; maintenance tests are not included by `vitest.config.ts`. [VERIFIED: vitest.config.ts:1-25; package.json:13-17] [ASSUMED]

## Security Domain

The tool is a local file-processing CLI, not a network service. Treat selected CSV/JSON and manifests as untrusted input; constrain writes to the explicit output directory and never write to bundled presets. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:18-21,230-240; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:29-34]

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | No user authentication flow is part of the local CLI scope. [ASSUMED] |
| V3 Session Management | No | No browser/session handling belongs in this workflow. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:238-240] |
| V4 Access Control | Yes, filesystem boundary | Restrict output to the explicitly selected path outside presets; resolve symlinks/real paths and refuse existing targets. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:29-34] [ASSUMED: concrete path-defense design] |
| V5 Input Validation | Yes | Fail closed on schema and semantic ambiguity; never coerce, repair, normalize, or gap-fill. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:50-101,218-224] |
| V6 Cryptography | Yes, narrowly | Use Node's built-in SHA-256 for the exact-byte source digest; do not invent a hash or treat checksum as semantic validation. [VERIFIED: scripts/maintenance/historical-returns/identify-source.mjs:1,130-153; docs/maintenance/historical-returns/source-contract.md:181-184] |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malformed or ambiguous source rows | Tampering | Strict parser + closed-schema and semantic checks; aggregate diagnostics and block candidates. [VERIFIED: docs/maintenance/historical-returns/schemas/annual-return-source.schema.json:5-51; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:16-20] |
| Output path traversal or symlink redirection | Tampering / Elevation of privilege | Canonicalize paths, perform segment-aware containment checks, preflight all destinations, refuse overwrites. [ASSUMED] |
| Duplicate-key ambiguity in JSON | Tampering | Extend/use the duplicate-key scanner for both source JSON and manifest JSON before `JSON.parse`. Existing scanner currently runs for the manifest. [VERIFIED: scripts/maintenance/historical-returns/identify-source.mjs:41-119,134-140] [ASSUMED: extend to source] |
| Accidental write to tracked data | Tampering | Assert preset file bytes unchanged before/after every successful and blocking CLI integration test. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:29-34; test/maintenance/historical-returns/identify-source.test.mjs:13-14,52-76] |

## Assumptions Log

| # | Claim / Recommendation | Section | Risk if Wrong |
|---|------------------------|---------|---------------|
| A1 | For subsets, emit full preset-shaped candidates by overlaying only scoped source records onto the bundled baseline, preserving out-of-scope records. | Architecture Patterns / Pitfalls | A subset could accidentally produce a partial candidate or erase unrelated baseline data. |
| A2 | Preserve known symbol partition membership; define an explicit, deterministic policy for new-symbol destination rather than inferring from asset class. | Pitfalls / Open Questions | New assets may be written to the wrong preset file or break Phase 3 assumptions. |
| A3 | Require the source symbols in subset mode to match the declared subset exactly, and require manifest `coveredCalendarYears` to match the unique years actually represented by parsed data. | Validation Architecture | Scope/coverage claims could be inconsistent without a blocking diagnostic. |
| A4 | Sort diagnostics using stable source file, row/index, symbol, year, field, and code components; avoid absolute temp paths, timestamps, locale-sensitive formatting, or environment values in deterministic output. | Pattern 1 / Validation Architecture | Reports can differ across repeat runs or omit required context. |
| A5 | Detect surrounding symbol whitespace as ambiguity and reject it rather than trimming; do not impose an undocumented ticker regex because the source schema has no symbol pattern. | Common Pitfalls | A valid nonstandard symbol could be rejected, or a padded symbol could be silently normalized. |
| A6 | Treat “clean output directory” as no existing report/candidate targets (or require the directory to be empty); settle exact behavior and test it before implementation. | Validation Architecture / Open Questions | Existing user files could be overwritten or runs could fail unexpectedly. |
| A7 | Use a run-time completed-year cutoff and inject/fix the clock in tests so current-year behavior is deterministic around calendar boundaries. | Validation Architecture | Partial current-year data may be accepted or tests become date-dependent. |
| A8 | Canonical-path output checks include symlinks and path-segment boundaries. | Security Domain | A lexical path check could be bypassed and mutate tracked presets. |
| A9 | Papa Parse's official docs were read, but the research-plan seam classified the `webfetch` provider LOW; strict parser behavior must be proven by local fixtures before it is treated as dependable. | Standard Stack | CSV parsing edge cases may be mishandled. |
| A10 | ASVS category applicability and the local CLI threat-to-control mapping are scope assessments, not a certification. | Security Domain | Teams could mistake applicability notes for a formal security review. |

## Open Questions

1. **How should a new symbol be assigned to `stocks.json` versus `indices.json`?**
   - What we know: existing QQQ occurs in both partitions; both copies currently compare equal, while `BUNDLED_PRESETS` merges the stocks map with IWM and AGG from indices. [VERIFIED: `"QQQ": {` and `"assetClass": "equity_index"` in src/data/presets/stocks.json:3620-3625 and src/data/presets/indices.json:2-7; src/data/services/preset-service.ts:83-90; parsed-object equality check]
   - What's unclear: the source schema carries `assetClass` but no file-partition field, and the locked context does not specify new-symbol routing. [VERIFIED: docs/maintenance/historical-returns/schemas/annual-return-source.schema.json:18-34; .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:29-39]
   - Recommendation: preserve known memberships and require a deterministic explicit routing rule for genuinely new symbols; do not use asset class alone. [ASSUMED]
2. **Should subset candidates be complete merged preset files or patch artifacts?**
   - What we know: candidate files must mirror the existing preset JSON shape, while subset input is permitted only with explicit scope. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:22-34]
   - What's unclear: the context does not state whether records outside subset scope are copied from baseline into the candidate.
   - Recommendation: use full merged preset-shaped candidate files and preserve all unscoped records unchanged. [ASSUMED]
3. **What exactly constitutes a clean output directory?**
   - What we know: `--output-dir` is required, overwrite is refused, and the directory must be clean. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:29-34]
   - What's unclear: whether unrelated pre-existing files are allowed and whether the CLI creates a missing directory.
   - Recommendation: document one policy; at minimum preflight every report/candidate destination before writing any output. [ASSUMED]

## Resolved Open Questions (2026-10-06)

The user selected the following policies after reviewing the research:

1. New symbols require an explicit reviewed `stocks.json`/`indices.json` partition; do not infer it from `assetClass`, and preserve known memberships including QQQ's duplicate.
2. Subset inputs produce full merged preset-shaped candidates, overlaying reviewed records while preserving all out-of-scope bundled records unchanged.
3. `--output-dir` may be absent (the CLI creates it) or already empty; reject any existing entries.
4. In subset mode, the declared symbol set must exactly match source symbols, and manifest `coveredCalendarYears` must exactly match the source's unique years.

These decisions resolve Open Questions 1-3 and assumptions A1-A3 and A6 above. [VERIFIED: user selections recorded in `02-DISCUSSION-LOG.md` and `02-CONTEXT.md`]

## Metadata

**Confidence breakdown:**
- Source contract and existing stack: HIGH — schemas, source contract, script, preset types, and tests were read directly; focused existing maintenance tests pass in this environment. [VERIFIED: cited source paths and test commands above]
- Architecture and validation strategy: MEDIUM — prescribed by locked context, with subset artifact semantics and new-symbol routing not fully specified. [ASSUMED]
- Security mapping: LOW — local threat controls are implementation recommendations; no formal ASVS assessment was performed. [ASSUMED]

**Research date:** 2026-10-05  
**Valid until:** 2026-11-04 for this stable repository-specific guidance; recheck the registry latest version if package work is added. [ASSUMED]

## Sources

- `.planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md` — locked validation, coverage, output, and ownership decisions.
- `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, `.planning/ROADMAP.md` — requirements, current phase scope, dependencies, and success criteria.
- `docs/maintenance/historical-returns/source-contract.md` and `docs/maintenance/historical-returns/schemas/{annual-return-source,annual-return-review-manifest}.schema.json` — Phase 1 data and provenance contracts.
- `scripts/maintenance/historical-returns/identify-source.mjs`; `src/data/services/preset-service.ts`; `src/data/validation/data-validator.ts`; `src/data/services/bulk-import-service.ts`; `src/data/presets/{stocks,indices}.json` — current CLI, baseline shapes, and import behavior.
- `test/maintenance/historical-returns/{identify-source,schema-contract}.test.mjs`; `package.json`; `vitest.config.ts`; `CLAUDE.md` — existing validation surfaces and repository commands.
- [Papa Parse official documentation](https://www.papaparse.com/docs) — CSV parser API/options; provider confidence classified LOW, so strict behavior remains fixture-gated.
- npm registry and `gsd-tools query package-legitimacy check --ecosystem npm papaparse` — registry version/publication metadata and package verdict `OK`.
