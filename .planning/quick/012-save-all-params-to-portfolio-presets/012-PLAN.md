---
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/schemas/portfolio.ts
  - src/data/services/portfolio-service.ts
  - src/components/ui/portfolio-composition.ts
  - src/components/app-root.ts
autonomous: true

must_haves:
  truths:
    - User can save portfolio with all parameter settings (SBLOC, simulation, chapters, taxes)
    - User can load saved portfolio and all parameters restore
    - Loading old portfolio without params uses default values (backward compatible)
  artifacts:
    - path: "src/data/schemas/portfolio.ts"
      provides: "Extended PortfolioRecord interface with simulation params"
      contains: "sblocParams|simulationParams|withdrawalChapters|taxModeling"
    - path: "src/data/services/portfolio-service.ts"
      provides: "Save/load functions handle optional param fields"
      min_lines: 50
    - path: "src/components/ui/portfolio-composition.ts"
      provides: "Save captures params from app-root, load restores them"
      min_lines: 1600
    - path: "src/components/app-root.ts"
      provides: "Methods to get/set all parameter values"
      contains: "getSimulationParams|setSimulationParams"
  key_links:
    - from: "src/components/ui/portfolio-composition.ts"
      to: "app-root"
      via: "custom event to request/restore params"
      pattern: "dispatchEvent.*get-simulation-params|addEventListener.*set-simulation-params"
    - from: "src/data/schemas/portfolio.ts"
      to: "SimulationConfig types"
      via: "import from simulation/types"
      pattern: "import.*SBLOCSimConfig|WithdrawalChaptersConfig|TaxModelingConfig"
---

<objective>
Extend portfolio presets to save and restore complete simulation configuration (SBLOC terms, simulation settings, withdrawal chapters, tax modeling) so users can save entire scenario configurations, not just asset allocations.

Purpose: Enable users to create comprehensive preset scenarios (e.g., "Conservative 30yr", "Aggressive 15yr with Tax") that capture all parameters for quick experimentation and comparison.

Output: Portfolio save/load includes all sidebar parameters with backward compatibility for existing saved portfolios.
</objective>

<execution_context>
@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/.planning/PROJECT.md
@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/.planning/ROADMAP.md
@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/.planning/STATE.md

## Current Implementation

Portfolio presets currently save:
- Portfolio name, created/modified timestamps
- Asset array: symbol, name, assetClass, weight (0-1 scale)

Missing parameters (from screenshot and app-root.ts):
1. **Line of Credit Terms** (4 params)
   - sblocRate (%), maxBorrowing (%), maintenanceMargin (%), liquidationHaircut (%)
2. **Simulation Settings** (3 params)
   - iterations, inflationRate (%), returnModel ('bootstrap'|'regime'), regimeCalibration
3. **Withdrawal Chapters** (optional, 5 params when enabled)
   - enabled, chapter2.yearsAfterStart, chapter2.reductionPercent, chapter3.yearsAfterStart, chapter3.reductionPercent
4. **Tax Modeling** (optional, 5 params when enabled)
   - enabled, taxAdvantaged, dividendYield (%), ordinaryTaxRate (%), ltcgTaxRate (%)

Also in collectSimulationParams but outside screenshot scope:
- Timeline: startYear, withdrawalStartYear (calendar year)
- Portfolio: initialValue, initialLocBalance
- Withdrawal: annualWithdrawal, annualRaise, monthlyWithdrawal
- Time horizon: timeHorizon (years)

**Strategy:** Save ALL simulation parameters to enable complete scenario reproduction.

## Key Files

@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/src/data/schemas/portfolio.ts
@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/src/data/services/portfolio-service.ts
@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/src/components/ui/portfolio-composition.ts
@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/src/components/app-root.ts
@C:/Users/ungac/source/repos/BuyBorrowDie/eVelo/src/simulation/types.ts
</context>

<tasks>

<task type="auto">
  <name>Extend schema and add param capture/restore API</name>
  <files>
    src/data/schemas/portfolio.ts
    src/components/app-root.ts
  </files>
  <action>
**1. Extend PortfolioRecord interface** (portfolio.ts):

