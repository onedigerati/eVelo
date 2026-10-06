# Phase 3: Gated Apply & Maintenance - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-10-06
**Phase:** 03-gated-apply-maintenance
**Areas discussed:** Candidate integrity and freshness, Explicit apply gate and write scope, Rollback and runbook

---

## Candidate integrity and freshness

| Option | Description | Selected |
|--------|-------------|----------|
| Fresh exact match | Rerun dry-run from the selected source and manifest against the current baseline; require generated candidates to byte-match reviewed artifacts. | ✓ |
| Shape-valid candidate | Validate candidate shape and scope, then apply even if it differs from a fresh dry run. | |
| Source-checksum trust | Trust output-directory candidates whenever the source checksum matches. | |

**Auto-selected choice:** Fresh exact match (recommended default).
**Notes:** Autonomous mode selected the fail-closed option; edited or stale candidate artifacts are not accepted.

---

## Explicit apply gate and write scope

| Option | Description | Selected |
|--------|-------------|----------|
| Separate command and confirmation | Require a separate `refresh:apply` invocation with an explicit confirmation signal; write only changed validated preset partitions. | ✓ |
| Interactive prompt only | Require an interactive terminal Y/N confirmation. | |
| Separate command only | Treat invocation of the apply command as sufficient approval and apply every candidate file. | |

**Auto-selected choice:** Separate command and confirmation (recommended default).
**Notes:** Dry-run remains non-mutating; browser custom data is never part of apply.

---

## Rollback and runbook

| Option | Description | Selected |
|--------|-------------|----------|
| Git-based recovery | Require clean target files; review the exact diff and use path-limited Git rollback for the files changed by apply. | ✓ |
| External backups | Allow dirty targets but create timestamped copies outside presets before apply. | |
| Overwrite and manual recovery | Allow overwriting local edits and rely on manual recovery. | |

**Auto-selected choice:** Git-based recovery (recommended default).
**Notes:** The runbook must instruct maintainers to inspect the current diff before restoring files.

---

## the agent's Discretion

- Exact confirmation-flag spelling, helper organization, and test-fixture structure remain open implementation details.

## Deferred Ideas

None.
