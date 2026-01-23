---
type: quick
task: 010
title: Prevent duplicate portfolio preset names
files_modified:
  - src/data/services/portfolio-service.ts
  - src/components/ui/portfolio-composition.ts
autonomous: true
---

<objective>
Prevent duplicate portfolio names by showing an overwrite/rename modal when the user tries to save a portfolio with a name that already exists.

Purpose: Avoid user confusion from multiple portfolios with identical names. Provide clear options: change the name or overwrite the existing portfolio.
Output: Modified savePreset() flow with duplicate detection and choice modal.
</objective>

<context>
@src/components/ui/portfolio-composition.ts - savePreset() method at line 1166
@src/data/services/portfolio-service.ts - savePortfolio() and loadAllPortfolios()
@src/components/ui/modal-dialog.ts - modal-dialog component with prompt/confirm modes

Current behavior:
- savePreset() shows prompt modal for name
- savePortfolio() creates new record (no duplicate check)
- Multiple portfolios can have identical names

Desired behavior:
- Check if entered name matches existing portfolio (case-insensitive)
- If match found, show new modal: "Change Name" or "Overwrite"
- "Change Name" returns to save dialog
- "Overwrite" updates existing portfolio instead of creating new
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add findPortfolioByName helper and implement duplicate-aware save flow</name>
  <files>
    src/data/services/portfolio-service.ts
    src/components/ui/portfolio-composition.ts
  </files>
  <action>
1. In portfolio-service.ts, add helper function:
   ```typescript
   /**
    * Find a portfolio by name (case-insensitive match)
    * Returns undefined if not found
    */
   export async function findPortfolioByName(name: string): Promise<PortfolioRecord | undefined> {
     const portfolios = await loadAllPortfolios();
     const normalizedName = name.trim().toLowerCase();
     return portfolios.find(p =>
       p.name !== TEMP_PORTFOLIO_KEY &&
       p.name.toLowerCase() === normalizedName
     );
   }
   ```

2. In portfolio-composition.ts, import the new function:
   ```typescript
   import { findPortfolioByName } from '../../data/services/portfolio-service';
   ```

3. Replace the savePreset() method with duplicate-aware version:
   ```typescript
   private async savePreset(): Promise<void> {
     if (this.selectedAssets.length === 0) {
       this.showToast('Add assets to portfolio before saving', 'error');
       return;
     }

     // Step 1: Prompt for name
     const name = await this.modal.show({
       title: 'Save Portfolio',
       subtitle: this._currentPortfolioName
         ? `Overwrite "${this._currentPortfolioName}" or enter a new name:`
         : 'Enter a name for this portfolio:',
       type: 'prompt',
       defaultValue: this._currentPortfolioName || '',
       confirmText: 'Save',
     });
     if (!name || typeof name !== 'string' || !name.trim()) return;

     const trimmedName = name.trim();

     // Step 2: Check for existing portfolio with same name (case-insensitive)
     const existing = await findPortfolioByName(trimmedName);

     // If exists and it's not the currently loaded portfolio, ask user what to do
     if (existing && existing.id !== this._currentPortfolioId) {
       const choice = await this.modal.show({
         title: 'Name Already Exists',
         subtitle: `A portfolio named "${existing.name}" already exists. What would you like to do?`,
         type: 'confirm',
         confirmText: 'Overwrite',
         cancelText: 'Change Name',
       });

       if (choice === false) {
         // User chose "Change Name" - restart the save process
         return this.savePreset();
       }
       // choice === true means "Overwrite" - continue with existing.id
     }

     try {
       const assets = this.buildAssetRecords();
       const now = new Date().toISOString();

       // Determine ID: use existing's ID if overwriting, otherwise create new
       const portfolioId = (existing && existing.id !== this._currentPortfolioId)
         ? existing.id
         : this._currentPortfolioId;

       const id = await savePortfolio({
         id: portfolioId,
         name: trimmedName,
         assets,
         created: portfolioId ? undefined : now, // Keep original created if updating
         modified: now,
         version: 1,
       });

       this._currentPortfolioId = id;
       this._currentPortfolioName = trimmedName;

       // Delete temp portfolio after successful save
       await deleteTempPortfolio();

       // Refresh preset dropdown
       await this.refreshPresetDropdown();

       this.showToast(`Saved portfolio: ${trimmedName}`, 'success');
     } catch (error) {
       this.showToast('Failed to save portfolio', 'error');
     }
   }
   ```
  </action>
  <verify>
    1. npm run build completes without errors
    2. Manual test: Save portfolio as "Test", then save another as "test" (lowercase) - should prompt overwrite/change
    3. Manual test: Choose "Change Name" - returns to save dialog
    4. Manual test: Choose "Overwrite" - updates existing portfolio (same ID, not new entry)
  </verify>
  <done>
    - Case-insensitive duplicate detection works
    - "Change Name" returns to save dialog
    - "Overwrite" updates existing portfolio (no new entry created)
    - Original portfolio's created timestamp preserved on overwrite
  </done>
</task>

</tasks>

<verification>
```bash
npm run build
```
Build must complete without TypeScript errors.

Manual verification:
1. Start dev server: `npm run dev`
2. Create and save portfolio as "My Portfolio"
3. Modify portfolio, try to save as "my portfolio" (different case)
4. Verify modal appears with "Overwrite" and "Change Name" options
5. Test both paths work correctly
</verification>

<success_criteria>
- Duplicate name detection is case-insensitive
- User can choose to overwrite or change name
- Overwriting updates the existing portfolio (preserves ID and created timestamp)
- Changing name returns to save dialog to enter a different name
- No regression in normal save flow (new names work as before)
</success_criteria>
