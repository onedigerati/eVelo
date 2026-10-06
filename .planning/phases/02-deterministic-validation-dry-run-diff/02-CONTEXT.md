# Phase 2: Deterministic Validation & Dry-Run Diff - Context

**Gathered:** 2026-10-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Validate explicitly selected, reviewed CSV/JSON annual-return snapshots and adjacent manifests against the Phase 1 source contract and the bundled asset baseline. Produce deterministic candidate preset files and a complete human-readable diff outside `src/data/presets`; do not apply updates, fetch provider data, calculate returns from raw prices, or access browser-stored custom data.

</domain>

<decisions>
## Implementation Decisions

### Validation & diagnostics
- On blocking validation errors, write a complete diagnostic report, create no candidate files, and exit nonzero.
- Aggregate all independently detectable errors in deterministic order with file, row, symbol, year, and field context instead of stopping at the first error.
- Preserve the existing app's `return < -0.9` and `return > 3.0` checks as nonblocking outlier warnings; do not reuse its looser importer as the maintenance validator. Objective contract and semantic violations remain blocking.
- Warning-only inputs may produce candidate files and exit successfully, with warnings clearly identified in the report.
- In subset mode, require the manifest's declared symbol set to exactly equal the source's symbol set, and require `coveredCalendarYears` to exactly equal the source's unique years.

### Coverage & change handling
- Full bundled-asset coverage is the default; a subset is accepted only when explicitly declared and reported as required by Phase 1.
- A valid new symbol not currently bundled is reported as an added asset and included in the candidate; Phase 2 never applies it.
- Every genuinely new symbol requires an explicit reviewed partition decision for `stocks.json` or `indices.json`; never infer the destination from `assetClass`. Preserve known memberships, including the synchronized QQQ duplicate.
- A newly completed year beyond the bundled end is reported as an added period and included in the candidate.
- If a previously covered year disappears from an asset, report the removal, fail coverage, and create no candidate unless a future explicit removal policy is approved.
- Reviewed name or asset-class changes are carried into the candidate and shown as explicit metadata changes. Never normalize or alter source metadata silently.

### Candidate & report outputs
- Require an explicit `--output-dir`; reject any output destination inside `src/data/presets`.
- Candidate files mirror the bundled `stocks.json` and `indices.json` shapes and partitions. Preserve established file decisions, including the synchronized QQQ duplicate in `indices.json`.
- For subset input, emit full merged preset candidates: overlay only reviewed in-scope records and preserve every out-of-scope bundled record unchanged.
- Write deterministic candidate JSON files and a deterministic Markdown report; stdout contains a concise status and output paths.
- Refuse to overwrite any existing target file; the output directory must be absent or empty. Create it when absent and reject it if it contains any entries.
- Dry run remains non-mutating with respect to tracked presets and IndexedDB. Applying reviewed candidates belongs to Phase 3.

### the agent's Discretion
- Choose the strict parser/validator implementation, diagnostic codes, stable sort details, candidate/report filenames, and internal comparison helpers.
- Reuse existing project conventions where compatible, but do not reuse import paths that normalize inputs or write browser custom data.
- Keep manifest identity and source-selection behavior consistent with the Phase 1 contract.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/maintenance/historical-returns/identify-source.mjs` provides explicit source/manifest selection, adjacency checks, exact-byte SHA-256, and identity-only CLI patterns.
- Phase 1 JSON Schemas and `test/maintenance/historical-returns/schema-contract.test.mjs` define the reviewed input and manifest contract.
- `PresetData`, `PRESET_ASSET_CLASSES`, and `BUNDLED_PRESETS` in `src/data/services/preset-service.ts` describe the runtime preset shape and current baseline.
- `src/data/presets/stocks.json` and `indices.json` are the candidate file shapes and existing output partitions.

### Established Patterns
- The repository uses Node ESM and `node:test` for the maintenance identity command; package scripts live in `package.json`.
- `src/data/validation/data-validator.ts` and `bulk-import-service.ts` use Papa Parse, but normalize headers, parse values permissively, and sit on the browser import path. Reuse only parsing primitives that can be wrapped in strict fail-closed checks.
- Existing application import services can write IndexedDB custom data and are outside this workflow's ownership boundary.
- Do not reuse the Phase 1 ledger-check command surfaced in `prior_verify_commands`: it reflects the pre-deviation raw-archive links and is intentionally obsolete after the user-approved sanitized-evidence substitution.

### Integration Points
- Phase 2 extends the Phase 1 maintenance CLI and source contract without changing bundled presets.
- Candidate generation compares source records with both bundled preset JSON files and writes only to the explicitly selected output directory.
- Phase 3 consumes the reviewed candidate artifacts for a separate explicit apply; user-imported IndexedDB data remains untouched.

</code_context>

<specifics>
## Specific Ideas

- The Markdown report should make the complete changes easy to review, including added, removed, and changed assets/periods plus blocking errors and nonblocking warnings.
- Keep generated candidates in the same shapes and file partitions expected by the Phase 3 apply step.

</specifics>

<deferred>
## Deferred Ideas

- Applying candidates to tracked preset files remains Phase 3 work.
- Provider retrieval, unattended refreshes, raw-price return calculations, and changes to IndexedDB remain out of scope.

</deferred>
