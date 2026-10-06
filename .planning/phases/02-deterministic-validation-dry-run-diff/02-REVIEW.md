---
phase: 02-deterministic-validation-dry-run-diff
reviewed: 2026-10-06T17:12:04Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - scripts/maintenance/historical-returns/dry-run.mjs
  - test/maintenance/historical-returns/dry-run.test.mjs
  - test/maintenance/historical-returns/schema-contract.test.mjs
  - docs/maintenance/historical-returns/schemas/annual-return-review-manifest.schema.json
  - docs/maintenance/historical-returns/source-contract.md
  - package.json
findings:
  critical: 1
  warning: 1
  info: 0
  total: 2
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-10-06T17:12:04Z  
**Depth:** standard  
**Files Reviewed:** 6  
**Status:** issues_found

## Summary

The dry-run validation, diff generation, output safety, schemas, tests, contract documentation, and npm scripts were reviewed. One input-decoding defect can silently alter reviewed data while still producing candidates; the routing schema also accepts keys that runtime validation rejects.

## Narrative Findings (AI reviewer)

### Critical Issues

#### CR-01: [BLOCKER] Invalid UTF-8 is silently replaced during input decoding

**File:** `scripts/maintenance/historical-returns/dry-run.mjs:238, 618`

**Issue:** `Buffer.toString('utf8')` replaces malformed byte sequences with U+FFFD instead of rejecting them. A CSV containing an invalid byte in an otherwise valid asset name was accepted with exit status 0, and the candidate contained the altered name (`�`). The manifest is decoded the same way, so malformed provenance text can also be accepted after alteration. Hashing the original bytes does not protect the parsed records from this lossy conversion. The documented CSV contract requires UTF-8.

**Fix:** Decode source and manifest bytes with fatal UTF-8 validation (for example, `TextDecoder('utf-8', { fatal: true })`) and add a blocking diagnostic on decoding failure before parsing or writing candidates.

### Warnings

#### WR-01: [WARNING] Routing schema permits symbol keys rejected by runtime

**File:** `docs/maintenance/historical-returns/schemas/annual-return-review-manifest.schema.json:47-50`; `scripts/maintenance/historical-returns/dry-run.mjs:532-535, 734-740`

**Issue:** The schema's `propertyNames` pattern only requires at least one non-whitespace character, so keys such as `" NEW "` validate against the manifest schema. Runtime validation rejects surrounding whitespace with `symbol-whitespace`, making schema-valid manifests unusable and leaving the canonical contract inconsistent.

**Fix:** Constrain `propertyNames` to reject leading or trailing whitespace, and add a schema-contract case for a padded routing key.

---

_Reviewed: 2026-10-06T17:12:04Z_  
_Reviewer: the agent (gsd-code-reviewer)_  
_Depth: standard_
