# Phase 2 Discussion Log

**Phase:** 2 — Deterministic Validation & Dry-Run Diff
**Gathered:** 2026-10-06

The user accepted the recommended answer set for each area.

## Validation & diagnostics

| Question | Selected answer | Other option |
|---|---|---|
| What happens when blocking validation errors exist? | Write the complete report, create no candidates, and exit nonzero. | Partial candidates for valid assets. |
| How should validation errors be collected? | Aggregate all independently detectable errors in deterministic order with file, row, symbol, year, and field context. | Stop at the first error. |
| How should statistically unusual but valid returns be handled? | Keep the existing app's -90% and +300% thresholds as nonblocking warnings; do not reuse the looser importer as the validator. | Objective contract checks only, with no outlier warnings. |
| What happens when input has warnings but no errors? | Generate candidates and exit successfully, with warnings clearly marked. | Require a manual override before candidate creation. |

## Coverage & change handling

| Question | Selected answer | Other option |
|---|---|---|
| How should a valid new symbol absent from the bundle be handled? | Show it as an added asset in the diff and candidate; Phase 2 never applies it. | Treat every non-bundled symbol as blocking. |
| How should a newly completed year after the bundled end be handled? | Include it as an added period in the candidate and diff. | Require a separate exception before inclusion. |
| How should a previously covered year missing from a symbol be handled? | Report the removal, fail coverage, and create no candidate without a future explicit removal policy. | Permit removal when the reviewed source omits it. |
| How should reviewed name or asset-class changes be handled? | Carry the source value into the candidate and show an explicit metadata change; do not normalize it. | Block until the manifest contains a specific metadata exception. |

## Candidate & report outputs

| Question | Selected answer | Other option |
|---|---|---|
| How should candidate files be organized? | Mirror the bundled `stocks.json` and `indices.json` shapes in the selected output directory. | Emit one combined canonical candidate JSON. |
| How should the output directory be selected? | Require an explicit `--output-dir` and reject destinations inside `src/data/presets`. | Use a fixed default directory and add it to `.gitignore`. |
| How should the diff be delivered? | Write a deterministic Markdown report and candidate JSON files; print concise status and paths to stdout. | Print the entire diff to stdout, with no report file. |
| What if candidate output files already exist? | Refuse to overwrite existing target files; require a clean output directory. | Replace only exact filenames owned by the tool. |

## Discussion fallback

The canonical GSD discussion-log template was inaccessible during this session.
This human-reference log records the complete questions, selections, and
alternatives from the saved discussion checkpoint without reading or bypassing
the denied template.

## Follow-up decisions

Research exposed four implementation choices not settled in the initial
discussion. The user accepted the recommended fail-closed/full-candidate
defaults:

| Question | Selected answer |
|---|---|
| How should genuinely new symbols be assigned to `stocks.json` or `indices.json`? | Require an explicit reviewed partition decision; never infer from `assetClass`. Preserve known memberships, including QQQ's duplicate. |
| What should subset candidates contain? | Full merged preset files: overlay reviewed records and preserve all out-of-scope bundled records unchanged. |
| How should a clean output directory be interpreted? | It may be absent (create it) or empty; reject any existing entries. |
| How should subset scope claims be checked? | Require exact equality between declared symbols and source symbols, and between declared covered years and unique source years. |
