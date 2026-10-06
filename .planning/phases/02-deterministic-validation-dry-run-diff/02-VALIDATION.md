---
phase: "02"
slug: "deterministic-validation-dry-run-diff"
status: draft
nyquist_compliant: false
wave_0_complete: false
created: "2026-10-06"
---

# Phase 02 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js built-in `node:test` |
| **Config file** | None for maintenance `.mjs` tests; run directly with Node |
| **Quick run command** | `node --test test/maintenance/historical-returns/dry-run.test.mjs` |
| **Full suite command** | `npm run test:refresh-identify && node --test test/maintenance/historical-returns/schema-contract.test.mjs && node --test test/maintenance/historical-returns/dry-run.test.mjs` |
| **Estimated runtime** | Local test suite; measure after Wave 0 adds the dry-run suite |

---

## Sampling Rate

- **After every task commit:** Run `node --test test/maintenance/historical-returns/dry-run.test.mjs`
- **After every plan wave:** Run the full suite command above
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** Keep the focused dry-run suite under 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| Assigned in PLAN | 02 | 0/1 | DATAREF-04 | N/A | Blocking errors create no candidates; malformed inputs are never normalized | unit / CLI | `node --test test/maintenance/historical-returns/dry-run.test.mjs` | ❌ Wave 0 | ⬜ pending |
| Assigned in PLAN | 02 | 0/1 | DATAREF-05 | N/A | Coverage and explicit subset claims fail closed; no periods are silently filled | integration | `node --test test/maintenance/historical-returns/dry-run.test.mjs` | ❌ Wave 0 | ⬜ pending |
| Assigned in PLAN | 02 | 0/1 | DATAREF-06 | N/A | Writes stay outside `src/data/presets`; IndexedDB and bundled preset bytes remain unchanged | CLI integration | `node --test test/maintenance/historical-returns/dry-run.test.mjs` | ❌ Wave 0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `test/maintenance/historical-returns/dry-run.test.mjs` — strict parsing, aggregate diagnostics, complete/subset coverage, candidate partitioning, output-path safety, deterministic output, and preset non-mutation tests
- [ ] Add a package script for the focused dry-run test command
- [ ] No new dependency is required; use the existing Node.js and Papa Parse dependencies

---

## Manual-Only Verifications

All phase behaviors have automated verification.

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
