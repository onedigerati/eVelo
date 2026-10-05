---
phase: 01-source-contract-review-governance
plan: "01"
status: complete
subsystem: maintenance
tags: [historical-returns, provenance, node, json-schema]
requires: []
provides:
  - Explicit read-only CSV/JSON snapshot identity and manifest provenance command
  - Draft 2020-12 source and adjacent review-manifest contracts
  - Source preparation and bounded review-governance documentation
affects: [01-02, phase-2-validation, phase-3-apply]
tech-stack:
  added: []
  patterns: [Node ESM built-ins, node:test subprocesses, strict local Ajv 2020 contract tests]
key-files:
  created:
    - scripts/maintenance/historical-returns/identify-source.mjs
    - test/maintenance/historical-returns/identify-source.test.mjs
    - docs/maintenance/historical-returns/schemas/annual-return-source.schema.json
    - docs/maintenance/historical-returns/schemas/annual-return-review-manifest.schema.json
    - test/maintenance/historical-returns/schema-contract.test.mjs
    - docs/maintenance/historical-returns/source-contract.md
  modified: [package.json]
key-decisions:
  - JSON annual records use integer year and numeric return; asset classes match the maintained preset vocabulary.
  - Manifest methodology is a closed structured declaration; exceptions state accepted values or policies as explicit text.
  - Absent unvalidated provenance is visibly listed rather than silently defaulted; identity fields must match.
  - Both supplied and physical paths must form the adjacent source/manifest pair.
requirements-completed: [DATAREF-01, DATAREF-02]
duration: 5min
completed: 2026-10-05
commits: 3
plan_head_before: 7874e64793d728343833826fb4ff3f590d75cd31
plan_head_after: 716e54762c616ba9778fdce90893aa9d10826a15
actuals:
  tokens: 12552.5
  tasks: 3
  commits: 3
---

# Phase 1 Plan 01: Snapshot identity and source contract Summary

Explicit-input SHA-256 identification reports unvalidated manifest provenance without parsing source records or writing data, backed by strict source/manifest contract fixtures.

## Tasks and commits

| Task | Outcome | Commit |
|---|---|---|
| 1. Identity/provenance command | Explicit CSV/JSON paths, byte hashing, adjacent pairing, identity mismatch diagnostics and read-only subprocess coverage | `e703028` |
| 2. Matching schemas | Closed draft 2020-12 contracts, date validation, methodology/scope/exception constraints and exhaustive field mutations | `6cf6615` |
| 3. Maintainer contract | Runnable interface, equivalent CSV/JSON records, manifest fields, review trigger and later-phase boundaries | `716e547` |

`commit_docs` resolved to true. Each task stages only its exact declared artifacts and carries the required Copilot coauthor trailer. No dependencies were installed.

## Verification

- RED: identity subprocess tests failed 10/10 before the command existed; evidence is in the session workspace `files/01-01-red.log`.
- GREEN: `npm --prefix . run test:refresh-identify` passed 10/10.
- `node --test test/maintenance/historical-returns/schema-contract.test.mjs` passed 181/181 with installed Ajv 8.17.1, strict draft 2020 compilation and real calendar-date checks.
- Combined targeted run passed 191/191, with no skips or todos.
- The plan's Task 3 source-contract term assertion passed.
- Task-scoped whitespace check passed. An initial broad whitespace check encountered existing unrelated CRLF/trailing-whitespace changes; these were not edited.
- Subprocess tests compare preset bytes and selected input bytes before/after identification, reject identity and path mismatches, and deliberately accept malformed source records to establish that semantic validation is not performed.
- Schema fixture mutation checks require a valid baseline before each negative mutation and verify validation does not coerce, default or remove properties.

## Decisions and scope

The command exposes calculated and declared digests separately, reports checksum match only on success, and labels all manifest claims unvalidated. Missing nonidentity fields are explicit in `unreportedProvenanceFields`; missing identity fails. Schemas and documentation define future strict behavior without wiring Ajv or source parsing into the command.

Four-place decimals use `multipleOf: 0.0001`; the test validator uses `multipleOfPrecision: 8` solely to accommodate binary floating-point division. Positive fixtures include accepted historical decimal values.

Strict schema/record/symbol/year/finite-value/metadata/coverage validation, deterministic candidates and diffs remain Phase 2; explicit apply remains Phase 3. No fetch, raw-price calculations, preset writes or IndexedDB access were added.

## Deviations from plan

- Strict Ajv compilation initially rejected years-or-metadata branches whose required keys were only defined in the parent. The branches now reference the same local field definitions; strict checking was not weakened.
- An initial valid digest fixture was too long; it was corrected to an explicit 64-character lowercase mixed alphanumeric digest, and each mutation now verifies its baseline independently.
- Runtime permissions denied the global workflow, summary-template and canonical TDD-reference reads. Their contents were not accessed through another route. Execution used the provided executor contract and on-disk plans; tests followed RED then GREEN with one verified task commit. No subagent tool was available, so plans are executed sequentially as requested.
- Per the user's exact-artifact scope, pre-existing dirty STATE.md, ROADMAP.md, REQUIREMENTS.md and config files are deliberately not modified or staged. Plan completion is recorded in this summary, not in those shared pointers.

## Known stubs and threat review

No blocking stubs, skipped tests or unrun task verifiers. Documentation examples are explicitly illustrative, not approved source data. The command adds only explicit local file reads and stdout/stderr output already covered by T-01/T-02/T-05; it introduces no network, authentication, storage-schema or apply surface.

## Self-Check: PASSED

All seven declared task artifacts exist. Commits `e703028`, `6cf6615` and `716e547` are ancestors of HEAD. The measured three-task-commit ledger and realized diff (50,210 characters / 4) are recorded above. Historical ledger work proceeds in 01-02.