Add optional simulation parameter fields (all optional for backward compatibility):
```typescript
export interface PortfolioRecord {
  // Existing fields
  id?: number;
  name: string;
  assets: AssetRecord[];
  created: string;
  modified: string;
  version: number;

  // NEW: Simulation configuration (all optional)
  // Portfolio & Timeline
  initialValue?: number;
  initialLocBalance?: number;
  startYear?: number;
  withdrawalStartYear?: number;
  timeHorizon?: number;

  // Withdrawal Strategy
  annualWithdrawal?: number;
  annualRaise?: number;  // 0-1 scale (not percent)
  monthlyWithdrawal?: boolean;

  // SBLOC Terms
  sblocRate?: number;  // 0-1 scale (not percent)
  maxBorrowing?: number;  // 0-1 scale (not percent)
  maintenanceMargin?: number;  // 0-1 scale (not percent)
  liquidationHaircut?: number;  // 0-1 scale (not percent)

  // Simulation Settings
  iterations?: number;
  inflationRate?: number;  // 0-1 scale (not percent)
  returnModel?: 'bootstrap' | 'regime';
  regimeCalibration?: 'historical' | 'conservative';

  // Withdrawal Chapters
  withdrawalChapters?: {
    enabled: boolean;
    chapter2?: { yearsAfterStart: number; reductionPercent: number };
    chapter3?: { yearsAfterStart: number; reductionPercent: number };
  };

  // Tax Modeling
  taxModeling?: {
    enabled: boolean;
    taxAdvantaged: boolean;
    dividendYield: number;  // 0-1 scale (not percent)
    ordinaryTaxRate: number;  // 0-1 scale (not percent)
    ltcgTaxRate: number;  // 0-1 scale (not percent)
  };
}
```

**2. Add param capture/restore methods** (app-root.ts):

Add public method `getSimulationParams()` that returns object with all current parameter values (use existing helper methods like `getNumberInputValue`, `getRangeSliderValue`, `getCheckboxValue`, `getSelectInputValue`). Return decimal values (0-1) NOT percentages (0-100) to match storage convention.

Add public method `setSimulationParams(params: Partial<PortfolioRecord>)` that sets all input values from saved params. Convert from 0-1 to 0-100 for percent sliders. Use `querySelector` + property setters for custom elements (e.g., `this.querySelector<RangeSlider>('#sbloc-rate').value = params.sblocRate * 100`). Set defaults for missing fields.

Add event listener for `get-simulation-params` custom event that responds with `getSimulationParams()` data.
Add event listener for `set-simulation-params` custom event that calls `setSimulationParams(event.detail)`.

**Why this approach:** Custom events maintain loose coupling between portfolio-composition and app-root. Optional fields ensure backward compatibility with existing saved portfolios.
  </action>
  <verify>
- `grep -n "initialValue\\?:" src/data/schemas/portfolio.ts` shows optional param fields
- `grep -n "getSimulationParams\|setSimulationParams" src/components/app-root.ts` shows new methods
- `grep -n "get-simulation-params\|set-simulation-params" src/components/app-root.ts` shows event listeners
  </verify>
  <done>
PortfolioRecord interface extended with 20+ optional simulation parameter fields. App-root has getSimulationParams/setSimulationParams methods and event listeners.
  </done>
</task>

<task type="auto">
  <name>Update save/load flow to capture and restore params</name>
  <files>
    src/components/ui/portfolio-composition.ts
  </files>
  <action>
**Modify savePreset() method:**

After line 1331 (`const assets = this.buildAssetRecords();`), dispatch `get-simulation-params` event to app-root:
```typescript
const paramsEvent = new CustomEvent('get-simulation-params', {
  bubbles: true,
  composed: true,
  detail: { callback: null },  // Will be set synchronously
});
let simulationParams: any = {};
paramsEvent.detail.callback = (params: any) => { simulationParams = params; };
this.dispatchEvent(paramsEvent);
```

Merge `simulationParams` into the portfolio record before calling `savePortfolio`:
```typescript
const id = await savePortfolio({
  id: portfolioId,
  name: trimmedName,
  assets,
  created: createdTimestamp,
  modified: now,
  version: 1,
  ...simulationParams,  // Spread all simulation params
});
```

