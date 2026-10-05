# Feature Landscape

**Domain:** Repeatable reviewed-file updates to bundled historical asset return presets
**Project:** eVelo Portfolio Strategy Simulator
**Researched:** 2026-10-05
**Confidence:** MEDIUM-HIGH (high confidence on eVelo's current data boundaries; recommendations are workflow design judgments)

## Executive Summary

Treat bundled return presets as maintained source data, not as ordinary user-imported market data. The maintainer should be able to provide a provider-neutral CSV or JSON file, generate a candidate update without changing tracked files, inspect an exact old-versus-new diff and validation report, and then explicitly apply a complete reviewed update. The workflow must not require a network connection or assume a particular quote/data API.

The repository already has useful building blocks for browser-side bulk imports: CSV/JSON parsing, asset-level validation, templates, and bulk export (`src/data/services/bulk-import-service.ts`, `src/data/validation/data-validator.ts`, `src/data/formats/bulk-format-templates.ts`, `src/data/services/bulk-export-service.ts`). Those features serve app users' custom data. The bundled presets are a separate trust boundary: checked-in JSON under `src/data/presets/` is imported synchronously by `src/data/services/preset-service.ts`, while user custom data can take precedence at runtime. A maintainer workflow should change the checked-in baseline only, and should not accidentally treat an IndexedDB override or an export of “effective” data as canonical input.

The highest-value differentiator is an auditable, deterministic review loop: strict validation, no-write dry-run by default, per-asset/per-year diffs, an explicit apply step, provenance, and a retained report. Statistical checks can identify suspicious entries but cannot establish that a historical return is factually correct; retain human review for methodology choices and source disagreements.

## Table Stakes

Features users and maintainers need for a safe, repeatable update:

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Provider-neutral CSV and JSON input | Maintainers may obtain source data through different vendors or manual research; tying the workflow to one provider constrains updates and reproducibility. | Medium | Accept files as input; do not fetch from an API. Define one documented schema for each format, with canonical symbols, asset class, year, and decimal annual return. |
| Downloadable / checked-in format examples | Avoids guesswork about headers, JSON shape, return units, and expected asset identifiers. | Low | Reuse or align with the existing templates in `src/data/formats/bulk-format-templates.ts`; distinguish a sample/template from authoritative data. |
| Strict syntax and semantic validation | A syntactically readable file can still be incomplete or unsafe to apply. | Medium | Reject invalid numbers, duplicate symbol/year pairs, non-finite values, malformed years, missing series, unknown symbols unless explicitly allowed, conflicting metadata, and ambiguous units. Report row/asset locations. |
| Whole-batch integrity checks | A single valid row or asset does not prove a complete, consistent update. | Medium | Check expected asset coverage, unique symbols and years, chronological ordering, deliberate gaps, date range, and that every bundled file/output target is accounted for. Do not silently omit invalid assets. |
| Dry-run as the default | Maintainers must be able to examine proposed changes without mutating the repository. | Low-Medium | Parse, validate, generate candidate files in a temporary/output location, and exit without modifying `src/data/presets/`. Applying changes must require a separate explicit action. |
| Reviewable before/after diff | Numeric changes across long return histories are easy to miss in a wholesale JSON rewrite. | Medium | Show additions, removals, changed values, changed metadata, and year-range shifts by symbol and year. Format percentages and absolute percentage-point deltas clearly; provide both concise summary and detailed rows. |
| Safe explicit apply and rollback | A rejected or incorrect update must not leave a mixed baseline. | Medium | Apply only a validated candidate after review; prefer all-or-nothing writes across the target bundle. Keep generated data under version control so existing Git review/history can serve as the audit and recovery mechanism. |
| Provenance and methodology fields | Historical return values depend on source, total-return convention, period boundaries, and corrections—not just a ticker and number. | Medium | Record provider/source citation, source as-of/retrieval date, return convention (e.g., calendar-year total return), units/precision, input-file hash, workflow version/command, and rationale for overrides. Preserve per-symbol exceptions rather than silently blending conventions. |
| Human-readable and machine-readable report | Reviewers need a skim-friendly decision artifact and maintainers need a stable record that can be compared or processed. | Low-Medium | Emit a readable Markdown or text report plus structured JSON summary. Include input/output hashes, timestamp, assets/years changed, unchanged, added/removed, errors/warnings, and apply status. |
| Explicit separation from user custom data | The runtime deliberately allows custom data to override bundled defaults. | Medium | Scope the maintainer tool to repository files. `getEffectiveData()` in `src/data/services/preset-service.ts` prioritizes custom data; avoid using `exportAllToJson()` in `src/data/services/bulk-export-service.ts` as a source-of-truth export without first separating bundled from custom data. |
| Documented maintenance cadence | Data can become stale, but indiscriminate refreshes create noise and incomplete periods can be mistaken for final annual data. | Low | Recommend review after the latest full calendar year is available and separately when a verified material correction is found. Do not auto-refresh on a timer or include a partial current year by default. |

## Differentiators

Valuable additions beyond a basic import-and-overwrite script:

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Reproducible candidate generation | The same input and workflow version produce byte-stable candidate files and make irrelevant formatting churn obvious. | Medium | Normalize symbol ordering, year ordering, numeric precision, and line endings; avoid timestamps inside generated preset data. Keep run timestamps in the report/manifest instead. |
| Coverage and anomaly dashboard in the report | Lets reviewers focus on meaningful changes instead of reading every row. | Medium | Surface new/missing tail years, unusually large return changes, long series shifts, and changes to start/end years. Label statistical outliers as warnings, not facts or automatic rejection. |
| Per-asset evidence and exception ledger | Financial data often has convention edge cases; reviewers can understand why a value differs from the bulk source. | Medium-High | Capture a short rationale and source reference for manual corrections, corporate actions, inception boundaries, or non-standard return conventions. Avoid unannotated one-off overrides. |
| Baseline-aware intent summary | Prevents users from confusing “file parsed” with “all expected bundled assets updated.” | Medium | State whether the input is a complete replacement or an explicit subset. For full refreshes, fail if expected symbols are missing; for intentional subset updates, require explicit scope and report untouched assets. |
| CI verification of generated data | Prevents malformed bundles from reaching builds after a reviewed update. | Medium | Run schema/coverage checks and app tests/build against the generated candidate or committed files. Keep external-data retrieval and source research out of CI. |
| Update packet for review | Provides one compact artifact bundle to share between a data preparer and reviewer. | Medium | Include the proposed diff, validation report, provenance manifest, and input checksum; separate preparer from approver where the project's review process supports it. |

## Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Automatically fetch from a vendor API or scrape data during apply | The requested workflow is file-based and provider-neutral; network availability, API changes, and provider-specific adjustments undermine repeatability and make review harder. | Accept prepared CSV/JSON files. Keep any future acquisition step separate and optional. |
| One-step import that immediately overwrites bundled JSON | Removes the review boundary and makes accidental data corruption costly to diagnose. | Dry-run, inspect diff/report, then explicitly apply. |
| Silent partial success or implicit skip behavior | The output can appear complete while omitting a failed asset or malformed year. | Fail the batch by default; require intentional subset scope and make all skipped/rejected items explicit. |
| Guessing units, filling missing history, or fabricating returns | Heuristics can silently change meaning; proxy or interpolated returns can bias simulation inputs. | Require an explicit documented convention and year coverage. Keep intentionally absent years absent unless a reviewer explicitly approves a documented methodology. |
| Treating outlier checks as proof of truth | Plausible-looking values may be wrong, and true crash-year values can look anomalous. | Use statistical checks to focus human review; validate provenance and methodology independently. |
| Unexplained rounding or normalization | Changing decimal/percent representation or precision can produce large errors or meaningless diffs. | State the input unit, preserve the declared precision policy, reject ambiguous input, and report rounding differences. |
| Mixing app-user custom data into the committed baseline | User overrides have different ownership and persistence; exporting effective data can fold personal data into bundled presets. | Keep repository maintenance separate from browser import/export and operate only on the bundled baseline. |
| Frequent automatic “latest” updates or partial-year bundles | Increases churn without guaranteeing accuracy and may mix complete and incomplete periods. | Use an explicit review cadence based on complete periods and verified corrections. |
| Rewriting all data files with unstable formatting | Creates noisy diffs that obscure the actual economic changes. | Deterministic ordering and formatting; report semantic changes separately from serialization changes. |

## Feature Dependencies

```text
CSV/JSON schema + format guidance
    → parse file
    → validate syntax, values, coverage, and scope
    → construct candidate bundle (no writes)
    → generate per-asset/per-year diff + report + provenance
    → maintainer review/approval
    → explicit all-or-nothing apply to src/data/presets/
    → validation/build/tests on committed baseline
    → Git review history and rollback
```

Provenance and an explicit return methodology should be defined alongside the file schema, before relying on diff or anomaly features. Diff generation depends on validated candidate data. Apply must depend on a successful dry-run and an affirmative review decision. The cadence governs when to start a refresh, not whether a particular update is trustworthy.

## MVP Recommendation

Prioritize:

1. **Provider-neutral CSV and JSON files** with a documented schema, decimal-return convention, year format, metadata, and explicit full-refresh versus subset scope.
2. **Fail-closed validation and a no-write dry-run** with asset/coverage checks and actionable row-level errors and warnings.
3. **Review packet before apply:** exact per-symbol/per-year diff, summary report, provenance/hash manifest, and separate explicit apply that updates only committed bundled presets.
4. **Repeatable maintenance checklist:** update after complete-year data is ready or a verified correction arises; capture return methodology and exception rationale; run bundle validation/build checks; review and retain the report with the change.

Defer: automatic provider/API acquisition (not required and conflicts with the provider-neutral file boundary); a scheduled refresh bot (adds churn without replacing source verification); automated “correction” or gap filling; and a complex multi-reviewer approval service. Git-based review is sufficient for the initial maintainer workflow.

## eVelo-Specific Context

- `src/data/presets/stocks.json`, `src/data/presets/indices.json`, and `src/data/presets/sp500.json` are bundled data candidates. `src/data/services/preset-service.ts` statically imports stocks and indices and types the runtime preset model.
- `src/data/services/bulk-import-service.ts` and `src/data/validation/data-validator.ts` parse and validate app-level bulk input; `src/components/ui/historical-data-viewer.ts` is the user-facing view/import workflow. These are related precedents, but do not by themselves implement a maintainer-side reviewed file-to-repository workflow.
- `src/data/services/bulk-export-service.ts` calls `getEffectiveData()`, which can return custom user data in preference to bundled data. This behavior makes a clear bundled-only source boundary a table-stakes safety feature.
- `.planning/quick/021-refresh-preset-asset-data/STATE.md` documents a recent refresh exercise with separate computed returns, correction inputs, a dry-run output, a diff report, explicit `--apply`, and build/smoke verification. It also records significant source/methodology edge cases and fabricated or misaligned historical entries discovered during review. This supports retaining an evidence-and-correction ledger; it is not evidence that raw API acquisition should be part of the requested workflow.
- Existing annual preset entries are consumed as simulation inputs (`src/calculations/return-probabilities.ts` and `src/data/services/preset-service.ts`), so errors can affect simulation results. Preserve their annual-return semantics and don't conflate data-format validation with validation of financial truth.

## Sources

- **Repository (high confidence; directly inspected):** `.planning/STATE.md` (Phase 33 scope: bulk import/export, format guidance, asset-class support, reset and preview); `.planning/ROADMAP.md` (Phase 32/33 goals); `.planning/quick/021-refresh-preset-asset-data/STATE.md` (refresh decisions and review history); `src/data/services/preset-service.ts`; `src/data/services/bulk-import-service.ts`; `src/data/services/bulk-export-service.ts`; `src/data/validation/data-validator.ts`; `src/data/formats/bulk-format-templates.ts`; `src/components/ui/historical-data-viewer.ts`; `src/data/presets/`.
- **RFC 4180, Common Format and MIME Type for CSV Files** (MEDIUM confidence, verified from the IETF RFC text): https://www.rfc-editor.org/rfc/rfc4180 — CSV's common interchange rules include consistent field counts and quoting/escaping for delimiters, line breaks, and quotes; RFC 4180 is informational and recognizes implementation variation.
- **RFC 8259, The JavaScript Object Notation (JSON) Data Interchange Format** (MEDIUM confidence, verified from the IETF RFC text): https://www.rfc-editor.org/rfc/rfc8259 — JSON is a language-independent interchange format; unique object member names are important for interoperable interpretation. Use explicit versioning and strict schema validation for the workflow's JSON envelope.
- **Git `diff` documentation** (MEDIUM confidence, official documentation inspected): https://git-scm.com/docs/git-diff — supports repository-native review of candidate changes.
- **Git `revert` documentation** (MEDIUM confidence, official documentation inspected): https://git-scm.com/docs/git-revert — supports preserving a reviewed correction as history rather than relying on destructive in-place recovery.
