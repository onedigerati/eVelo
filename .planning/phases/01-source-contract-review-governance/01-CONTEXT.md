# Phase 1: Source Contract & Review Governance - Context

**Gathered:** 2026-10-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Define and document the reviewed annual-return source contract and review governance for the maintainer refresh workflow, and provide a minimal runnable repository-local command that accepts explicitly selected CSV or JSON snapshots with asset metadata and their review manifest. This phase does not implement semantic validation or coverage checks, dry-run candidate generation, apply, provider fetching, or raw-price calculations.

</domain>

<decisions>
## Implementation Decisions

### Snapshot and provenance
- Keep source data in the explicitly selected CSV or JSON snapshot and record review metadata in a required, adjacent JSON manifest. Do not embed metadata in CSV comments or depend on implicit directory discovery.
- Identify the exact reviewed snapshot with a SHA-256 checksum over its source bytes; record the filename/identity and attribution in the manifest so reviewers can match the manifest to the input.
- Record methodology, return convention, units, precision, covered calendar years, asset scope, reviewer and review date, and known exceptions with rationale. Exceptions must be explicit and traceable to the reviewed source.
- Phase 1's command must require explicit source and manifest paths and be runnable from the repository. It may read the selected files and report their identity/provenance, but it must not claim the data is semantically validated or generate/apply presets.

### Coverage and periods
- Require complete bundled-asset coverage by default. A subset is acceptable only when its symbols and scope are explicitly declared and reported.
- Include completed calendar years only; do not include partial current-year returns.
- Do not silently fill gaps, normalize ambiguous values, or infer metadata; missing or ambiguous source facts require correction or an explicitly reviewed exception.

### Methodology and historical decisions
- Preserve the established reviewed methodology: calendar-year total returns with dividends reinvested, computed last-trading-day to last-trading-day, represented as decimal returns and stored at four decimal places.
- Retain the documented asset-specific decisions and exceptions from the completed 45-asset verification; do not repeat that verification or treat the old provider-fetch script as the new contract.
- Keep ETF-level returns for ETF presets rather than substituting index total-return series.

### the agent's Discretion
- Choose exact manifest key names and CSV/JSON field spelling during planning, provided both formats express the same contract and validation remains explicit and fail-closed.
- Choose a minimal command name, source summary output, and repository-local source-documentation location consistent with existing project conventions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing preset shape and loading behavior are in `src/data/services/preset-service.ts` and `src/data/presets/`.
- CSV parsing and validation precedents are available in `src/data/validation/data-validator.ts`; Papa Parse is already installed.

### Established Patterns
- Maintainer tooling can use the repository's Node ESM environment (`package.json` has `"type": "module"`).
- Data validation uses explicit structured errors and rejects invalid numeric values; preserve that fail-closed behavior in the future refresh tool.
- Existing returns and metadata are bundled separately from IndexedDB custom overrides; the refresh contract must preserve this ownership boundary.

### Integration Points
- The future workflow consumes reviewed files and ultimately produces the existing bundled preset data shape under `src/data/presets/`.
- Regression work belongs in the existing Vitest setup. Browser-stored custom data is not a refresh target.

</code_context>

<specifics>
## Specific Ideas

- Keep the source manifest adjacent to the selected snapshot so the provenance review follows the actual file regardless of whether it is CSV or JSON.
- Checksum the exact snapshot bytes rather than a normalized parse, so a reviewed file can be identified reproducibly.
- Use the archived quick task as evidence for known methodology decisions and corrections, not as an active source-discovery mechanism.

</specifics>

<deferred>
## Deferred Ideas

- Provider API retrieval, scheduled updates, and raw-price calculations remain out of scope for this milestone.
- Implementing strict parsing/coverage validation, deterministic dry-run output, explicit apply, tests, and the maintainer runbook belongs to Phases 2 and 3.

</deferred>