**Modify populateFromPortfolio() method:**

After line 880 (`this.updatePresetSelect();`), dispatch `set-simulation-params` event if portfolio has simulation params:
```typescript
// Restore simulation parameters if present
if (portfolio.initialValue !== undefined || portfolio.sblocRate !== undefined) {
  this.dispatchEvent(new CustomEvent('set-simulation-params', {
    bubbles: true,
    composed: true,
    detail: portfolio,  // Pass entire portfolio record
  }));
}
```

**Why this approach:** Event-based communication keeps portfolio-composition decoupled from app-root internals. Spreading params into portfolio record keeps save logic simple. Conditional restore preserves backward compatibility.
  </action>
  <verify>
- `grep -n "get-simulation-params" src/components/ui/portfolio-composition.ts` shows event dispatch in savePreset
- `grep -n "set-simulation-params" src/components/ui/portfolio-composition.ts` shows event dispatch in populateFromPortfolio
- `grep -n "...simulationParams" src/components/ui/portfolio-composition.ts` shows param spreading into savePortfolio call
  </verify>
  <done>
Portfolio save captures all simulation params via event. Portfolio load restores all params via event. Backward compatible with old portfolios missing param fields.
  </done>
</task>

<task type="auto">
  <name>Update portfolio service for param persistence</name>
  <files>
    src/data/services/portfolio-service.ts
  </files>
  <action>
**Update savePortfolio function:**

No changes needed - Dexie will automatically persist all fields in the PortfolioRecord object. The extended schema is backward compatible (optional fields).

**Update loadAllPortfolios, findPortfolioByName functions:**

No changes needed - Dexie returns all fields present in the database. Missing fields will be `undefined`.

**Update exportAndDownload function:**

No changes needed - existing code strips `id` but preserves all other fields. Simulation params will be exported.

**Update importFromFile function:**

No changes needed - existing code handles any valid PortfolioRecord fields. Simulation params will be imported if present.

**Verify backward compatibility:**

Review code to confirm:
1. Old portfolios without params load without errors (missing fields = undefined)
2. New portfolios with params save/load correctly
3. Export/import preserves simulation params

**Why minimal changes:** Dexie's flexible schema handles new optional fields automatically. No migration needed since fields are optional.
  </action>
  <verify>
- Review `savePortfolio`, `loadAllPortfolios`, `exportAndDownload`, `importFromFile` functions
- Confirm no hardcoded field lists that would exclude new params
- `npm run build` succeeds with no type errors
  </verify>
  <done>
Portfolio service handles extended PortfolioRecord schema. All save/load/import/export functions preserve simulation params. Backward compatible with old portfolios.
  </done>
</task>

</tasks>

<verification>
**Manual test:**

1. Open app, set non-default parameters:
   - SBLOC rate: 8%
   - Max borrowing: 70%
   - Iterations: 50,000
   - Enable withdrawal chapters with custom values
   - Enable tax modeling with custom rates
2. Save portfolio as "Test Full Config"
3. Change all parameters to different values
4. Load "Test Full Config"
5. Verify all parameters restored to saved values
6. Export portfolio to file
7. Import portfolio and verify parameters load correctly
8. Load an old portfolio (created before this feature)
9. Verify it loads without errors (uses default values for missing params)

**Success criteria:**
- All 20+ parameters save and restore correctly
- Old portfolios load without errors
- Export/import preserves full configuration
- Auto-save (temp portfolio) includes parameters
</verification>

<success_criteria>
- [ ] PortfolioRecord interface extended with 20+ optional param fields
- [ ] app-root has getSimulationParams/setSimulationParams methods
- [ ] Portfolio save captures all parameters via event
- [ ] Portfolio load restores all parameters via event
- [ ] Old portfolios without params load using defaults (no errors)
- [ ] Export/import preserves simulation params
- [ ] Manual test: save/load/export/import all work with full config
- [ ] Manual test: old portfolio loads without errors
- [ ] Build succeeds with no type errors
</success_criteria>

<output>
After completion, create `.planning/quick/012-save-all-params-to-portfolio-presets/012-SUMMARY.md`
</output>
