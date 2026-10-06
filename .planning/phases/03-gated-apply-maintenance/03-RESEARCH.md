<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
DATA_D41C8B7E_START
### Candidate integrity and freshness
- **D-01:** Before applying, rerun the dry run from the selected source and its adjacent manifest against the current physical preset baseline. Refuse apply unless the newly generated candidate files and report byte-match the reviewed artifacts; stale, edited, or mismatched artifacts fail closed.

### Explicit apply gate and write scope
- **D-02:** Keep mutation in a separate `refresh:apply` command with a distinct explicit confirmation signal; dry-run must never apply implicitly.
- Apply only the changed `stocks.json` and/or `indices.json` partitions represented by the freshly validated full candidates. Never write outside those declared preset targets or modify browser custom data in IndexedDB.

### Rollback and runbook
- **D-03:** Refuse apply if a target preset file already has local changes. Show the exact proposed diff before mutation, and document rollback using Git history and path-limited restore of only the files changed by apply. Do not add a second backup system; the runbook must require checking the current diff before restoring.
DATA_D41C8B7E_END

### the agent's Discretion
DATA_6F92A1D3_START
- Internal CLI structure, the exact confirmation-flag spelling, candidate comparison helpers, and test-fixture organization remain implementation choices, provided the separate apply boundary, freshness gate, target scope, and rollback safeguards above are preserved.
DATA_6F92A1D3_END

### Deferred Ideas (OUT OF SCOPE)
DATA_B3E7C914_START
None — discussion stayed within Phase 3 scope.
DATA_B3E7C914_END
</user_constraints>

<phase_requirements>
## Phase Requirements

DATA_A5D8F203_START
| ID | Description | Research Support |
|----|-------------|------------------|
| DATAREF-07 | Maintainer can explicitly apply a successfully validated and reviewed candidate, and the operation changes only the declared bundled preset files, never browser-stored custom overrides. | Separate apply CLI, exact freshness gate, dirty-target refusal, confirmation, narrow write set, and apply-specific integration tests. [VERIFIED: .planning/REQUIREMENTS.md:23] |
| DATAREF-08 | The workflow is runnable from a normal repository checkout without machine-specific absolute paths and has regression tests for malformed input, coverage, determinism, and compatibility with the preset data shape. | Reuse repository-root-relative ESM CLI and `node:test`; extend existing validation tests and add preset-shape/apply tests. [VERIFIED: .planning/REQUIREMENTS.md:24] |
| DATAREF-09 | A maintainer runbook explains source preparation, return methodology, refresh cadence, review and apply steps, verification, exceptions, and rollback; the workflow does not fetch provider data or schedule silent updates. | Document the existing reviewed-source contract and explicit dry-run/review/apply/verify/restore sequence, with no fetching or scheduled job. [VERIFIED: .planning/REQUIREMENTS.md:25] |
DATA_A5D8F203_END
</phase_requirements>

# Phase 3: Gated Apply & Maintenance - Research

**Researched:** 2026-10-06
**Domain:** Repository-local Node.js maintenance CLI, constrained preset-file promotion, regression testing, and maintainer runbook
**Confidence:** LOW overall (the confidence seam returned LOW for both `codebase --verified` and official-doc retrieval; implementation details not locked in CONTEXT remain recommendations, not user decisions). [VERIFIED: `gsd-tools query classify-confidence --provider codebase --verified` and `--provider webfetch`, 2026-10-06]

## Summary

Phase 3 is a local repository-maintenance feature, not an application/browser feature: the new apply command should be a separate Node ESM CLI that reuses Phase 2 validation and its full candidates, while writing only the two explicitly authorized bundled preset partitions. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-21; scripts/maintenance/historical-returns/dry-run.mjs:1361-1378]

Make freshness a byte-level gate: regenerate the dry-run artifacts from the selected source/adjacent manifest against the current physical baseline, compare both full candidate files and the report with the reviewed artifacts, reject any mismatch, inspect working-tree changes for the files about to be written, show the exact diff, and require a distinct apply confirmation before mutation. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-24] The candidate/report output is deterministic across independent output locations and excludes timestamps and temporary directory names in the current test contract. [VERIFIED: test/maintenance/historical-returns/dry-run.test.mjs:388-440]

No external package is needed for this phase: the project already uses npm scripts, direct Node CLIs, and the built-in `node:test` runner for this maintenance workflow. [VERIFIED: package.json:16-19; .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:17-25] The current checkout has local modifications to both authorized preset files; do not run a real apply in this checkout until those changes are resolved, because the locked policy requires refusing modified targets. [VERIFIED: `git status --short -- src/data/presets/stocks.json src/data/presets/indices.json` observed 2026-10-06; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:23-24]

