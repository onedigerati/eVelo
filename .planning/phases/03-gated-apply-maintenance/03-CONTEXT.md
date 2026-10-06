# Phase 3: Gated Apply & Maintenance - Context

**Gathered:** 2026-10-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a separately invoked, explicitly approved path for promoting reviewed Phase 2 candidates into the bundled historical-return preset files. Verify the result with repository-local regression checks and provide a maintainer runbook covering source preparation, review, apply, verification, exceptions, and rollback. Apply must not change browser-stored custom data, fetch provider data, calculate returns from raw prices, or schedule unattended updates.

</domain>

<decisions>
## Implementation Decisions

### Candidate integrity and freshness
- **D-01:** Before applying, rerun the dry run from the selected source and its adjacent manifest against the current physical preset baseline. Refuse apply unless the newly generated candidate files and report byte-match the reviewed artifacts; stale, edited, or mismatched artifacts fail closed.

### Explicit apply gate and write scope
- **D-02:** Keep mutation in a separate `refresh:apply` command with a distinct explicit confirmation signal; dry-run must never apply implicitly.
- Apply only the changed `stocks.json` and/or `indices.json` partitions represented by the freshly validated full candidates. Never write outside those declared preset targets or modify browser custom data in IndexedDB.

### Rollback and runbook
- **D-03:** Refuse apply if a target preset file already has local changes. Show the exact proposed diff before mutation, and document rollback using Git history and path-limited restore of only the files changed by apply. Do not add a second backup system; the runbook must require checking the current diff before restoring.

### the agent's Discretion
- Internal CLI structure, the exact confirmation-flag spelling, candidate comparison helpers, and test-fixture organization remain implementation choices, provided the separate apply boundary, freshness gate, target scope, and rollback safeguards above are preserved.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and prior decisions
- `.planning/ROADMAP.md` — Phase 3 goal, requirements, and success criteria.
- `.planning/REQUIREMENTS.md` — DATAREF-07, DATAREF-08, and DATAREF-09.
- `.planning/PROJECT.md` — milestone objectives and validated Phase 1/2 requirements.
- `.planning/STATE.md` — current phase position and accumulated constraints.
- `.planning/phases/01-source-contract-review-governance/01-CONTEXT.md` — reviewed input, methodology, provenance, and no-fetch boundaries.
- `.planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md` — candidate shape, exact coverage, explicit routing, and non-mutating dry-run contract.
- `.planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md` — maintenance regression commands and coverage.

### Existing maintenance and data contracts
- `scripts/maintenance/historical-returns/dry-run.mjs` — strict reviewed-input validation, candidate generation, deterministic report, and safe output behavior.
- `scripts/maintenance/historical-returns/identify-source.mjs` — explicit source/manifest selection and exact-byte identity check.
- `docs/maintenance/historical-returns/source-contract.md` — source, manifest, coverage, and new-symbol routing semantics.
- `docs/maintenance/historical-returns/schemas/annual-return-source.schema.json` — reviewed source schema.
- `docs/maintenance/historical-returns/schemas/annual-return-review-manifest.schema.json` — reviewed manifest schema and partition routing.
- `src/data/services/preset-service.ts` — canonical `PresetData` shape and bundled preset load behavior.
- `src/data/services/custom-data-service.ts` — browser custom-data boundary; apply must not access or mutate it.
- `src/data/presets/stocks.json` and `src/data/presets/indices.json` — physical preset partitions that may be changed.
- `package.json` — existing maintenance CLI and regression-test commands.
- `test/maintenance/historical-returns/dry-run.test.mjs` — Phase 2 validation, output, and non-mutation regression coverage.
- `test/maintenance/historical-returns/identify-source.test.mjs` — Phase 1 identity regression coverage.
- `test/maintenance/historical-returns/schema-contract.test.mjs` — source and manifest schema contract coverage.

### Codebase maps
- `.planning/codebase/ARCHITECTURE.md` — separation between bundled preset imports and browser persistence.
- `.planning/codebase/INTEGRATIONS.md` — IndexedDB custom-data and provider boundaries.
- `.planning/codebase/STACK.md` — Node/npm and test-tool conventions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `dry-run.mjs` already validates the explicit reviewed source/manifest pair and emits complete `stocks.json`, `indices.json`, and `dry-run-report.md` artifacts.
- `identify-source.mjs` establishes the exact-byte snapshot/manifest pairing contract.
- `PresetData` in `preset-service.ts` is the compatibility shape for bundled preset records.

### Established Patterns
- Maintenance tools are separate Node ESM CLIs with direct `node:test` suites and npm scripts.
- Phase 2 uses physical preset partitions, strict input checks, deterministic serialization, canonical-path containment, absent-or-empty external output directories, and exclusive writes.
- Browser custom data is handled by a separate service and IndexedDB table; it is outside the bundled-preset apply surface.

### Integration Points
- A new apply path connects reviewed Phase 2 candidate artifacts to only the physical preset files under `src/data/presets/`.
- Compatibility verification should exercise the repository's preset data shape and existing maintenance regression commands from a normal checkout.
- The runbook belongs with the existing historical-return maintenance documentation.

</code_context>

<specifics>
## Specific Ideas

No additional user-specific requirements were given; the recommendations above were selected in autonomous discussion mode.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 3 scope.

</deferred>

---

*Phase: 03-gated-apply-maintenance*
*Context gathered: 2026-10-06*
