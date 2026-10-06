# Phase 1 Multi-Source Coverage Audit

| Source | ID | Feature / decision | Plan | Status | Notes |
|---|---|---|---|---|---|
| GOAL | — | Maintainers and reviewers share a clear, auditable reviewed annual-return source contract | 01-01, 01-02 | COVERED | The runnable identity command, normative contract/schemas, and preserved exception ledger provide the reviewable source and provenance path. |
| GOAL | SC-1 | A maintainer can run a repository-local command against explicitly selected reviewed CSV or JSON snapshots with annual returns and asset metadata | 01-01 | COVERED | `refresh:identify` requires explicit source and adjacent manifest paths, accepts CSV/JSON, reports exact-byte identity and provenance, and clearly does not claim semantic validation. |
| GOAL | SC-2 | A reviewer can determine the return convention, period coverage, completed-year rule, units, precision, and known exceptions from documented rules traceable to the reviewed source | 01-01, 01-02 | COVERED | Contract, schemas, and historical exception ledger preserve methodology, coverage and rationale. |
| GOAL | SC-3 | A reviewer can trace attribution, snapshot identity/checksum, methodology, covered period, and rationale for every approved exception | 01-01, 01-02 | COVERED | Command and manifest contract expose snapshot/provenance identity; ledger retains evidence and exception rationale. |
| REQ | DATAREF-01 | Run repository-local command against explicitly reviewed CSV/JSON snapshots containing annual returns and asset metadata | 01-01 | COVERED | The command requires both `--source` and `--manifest`, reads the selected CSV/JSON snapshot and manifest, reports exact-byte SHA-256 and provenance, and disclaims semantic validation. The schema verification gate asserts the required source `assets`/asset-record fields and required manifest provenance keys rather than only parsing JSON. |
| REQ | DATAREF-02 | Document accepted convention, coverage, completed-year policy, units, precision, and exceptions traceable to reviewed source | 01-01, 01-02 | COVERED | Contract/schema state the policies; ledger preserves the prior reviewed decisions and evidence references. |
| REQ | DATAREF-03 | Record source attribution, snapshot identity/checksum, methodology, covered period, and exception rationale | 01-01, 01-02 | COVERED | Adjacent manifest schema requires exact-byte SHA-256, attribution, methodology, period, reviewer/date, scope, and exception evidence/rationale. |
| RESEARCH | — | Explicit reviewed CSV/JSON files; no live provider acquisition | 01-01 | COVERED | Explicit paths and both formats are part of the source contract; phase tasks add no acquisition behavior. |
| RESEARCH | — | Provenance, methodology, corrections, and source ledger | 01-01, 01-02 | COVERED | Manifest contract plus historical exception ledger. |
| RESEARCH | — | Strict rejection of ambiguous/missing facts and no heuristic filling | 01-01 | COVERED | Contract states fail-closed policy for future validator implementation. |
| RESEARCH | — | Keep bundled presets separate from IndexedDB custom overrides | 01-01 | COVERED | Ownership boundary is stated in source contract. |
| RESEARCH | — | Preserve historical decisions, including asset-specific exceptions and old fetch artifact's non-contract status | 01-02 | COVERED | Ledger cites archived verification and corrections; does not adopt the fetch script. |
| RESEARCH | — | Preserve the `sp500.json` follow-up and prior QQQ duplicate decision | 01-02 | COVERED | Ledger records the pending deletion approval and synchronized duplicate decision from the archived state. |
| RESEARCH | — | State a human-initiated refresh/review cadence without scheduled retrieval | 01-01, 01-02 | COVERED | Contract ties review to a newly completed year or material source correction; no automatic schedule. |
| CONTEXT | D-01 | Explicitly selected CSV/JSON snapshot with required adjacent JSON manifest | 01-01 | COVERED | Source pairing and filename convention are specified. |
| CONTEXT | D-02 | Exact-byte SHA-256 and full provenance/review record | 01-01, 01-02 | COVERED | Manifest schema and exception traceability. |
| CONTEXT | D-03 | Complete bundled coverage by default; explicitly declared subsets | 01-01 | COVERED | Manifest asset-scope mode and subset symbol/rationale requirements. |
| CONTEXT | D-04 | Completed calendar years only; no silent repair or inference | 01-01 | COVERED | Source contract documents these rules. |
| CONTEXT | D-05 | Reinvested calendar-year total returns, last-trading-day boundaries, decimal/four-place precision | 01-01, 01-02 | COVERED | Contract and exception ledger preserve exact methodology. |
| CONTEXT | D-06 | Preserve completed verification decisions; no repeat verification or active old fetch contract | 01-02 | COVERED | Ledger records known decisions and cites the archived record without recalculation/fetch. |
| CONTEXT | D-07 | ETF-level returns rather than index total-return substitutions | 01-01, 01-02 | COVERED | Contract and ledger preserve this rule. |

## Resolved Scope and Phase Boundary

The current `01-CONTEXT.md` resolves the earlier scope decision by explicitly including a minimal, runnable Phase 1 identity/provenance command with explicit source and manifest paths. The Phase 1 command reads and identifies selected CSV/JSON snapshot bytes and the adjacent manifest, reports the exact-byte SHA-256 identity and provenance summary, and does not claim semantic validation. DATAREF-01 and roadmap success criterion 1 are therefore covered by plan 01-01.

Strict schema, symbol, period, finite-value, metadata, and coverage validation, deterministic candidate generation and diff remain Phase 2 work. Explicit apply remains Phase 3 work. This scope does not include provider fetching or raw-price calculations. The existing contract/schema work in 01-01 and historical exception ledger in 01-02 remain in the plan set.