**Primary recommendation:** Add an isolated apply CLI that delegates input validation/candidate generation to the existing dry-run command, compares the newly generated `stocks.json`, `indices.json`, and report byte-for-byte against the reviewed output, checks local target edits before any write, and gates a printed exact diff behind explicit apply confirmation. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-24; scripts/maintenance/historical-returns/dry-run.mjs:1361-1378]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Source validation and candidate regeneration | Repository-local maintenance CLI | Current physical preset files | Existing maintenance tools select inputs explicitly, load physical preset partitions, and emit full candidates without using browser services. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:18-22, 972-1022, 1381-1416] |
| Approval and bounded apply | Repository-local maintenance CLI | Version-controlled preset partitions | The apply command owns the explicit confirmation and mutation boundary; only changed authorized partitions are eligible to be written. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-24] |
| Runtime preset compatibility | Bundled-data/type contract | Build and maintenance regression tests | `PresetData` is the app-facing record shape; verifying JSON structure plus the project build catches changes incompatible with the runtime import type. [VERIFIED: src/data/services/preset-service.ts:51-67; package.json:6-10] |
| Browser custom overrides | Browser persistence service (outside apply ownership) | None | Custom records are saved through a separate IndexedDB-backed service; the maintenance workflow must not import or invoke it. [VERIFIED: src/data/services/custom-data-service.ts:1-10, 20-38; .planning/REQUIREMENTS.md:33-37] |

### System Architecture Diagram

```text
Maintainer selects reviewed source + adjacent manifest + reviewed candidate directory
                         |
                         v
Separate apply CLI reruns Phase 2 dry-run against current physical preset baseline
                         |
             validation fails or artifact/report bytes differ
                         +------------------------------> fail closed; no preset write
                         |
                         v
Check local edits on every target-to-write; calculate exact proposed diff
                         |
                target locally modified
                         +------------------------------> refuse before any write
                         |
                         v
Print diff -> receive distinct apply confirmation -> write only changed allowed files
                         |
                         v
Verify written bytes and run compatibility/regression checks
                         |
                         v
Bundled files are consumed by preset-service at app build/runtime
Browser custom data remains on its separate IndexedDB service path (not connected)
```

The separation between bundled JSON imports and browser custom-data persistence is explicit in the service imports and the separate custom-data service implementation. [VERIFIED: src/data/services/preset-service.ts:15-18; src/data/services/custom-data-service.ts:1-10]

## Standard Stack

### Core

| Library / tool | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js | v22.23.2 observed locally; project minimum is not established here. [VERIFIED: `node --version`, 2026-10-06] | Run repository-local maintenance ESM CLIs and built-in tests. | Existing maintenance commands invoke Node directly and use `node:test`. [VERIFIED: package.json:16-19; .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:21-24] |
| npm | v12.2.0 observed locally. [VERIFIED: `npm --version`, 2026-10-06] | Expose repository commands and regression scripts. | Current refresh CLI and test commands are npm scripts. [VERIFIED: package.json:16-19] |
| Node built-ins (`node:fs`, `node:path`, `node:child_process`, `node:test`) | Provided by the selected Node runtime; no separate version. [CITED: nodejs.org/docs/latest-v22.x/api/fs.html; nodejs.org/docs/latest-v22.x/api/test.html] | Filesystem checks/writes, repository-root path handling, subprocess tests, and direct regression execution. | Existing maintenance CLI already uses Node built-ins and direct CLI tests; the official test runner is available without a test-framework install. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:1-16; test/maintenance/historical-returns/dry-run.test.mjs:1-17; CITED: nodejs.org/docs/latest-v22.x/api/test.html] |

The checked-in `PresetData` and return contracts are verbatim:

DATA_C7B4E190_START
```typescript
export interface PresetReturn {
  date: string;
  return: number;
}

export interface PresetData {
  symbol: string;
  name: string;
  /** Asset class; when absent, treat as 'equity_stock' */
  assetClass?: PresetAssetClass;
  startDate: string;
  endDate: string;
  returns: PresetReturn[];
}
```
DATA_C7B4E190_END
[VERIFIED: src/data/services/preset-service.ts:51-67]

DATA_F21A9D64_START
```typescript
export const PRESET_ASSET_CLASSES = [
  'equity_index',
  'equity_stock',
  'bond',
  'commodity',
] as const;
```
DATA_F21A9D64_END
[VERIFIED: src/data/services/preset-service.ts:25-30]

