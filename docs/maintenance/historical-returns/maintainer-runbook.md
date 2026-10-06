# Historical Returns Maintainer Runbook

This runbook documents the operator-owned refresh path for bundled preset returns. It is local, explicit, and maintainer-initiated.

## 1) When to run this workflow

Run this workflow only when a maintainer has an explicitly reviewed snapshot for:

- a **newly completed calendar year**, or
- a **material source correction** to already covered years.

Do not schedule unattended runs. There is no automatic cadence.

## 2) Source and manifest preparation

Prepare one reviewed source file (`.csv` or `.json`) and its adjacent manifest:

- `reviewed.csv` + `reviewed.csv.manifest.json`, or
- `reviewed.json` + `reviewed.json.manifest.json`.

The manifest must include:

- exact-byte `snapshotSha256` for the selected source,
- reviewer identity and review date,
- source attribution and methodology,
- complete coverage by default (`assetScope.mode = "complete"`), or an explicit subset scope and rationale,
- applicable exception evidence (symbols/years or metadata field, accepted value/policy, rationale, and evidence).

Use the source contract for exact schema and semantics:

- `docs/maintenance/historical-returns/source-contract.md`
- `docs/maintenance/historical-returns/schemas/annual-return-source.schema.json`
- `docs/maintenance/historical-returns/schemas/annual-return-review-manifest.schema.json`

## 3) Methodology and boundary rules

Use the approved annual-return methodology:

- calendar-year total returns,
- dividends reinvested,
- last-trading-day to last-trading-day endpoints,
- decimal units with four-decimal precision,
- ETF-level returns for ETF presets.

Only completed calendar years are eligible. Exclude current-year partial periods.

Do not treat a checksum match as reviewer authorization. Digest identity and freshness prove exact bytes, not whether attribution/evidence/methodology claims are valid.

## 4) Repository-root command flow

Run from repository root with explicit paths:

```bash
npm run refresh:identify -- --source "$SOURCE_PATH" --manifest "$MANIFEST_PATH"
npm run refresh:dry-run -- --source "$SOURCE_PATH" --manifest "$MANIFEST_PATH" --output-dir "$REVIEWED_CANDIDATES_DIR"
```

Review all three generated artifacts before apply:

- `stocks.json`
- `indices.json`
- `dry-run-report.md`

Apply is a separate command. Preview first, then confirm explicitly:

```bash
npm run refresh:apply -- --source "$SOURCE_PATH" --manifest "$MANIFEST_PATH" --candidates-dir "$REVIEWED_CANDIDATES_DIR"
npm run refresh:apply -- --source "$SOURCE_PATH" --manifest "$MANIFEST_PATH" --candidates-dir "$REVIEWED_CANDIDATES_DIR" --confirm-apply
```

## 5) Pre-apply safeguards

Before invoking confirmed apply:

1. Record current commit:

   ```bash
   PRE_APPLY_COMMIT=$(git rev-parse HEAD)
   ```

2. Check whether either authorized target already has local edits:

   ```bash
   git status --short -- src/data/presets/stocks.json src/data/presets/indices.json
   ```

`refresh:apply` also checks this and refuses to write if a pending target is dirty.

## 6) Post-apply verification

Run the maintenance and build checks:

```bash
npm --prefix . run test:refresh-identify
node --test test/maintenance/historical-returns/schema-contract.test.mjs
npm --prefix . run test:refresh-dry-run
npm --prefix . run test:refresh-apply
node --test test/maintenance/historical-returns/runbook.test.mjs
npm run build
```

## 7) Rollback (path-limited, Git-history based)

Inspect the current diff before any restore:

```bash
git --no-pager diff -- src/data/presets/stocks.json src/data/presets/indices.json
```

Restore **only** the path actually changed by apply:

```bash
CHANGED_PRESET_PATH="src/data/presets/stocks.json"   # or "src/data/presets/indices.json"
git restore --source="$PRE_APPLY_COMMIT" -- "$CHANGED_PRESET_PATH"
```

`CHANGED_PRESET_PATH` must be one of:

- `src/data/presets/stocks.json`
- `src/data/presets/indices.json`

No backup/restore sidecar is provided. Path-limited restore discards current edits on restored paths.

## 8) Explicit exclusions and operational limits

- No provider fetching.
- No raw-price return calculation.
- No browser IndexedDB custom-data access.
- No silent scheduling or unattended updates.
- Run one apply process at a time; concurrent apply is unsupported.
- Cross-file all-or-nothing writes are not guaranteed; interruption can leave a partial two-file result.

## 9) Exception handling

When a reviewed source requires an exception, document:

- affected symbols and years (or metadata field),
- accepted value or policy,
- rationale,
- evidence tied to the selected snapshot.

Keep exceptions source-specific. Historical ledger entries provide context but do not replace review evidence for a new selected snapshot.
