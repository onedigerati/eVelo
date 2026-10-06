---
phase: "02"
slug: "deterministic-validation-dry-run-diff"
status: validated
nyquist_compliant: true
wave_0_complete: true
created: "2026-10-06"
updated: "2026-10-06"
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` |
| **Config file** | None for maintenance `.mjs` tests; run directly with Node |
| **Quick run command** | `npm run test:refresh-dry-run` |
| **Full suite command** | `npm run test:refresh-identify && node --test test/maintenance/historical-returns/schema-contract.test.mjs && npm run test:refresh-dry-run` |
| **Estimated runtime** | Under 10 seconds for the focused maintenance regression chain |

---

## Sampling Rate

- **After every task commit:** Run `npm run test:refresh-dry-run` for CLI changes; run the schema-contract suite when changing the manifest schema.
- **After every plan wave:** Run the full maintenance regression chain above.
- **Before phase verification:** The full maintenance regression chain must be green.
- **Max feedback latency:** 10 seconds for the focused dry-run suite.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 02-01 | 1 | DATAREF-04, DATAREF-05, DATAREF-06 | T-02-01, T-02-02 | Explicit reviewed inputs; candidate output never writes bundled presets | CLI integration | `npm run test:refresh-dry-run` | ✅ `dry-run.test.mjs` | ✅ green |
| 02-01-02 | 02-01 | 1 | DATAREF-04, DATAREF-05, DATAREF-06 | — | Package commands retain separate identity and dry-run boundaries | CLI integration | `npm run test:refresh-dry-run && npm run test:refresh-identify` | ✅ both suites | ✅ green |
| 02-02-01 | 02-02 | 2 | DATAREF-04 | T-02-03, T-02-04 | Strict parsing rejects malformed or ambiguous input without normalization | CLI integration | `npm run test:refresh-dry-run` | ✅ `dry-run.test.mjs` | ✅ green |
| 02-02-02 | 02-02 | 2 | DATAREF-04 | T-02-03 | All blocking diagnostics are stable and suppress candidates; outlier warnings remain nonblocking | CLI integration | `npm run test:refresh-dry-run` | ✅ `dry-run.test.mjs` | ✅ green |
| 02-03-01 | 02-03 | 3 | DATAREF-05, DATAREF-06 | T-02-05 | Full and declared-subset coverage compare exact symbol/year sets without filling gaps | CLI integration | `npm run test:refresh-dry-run` | ✅ `dry-run.test.mjs` | ✅ green |
| 02-03-02 | 02-03 | 3 | DATAREF-05, DATAREF-06 | T-02-06 | New symbols require explicit reviewed partition routing; existing memberships remain authoritative | Contract and CLI integration | `node --test test/maintenance/historical-returns/schema-contract.test.mjs && npm run test:refresh-dry-run` | ✅ both suites | ✅ green |
| 02-03-03 | 02-03 | 3 | DATAREF-05, DATAREF-06 | T-02-05, T-02-06 | Complete diffs and candidates preserve out-of-scope records and synchronized QQQ memberships | CLI integration | `npm run test:refresh-dry-run` | ✅ `dry-run.test.mjs` | ✅ green |
| 02-04-01 | 02-04 | 4 | DATAREF-06 | T-02-07, T-02-08 | Output paths are physically contained and exclusive writes refuse replacement | CLI integration | `npm run test:refresh-dry-run` | ✅ `dry-run.test.mjs` | ✅ green |
| 02-04-02 | 02-04 | 4 | DATAREF-04, DATAREF-05, DATAREF-06 | T-02-09 | Outputs are deterministic; presets remain byte-identical and no provider/browser storage path is used | CLI integration | Full maintenance regression chain | ✅ all three suites | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing Node.js and `node:test` infrastructure covers all phase requirements. No Wave 0 dependencies or framework installation were required.

---

## Manual-Only Verifications

All Phase 2 behaviors have automated verification. No manual-only checks remain.

---

## Validation Sign-Off

- [x] All tasks have automated verification.
- [x] Sampling continuity is maintained; no three consecutive tasks lack automated verification.
- [x] Existing test infrastructure covers all requirements; no Wave 0 gaps remain.
- [x] Commands are one-shot and contain no watch-mode flags.
- [x] Focused test feedback latency target is under 10 seconds.
- [x] `nyquist_compliant: true` is set in frontmatter.

**Approval:** Automated coverage audited; no human-only verification is required.

## Validation Audit 2026-10-06

| Metric | Count |
|---|---|
| Gaps found | 0 |
| Resolved | 0 |
| Escalated | 0 |