### Supporting

| Tool | Purpose | When to Use |
|---------|---------|-------------|
| Git CLI | Detect staged/unstaged edits on tracked target files and provide path-limited rollback from history. | Required at apply/rollback time; Git v2.43.0 is available in this environment. [VERIFIED: `git --version`, 2026-10-06; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:23-24] |
| Existing Phase 2 dry-run CLI | Revalidate source/manifest, regenerate candidates and report, and preserve one semantic validation implementation. | Invoke from the apply path using a newly created empty output directory; do not duplicate its strict validator. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:1381-1416; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-17] |
| Vite/TypeScript build | Check application imports and JSON typing after the preset files change. | Run as a post-apply compatibility check. [VERIFIED: package.json:6-10; src/data/services/preset-service.ts:15-18, 69-73] |

**External package additions:** None recommended; extend the existing Node built-in test suites and CLI conventions. [VERIFIED: package.json:16-19; .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:17-25]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Re-run Phase 2 and compare exact artifacts | Trust the candidate files without regeneration | Re-running is required by the locked freshness decision; trusting stale/edited artifacts would remove the freshness guarantee. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-17] |
| Reuse the existing semantic validator | Build a second apply-only validator | A second validator can diverge; the current dry-run already owns parsing, validation, coverage, and candidate construction. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:1381-1410] |
| Git history plus path-limited restore | Add a separate backup/restore database | Explicitly excluded by the rollback decision. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:23-24] |

## Architecture Patterns

### Recommended Project Structure

The apply implementation should sit beside the existing historical-return maintenance CLIs, with a direct `node:test` suite alongside their tests and the runbook in the existing maintenance documentation area. The exact new filenames are discretionary recommendations, not existing checked-in paths. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:45-57, 79-82; ASSUMED: proposed placement follows established convention]

```text
scripts/maintenance/historical-returns/   # existing CLI area; add apply command
test/maintenance/historical-returns/      # existing direct node:test suites; add apply coverage
docs/maintenance/historical-returns/      # existing source contract; add maintainer runbook
```

### Pattern 1: Freshness-gated apply

**What:** Treat reviewed candidates as approval evidence, not as direct write payloads: regenerate all artifacts from the selected source pair against the current physical baseline; compare exact bytes for each candidate and the report; stop on any difference; check target cleanliness; print the diff; and write only changed authorized files after explicit confirmation. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-24]

**When to use:** Every apply invocation, including an invocation that follows a prior preview; current source bytes and the baseline must be revalidated at application time. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-17]

**Existing candidate serialization and filesystem safeguards:** the dry-run emitter currently declares its three artifact names and uses exclusive creation. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:1361-1378]

DATA_8C5E2B71_START
```javascript
const fresh = await regenerateFromSelectedSourceAndManifest();
assertExactBytesMatch(fresh.stocks, reviewed.stocks);
assertExactBytesMatch(fresh.indices, reviewed.indices);
assertExactBytesMatch(fresh.report, reviewed.report);

const changed = fixedAllowedTargets.filter(target =>
  !equalBytes(fresh[target], readFileSync(target))
);
assertNoLocalChangesOnTargets(changed); // Check every target before the first write.
printExactDiff(changed);
if (!hasExplicitApplyConfirmation(args)) return; // Preview only; never mutate.
writeOnlyFreshCandidateBytes(changed, fresh);
verifyWrittenBytesAndPresetShape(changed);
```
DATA_8C5E2B71_END

This is planning pseudocode, not an existing API; `fixedAllowedTargets` must encode only the two approved partitions and should not be caller-controlled. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-21; ASSUMED: helper/API names are illustrative]

### Pattern 2: Repository-root-relative CLI and fixtures

**What:** Resolve the repository root from the CLI module location, as the current dry-run does, and let selected source/candidate paths be caller-provided paths rather than machine-specific absolute constants. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:18-22, 25-42]

**When to use:** Production maintenance commands and tests; derive test roots from `import.meta.url` and create disposable input/output fixtures under the OS temporary directory. [VERIFIED: test/maintenance/historical-returns/dry-run.test.mjs:1-30]

The current script constructs its preset directory from the module-derived root as follows:

DATA_2B7F4C91_START
```javascript
const presetDirectory = path.join(root, 'src/data/presets');
```
DATA_2B7F4C91_END
[VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:18-19]

DATA_34A7C6D9_START
```bash
npm run refresh:dry-run -- --source "$SOURCE" --manifest "$MANIFEST" --output-dir "$CANDIDATES"
```
DATA_34A7C6D9_END

