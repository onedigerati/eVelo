# Technology Stack

**Project:** eVelo — maintainer-runnable, provider-neutral historical preset refresh
**Researched:** 2026-10-05
**Scope:** Tooling for refreshing annual-return preset JSON from maintainer-selected, reviewed CSV/JSON files. This does not evaluate or add market-data providers.

## Recommended Stack

### Core Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node.js ES modules (`.mjs`) | Existing project prerequisite: Node.js 18+ | Run a small maintainer CLI for input validation and preset generation | `package.json` already declares `"type": "module"` and the README documents Node.js 18+. Node's built-in filesystem, path, and process-argument APIs cover the CLI without an extra runtime. Keeping the script as `.mjs` avoids changing the app's TypeScript configuration or introducing a TS execution loader. |
| Existing npm scripts | npm as currently used by the project | Give maintainers explicit validate/refresh/check commands | Fits the existing `package.json` workflow and is easy to run locally or in CI. These would be new script aliases, not a new task-runner dependency. |

### Database
Not applicable. The refresh tool should generate checked-in JSON files under `src/data/presets`; it should not connect to or modify IndexedDB.

### Infrastructure
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Node built-ins (`node:fs/promises`, `node:path`, `process.argv`) | Included with the supported Node runtime | Read reviewed files, validate arguments, and write or compare outputs | Avoids a build service, runtime API credentials, network access, and new infrastructure. Generate locally and review the resulting Git diff. |

### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `papaparse` | **5.5.3 locked** (`package-lock.json`) | Parse CSV source files | Reuse the package already used by the app's bulk import and validation code. Configure header parsing and explicit header normalization; retain strings during parsing and validate/convert numeric values explicitly. Check parser errors as well as field-level validation. |
| `@types/papaparse` | **5.5.2 locked** (`package-lock.json`) | Type definitions for Papa Parse in TypeScript consumers | Already installed. A plain `.mjs` maintainer script does not need TypeScript declarations, but no new types package is needed if TypeScript is later selected. |
| `JSON.parse` / `JSON.stringify` | Node built-ins | Parse JSON input and serialize canonical preset outputs | Sufficient for JSON input and the existing JSON preset representation; no JSON parsing or schema package is warranted for this narrowly bounded local format. Validate parsed values explicitly before serialization. |
| Vitest | **4.0.18 locked** (`package-lock.json`) | Unit tests for input validation and deterministic generation | Reuse the project's test runner for malformed rows, duplicate years/symbols, invalid numeric values, boundary cases, and repeatable output. Keep the production refresh command usable without running the entire application build. |

## Recommended Tool Shape

- Put the maintainer utility under `scripts/` as an ESM `.mjs` file. Read only explicit file paths passed by the maintainer; accept CSV and JSON inputs, and do not fetch or infer an upstream provider.
- Give the accepted input contract a short checked-in schema/example. For CSV, a straightforward annual-row shape is `symbol,name,asset_class,year,annual_return`; JSON should represent the same information explicitly. Keep the source-data convention explicit: annual returns are decimal fractions (for example, `0.12` means 12%), not percentage points.
- Provide small npm commands, for example:
  - `npm run presets:validate -- --source path/to/reviewed.csv` — parse and validate without touching bundled output.
  - `npm run presets:refresh -- --source path/to/reviewed.csv` — generate the corresponding preset file(s).
  - `npm run presets:check -- --source path/to/reviewed.csv` — regenerate in memory and fail if checked-in output differs, without writing.
