# Requirements: Historical Data Refresh Workflow

**Milestone:** v1.0
**Defined:** 2026-10-05
**Core Value:** Make future updates to eVelo's bundled historical returns repeatable, deterministic, and reviewable.

## v1.0 Requirements

### Reviewed Source Data

- [x] **DATAREF-01**: Maintainer can run a repository-local command against explicit reviewed CSV or JSON snapshots containing annual returns and asset metadata.
- [x] **DATAREF-02**: The accepted annual-return convention, period coverage, full-calendar-year policy, units, precision, and known exceptions are documented and traceable to the reviewed source.
- [x] **DATAREF-03**: Maintainer can record source attribution, snapshot identity and checksum, methodology, covered period, and rationale for any approved exception in reviewable provenance.

### Validation and Preview

- [x] **DATAREF-04**: The refresh tool validates schema, symbols, unique periods, finite return values, and required metadata, and fails closed on malformed or ambiguous input without silently filling or correcting data.
- [x] **DATAREF-05**: The default dry run checks the complete bundled asset set, reports missing or unexpected assets and periods, and allows a subset only when the maintainer explicitly identifies its scope.
- [x] **DATAREF-06**: The dry run produces deterministic candidate preset files outside the tracked preset directory and a complete human-readable report of added, removed, and changed assets and periods without modifying bundled presets.

### Apply and Maintenance

- [x] **DATAREF-07**: Maintainer can explicitly apply a successfully validated and reviewed candidate, and the operation changes only the declared bundled preset files, never browser-stored custom overrides.
- [x] **DATAREF-08**: The workflow is runnable from a normal repository checkout without machine-specific absolute paths and has regression tests for malformed input, coverage, determinism, and compatibility with the preset data shape.
- [x] **DATAREF-09**: A maintainer runbook explains source preparation, return methodology, refresh cadence, review and apply steps, verification, exceptions, and rollback; the workflow does not fetch provider data or schedule silent updates.

## Future Requirements

- Direct retrieval from market-data provider APIs.
- Scheduled refreshes or unattended preset updates.
- Calculation of annual returns from raw adjusted-price observations inside the refresh tool.

## Out of Scope

- Updating or overwriting user-imported IndexedDB custom data.
- Live market-data feeds or automatic source acquisition.
- Re-running the already documented 45-asset verification from scratch as part of this milestone.

## Traceability

| Requirement | Phase |
|-------------|-------|
| DATAREF-01 | Phase 1 |
| DATAREF-02 | Phase 1 |
| DATAREF-03 | Phase 1 |
| DATAREF-04 | Phase 2 |
| DATAREF-05 | Phase 2 |
| DATAREF-06 | Phase 2 |
| DATAREF-07 | Phase 3 |
| DATAREF-08 | Phase 3 |
| DATAREF-09 | Phase 3 |

---
*Requirements defined: 2026-10-05*
