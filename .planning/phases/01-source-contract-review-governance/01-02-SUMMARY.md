---
phase: 01-source-contract-review-governance
plan: "02"
status: complete
subsystem: maintenance
tags: [historical-returns, exceptions, provenance, review-governance]
requires:
  - phase: 01-01
    provides: Source contract, manifest schema and bounded identity command
provides:
  - Individually evidenced inventory of 28 inherited coverage, value, methodology and file decisions
  - Source-contract linkage requiring independent new-snapshot exception provenance
affects: [phase-2-validation, phase-3-apply]
tech-stack:
  added: []
  patterns: [Repository-relative archived evidence links, stable decision IDs]
key-files:
  created: [docs/maintenance/historical-returns/verified-exception-ledger.md]
  modified: [docs/maintenance/historical-returns/source-contract.md]
key-decisions:
  - Final archived run 3 decisions and applied corrections supersede preliminary AGG basis findings and pending ETN wording.
  - Archived evidence is not a checksum of unavailable original provider bytes; each selected new snapshot needs its own manifest and exact-byte hash.
requirements-completed: [DATAREF-02, DATAREF-03]
duration: 3min
completed: 2026-10-05
commits: 2
plan_head_before: 166a9a696616dc9accabdc4dc6a2ecab7282c231
plan_head_after: c6d4e35fd6812f58c98ae2c1c69527ce9c43500a
actuals:
  tokens: 4164.25
  tasks: 2
  commits: 2
---

# Phase 1 Plan 02: Verified historical exception ledger Summary

Twenty-eight individually cited historical decisions preserve approved coverage, adjustments and methodology while requiring independent provenance for each newly reviewed source.

## Tasks and commits

| Task | Outcome | Commit |
|---|---|---|
| 1. Preserve verified decisions | Stable six-column inventory with each row's own rationale and local archived evidence; richer decision explanations alongside the table | `8331d20` |
| 2. Link new-source review | Contract links the ledger and separates inherited context from selected-source exceptions, reviewer/date and exact-byte SHA-256 | `c6d4e35` |

`commit_docs` is enabled. Each task stages only its exact declared document and includes the required Copilot coauthor trailer.

## Preserved decisions

All fourteen specified first-full-calendar-year boundaries plus DELL Class C 2019 are recorded. The ledger distinguishes DVMT tracking-stock history from the current DELL security. It preserves AVGO 2018 `0.0218`, ETN 2001 `0.1681` and 2018 `-0.1004`, AGG NAV 2008 `0.0588` and 2009 `0.0514`, and GLD's `Gold (GLD)` display label.

D-05/D-06/D-07 govern reinvested calendar-year total returns, preceding-to-current last-trading-day endpoints, decimal four-place storage, the intentional 1995 correlation window and ETF-level rather than index returns. The retained unimported sp500.json and synchronized QQQ duplicate remain explicit historical file decisions, not deletion permission.

The richer narrative preserves the Yahoo dividend artifact for AVGO, Axcelis spin-off and dividend adjustment rationales for ETN, and the crisis premium/unwind explanation behind AGG's NAV exception. It distinguishes earlier AGG `computed_right` market-price findings from the later explicit NAV policy approval. ETN's detailed run 2 evidence is linked separately because it is not present in the earlier keyed verification_results.json.

## Verification

- The original Plan 02 Task 1 verifier passed in the execution workspace before evidence sanitization: all 28 required ID/subject/year-or-field/value tuples and decision-specific rationales were checked against the raw archive. That archive was not committed; after the user approved sanitized evidence instead of importing it, the final ledger links each row to the corresponding section of the committed historical-evidence record.
- Rechecked the final sanitized ledger's 28 unique decision IDs, six-column rows, nonempty rationale fields, and per-row local evidence links to the sanitized record.
- Ran the exact Task 2 provenance-link term assertion successfully.
- Rechecked the Plan 01 source-contract term assertion after linkage.
- Combined identity and schema tests passed 209/209 with no skips or todos (11 identity tests and 198 schema-contract tests).
- Actual `npm run refresh:identify -- --source ... --manifest ...` entry point succeeded for separately selected CSV and JSON fixtures. Temporary fixtures were removed.
- Scoped whitespace checks passed, and both task commits are ancestors of HEAD.
- Compared the final `git diff --binary` with the captured pre-execution baseline: all pre-existing tracked dirty-file changes are byte-for-byte unchanged. Preset-byte immutability is additionally asserted by subprocess tests.
- Inspected ledger decisions against archived state, corrections.json and the applicable earlier verification records; no asset verification, provider fetch or return calculation was repeated.

## Deviations from plan

After execution, the user approved a sanitized evidence record instead of
importing the untracked raw quick-task archive. The plan's original per-row
links to `STATE.md` and `corrections.json` were therefore superseded by links
from each ledger row to the matching section of
`historical-evidence.md`, which preserves cited sources and decision rationales
while explicitly disclosing that raw snapshots, per-asset verification files,
and historical source-byte checksums are unavailable. The raw archive was not
committed; no such files or checksums are claimed. Plan 01-02's key-link and
verification criteria were updated to record and validate this approved
substitute.

An optional deeper ETN archive read initially encountered its existing UTF-8
BOM; the read-only inspection handled that BOM without altering any archive
bytes.

As in 01-01, the user's narrow-artifact scope takes precedence over general state-update workflow steps: existing dirty STATE.md, ROADMAP.md, REQUIREMENTS.md and config remain untouched and unstaged. Completion is recorded in the two new summaries. Global workflow/template reference reads were permission-blocked earlier; no bypass was attempted.

## Remaining boundaries

No implementation blockers. Shared planning pointers still reflect their pre-execution state by design and will need a separately authorized metadata update. Semantic validation, coverage checks, deterministic dry-run generation/diff and explicit apply remain later-phase work, not delivered by the Phase 1 command.

No blocking stubs, skipped tests, unrun task verifiers or new security surfaces. Documentation uses local evidence references only and does not fabricate source-snapshot hashes.

## Self-Check: PASSED

Both declared task artifacts exist. Commits `8331d20` and `c6d4e35` are ancestors of HEAD. The measured two-task-commit ledger and realized diff (16,657 characters / 4) are recorded above. Plan 01's summary is present and its three task commits remain in history.