- Build outputs in memory only after *all* selected inputs pass validation. The check command should make refreshes reviewable and suitable for CI; the write command should use a same-directory temporary file and rename after successful generation so failures do not leave partial JSON.
- Keep the output compatible with the current preset shape: asset metadata (`symbol`, `name`, `assetClass`, `startDate`, `endDate`) and annual `returns` records (`date`, `return`). Preserve the established decimal convention and year-valued return dates.
- Make output deterministic: explicitly sort asset symbols and annual records, construct fields in a fixed order, use one JSON indentation/newline convention, and omit run timestamps, machine-specific paths, locale-dependent formatting, and other volatile metadata. Do not round or convert source values silently; any intended precision rule must be explicit and tested.
- Validate before generating: required headers/fields, nonempty identifiers, finite numeric returns, valid year values, duplicate symbol-year pairs, permissible return bounds (a total loss of `-1` is distinct from returns below `-1`), and the project's documented gap policy. Reject parser errors and unexpected/missing columns rather than quietly dropping data. Retain source provenance (source label/URL if supplied, retrieval/as-of date, return methodology/adjustment basis, and reviewer) with the reviewed input or an accompanying manifest; do not invent provenance from filenames.
- Test both successful and rejected inputs, and assert that identical source bytes and options produce identical output bytes. Keep source-data review separate from whether the transformation is deterministic: a repeatable generator cannot establish that the supplied returns are correct or licensed.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Script runtime | Node `.mjs` | Add `tsx`, `ts-node`, or another TypeScript runtime | Adds a tool and execution path for a small utility. The app's current `tsconfig.json` is `noEmit`, uses bundler module resolution, and includes only `src`; a script runner would be a separate configuration concern. |
| CSV parser | Existing Papa Parse 5.5.3 | Add `csv-parse`, `fast-csv`, or hand-roll CSV parsing | The dependency and real usage already exist in `src/data/validation/data-validator.ts` and `src/data/services/bulk-import-service.ts`. A hand-written parser risks mishandling quoted fields and escaped delimiters. |
| JSON validation | Explicit checks against the narrow input/output contract | Add a general schema-validation dependency | Current inputs are maintainer-supplied files and the preset shape is small. Explicit checks and tests are adequate; revisit only if formats multiply or schemas become shared across tools. |
| CLI framework | Minimal argument parsing with a small documented option set | Add a command framework such as Commander/Yargs | A few explicit source/check options do not justify another dependency or abstraction. |
| Data acquisition | Reviewed, local CSV/JSON source files | Market-data SDKs, provider clients, download scripts, or scheduled API jobs | Direct retrieval is out of scope by user decision and would couple the refresh process to provider availability, credentials, terms, and API-specific normalization. |
| Runtime data model | Existing JSON preset schema | Add a database, generated-code pipeline, or new storage format | The app already imports presets from `src/data/presets`; keep the established format and avoid an unrelated migration. |

## Installation

No installation command is recommended. The required runtime and packages are already present.

```bash
# No new dependencies required.
# Existing relevant packages: papaparse, @types/papaparse, vitest
```

## Repository Evidence

- `package.json`: ESM package (`"type": "module"`), Node.js 18+ documented in `README.md`, existing scripts for builds/tests, and existing Papa Parse/Vitest dependencies.
- `package-lock.json`: resolved versions verified as `papaparse` 5.5.3, `@types/papaparse` 5.5.2, and Vitest 4.0.18.
- `src/data/presets/sp500.json`, `indices.json`, `stocks.json`: checked-in annual-return preset JSON; records use year strings and decimal returns.
- `src/data/services/preset-service.ts`: application imports and consumes the preset files.
- `src/data/validation/data-validator.ts` and `src/data/services/bulk-import-service.ts`: existing Papa Parse usage, CSV/JSON parsing, header normalization, and validation patterns. These are useful references, but the existing UI import path should not be assumed to meet stricter batch-generation requirements without review.
- `tsconfig.json`: strict TypeScript, `moduleResolution: "bundler"`, `noEmit: true`, and `include: ["src"]`; avoid expanding application compilation settings for a maintainer-only tool.

## Sources

- Node.js official documentation — [ECMAScript modules](https://nodejs.org/api/esm.html), [File system](https://nodejs.org/api/fs.html), [Path](https://nodejs.org/api/path.html), and [Process](https://nodejs.org/api/process.html). Consulted 2026-10-05. These document the ESM and built-in CLI primitives needed; project runtime floor is taken from this repository's README.
- Papa Parse official documentation — [Documentation](https://www.papaparse.com/docs). Consulted 2026-10-05 for CSV string parsing, header/configuration options, and parse-result/error handling. Current installed package version is verified from this repository's lockfile, not inferred from the documentation site.
- TypeScript official documentation — [TSConfig reference](https://www.typescriptlang.org/tsconfig/) and [Handbook](https://www.typescriptlang.org/docs/handbook/intro.html). Consulted 2026-10-05; project-specific execution recommendation is based on this repository's actual `tsconfig.json` and package module setting.
- eVelo repository files listed under **Repository Evidence** above.

## Confidence and Gaps

**Overall confidence: MEDIUM.** The recommendation is grounded in the existing lockfile, current preset files, app parsing code, and official Node/Papa Parse documentation. GSD's web-search route was unavailable because its Brave API key was not configured, so this report does not make claims about relative ecosystem popularity.

The CSV/JSON source contract, approved source provenance, adjustment methodology, and policy for missing years still need explicit maintainer decisions. Those are data-governance decisions, not reasons to add more tooling. Re-check the project Node support policy if it changes before choosing script syntax.
