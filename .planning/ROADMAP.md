# Roadmap: eVelo

## Overview

The v1.0 Historical Data Refresh Workflow productizes the existing reviewed historical-return work into a repeatable maintainer process. It starts by defining an explicit source and provenance contract, then validates reviewed inputs and generates deterministic dry-run candidates and complete diffs, and finishes with narrow, explicit application, regression verification, and a practical runbook. The workflow consumes reviewed annual-return CSV/JSON files only: it does not fetch provider data or redo the completed 45-asset verification.

## Milestones

- 🚧 **v1.0 Historical Data Refresh Workflow** — Planning

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Source Contract & Review Governance** - Define reviewed annual-return inputs, methodology, coverage policy, and traceable provenance. (completed 2026-10-05)
- [x] **Phase 2: Deterministic Validation & Dry-Run Diff** - Reject invalid or incomplete data and produce deterministic candidates and a complete non-mutating report. (completed 2026-10-06)
- [x] **Phase 3: Gated Apply & Maintenance** - Apply reviewed candidates narrowly, verify compatibility, and document the repeatable maintenance and rollback workflow. (completed 2026-10-06)

## Phase Details

### Phase 1: Source Contract & Review Governance

**Goal**: Maintainers and reviewers share a clear, auditable contract for preparing and approving annual-return source snapshots.
**Depends on**: Nothing (first phase)
**Requirements**: DATAREF-01, DATAREF-02, DATAREF-03
**Success Criteria** (what must be TRUE):
  1. A maintainer can run a repository-local command against explicitly selected reviewed CSV or JSON snapshots containing annual returns and asset metadata, without relying on implicit source discovery or provider fetching.
  2. A reviewer can determine the accepted return convention, period coverage, completed-calendar-year rule, units, precision, and known exceptions from documented rules traceable to the reviewed source.
  3. A reviewer can trace source attribution, snapshot identity and checksum, methodology, covered period, and the rationale for every approved exception.

**Plans:** 2/2 plans complete

Plans:
- [x] 01-01-PLAN.md — Runnable snapshot identity command, source contract, and schemas
- [x] 01-02-PLAN.md — Historical methodology and exception ledger

### Phase 2: Deterministic Validation & Dry-Run Diff

**Goal**: Maintainers can see exactly what a reviewed source would change without modifying bundled presets.
**Depends on**: Phase 1
**Requirements**: DATAREF-04, DATAREF-05, DATAREF-06
**Success Criteria** (what must be TRUE):
  1. Invalid schemas, symbols, duplicate periods, non-finite returns, missing metadata, and ambiguous inputs fail closed without silent correction or gap filling.
  2. A default dry run checks the complete bundled asset set and reports missing or unexpected assets and periods; a subset is accepted only when its scope is explicitly declared and the report identifies it.
  3. Repeating a dry run with the same reviewed inputs produces the same candidate preset files outside `src/data/presets` and a complete human-readable report of added, removed, and changed assets and periods, while leaving bundled presets untouched.

**Plans**: 4/4 plans complete
- [x] 02-01-PLAN.md
- [x] 02-02-PLAN.md
- [x] 02-03-PLAN.md
- [x] 02-04-PLAN.md

### Phase 3: Gated Apply & Maintenance

**Goal**: Maintainers can safely promote a reviewed candidate into the bundled baseline and verify, maintain, or roll back the result.
**Depends on**: Phase 2
**Requirements**: DATAREF-07, DATAREF-08, DATAREF-09
**Success Criteria** (what must be TRUE):
  1. A maintainer must explicitly request apply after validation and review; applying changes only the declared bundled preset files and never changes browser-stored custom overrides.
  2. From a normal repository checkout, a maintainer can run regression checks for malformed inputs, coverage, determinism, and compatibility with the preset data shape without machine-specific absolute paths.
  3. A maintainer can follow the runbook to prepare and review sources, apply and verify updates, document exceptions, and restore the prior bundled data; the process neither fetches provider data nor schedules silent updates.

**Plans:** 3/3 plans complete

Plans:
**Wave 1**
- [x] 03-01-PLAN.md — Freshness-gated explicit apply CLI and isolated end-to-end tracer

**Wave 2** *(blocked on Wave 1 completion)*
- [x] 03-02-PLAN.md — Fail-closed apply checks, preset compatibility, and regression coverage
- [x] 03-03-PLAN.md — Tested maintainer runbook for review, apply, verification, and rollback

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Source Contract & Review Governance | 2/2 | Complete    | 2026-10-05 |
| 2. Deterministic Validation & Dry-Run Diff | 4/4 | Complete    | 2026-10-06 |
| 3. Gated Apply & Maintenance | 3/3 | Complete    | 2026-10-06 |
