---
phase: quick
plan: 019
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/historical-data-viewer.ts
autonomous: true

must_haves:
  truths:
    - "User can see AI-assisted data generation section in Bulk Operations mode"
    - "User can copy the AI prompt template with a single click"
    - "Prompt template matches the user-provided format exactly"
  artifacts:
    - path: "src/components/ui/historical-data-viewer.ts"
      provides: "AI data generation guide section with copy button"
      contains: "AI-Assisted Data Generation"
  key_links:
    - from: "historical-data-viewer.ts"
      to: "clipboard API"
      via: "copy button click handler"
      pattern: "navigator\\.clipboard\\.writeText"
---

<objective>
Add an AI-Assisted Data Generation guide to the Historical Return Data modal's Bulk Operations mode.

Purpose: Help users generate properly formatted CSV data for bulk import by providing a ready-to-use prompt template they can copy to AI assistants (ChatGPT, Gemini, Claude).

Output: New "AI-Assisted Data Generation" section in the Bulk Import area with collapsible prompt template and one-click copy functionality.
</objective>

<execution_context>
@C:\Users\ungac\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\ungac\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/ui/historical-data-viewer.ts
@src/data/formats/bulk-format-templates.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add AI-Assisted Data Generation Section to Bulk Operations</name>
  <files>src/components/ui/historical-data-viewer.ts</files>
  <action>
Add a new section to the `renderBulkOptions()` method, placed BETWEEN the "Bulk Import" section and the "Reset to Defaults" section.

The new section should include:

1. **Section header:** "AI-Assisted Data Generation" with a brief description explaining users can use AI assistants to generate formatted CSV data.

2. **Collapsible prompt template:** Use native `<details>/<summary>` HTML elements for expand/collapse. The summary text should be "View Prompt Template" or similar.

3. **Prompt content:** Display the full prompt template (provided below) inside a `<pre>` block within the details element. Style with smaller font, good padding, and horizontal scroll if needed.

4. **Copy button:** Add a button with clipboard icon next to or below the prompt that copies the entire prompt to clipboard. Use `navigator.clipboard.writeText()`. Show brief visual feedback on successful copy (e.g., button text changes to "Copied!" for 2 seconds).

**Prompt Template (use exactly as provided):**
```
System/User Role: You are a financial data specialist.

Task: I will provide a list of ticker symbols. Generate a CSV export (in a code block) following the exact schema of the provided "Bulk Import Template."

The Schema:

symbol: The ticker symbol.
name: The full legal company/fund name.
asset_class: Categorize as equity_stock, equity_index, fixed_income, or crypto.
year: The calendar year.
annual_return: The total annual return as a decimal (e.g., 0.125).

Data Requirements:

Contiguous 31-Year Span: Provide data for exactly 31 years, starting from 1995 through 2025.

Handling Young Companies (Proxy Backfilling): If a company has not been in business/public for the full 31 years:
- For the years before the company existed, use the annual returns of the S&P 500 (SPY) as a proxy.
- Keep the symbol and name columns consistent with the requested ticker, even for the proxy years.
- This ensures every ticker has a full, unbroken 31-year history.

These are the only supported values for asset_class:
equity_stock, equity_index, commodity

Make sure you make your best judgement to properly classify the assets.

Formatting Rules:

Output in standard CSV format.
Header: symbol,name,asset_class,year,annual_return
Ensure high accuracy for the historical return percentages.

Input Tickers:
[INSERT TICKERS HERE]
```

**CSS additions required:**
- `.ai-generation-section` - Section wrapper styling
- `.prompt-container` - Wrapper for details/summary
- `.prompt-template` - Pre block styling (smaller font, scroll, dark bg)
- `.copy-prompt-btn` - Copy button styling
- `.copy-success` - Visual feedback class for successful copy

**Dark theme support:** Add corresponding `:host-context([data-theme="dark"])` selectors.
  </action>
  <verify>
1. `npm run build` succeeds without errors
2. Open the app, go to Settings -> Historical Return Data -> Bulk Operations tab
3. Verify "AI-Assisted Data Generation" section appears between Bulk Import and Reset sections
4. Verify prompt template is collapsed by default and expands on click
5. Click "Copy Prompt" button and paste into text editor - verify full prompt is copied
6. Verify the button shows brief "Copied!" feedback
  </verify>
  <done>
- AI-Assisted Data Generation section visible in Bulk Operations mode
- Prompt template collapsible and displays correctly
- Copy button copies full prompt to clipboard with visual feedback
- Section styled consistently with existing bulk sections
- Dark theme support included
  </done>
</task>

</tasks>

<verification>
1. Build completes: `npm run build`
2. Manual UI verification:
   - Historical Data Viewer modal opens
   - Bulk Operations tab shows new AI section
   - Prompt expands/collapses correctly
   - Copy button works and shows feedback
   - Dark theme looks correct
</verification>

<success_criteria>
- User can access AI data generation guide in Bulk Operations mode
- Prompt template is easily copyable with single click
- Section integrates visually with existing bulk operations UI
- No regressions in existing functionality
</success_criteria>

<output>
After completion, create `.planning/quick/019-add-ai-assisted-data-generation-guide-to/019-SUMMARY.md`
</output>