The command shape and required dry-run flags are defined by the existing npm script and CLI usage string. [VERIFIED: package.json:18-19; scripts/maintenance/historical-returns/dry-run.mjs:22, 25-42]

**Apply interface proposal (not locked):** use a candidate-directory option and an unmistakable explicit confirmation flag; for example, `--candidates-dir` and `--confirm-apply`. Re-run the same source/manifest through the dry-run implementation during apply, rather than trusting the directory. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-27; ASSUMED: flag spellings are proposed only]

### Anti-Patterns to Avoid

- **Do not add an apply switch to dry-run:** the locked design requires a separate `refresh:apply` command and explicitly preserves dry-run non-mutation. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-21]
- **Do not copy a candidate into the preset directory before comparing all reviewed artifacts:** stale or edited candidate/report files must fail closed. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-17]
- **Do not use source `assetClass` to infer a partition or omit one side of a full candidate:** Phase 2’s routing and physical-membership behavior is already established, including new-symbol route validation and duplicated memberships. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:980-1018, 1024-1071]
- **Do not route apply through app import/custom-data services:** that would cross into the browser persistence boundary, which is explicitly excluded. [VERIFIED: src/data/services/preset-service.ts:15-18; src/data/services/custom-data-service.ts:20-38; .planning/REQUIREMENTS.md:33-37]
- **Do not claim multi-file writes are transactional unless implementation and tests establish that guarantee:** Node’s filesystem documentation states that copy operations make no atomicity guarantee. [CITED: nodejs.org/docs/latest-v22.x/api/fs.html]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|---------|-----|
| Strict source/manifest semantics | A second parser or looser apply validator | Re-run the Phase 2 dry-run from the chosen source/manifest. | Existing dry-run validates the pair, source and manifest, baseline coverage, then emits full candidates or a blocking diagnostic report. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:192-294, 420-637, 1381-1416] |
| Candidate serialization / partition merge | An apply-specific serializer or inferred asset routing | Consume fresh outputs from the existing merge/ordered-JSON path. | The existing generator preserves full partition candidates and deterministic sorted keys. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:980-1022, 1191-1193] |
| App-side custom-data writes | Direct calls into the browser custom-data service | Do not use that service at all; apply only changes the approved tracked JSON inputs. | The custom-data service writes to IndexedDB, while the apply contract explicitly excludes browser overrides. [VERIFIED: src/data/services/custom-data-service.ts:20-38; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-21] |
| New test framework or diff package | Add dependencies for the apply CLI and tests | Built-in Node APIs, `node:test`, and Git already used/available in this repo/environment. | The current maintenance stack has direct Node tests and scripts; no additional dependency is necessary for this design. [VERIFIED: package.json:16-19; .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:17-25; local `git --version`] |

**Key insight:** The most expensive apply defects are approval/freshness and write-scope failures, not parsing; keep semantic validation single-sourced and make the new surface a narrow gate around exact artifact comparison and bounded writes. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-24; scripts/maintenance/historical-returns/dry-run.mjs:1381-1416]

## Common Pitfalls

### Pitfall 1: Comparing only one file or omitting the report
**What goes wrong:** A reviewed output can be partly edited or stale while apply still proceeds. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-17]
**Why it happens:** A full candidate directory contains both partition candidates and a human review report. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:1361-1368]
**How to avoid:** Compare the freshly regenerated bytes of both full candidate files and the report against the reviewed artifacts on every apply. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-17]
**Warning signs:** One artifact differs, the report cannot be read, regeneration blocks, or a baseline change produces a different report/candidate. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-17; scripts/maintenance/historical-returns/dry-run.mjs:1400-1410]

### Pitfall 2: Local edits overwritten or partially written
**What goes wrong:** Applying over an existing maintainer edit loses work; an unexpected failure during multiple writes can leave a partial update. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:23-24; CITED: nodejs.org/docs/latest-v22.x/api/fs.html]
**Why it happens:** A clean-target preflight can be omitted; separate writes should not be described as an all-target transaction unless the implementation establishes that guarantee. [ASSUMED]
**How to avoid:** Before any write, identify every changed target, refuse if any has staged or unstaged local changes, print the exact diff, then make the narrow writes and post-verify. Do not claim all-or-nothing behavior unless proved. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-24; ASSUMED: staged/unstaged is the recommended operational interpretation of “local changes”]
**Warning signs:** Modified target status, mismatch between bytes checked and bytes written, a write error after the first partition, or post-write content differing from fresh candidates. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:23-24]

