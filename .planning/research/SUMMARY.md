# Project Research Summary

**Project:** eVelo
**Domain:** Maintainer-run refresh of bundled historical market-return presets
**Researched:** 2026-10-05
**Confidence:** MEDIUM

## Executive Summary

This milestone is best understood as a repository-side governance workflow, not as a live market-data integration. The research across stack, features, architecture, and pitfalls converges on an offline, deterministic process: a human reviews source CSV/JSON snapshots, a local Node-based script validates them, and the maintainer reviews a candidate diff and provenance manifest before any checked-in preset file is updated. User-chosen, standardized reviewed input files are the intended trust boundary; direct API fetching is intentionally excluded.

The strongest recommendation is to keep this workflow outside browser runtime services and outside user custom-data flows. `src/data/presets/*.json` should remain the checked-in bundled baseline, while IndexedDB custom imports remain a separate override layer. That boundary matters because a refresh should never silently mutate user-owned data or depend on a provider's availability, credentials, or rate-limit behavior. The stack recommendations are intentionally minimal: existing Node ESM, Papa Parse for CSV parsing, and Vitest for validation and determinism checks are enough for this scope.

The primary risk is not technical complexity but trust and method. Historical return data can be wrong even when it parses cleanly: source provenance, return convention, coverage policy, and correction rationale all matter. The research is consistent that the maintainers should default to fail-closed validation, dry-run review, explicit apply steps, and a source ledger. Exact metadata layout and full-vs-subset refresh policy remain open design questions, and those questions should be resolved in planning because they affect auditability, reviewer effort, and what counts as a valid change.

## Key Findings

### Recommended Stack

The recommended stack is intentionally small and repo-native. Use the existing Node.js ESM environment with built-in filesystem/process APIs for a maintainer CLI; use Papa Parse for CSV ingestion where it is already present; and use Vitest for deterministic validation and regular regression coverage. This avoids introducing a new framework or bootstrap environment for a narrowly scoped tool. The workflow is repository-local and review-first, so an infrastructure layer or remote service would be a mismatch.

**Core technologies:**
- Node.js ESM (`.mjs`) for the maintainer CLI — fits the project's package type and avoids app-level TS/Vite coupling.
- Papa Parse 5.5.3 for CSV ingestion — already present in the repo and suitable for explicit validation and field normalization.
- Native JSON parsing / serialization — enough for reviewed source files and the established preset shape.
- Vitest for validation and determinism checks — supports malformed-row, duplicate-year, and byte-stable output tests.

### Expected Features

**Must have (table stakes):**
- Provider-neutral CSV and JSON source files — accepted source snapshots are reviewed before refresh; no live API fetch.
- Strict syntax and semantic validation — reject malformed rows, duplicates, non-finite numbers, missing coverage, and ambiguous metadata.
- No-write dry-run as the default — generate a candidate bundle and review diff before mutating repository assets.
- Explicit apply boundary — writes occur only after a reviewed candidate passes validation.
- Provenance and methodology tracking — source attribution, return convention, checksum, and reviewer rationale are kept with the change.

**Should have (competitive):**
- Deterministic generation — stable symbol ordering, year ordering, formatting, and output hashing for reviewability.
- Coverage and anomaly summaries — highlight new, removed, or suspicious changes without hiding a full diff.
- Exception ledger — document source-specific corrections and methodology exceptions explicitly.
- CI-friendly verification — validate updated outputs against the app's preset schema and build/test requirements.

**Defer (v2+):**
- Automatic provider acquisition or scheduled refresh jobs — incompatible with the reviewed-file boundary.
- Heuristic gap-filling or silent corrections — too risky for a financial dataset used in simulations.
- Multi-reviewer automation or remote orchestration — unnecessary for the initial maintainer workflow.

### Architecture Approach

The architecture is a staged offline pipeline: reviewed source snapshots live outside the app bundle, a local script reads explicit inputs, normalizes them, validates them, and generates candidate output in a staging area, then a reviewer compares output against the current tracked presets before an explicit apply step. The runtime app continues to consume `src/data/presets/*.json` through the static import/service layer, while custom user data remains a separate override path. That separation keeps the bundle update mechanism auditable and prevents accidental mutation of user-owned state.

**Major components:**
1. Source snapshot selector — accepts explicit reviewed files or named snapshots and rejects ambiguous missing inputs.
2. Parser + normalizer — converts CSV/JSON into canonical intermediate records with explicit units, field names, and policy rules.
3. Validator + candidate builder — fails closed on malformed records, missing coverage, invalid periods, and conflicting metadata.
4. Diff + provenance reporter — records exact old/new values, hashes, and rationale for accepted exceptions.
5. Explicit apply boundary — writes only after human review to the checked-in preset bundle.

### Critical Pitfalls

1. **Direct fetching / provider coupling** — live market-data acquisition conflicts with the user-selected reviewed-file process and makes rebuilds non-deterministic.
2. **Silent partial or heuristic change** — dropping rows, filling gaps, or guessing conventions without review can create auditably wrong results.
3. **Mixing custom user data with repository baseline** — custom overrides and bundled presets have different ownership and persistence.
4. **Methodology ambiguity** — without explicit conventions for market-return type, coverage gaps, and corrections, the final data can be technically valid yet economically wrong.
5. **Statistical / numeric assumptions in the product** — even correct data points can mislead if the simulation engine mishandles assumptions and floating-point precision.

