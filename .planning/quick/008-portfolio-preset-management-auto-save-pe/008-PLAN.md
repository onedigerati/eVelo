---
phase: quick-008
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/portfolio-composition.ts
  - src/data/services/portfolio-service.ts
autonomous: true

must_haves:
  truths:
    - "Selected assets are hidden (not just disabled) from available list"
    - "Portfolio auto-saves to temp on any change when no named portfolio selected"
    - "Last portfolio (including temp) loads on page refresh"
    - "Save button prompts for name and saves portfolio"
    - "Load button opens dialog to select from saved portfolios"
    - "Import button imports portfolio from JSON file"
    - "Export button exports current portfolio to JSON file"
    - "Delete button deletes currently selected preset"
  artifacts:
    - path: "src/components/ui/portfolio-composition.ts"
      provides: "Portfolio preset button wiring and auto-save/load"
    - path: "src/data/services/portfolio-service.ts"
      provides: "Temp portfolio CRUD functions"
  key_links:
    - from: "portfolio-composition.ts"
      to: "portfolio-service.ts"
      via: "saveTempPortfolio/loadTempPortfolio imports"
---

<objective>
Implement portfolio preset management with auto-save and persistence.

Purpose: Enable users to save, load, import/export portfolios, and have their work auto-saved
Output: Fully functional preset buttons with auto-save to temp portfolio and persistence on refresh
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/ui/portfolio-composition.ts
@src/data/services/portfolio-service.ts
@src/data/schemas/portfolio.ts
@src/data/db.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add temp portfolio service functions</name>
  <files>src/data/services/portfolio-service.ts</files>
  <action>
Add temp portfolio functions to portfolio-service.ts:

1. Add TEMP_PORTFOLIO_KEY constant = '__temp_portfolio__' for identifying temp portfolios
2. Add saveTempPortfolio(assets) function:
   - Uses special name TEMP_PORTFOLIO_KEY to identify temp
   - Upserts (update if exists, create if not)
   - Called on any portfolio change when no named portfolio selected
3. Add loadTempPortfolio() function:
   - Returns the temp portfolio if it exists, undefined otherwise
4. Add loadLastPortfolio() function:
   - First tries to load temp portfolio
   - If no temp, loads most recently modified named portfolio
   - Returns undefined if no portfolios exist
5. Add deleteTempPortfolio() function:
   - Deletes the temp portfolio by name lookup

These functions enable auto-save on change and restore on refresh.
  </action>
  <verify>TypeScript compiles without errors: `npm run build`</verify>
  <done>Four new functions exported: saveTempPortfolio, loadTempPortfolio, loadLastPortfolio, deleteTempPortfolio</done>
</task>

<task type="auto">
  <name>Task 2: Hide selected assets and wire preset buttons</name>
  <files>src/components/ui/portfolio-composition.ts</files>
  <action>
Update portfolio-composition.ts:

1. **Hide selected assets from available list:**
   - In renderAvailableAssets(), filter OUT selected symbols entirely (not just disable)
   - Change: `const filtered = this.getFilteredAssets().filter(a => !selectedSymbols.has(a.symbol))`
   - Remove the `.disabled` class logic since items won't be rendered at all

2. **Add export button to preset row:**
   - Add export-btn between import-btn and delete-btn in template
   - SVG icon: document with down arrow (export symbol)
   - Wire exportPreset() method

3. **Add hidden file input for import:**
   - Add `<input type="file" id="import-file-input" accept=".json" hidden />` near preset row
   - Wire change handler to importPreset

4. **Add auto-save and persistence:**
   - Import saveTempPortfolio, loadTempPortfolio, loadLastPortfolio from portfolio-service
   - In connectedCallback after loadAvailableAssets(): call loadLastPortfolio() and populate selectedAssets
   - In dispatchPortfolioChange(): call saveTempPortfolio(assets) when _currentPortfolioId is undefined

5. **Wire savePreset():**
   - Prompt user for name with window.prompt("Portfolio name:")
   - If name provided, save via savePortfolio() with current assets
   - Set _currentPortfolioId to returned id
   - Delete temp portfolio after successful save
   - Show toast on success

6. **Wire loadPreset():**
   - Load all portfolios via loadAllPortfolios()
   - Show simple selection UI (could use native select in a prompt or create modal)
   - For simplicity: populate preset-select dropdown with portfolios, trigger load on change
   - On load: populate selectedAssets from loaded portfolio
   - Set _currentPortfolioId
   - Re-render

7. **Wire importPreset():**
   - Trigger hidden file input click
   - On file selected: use importFromFile() from portfolio-service
   - Load first portfolio from import into selectedAssets
   - Re-render and show toast

8. **Wire exportPreset():**
   - Build PortfolioRecord from current selectedAssets
   - Use exportAndDownload() with single portfolio array
   - Show toast on success

9. **Wire deletePreset():**
   - Only enabled when _currentPortfolioId is set
   - Confirm with user
   - Delete via deletePortfolio(_currentPortfolioId)
   - Clear _currentPortfolioId
   - Remove from preset-select options
   - Show toast

10. **Track current portfolio:**
    - Add private _currentPortfolioId: number | undefined
    - Add private _currentPortfolioName: string = '' for display
    - Update preset-select to show current selection
  </action>
  <verify>
- `npm run build` compiles without errors
- Dev server starts: `npm run dev`
- Manual test: Add asset -> disappears from available list
- Manual test: Change weights -> check IndexedDB for temp portfolio
- Manual test: Refresh page -> portfolio loads
- Manual test: Save, Load, Import, Export, Delete buttons work
  </verify>
  <done>
- Selected assets hidden from available list (not just disabled)
- Auto-save to temp portfolio on every change
- Portfolio persists across page refresh
- All 5 preset buttons functional: Save prompts for name, Load shows dialog, Import/Export work with JSON files, Delete removes preset
  </done>
</task>

</tasks>

<verification>
1. Build succeeds: `npm run build`
2. Selected assets disappear from available list when added
3. Refresh page -> last portfolio state restored
4. Save creates new named portfolio
5. Load populates portfolio from saved
6. Import loads from JSON file
7. Export downloads current portfolio as JSON
8. Delete removes selected preset
</verification>

<success_criteria>
- All 5 preset buttons functional
- Selected assets hidden from available list
- Auto-save to temp portfolio working
- Page refresh restores last portfolio state
- No TypeScript or runtime errors
</success_criteria>

<output>
After completion, create `.planning/quick/008-portfolio-preset-management-auto-save-pe/008-SUMMARY.md`
</output>