### Pitfall 3: Applying an in-scope subset as if it were a complete dataset
**What goes wrong:** Files not represented by the approved changed partitions are overwritten, or a partial review changes out-of-scope records. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:16-31; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-21]
**Why it happens:** Dry-run emits merged full candidates even for a subset, while apply is allowed to write only partitions changed by those candidates. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-CONTEXT.md:34-52; scripts/maintenance/historical-returns/dry-run.mjs:980-1022]
**How to avoid:** Compare candidates with the physical baseline, calculate changed partitions, and write only those fixed targets; include tests proving every other preset file stays byte-identical. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-21; test/maintenance/historical-returns/dry-run.test.mjs:381-386, 443-469]
**Warning signs:** A candidate includes differences outside the reviewed report or a test snapshots only the two expected files. [VERIFIED: test/maintenance/historical-returns/dry-run.test.mjs:381-386, 388-440]

### Pitfall 4: Treating an exact-byte source checksum as reviewer authorization
**What goes wrong:** A matching snapshot hash is mistaken for evidence that methodology, reviewer, or exception claims are true. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:200-203]
**Why it happens:** SHA-256 establishes byte identity, not the truth of the surrounding review claims. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:200-203]
**How to avoid:** Preserve human review of provenance, methodology, coverage, and exceptions; apply’s byte-match gate proves artifact freshness only. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:126-147, 200-203; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-17]
**Warning signs:** Runbook or CLI describes checksum match as semantic approval or reviewer authorization. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:200-203]

### Pitfall 5: Machine-specific paths or accidental network/browser coupling
**What goes wrong:** A workflow succeeds only on one developer’s machine or reaches provider/IndexedDB code. [VERIFIED: .planning/REQUIREMENTS.md:24-25, 33-37]
**Why it happens:** Hard-coded local paths or reuse of application services bypass the local CLI boundary. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:18-22; src/data/services/custom-data-service.ts:20-38]
**How to avoid:** Anchor repository paths from the module URL, accept source/candidate paths as CLI inputs, test from a normal checkout, and use network/IndexedDB guards in the apply integration suite. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:18-42; test/maintenance/historical-returns/dry-run.test.mjs:471-489]
**Warning signs:** Absolute developer-home paths in scripts/tests, provider fetch, or imports of IndexedDB services from the apply command. [VERIFIED: .planning/REQUIREMENTS.md:24-25, 33-37; test/maintenance/historical-returns/dry-run.test.mjs:471-489]

## Code Examples

### Apply gate (pseudocode)

DATA_74E1F3B8_START
```javascript
const regenerated = await rerunDryRun(sourcePath, manifestPath, freshOutputDir);
assertBytesEqual(regenerated.stockCandidate, reviewed.stockCandidate);
assertBytesEqual(regenerated.indexCandidate, reviewed.indexCandidate);
assertBytesEqual(regenerated.report, reviewed.report);

const writes = allowedTargetsThatDifferFromPhysicalBaseline(regenerated);
assertGitCleanForEveryTarget(writes); // Complete this before the first mutation.
printProposedDiff(writes);
if (!explicitConfirmation) return; // Preview invocation is strictly non-mutating.
applyOnlyFreshBytes(writes, regenerated);
assertByteEqualAfterWrite(writes, regenerated);
```
DATA_74E1F3B8_END

This is illustrative control flow, not copied production code; helper names and the choice of a second preview invocation remain implementation decisions. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-27; ASSUMED: helper names and CLI interaction]

### Runtime-compatible candidate checks

Use the checked-in `PresetData` contract quoted in Standard Stack as the compatibility oracle: each keyed record needs the declared symbol/name/date/returns shape, with each return represented by a string `date` and numeric `return`; compare generated candidates and the post-apply files to that contract and run the application build. [VERIFIED: src/data/services/preset-service.ts:51-67; package.json:6-10]

### Existing output artifact contract

DATA_E0B18F53_START
```javascript
[
  ['stocks.json', orderedJson(candidates.stocks)],
  ['indices.json', orderedJson(candidates.indices)],
  ['dry-run-report.md', report],
]
```
DATA_E0B18F53_END

The quoted names are the existing dry-run artifact set; the report is review evidence and must be byte-compared but must never be written into the preset directory. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:1361-1368; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-21]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dry-run-only workflow with candidate generation outside the baseline | Add a separate explicit apply path that revalidates and compares the reviewed outputs before bounded writes | Phase 3, 2026-10-06 planning context. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-24] | Promotes reviewed candidate data without coupling validation, preview, and mutation into one implicit action. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-24] |
| User-initiated refreshes | Keep maintenance initiated by a maintainer; do not fetch provider data or schedule silent updates | Existing source policy and Phase 3 requirement. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:225-247; .planning/REQUIREMENTS.md:25-31] | No background job or provider integration is part of this phase. [VERIFIED: .planning/REQUIREMENTS.md:27-37] |