## Implications for Roadmap

Based on the combined research, the milestone should be structured around reviewability and trust, not provider integration.

### Phase 1: Source contract and review governance
**Rationale:** The chosen boundary is explicit reviewed input files. The source schema, provenance fields, and file-policy rules must be decided first because they determine validation, diff behavior, and reviewer expectations.
**Delivers:** A documented CSV/JSON contract, source snapshot structure, and a provenance model covering source attribution, methodology, reviewer, checksum, and explicit exception notes.
**Addresses:** provider-neutral inputs, provenance, maintenance cadence, and the lack of implicit source discovery.
**Avoids:** silent heuristics, guessed units, and unreviewed upstream sourcing.

### Phase 2: Deterministic validation and dry-run diff generation
**Rationale:** A refresh is only reviewable if it is deterministic, strict, and non-mutating by default. This phase creates the candidate bundle and the human-readable summary before any tracked file is changed.
**Delivers:** A local CLI that parses explicit files, validates asset/year coverage and values, produces candidate preset JSON, and prints a clear diff report with added/changed/unchanged/missing assets.
**Addresses:** strict validation, whole-batch integrity checks, reviewable diff output, and deterministic generation.
**Avoids:** partial success, formatting churn, and threshold-only diffing that hides material changes.

### Phase 3: Safe apply, manifest, and verification
**Rationale:** Preview and apply must remain separate. The final step is not a “silent write,” but a gated transition to the repo-backed baseline with manifest capture and a reviewable audit trail.
**Delivers:** explicit `--apply` gating, manifest output, validation/build checks, and a straightforward path for commit review and rollback.
**Addresses:** safe apply, provenance retention, and separation from user custom-data flows.
**Avoids:** destructive writes, accidental mutation of custom data, and changes that pass syntax but fail real data-quality checks.

### Phase Ordering Rationale

- Source trust and schema come first; otherwise validation and review are unstable.
- Validation and diff generation precede apply because the output must be reviewed as an artifact, not written in place.
- Apply is intentionally narrow and last: it is the lowest-risk step after the repo has a clear audit trail.
- This ordering directly avoids the major pitfalls of API coupling, silent corrections, and mixed ownership of custom vs bundled data.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** Source metadata contract, coverage policy, and the exact review workflow for accepted CSV/JSON snapshots.
- **Phase 2:** Output-format determinism and human-readable diff/report rules for changed years and asset coverage.

Phases with standard patterns (skip a dedicated research-phase):
- **Phase 3:** Apply/verification flows are conventional repo data operations and do not require broad new research beyond the project-specific boundary rules.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Existing repo evidence strongly supports Node + Papa Parse + Vitest, but the final CLI structure remains a design choice. |
| Features | MEDIUM-HIGH | Strong convergence on requirement boundaries: reviewed-file input, validation, dry-run diffing, and explicit apply. |
| Architecture | MEDIUM | Repo boundaries are clear, but the exact source archive and manifest structure are still open design choices. |
| Pitfalls | HIGH | The project and financial-domain risks are well documented; the operational and data-governance issues are understood. |

**Overall confidence:** MEDIUM

### Gaps to Address

- Final source schema and metadata contract — exact field names, conventions, and review metadata still require maintainer sign-off.
- Coverage policy — full-refresh vs subset-refresh and rules for absent or corrected assets need explicit decision-making.
- Provenance layout — whether source metadata sits in a manifest, snapshot-local README, or both should be chosen before implementation.
- Review cadence — define when a refresh is required and how partial-year or corrected exceptions are handled.

## Sources

### Primary (HIGH confidence)
- `.planning/research/STACK.md` — project-specific recommendation for a local Node ESM maintainer utility with reviewed-file input and no-fetch boundary.
- `.planning/research/FEATURES.md` — required workflow and anti-feature guidance for a repeatable refresh process.
- `.planning/research/ARCHITECTURE.md` — repository boundary recommendations, data flow, and separation between runtime imports and reviewed source snapshots.
- `.planning/research/PITFALLS.md` — risk analysis for financial simulation quality and operational pitfalls relevant to the data-refresh boundary.
- `src/data/services/preset-service.ts`, `src/data/services/bulk-import-service.ts`, `src/data/validation/data-validator.ts`, and `src/data/presets/` — repo evidence for current preset import patterns and validation precedents.

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` and the current project structure — they support the Phase 33 bulk historical data scope and the repo's existing toolchain.
- Existing bulk data import and validation code under `src/data/` — useful precedent for schema and validation patterns, but not a complete implementation of the reviewed-file refresh pipeline.

### Tertiary (LOW confidence)
- Exact file structure, manifest format, and review cadence are still unresolved design decisions; those should be validated during planning before implementation begins.

---
*Research completed: 2026-10-05*
*Ready for roadmap: yes*
