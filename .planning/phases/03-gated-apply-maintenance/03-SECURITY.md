---
phase: "03"
slug: "gated-apply-maintenance"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-10-06"
---

# Phase 03 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

## Trust Boundaries

| Boundary | Description | Data Crossing |
|-----------|-------------|---------------|
| Maintainer-selected artifacts → apply CLI | Source, manifest, and reviewed candidates are untrusted until freshly regenerated and byte-matched. | Local files and candidate bytes |
| Apply CLI → repository filesystem | The command may update only changed files from its fixed preset allow-list, after target preflight. | `stocks.json` and `indices.json` bytes |
| Maintenance CLI → browser/provider systems | Apply is local-filesystem-only and does not access provider APIs or browser custom-data storage. | No data crosses this boundary |
| Review claims → maintainer decision | A digest proves byte identity and freshness, not methodology correctness or reviewer authorization. | Provenance, methodology, coverage, and exception claims |

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-03-01 | Tampering | Reviewed candidates and report | high | mitigate | Fresh dry-run regeneration and byte comparisons cover both candidate partitions and report before any diff or write; apply tests reject edited and stale artifacts. (`apply.mjs`; `apply.test.mjs`) | closed |
| T-03-02 | Tampering | CLI arguments and preset target selection | high | mitigate | Strict known-flag parsing and internally fixed target paths prevent caller-directed writes. (`apply.mjs`; confirmed apply test) | closed |
| T-03-03 | Information disclosure / Elevation | Apply CLI integrations | high | mitigate | Apply uses local filesystem operations only; an integration test makes HTTP(S), `fetch`, and IndexedDB access throw if touched. (`apply.test.mjs`) | closed |
| T-03-04 | Tampering | Git working-tree target files | high | mitigate | Git porcelain status checks changed targets and rejects staged or unstaged local edits before mutation; both cases are covered by tests. (`apply.mjs`; `apply.test.mjs`) | closed |
| T-03-05 | Denial of service / Tampering | Sequential writes to changed preset targets | medium | mitigate | Candidate shape and all pending target preconditions are validated before writes; written bytes are verified. The runbook documents possible partial completion and path-limited rollback without claiming transactionality. | closed |
| T-03-06 | Tampering | Concurrent apply invocations | low | accept | Concurrent invocation is unsupported; CLI usage and the maintainer runbook require a single serial apply process and make no locking guarantee. | closed |
| T-03-07 | Spoofing / Tampering | Review report and source digest interpretation | medium | mitigate | The runbook explicitly states that checksum identity proves freshness only and does not replace human review of attribution, methodology, coverage, or exceptions. | closed |
| T-03-08 | Tampering | Git rollback commands | high | mitigate | The runbook requires inspecting the current diff and restoring only the exact preset path changed by apply; runbook contract tests enforce the path-limited wording. | closed |
| T-03-SC | Tampering | npm dependency installation | high | mitigate | No npm dependency was added; package changes only register scripts. The separately installed GitHub CLI was checksum-verified from the official release and is outside the project dependency set. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*  
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`.*  
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party).*

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-03-01 | T-03-06 | Concurrent apply invocations are unsupported in this local, operator-initiated workflow; the operator runs one process at a time. No locking or serialization guarantee is claimed. | Phase 03 plan decision | 2026-10-06 |

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-06 | 9 | 9 | 0 | Copilot CLI — ASVS L1 evidence review |

ASVS L1 short-circuit applied: the plans contain an authored threat register, all high-or-above mitigations have implementation/test evidence, and the configured threshold is high. No separate auditor pass was required for this level and zero-open result.

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-10-06