**Deprecated/outdated:**
- Archived acquisition scripts and the completed historical verification are historical evidence, not refresh/runbook steps; do not rerun them for this phase. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:225-227; .planning/STATE.md:57-61]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | [ASSUMED] Proposed placement is a new apply CLI beside the existing historical-return scripts, with adjacent direct tests and a runbook beside the source contract. | Recommended Project Structure | Low: implementation may choose another in-repo path, but docs/tests/command references must agree. |
| A2 | [ASSUMED] `--candidates-dir` plus a distinct `--confirm-apply` are possible CLI spellings, not locked choices. | Pattern 1 | Low: exact spelling is expressly left to implementation discretion. |
| A3 | [ASSUMED] “Local changes” should include staged and unstaged Git modifications on every target that will be written. | Pitfall 2 | Medium: define this clearly in implementation/tests to avoid accidentally overwriting staged work. |
| A4 | [RESOLVED] The local Node v22.23.2 observation is not a declared project minimum; this phase adds no minimum and uses existing repository runtime prerequisites. | Standard Stack / Resolved Decision Log | No new runtime constraint is imposed without evidence in package metadata. |
| A5 | [RESOLVED] No multi-target atomicity is guaranteed or added; preflight all fixed targets, write only changed authorized partitions, verify bytes, and document partial-state recovery. | Pitfall 2 / Resolved Decision Log | An interruption may leave an authorized partial update; recover with reviewed, path-limited Git restore. |

## Resolved Decision Log

1. **RESOLVED — Confirmation interaction:** Use a separate non-mutating preview and a confirmed invocation with `--confirm-apply`, as selected in Phase 03 plans. This is an implementation choice within locked decision D-02, not a change to D-02: apply remains a separate command with a distinct explicit confirmation signal, and dry-run never applies implicitly. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-27; 03-01-PLAN.md; 03-02-PLAN.md]

2. **RESOLVED — Partial writes and recovery:** No multi-file atomicity is guaranteed or added. Preflight every fixed target before mutation, write only changed authorized partitions, and verify resulting bytes. Disclose that concurrent applies are unsupported and interruption may leave partial state. Recovery is through Git history and path-limited restore only after reviewing the current diff; do not add a backup system. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:23-24; 03-02-PLAN.md; 03-03-PLAN.md; CITED: nodejs.org/docs/latest-v22.x/api/fs.html]

3. **RESOLVED — Minimum Node runtime:** This phase declares no project minimum. Use the repository's existing runtime prerequisites and do not impose a version unsupported by package metadata; the observed local Node version is evidence of this environment only, not a project-wide minimum. No new project decision is required. [VERIFIED: package.json:16-19; local version observation recorded above]

No open research questions remain.

## Resolution Verification Log

- Checked confirmation resolution against locked D-02 and plans 03-01/03-02: separate preview plus `--confirm-apply`; D-02 is unchanged.
- Checked partial-write resolution against D-03 and plans 03-02/03-03: all-target preflight, changed authorized partitions only, post-write byte verification, unsupported concurrency and possible partial state disclosed, Git path-limited recovery after current-diff review, and no backup or atomicity claim.
- Checked runtime resolution against repository package metadata: no project minimum is declared by this phase, and no unsupported minimum is introduced.
- All three research questions have visible **RESOLVED** status; no open questions remain.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Maintenance CLI and direct tests | ✓ | v22.23.2 | None needed in this environment; project-wide minimum remains unspecified. [VERIFIED: `node --version`; ASSUMED: no minimum established] |
| npm | Repository scripts | ✓ | 12.2.0 | Invoke checked-in Node entrypoints directly if npm script resolution is unavailable. [VERIFIED: `npm --version`; package.json:16-19] |
| Git | Local target edit check and path-limited restore | ✓ | 2.43.0 | No safe Git-history rollback fallback; apply/runbook requires a Git checkout. [VERIFIED: `git --version`; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:23-24] |
| Provider APIs / IndexedDB | Not required by this phase | Not used | — | No fallback required; both are outside the maintenance workflow. [VERIFIED: .planning/REQUIREMENTS.md:25, 33-37; docs/maintenance/historical-returns/source-contract.md:245-259] |

