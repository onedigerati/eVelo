---
phase: "03"
slug: "gated-apply-maintenance"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-06"
---

# Phase 03 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` |
| **Config file** | None for maintenance `.mjs` tests; run directly with Node |
| **Quick run command** | `npm --prefix . run test:refresh-apply` |
| **Full suite command** | `npm --prefix . run test:refresh-identify && node --test test/maintenance/historical-returns/schema-contract.test.mjs && npm --prefix . run test:refresh-dry-run && npm --prefix . run test:refresh-apply && node --test test/maintenance/historical-returns/runbook.test.mjs && npm run build` |
| **Estimated runtime** | Under 30 seconds, subject to the build environment |

---

## Sampling Rate

- **After every apply-CLI task commit:** Run `npm --prefix . run test:refresh-apply` and `npm --prefix . run test:refresh-dry-run`.
- **After every plan wave:** Run the full maintenance regression chain above.
- **Before phase verification:** The full maintenance regression chain and `npm run build` must be green.
- **Max feedback latency:** 10 seconds for the focused apply suite; the full chain includes the application build.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 03-01 | 1 | DATAREF-07 | T-03-01, T-03-02 | Fresh source regeneration and byte comparison reject stale or edited candidates and reports before a fixed-target write | CLI integration | `node --test --test-name-pattern="confirmed apply writes only changed preset partitions" test/maintenance/historical-returns/apply.test.mjs` | Yes | green |
| 03-01-02 | 03-01 | 1 | DATAREF-07 | T-03-02, T-03-03 | Missing confirmation is non-mutating; changed-only apply remains separate from dry-run and discloses the single-process limit | CLI integration | `npm --prefix . run test:refresh-apply && npm --prefix . run test:refresh-dry-run` | Yes | green |
| 03-02-01 | 03-02 | 2 | DATAREF-07 | T-03-01, T-03-04 | Edited candidates/report, baseline drift, malformed input, staged or unstaged target changes, and out-of-scope writes fail closed | CLI integration | `npm --prefix . run test:refresh-apply && npm --prefix . run test:refresh-dry-run` | No - create in implementation | pending |
| 03-02-02 | 03-02 | 2 | DATAREF-08 | T-03-05, T-03-06 | `PresetData` compatibility and safe manual repeat behavior are checked alongside inherited malformed-input, coverage, deterministic, and build regressions | CLI and contract integration | `npm --prefix . run test:refresh-apply && npm --prefix . run test:refresh-identify && node --test test/maintenance/historical-returns/schema-contract.test.mjs && npm --prefix . run test:refresh-dry-run && npm run build` | Existing suites; create apply suite | pending |
| 03-03-01 | 03-03 | 2 | DATAREF-09 | T-03-07, T-03-08 | Runbook documents source preparation, methodology, manual trigger, review/apply/verify, exceptions, concurrency limits, and path-limited rollback | Documentation contract | `node --test test/maintenance/historical-returns/runbook.test.mjs` | No - create in implementation | pending |
| 03-03-02 | 03-03 | 2 | DATAREF-08, DATAREF-09 | T-03-07, T-03-08 | Runbook safeguards and every maintenance regression command are verified from repository root | Documentation and full integration | `npm --prefix . run test:refresh-identify && node --test test/maintenance/historical-returns/schema-contract.test.mjs && npm --prefix . run test:refresh-dry-run && npm --prefix . run test:refresh-apply && node --test test/maintenance/historical-returns/runbook.test.mjs && npm run build` | Existing suites; create apply and runbook suites | pending |

*Status: pending · green · red · flaky*

---

## Wave 0 Requirements

Existing Node.js and `node:test` infrastructure covers this phase; no framework, configuration, or dependency installation is required. The apply suite and runbook are implementation deliverables, not Wave 0 tooling prerequisites.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Runbook completeness and rollback clarity | DATAREF-09 | The required operational guidance must be reviewed as a coherent maintainer workflow, including explicit boundaries and path-limited restore instructions. | Check each DATAREF-09 item against the runbook; confirm examples use repository-relative commands, prohibit provider fetching and unattended updates, and require reviewing the current diff before restoring only changed preset paths. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter after validation

**Approval:** pending plan review and execution
