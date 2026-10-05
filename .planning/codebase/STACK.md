---
last_mapped_commit: 481cebe91be1bd85692db4830b6fb645f1e0b5d0
last_mapped_at: 2026-10-05
---
# Technology Stack

**Analysis Date:** 2026-10-05

## Languages

**Primary:**
- TypeScript 5.7.0 - `tsconfig.json`, `src/**/*.ts`

**Secondary:**
- JavaScript / ES modules - `vite.config.ts`, `test/e2e/*.js`, browser glue in `src/**/*.js`
- HTML + CSS - `index.html`, `src/styles/**/*.css`, and component templates in `src/components/**/*.ts`

## Runtime

**Environment:**
- Browser runtime for the app shell, with a Vite dev server for local execution (`package.json`)
- Web Workers for Monte Carlo simulation in `src/simulation/worker-loader.ts` and `src/simulation/simulation.worker.ts`

**Package Manager:**
- npm - `package-lock.json`
- Lockfile: present

## Frameworks

**Core:**
- Vite 6.0.0 - bundling, dev server, PWA/static build config in `vite.config.ts`
- Web Components / custom elements - app UI composition under `src/components/` and `src/components/ui/`

**Testing:**
- Vitest 4.0.18 - test runner and config in `vitest.config.ts`, specs under `src/**/*.{test,spec}.{ts,tsx}`

**Build/Dev:**
- TypeScript 5.7.0 - compile-time checks in `tsconfig.json`
- `vite-plugin-comlink` - worker integration for `src/simulation/*`
- `vite-plugin-pwa` - installable app support in `vite.config.ts`
- `vite-plugin-singlefile` - portable single-file output for `dist-portable` in `vite.config.ts`

## Key Dependencies

**Critical:**
- `chart.js` 4.5.1 - chart rendering in `src/charts/`
- `chartjs-chart-matrix` 3.0.0 - matrix heatmap visualization support
- `dexie` 4.2.1 - IndexedDB persistence via `src/data/db.ts`
- `comlink` - worker RPC boundary in `src/simulation/index.ts` and `src/simulation/simulation.worker.ts`
- `seedrandom` 3.0.5 - seeded RNG in `src/simulation/monte-carlo.ts`
- `papaparse` 5.5.3 - CSV/JSON parsing in `src/data/services/bulk-import-service.ts` and `src/data/services/bulk-export-service.ts`

**Infrastructure:**
- `bottleneck` 2.19.5 - rate limiting for external market-data clients in `src/data/api/base-api.ts`
- `agent-browser` 0.6.0 - browser automation for E2E tests under `test/e2e/`
- `pixelmatch` 7.1.0 and `pngjs` 7.0.0 - visual regression comparisons in `test/e2e/`
- `cross-spawn` 7.0.6 - cross-platform test orchestration in `test/e2e/*.js`

## Configuration

**Environment:**
- No repository `.env` files are used for application runtime; API keys are user-entered and persisted in IndexedDB via `src/data/schemas/settings.ts`
- `package.json` defines Vite scripts: `npm run dev`, `npm run build`, `npm run build:portable`, and multiple `test:e2e*` commands

**Build:**
- `tsconfig.json` sets `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `strict: true`, `noEmit: true`
- `vite.config.ts` configures `comlink()`, `VitePWA(...)`, and a `portable` mode with `__PORTABLE_BUILD__`
- `vitest.config.ts` runs tests in a Node environment and includes `src/**/*.{test,spec}.{ts,tsx}`

## Platform Requirements

**Development:**
- Node.js + npm for the Vite toolchain, test runner, and browser automation
- Modern browser with IndexedDB and Web Worker support for local data persistence and simulation execution

**Production:**
- Static web app bundle: `dist/` for the PWA build and `dist-portable/` for the single-file build from `vite.config.ts`
- No server-side runtime or database service is bundled; all persistence is browser-local via IndexedDB

---

*Stack analysis: 2026-10-05*