**Missing dependencies with no fallback:** None observed for repository-local CLI/testing; an active Git checkout is required for the mandated rollback path. [VERIFIED: environment probes; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:23-24]

## Validation Architecture

Include Nyquist validation because the research protocol treats the workflow as enabled unless `.planning/config.json` explicitly sets `workflow.nyquist_validation` to `false`; the inspected config did not contain that explicit false setting. [CITED: phase researcher validation rule; ASSUMED: inspected config omission is not affirmative evidence of another setting]

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Node.js built-in `node:test`. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:17-24] |
| Config file | None for maintenance `.mjs` tests; tests run directly with Node. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:19-24] |
| Quick run command | `npm run test:refresh-dry-run` for current dry-run regression; add a focused apply-test script in this phase. [VERIFIED: package.json:19; ASSUMED: new script to be added] |
| Full suite command | `npm run test:refresh-identify && node --test test/maintenance/historical-returns/schema-contract.test.mjs && npm run test:refresh-dry-run`, extended with the apply suite and `npm run build`. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:21-25; package.json:6-10; ASSUMED: append apply suite] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DATAREF-07 | Separate apply signal; without confirmation no writes; with confirmation writes only changed allowed files. | CLI integration | New apply CLI `node:test` suite plus existing maintenance chain. | No — add beside existing maintenance tests. [VERIFIED: package.json:17-19; ASSUMED: new suite] |
| DATAREF-07 | Stale/edited candidate file, edited report, changed baseline, malformed source, or dirty target fails closed without mutation. | CLI integration | New apply CLI suite; compare all target bytes before/after. | No — add cases. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-24; ASSUMED: new suite] |
| DATAREF-08 | Malformed-input and coverage regression remains green. | CLI integration | `npm run test:refresh-dry-run` | Yes — existing Phase 2 suite. [VERIFIED: package.json:18-19; test/maintenance/historical-returns/dry-run.test.mjs:652-835] |
| DATAREF-08 | Deterministic candidate/report generation and no accidental writes outside the allowed files. | CLI integration | Existing dry-run suite plus apply tests snapshotting all preset file bytes. | Partially — dry-run coverage exists; apply test is new. [VERIFIED: test/maintenance/historical-returns/dry-run.test.mjs:381-469; ASSUMED: apply suite] |
| DATAREF-08 | Candidate and post-apply JSON remain compatible with `PresetData`. | Contract/integration + build | JSON record assertions against the checked-in shape plus `npm run build`. | Build exists; apply compatibility test is new. [VERIFIED: src/data/services/preset-service.ts:51-67; package.json:6-10; ASSUMED: new test] |
| DATAREF-09 | Runbook includes source preparation, method, timing, review/apply/verify, exceptions and Git rollback, and forbids provider retrieval/scheduled updates. | Documentation review | Manual checklist; include command snippets that run from a repository checkout. | No — write the phase runbook. [VERIFIED: .planning/REQUIREMENTS.md:25-37] |

### Sampling Rate

- **Per apply-CLI task:** run the focused apply integration suite and `npm run test:refresh-dry-run`. [VERIFIED: package.json:19; ASSUMED: new focused suite]
- **Per wave merge:** run the Phase 1 identity, schema-contract, Phase 2 dry-run chain plus the new apply suite. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:21-34; ASSUMED: append apply suite]
- **Phase gate:** run the complete maintenance regression chain and `npm run build`; review the runbook against DATAREF-09. [VERIFIED: package.json:6-10; .planning/REQUIREMENTS.md:25]

### Wave 0 Gaps

- No new framework, config, or dependency installation is needed; the existing maintenance Node test infrastructure is already present. [VERIFIED: .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:17-25]
- Add apply-specific tests as part of the implementation wave; no tests currently exercise the new apply boundary. [ASSUMED: apply implementation is this phase's planned deliverable; package.json:16-19 lists only the existing identity/dry-run commands]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No app authentication surface is defined for this local CLI. | Treat OS/repository maintainer access as the trust boundary; the explicit apply signal is not identity authentication. [ASSUMED] |
| V3 Session Management | No browser or authenticated session is involved. | No session/cookie/token state in the CLI. [ASSUMED] |
| V4 Access Control | Yes — filesystem write scope is security-critical. | Hard-code the two authorized target partitions; reject any other target and check local edits before writing. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-24] |
| V5 Input Validation | Yes. | Reuse the strict Phase 2 source/manifest validation and canonicalize/restrict apply paths; reject malformed or mismatching artifacts. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:192-294, 420-637; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-21] |
| V6 Cryptography | Narrow applicability for source-byte identity only. | Keep the existing source checksum as byte identity; do not claim that a checksum proves reviewer authority or provenance truth. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:200-203] |

