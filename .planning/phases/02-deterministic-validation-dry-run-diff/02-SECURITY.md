---
phase: "02"
slug: "deterministic-validation-dry-run-diff"
status: verified
threats_open: 0
asvs_level: 1
created: "2026-10-06"
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Selected source and manifest → maintenance CLI | Caller-selected local files are untrusted until identity, syntax, shape, and semantic checks complete. | Reviewed CSV/JSON records and provenance |
| Validation result → candidate writer | Candidate creation is permitted only after blocking diagnostics are clear. | Validated annual returns and metadata |
| Caller output path → filesystem writer | Lexical paths, symlinks, and raced-in entries must not redirect or replace protected files. | Candidate JSON and Markdown report |

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-02-01 | Tampering | Source/manifest parser | high | mitigate | Exact-byte source/manifest pairing, strict parsing, and validation before candidate generation; `dry-run.mjs:184-241,616-850`; `dry-run.test.mjs:652-775` | closed |
| T-02-02 | Tampering | Candidate writer | high | mitigate | Candidate files are emitted only under the explicit output directory; all preset bytes are checked across success, warning, and blocking cases; `dry-run.mjs:1003-1171,1340-1355`; `dry-run.test.mjs:443-469` | closed |
| T-02-03 | Tampering | CSV/JSON validation | high | mitigate | Closed schema and semantic checks preserve raw values, aggregate blockers, and suppress candidates on invalid input; `dry-run.mjs:616-945`; `dry-run.test.mjs:652-872` | closed |
| T-02-04 | Tampering | Duplicate-key handling | medium | mitigate | Nested duplicate JSON keys are detected before parsing in source and manifest; `dry-run.mjs:58-165`; `dry-run.test.mjs:684-713` | closed |
| T-02-05 | Tampering | Coverage comparison | high | mitigate | Exact symbol/year set comparison blocks removals and never fills gaps; `dry-run.mjs:906-1003`; `dry-run.test.mjs:196-266` | closed |
| T-02-06 | Tampering | New-symbol routing | medium | mitigate | New assets require explicit manifest destinations; stale routes and routes for known symbols block; `dry-run.mjs:1003-1048`; `dry-run.test.mjs:267-318` | closed |
| T-02-07 | Tampering | Output path resolution | high | mitigate | Canonical physical paths and segment-aware containment reject preset paths, traversal, and symlink aliases; `dry-run.mjs:1273-1320`; `dry-run.test.mjs:601-648` | closed |
| T-02-08 | Tampering | Candidate/report file creation | high | mitigate | Output targets are preflighted and created exclusively, preserving raced-in files; `dry-run.mjs:1306-1355`; `dry-run.test.mjs:506-600` | closed |
| T-02-09 | Repudiation | Report serializer | medium | mitigate | Stable serialization and repeated-run byte comparisons exclude timestamps and temporary paths; `dry-run.mjs:1171-1225`; `dry-run.test.mjs:388-442` | closed |
| T-02-SC | Tampering | Dependency installation | high | mitigate | No dependency installation or package addition was part of Phase 2; the maintenance CLI uses existing dependencies. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above `workflow.security_block_on` count toward `threats_open`.*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party).*

---

## Accepted Risks Log

No accepted risks.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-10-06 | 10 | 10 | 0 | Phase 2 verification (ASVS L1) |

---

## Sign-Off

- [x] All threats have a disposition.
- [x] Accepted risks documented; none were accepted.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** verified 2026-10-06
