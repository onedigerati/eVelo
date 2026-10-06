---
last_mapped_commit: 481cebe91be1bd85692db4830b6fb645f1e0b5d0
last_mapped_at: 2026-10-05
---
# Coding Conventions

**Analysis Date:** 2026-10-05

## Naming Patterns

**Observed practice:**
- Files are lower-case and kebab-case, with feature-oriented names such as `src/components/ui/progress-indicator.ts`, `src/data/services/market-data-service.ts`, and `src/calculations/sell-strategy.ts`.
- TypeScript classes use PascalCase, e.g., `BaseComponent` in `src/components/base-component.ts` and `SBLOCStateValidationError` in `src/sbloc/validation.ts`.
- Functions and methods are camelCase, e.g., `calculateSellStrategy` in `src/calculations/sell-strategy.ts`, `parseAndValidateCsv` in `src/data/validation/data-validator.ts`, and `validateSBLOCState` in `src/sbloc/validation.ts`.
- Boolean-like state fields use descriptive names such as `currentLTV`, `loanBalance`, `yearsSinceStart`, and `portfolioValue` in `src/sbloc/types.ts` and `src/sbloc/validation.ts`.
- Module barrels use the `index.ts` pattern, with re-exports in `src/math/index.ts` and `src/calculations/index.ts`.

**Gaps / not yet standardized:**
- There is no single lint rule or naming policy document enforcing patterns beyond the code itself; conventions are inferred from implementation rather than formal schema.
- Some helper and config names are more domain-specific than uniformly grouped, such as `test/e2e/helpers/agent-browser.js` and `test/e2e/helpers/screenshot.js`.

## Code Style

**Observed practice:**
- TypeScript is the dominant language, with strict settings in `tsconfig.json`: `strict: true`, `noEmit: true`, `target: 'ES2022'`, and `moduleResolution: 'bundler'`.
- The codebase prefers semicolons and single quotes, as seen in `src/components/base-component.ts`, `vite.config.ts`, and `test/e2e/run-all.js`.
- Indentation is typically 2 spaces and blocks are explicit, with a preference for plain objects and explicit return values rather than mutation-heavy hidden state.
- Exported functions and classes commonly use JSDoc blocks, especially in `src/sbloc/validation.ts` and `src/data/validation/data-validator.ts`.

**Gaps / not yet standardized:**
- No `.prettierrc`, `eslint.config.*`, or `biome.json` file was detected at the repo root, so formatting and linting are not centrally enforced.
- The project relies on TypeScript compiler checks and manual review rather than a consistent linter workflow.

## Import Organization

**Observed practice:**
- Modules mostly import local relative files, often to sibling modules or barrel files, e.g., `import { describe, test, expect } from 'vitest';` in `src/calculations/__tests__/sell-strategy.test.ts` and `import Papa from 'papaparse';` in `src/data/validation/data-validator.ts`.
- The repo uses barrel exports for domain modules: `src/math/index.ts`, `src/calculations/index.ts`, and `src/components/ui/index.ts` centralize public APIs.
- There are no path aliases configured in `tsconfig.json`; imports are local instead of using `@/`-style aliasing.

**Gaps / not yet standardized:**
- Import order is not rigidly enforced; the codebase is pragmatic rather than formal, with no linter rule to sort or group imports.

## Error Handling

**Observed practice:**
- Validation errors are represented as structured objects with explicit types, typically `errors` and `warnings` arrays. See `ValidationResult`, `ValidationError`, and `ValidationWarning` in `src/data/validation/data-validator.ts`.
- Custom domain exceptions are used when state is invalid or unsafe, especially in `src/sbloc/validation.ts`, where `SBLOCStateValidationError extends Error` captures a `field` and `state` snapshot for debugging.
- Numeric guards are explicit: the code rejects `NaN`, negative values, and invalid `Infinity` conditions before calculations proceed.
- Data ingestion is designed to fail gracefully: the CSV/JSON validators return structured validation results instead of throwing unhandled runtime exceptions.

**Gaps / not yet standardized:**
- There is no single application-level error boundary or global logger abstraction for UI-level exceptions.
- Some modules rely on permissive fallback behavior rather than a universal fail-fast validation pattern.

## Logging

**Observed practice:**
- Console logging is used for script diagnostics and test reporting, e.g., `console.log` in `test/e2e/run-all.js` and examples in `src/sbloc/validation.ts` comments.
- Debugging utilities exist in `src/utils/debug-layout.ts` for browser-side layout diagnostics, which indicates a practical, console-based debugging style.

**Gaps / not yet standardized:**
- There is no formal logging framework or centralized log policy; behavior is largely ad hoc and console-based.

## Comments and Documentation

**Observed practice:**
- JSDoc-style comments are common on public APIs and domain classes, especially in `src/sbloc/validation.ts`, `src/data/validation/data-validator.ts`, and `src/components/base-component.ts`.
- Comments often explain edge cases and complex business logic, particularly in validation and financial modules.

**Gaps / not yet standardized:**
- Not every file is equally documented; the repo does not enforce JSDoc coverage for all functions.

## Function Design

**Observed practice:**
- Core business logic is generally function-based and pure where possible, especially in the financial modules under `src/calculations/` and `src/math/`.
- Functions frequently accept a config object instead of many positional parameters, e.g., `calculateSellStrategy(config, percentiles)` in `src/calculations/__tests__/sell-strategy.test.ts` and related modules.
- State updates are explicit and return new state values rather than mutating hidden state; this is especially visible in the SBLOC modules under `src/sbloc/`.
- Lifecycle methods are used in component class patterns via `connectedCallback`, `disconnectedCallback`, and `render` in `src/components/base-component.ts`.

**Gaps / not yet standardized:**
- The codebase is not entirely consistent about whether pure functions or class instances should own logic; some domains are functional, while others are component-driven and lifecycle-oriented.

## Module Design

**Observed practice:**
- Domain-driven modules are separated by feature area: `src/calculations/`, `src/sbloc/`, `src/simulation/`, `src/data/`, and `src/components/`.
- Barrel exports are used to expose stable interfaces and public APIs, as seen in `src/calculations/index.ts` and `src/math/index.ts`.
- Tests sit next to source modules in `__tests__/` directories (`src/simulation/__tests__/`, `src/sbloc/__tests__/`, `src/calculations/__tests__/`) instead of a single centralized test tree.

**Gaps / not yet standardized:**
- The repo is organized by feature, but there is no formal architectural boundary policy or dependency-graph enforcement beyond convention and review.

---

*Convention analysis: 2026-10-05*