### Known Threat Patterns for the local filesystem CLI

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Candidate/report tampering or stale review output | Tampering | Regenerate all artifacts and byte-compare before any apply; stale or edited artifacts fail closed. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-17] |
| Path traversal, symlink aliases, or caller-controlled write target | Tampering / Elevation of privilege | Never accept arbitrary destination filenames; anchor the repo root from the module, validate physical paths, and enforce the fixed target allow-list. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:18-19, 1294-1315; .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-21] |
| Overwriting local edits or clobbering custom overrides | Tampering | Reject dirty write targets before mutation; never import/use the IndexedDB custom-data service. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:19-24; src/data/services/custom-data-service.ts:20-38] |
| Partial write after interruption or disk failure | Denial of service / Tampering | Preflight all targets, post-verify each written target, surface any partial state, and document Git path-limited recovery; do not claim atomic multi-file behavior without proof. [CITED: nodejs.org/docs/latest-v22.x/api/fs.html; VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:23-24] |
| Hidden provider fetch or browser storage side effect | Information disclosure / Tampering | Keep the CLI dependency graph local-only; add network and IndexedDB guards to integration tests. [VERIFIED: .planning/REQUIREMENTS.md:25, 33-37; test/maintenance/historical-returns/dry-run.test.mjs:471-489] |

## Sources

### Primary (repository source of truth)

- `.planning/phases/03-gated-apply-maintenance/03-CONTEXT.md` — locked freshness, explicit confirmation, target write scope, local edit refusal, diff display, and rollback constraints. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-27]
- `.planning/REQUIREMENTS.md` — exact DATAREF-07/08/09 criteria and no-fetch/no-schedule boundaries. [VERIFIED: .planning/REQUIREMENTS.md:23-37]
- `scripts/maintenance/historical-returns/dry-run.mjs` — CLI path resolution, strict validation, candidate merge, deterministic serialization, and exclusive output writes. [VERIFIED: scripts/maintenance/historical-returns/dry-run.mjs:18-42, 972-1022, 1191-1193, 1361-1378]
- `src/data/services/preset-service.ts` and `src/data/services/custom-data-service.ts` — app preset shape and separate browser persistence boundary. [VERIFIED: src/data/services/preset-service.ts:15-18, 51-67; src/data/services/custom-data-service.ts:1-10, 20-38]
- `test/maintenance/historical-returns/dry-run.test.mjs` and `.planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md` — existing CLI regression patterns and maintenance test chain. [VERIFIED: test/maintenance/historical-returns/dry-run.test.mjs:362-505; .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:17-34]
- `docs/maintenance/historical-returns/source-contract.md` — methodology, provenance, exceptions, no unattended cadence, and ownership boundaries. [VERIFIED: docs/maintenance/historical-returns/source-contract.md:126-147, 200-203, 225-259]

### Secondary (official documentation)

- [Node.js v22 File system API](https://nodejs.org/docs/latest-v22.x/api/fs.html) — exclusive open flags and cautions about atomicity; retrieved directly from the official documentation site. [CITED: nodejs.org/docs/latest-v22.x/api/fs.html]
- [Node.js v22 Test runner](https://nodejs.org/docs/latest-v22.x/api/test.html) — built-in direct test runner and CLI usage; retrieved directly from the official documentation site. [CITED: nodejs.org/docs/latest-v22.x/api/test.html]

## Metadata

**Confidence breakdown:**
- Standard stack: LOW — existing package scripts/test conventions are directly inspected, but the confidence seam rated the codebase provider LOW and no runtime minimum is declared here. [VERIFIED: package.json:16-19; .planning/phases/02-deterministic-validation-dry-run-diff/02-VALIDATION.md:17-25]
- Architecture: LOW — directly grounded in phase decisions and current source ownership boundaries; apply implementation is not yet present. [VERIFIED: .planning/phases/03-gated-apply-maintenance/03-CONTEXT.md:16-27; src/data/services/preset-service.ts:15-18]
- Pitfalls: LOW — existing regression patterns and official filesystem docs support the risks, but interruption/concurrency guarantees need implementation-level tests. [CITED: nodejs.org/docs/latest-v22.x/api/fs.html; VERIFIED: test/maintenance/historical-returns/dry-run.test.mjs:388-469]

**Research date:** 2026-10-06
**Valid until:** 2026-11-05 (stable repository contracts; refresh if Phase 3 decisions, CLI implementation, or Node runtime target changes).
