---
type: quick
plan: 009
title: Implement modal framework with blur effect for Save/Load Portfolio
files_modified:
  - src/components/ui/modal-dialog.ts
  - src/components/ui/portfolio-composition.ts
  - src/components/ui/index.ts
  - src/styles/tokens.css
autonomous: true
---

<objective>
Create a reusable modal dialog component and integrate it into portfolio-composition to replace native window.prompt() and window.confirm() with styled modals that match the reference design.

Purpose: Native browser dialogs break the visual flow and look inconsistent. Custom modals provide better UX with blur backdrop, consistent styling, and proper input handling.

Output: modal-dialog.ts component, updated portfolio-composition.ts using modals for Save/Delete actions.
</objective>

<context>
@.planning/STATE.md
@src/components/ui/portfolio-composition.ts (lines 1160-1258 - savePreset/deletePreset methods use window.prompt/confirm)
@src/components/ui/settings-panel.ts (existing modal overlay pattern)
@src/components/base-component.ts
@src/styles/tokens.css
</context>

<reference_analysis>
From screenshots, the reference application modals have:

**Save Portfolio Modal:**
- White card, rounded corners (12px), positioned lower-left over sidebar
- Title: "Save Portfolio" (bold, dark text, ~16px)
- Subtitle: "Overwrite 'Mag Seven' or enter a new name:" (lighter gray text, ~14px)
- Text input pre-filled with current portfolio name
- Two buttons: "Cancel" (white bg, gray border) and "OK" (filled teal #0d9488)
- Subtle drop shadow

**Load Portfolio Modal:**
- Same card styling as Save modal
- Title: "Load Portfolio"
- Body text: "Loading this preset will replace your current portfolio. Continue?"
- Same Cancel/OK button pattern

**Blur Effect:**
- Sidebar content has subtle backdrop-filter blur when modal is open
- Creates visual hierarchy, focuses attention on modal
</reference_analysis>

<tasks>

<task type="auto">
  <name>Task 1: Create modal-dialog component</name>
  <files>
    src/components/ui/modal-dialog.ts
    src/components/ui/index.ts
  </files>
  <action>
Create a reusable modal-dialog Web Component extending BaseComponent.

**Component API:**
- Attributes: `title`, `subtitle`, `confirm-text` (default "OK"), `cancel-text` (default "Cancel")
- Method: `show(options?)` - opens modal, returns Promise resolving to result
- Method: `hide()` - closes modal
- Slots: default slot for body content

**Modal types via show() options:**
- `type: 'prompt'` - shows text input, resolves to input value or null
- `type: 'confirm'` - shows body text only, resolves to true/false
- `defaultValue` - pre-fill input for prompt type

**Styling (match reference):**
- Fixed position overlay with backdrop-filter: blur(4px) and rgba(0,0,0,0.3) background
- Modal card: white bg, 12px border-radius, max-width 360px, padding 24px
- Box shadow: 0 10px 25px rgba(0,0,0,0.15)
- Title: font-weight 600, font-size 1.125rem, color --text-primary
- Subtitle: font-size 0.875rem, color --text-secondary, margin-bottom 16px
- Input: full width, 8px padding, 1px border --border-color, 6px radius
- Buttons container: flex, gap 8px, justify-content flex-end, margin-top 20px
- Cancel button: white bg, 1px border --border-color, 8px 16px padding, 6px radius
- OK button: --color-primary bg, white text, 8px 16px padding, 6px radius

**Event handling:**
- Click outside modal OR Cancel button resolves null/false
- OK button resolves input value (prompt) or true (confirm)
- Enter key submits, Escape key cancels
- Focus input on open for prompt type

**Export and register:**
- Add to src/components/ui/index.ts barrel export
- Register as `modal-dialog` custom element
  </action>
  <verify>
Component file exists and exports ModalDialog class.
TypeScript compiles without errors: `npx tsc --noEmit`
  </verify>
  <done>
modal-dialog.ts created with show()/hide() API, prompt and confirm modes, blur backdrop, reference-matching styles.
  </done>
</task>

<task type="auto">
  <name>Task 2: Replace window.prompt/confirm in portfolio-composition</name>
  <files>
    src/components/ui/portfolio-composition.ts
  </files>
  <action>
Update portfolio-composition.ts to use the new modal-dialog component instead of native dialogs.

**Add modal element:**
- Add `<modal-dialog id="portfolio-modal"></modal-dialog>` to the template (after .portfolio-composition div)
- Get reference in afterRender: `this.modal = this.$('#portfolio-modal') as ModalDialog`

**Update savePreset() method (line ~1160):**
Replace:
```typescript
const name = window.prompt('Portfolio name:');
if (!name || !name.trim()) return;
```
With:
```typescript
const name = await this.modal.show({
  title: 'Save Portfolio',
  subtitle: this._currentPortfolioName
    ? `Overwrite "${this._currentPortfolioName}" or enter a new name:`
    : 'Enter a name for this portfolio:',
  type: 'prompt',
  defaultValue: this._currentPortfolioName || '',
  confirmText: 'Save',
});
if (!name || !name.trim()) return;
```

**Update deletePreset() method (line ~1234):**
Replace:
```typescript
const confirmed = window.confirm(`Delete portfolio "${this._currentPortfolioName}"?`);
if (!confirmed) return;
```
With:
```typescript
const confirmed = await this.modal.show({
  title: 'Delete Portfolio',
  subtitle: `Are you sure you want to delete "${this._currentPortfolioName}"? This cannot be undone.`,
  type: 'confirm',
  confirmText: 'Delete',
});
if (!confirmed) return;
```

**Add import:**
```typescript
import { ModalDialog } from './modal-dialog';
```

**Add private field:**
```typescript
private modal!: ModalDialog;
```
  </action>
  <verify>
Run `npx tsc --noEmit` - no TypeScript errors.
Run `npm run dev` and test:
1. Click Save button with assets selected - custom modal appears with blur backdrop
2. Type name and click Save - portfolio saves
3. Click Cancel - modal closes, no save
4. Press Escape - modal closes
5. Select a saved portfolio, click Delete - confirm modal appears
6. Click Delete - portfolio deleted
7. Click Cancel on delete - modal closes, no deletion
  </verify>
  <done>
portfolio-composition uses modal-dialog for Save and Delete actions instead of native browser dialogs. Modals display with blur backdrop and match reference styling.
  </done>
</task>

<task type="auto">
  <name>Task 3: Add modal CSS tokens</name>
  <files>
    src/styles/tokens.css
  </files>
  <action>
Add CSS custom properties to tokens.css for modal styling consistency:

```css
/* Modal */
--modal-backdrop: rgba(0, 0, 0, 0.3);
--modal-backdrop-blur: 4px;
--modal-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
--modal-max-width: 360px;
```

These tokens can be used by both modal-dialog and any future modal components for consistency.
  </action>
  <verify>
`npm run dev` - app loads without CSS errors.
Modal uses CSS variables from tokens.css.
  </verify>
  <done>
Modal-related CSS tokens added to tokens.css for consistent modal styling across the application.
  </done>
</task>

</tasks>

<verification>
Run full verification:
```bash
npx tsc --noEmit
npm run dev
```

Manual testing:
1. Add some assets to portfolio
2. Click Save button - modal appears with blur backdrop
3. Enter name "Test Portfolio" and click Save - toast confirms save
4. Dropdown now shows "Test Portfolio"
5. Select "Test Portfolio" from dropdown
6. Click Delete button - confirm modal appears
7. Click Delete - toast confirms deletion
8. Modal styling matches reference (white card, teal OK button, blur backdrop)
</verification>

<success_criteria>
- modal-dialog.ts component exists with show()/hide() API
- prompt mode returns input value or null
- confirm mode returns true/false
- Blur backdrop visible when modal open
- Save Portfolio modal shows with editable name input
- Delete Portfolio modal shows confirmation message
- Escape key and Cancel button close modal
- Enter key submits modal
- All TypeScript compiles without errors
</success_criteria>

<output>
After completion, create `.planning/quick/009-implement-modal-framework-with-blur-effe/009-SUMMARY.md`
</output>
