# Quick Task 017: Fix Help Tooltip Formatting

## Overview

**Task:** Review and fix help tooltips in the eVelo Parameters section for proper formatting and readability.

**Problem:** Tooltips display with cramped text, awkward word breaks (e.g., "securities-" breaking mid-word), and poor readability as shown in the user's screenshot.

## Analysis

The `help-tooltip.ts` component has these issues:
1. `max-width: 250px` is too narrow for some content, causing awkward line breaks
2. No `word-break` or hyphen handling for proper text flow
3. Default position is "top" but content may benefit from other positions
4. Some tooltips have lengthy content that needs better formatting

## Tasks

### Task 1: Improve tooltip CSS for better readability

**File:** `src/components/ui/help-tooltip.ts`

Changes:
- Increase `max-width` from 250px to 280px for more breathing room
- Add `hyphens: auto` for proper word breaking at syllable boundaries
- Add `overflow-wrap: break-word` as fallback
- Improve `line-height` from 1.4 to 1.5 for better readability
- Add slight letter-spacing for improved legibility at small font sizes
- Add `min-width` to prevent overly narrow tooltips

### Task 2: Review and improve tooltip content

**File:** `src/components/app-root.ts`

Review all 8 help-tooltip instances and ensure:
- Content is concise and well-formatted
- No unnecessary repetition
- Clear, scannable information

Current tooltips to review:
1. "Annual Cash Need" - Tax-free borrowing explanation
2. "Period (Years)" - Time horizon benefit
3. "Annual Interest Rate" - SBLOC rate explanation (THE PROBLEM ONE)
4. "Max LTV / Hard Margin" - Borrowing limit
5. "Warning Zone LTV" - Margin call threshold
6. "Simulation Iterations" - Monte Carlo accuracy
7. "Cost Basis Ratio" - Embedded gains explanation
8. "Dividend Yield" - Portfolio yield explanation

### Task 3: Add position="left" for right-edge tooltips

For tooltips on the right side of the panel (near viewport edge), use `position="left"` to prevent edge clipping.

## Acceptance Criteria

- [ ] Tooltips display with proper word wrapping (no mid-word breaks)
- [ ] Text is readable with good line spacing
- [ ] Tooltips don't get clipped by viewport edges
- [ ] All 8 parameter tooltips reviewed and formatted consistently
