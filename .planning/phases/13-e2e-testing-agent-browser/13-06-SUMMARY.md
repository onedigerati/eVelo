---
phase: 13
plan: 06
subsystem: ci-cd
tags: [github-actions, e2e, ci, automation]
requires: [13-02, 13-03, 13-04]
provides: [ci-pipeline, test-orchestrator]
affects: []
tech-stack:
  added: []
  patterns: [ci-cd-workflow, test-orchestration, artifact-preservation]
key-files:
  created:
    - .github/workflows/e2e.yml
    - test/e2e/run-all.js
  modified: []
decisions:
  - id: critical-vs-noncritical
    choice: "Smoke and workflow tests are critical; responsive is non-critical"
    rationale: "Functional correctness (smoke, workflow) must pass for merge; visual layout warnings (responsive) are informational"
  - id: exclude-charts-from-ci
    choice: "Exclude charts.js visual regression from automated CI"
    rationale: "Requires baseline capture and deliberate human verification for initial setup"
  - id: sequential-execution
    choice: "Run tests sequentially, not in parallel"
    rationale: "Avoids port conflicts from multiple Vite servers; simplifies debugging"
metrics:
  duration: 4 min
  completed: 2026-01-22
---

# Phase 13 Plan 06: CI/CD Integration Summary

GitHub Actions CI/CD pipeline for E2E tests with test orchestrator for local and CI execution.

## What Was Built

### Test Orchestrator (test/e2e/run-all.js)

Created a Node.js test orchestrator that runs all E2E tests in sequence:

```javascript
const TESTS = [
  { name: 'Smoke Test', script: 'smoke.js', critical: true },
  { name: 'Workflow Test', script: 'workflow.js', critical: true },
  { name: 'Responsive Test', script: 'responsive.js', critical: false },
];
```

Key features:
- **Sequential execution** - Runs tests one at a time to avoid port conflicts
- **Critical vs non-critical** - Critical failures block CI; non-critical log warnings only
- **Full report** - Continues running all tests even after failure
- **Cross-platform** - Uses cross-spawn for Windows compatibility
- **Summary output** - Prints pass/fail counts and total duration

### GitHub Actions Workflow (.github/workflows/e2e.yml)

Created CI/CD workflow with:

```yaml
on:
  pull_request:
    branches: [main, master]
  push:
    branches: [main, master]
  workflow_dispatch:  # Manual trigger
```

Workflow features:
- **ubuntu-latest** runner with Node.js 20
- **npm ci** for clean, reproducible installs (triggers agent-browser postinstall)
- **4GB Node memory** for Monte Carlo simulations
- **15-minute timeout** for simulation completion
- **Artifact upload on failure** - screenshots/current/, screenshots/diff/, logs

## Commits

| Hash | Description |
|------|-------------|
| d373bd6 | Create E2E test orchestrator script |
| 1ab9d46 | Create GitHub Actions E2E test workflow |

## Files Created

| File | Purpose | Lines |
|------|---------|-------|
| test/e2e/run-all.js | Test orchestrator for sequential execution | 122 |
| .github/workflows/e2e.yml | GitHub Actions workflow definition | 62 |

## Key Decisions

1. **Critical vs Non-Critical Tests**
   - Smoke test: critical (basic app loading must work)
   - Workflow test: critical (simulation must complete)
   - Responsive test: non-critical (layout warnings don't block merge)

2. **Sequential Execution**
   - Chosen over parallel to avoid Vite server port conflicts
   - Simpler debugging when tests run in order

3. **Charts Excluded from CI**
   - Visual regression testing for Chart.js requires baseline images
   - Baselines must be captured and committed before enabling
   - Run manually with `npm run test:e2e:charts`

## Verification Results

| Criterion | Status |
|-----------|--------|
| run-all.js runs smoke, workflow, responsive in sequence | PASS |
| Smoke and workflow marked critical | PASS |
| Responsive marked non-critical | PASS |
| Summary prints pass/fail counts and duration | PASS |
| Workflow triggers on PR and push | PASS |
| Workflow uses npm ci (not npm install) | PASS |
| Workflow uploads artifacts on failure | PASS |
| Exit code 0 on critical pass, non-zero on critical fail | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Usage

**Local execution:**
```bash
npm run test:e2e           # Run all tests
npm run test:e2e:smoke     # Run smoke test only
npm run test:e2e:workflow  # Run workflow test only
npm run test:e2e:responsive # Run responsive test only
```

**CI execution:**
- Automatic on PR to main/master
- Automatic on push to main/master
- Manual via Actions > E2E Tests > Run workflow

**Debugging failures:**
1. Check workflow run logs
2. Download e2e-screenshots artifact
3. Compare current/ with baseline/ and review diff/ images

## Next Phase Readiness

Phase 13 (E2E Testing with Agent-Browser) is complete:
- Plan 01: Test infrastructure and helpers
- Plan 02: Smoke test
- Plan 03: Workflow test
- Plan 04: Responsive test
- Plan 06: CI/CD integration

All E2E tests are now running in GitHub Actions. Visual regression for charts can be enabled once baselines are captured.
