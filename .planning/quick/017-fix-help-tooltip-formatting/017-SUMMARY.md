# Quick Task 017 Summary: Fix Help Tooltip Formatting

## Completed

### 1. Improved tooltip CSS for better readability

**File:** `src/components/ui/help-tooltip.ts`

Changes made:
- Increased `max-width` from 250px to 280px for more breathing room
- Added `min-width: 180px` to prevent overly narrow tooltips
- Increased `padding` from 8px/12px to 10px/14px for better spacing
- Increased `font-size` from 12px to 13px for readability
- Improved `line-height` from 1.4 to 1.5 for better text flow
- Added `letter-spacing: 0.01em` for improved legibility
- Added proper word-break handling:
  - `overflow-wrap: break-word`
  - `word-wrap: break-word`
  - `hyphens: auto` with vendor prefixes
- Increased `border-radius` from 4px to 6px for softer appearance

### 2. Improved all 8 tooltip content strings

**File:** `src/components/app-root.ts`

All tooltips condensed to be concise and scannable:

| Parameter | Before | After |
|-----------|--------|-------|
| Annual Cash Need | "Tax-free income from borrowing against your portfolio. Unlike selling, this doesn't trigger capital gains taxes." | "Tax-free income via SBLOC borrowing. Unlike selling, no capital gains taxes triggered." |
| Period (Years) | "Investment period in years. Longer horizons typically show more benefit from the Buy-Borrow-Die strategy." | "Simulation timeframe. Longer periods typically favor Buy-Borrow-Die." |
| Annual Interest Rate | "Annual interest rate charged on your securities-backed line of credit. Typically SOFR + 1-3%." | "Interest rate on your SBLOC. Typically SOFR + 1-3% spread." |
| Max LTV | "Loan-to-Value ratio. Maximum percentage of your portfolio value you can borrow. Lower LTV = more conservative." | "Maximum loan-to-value ratio. Portfolio liquidated if exceeded. Lower = safer." |
| Warning Zone LTV | "LTV threshold that triggers a margin call. If your loan exceeds this ratio of portfolio value, you must repay or liquidate." | "Margin call trigger. Exceeding this ratio requires action to avoid forced liquidation." |
| Simulation Iterations | "Number of Monte Carlo scenarios to simulate. More iterations = more accurate results but slower computation." | "Number of Monte Carlo scenarios. More = accurate but slower." |
| Cost Basis Ratio | "What fraction of your portfolio is original cost (basis) vs gains. 40% means 60% embedded gains. Affects capital gains taxes when selling." | "Portion of portfolio that is original cost. 40% basis = 60% unrealized gains subject to tax." |
| Dividend Yield | "Annual dividend yield of your portfolio. S&P 500 averages 1.5-2%. Growth portfolios may be lower, income portfolios higher." | "Portfolio dividend yield for Sell strategy comparison. S&P 500: ~1.5-2%." |

### 3. Added `position="left"` to all tooltips

All 8 tooltips now use `position="left"` which displays the tooltip to the left of the help icon. This prevents viewport edge clipping since the parameters panel is on the left side of the screen.

## Result

- Tooltips now display with proper word wrapping (no mid-word breaks like "securities-")
- Text is more readable with improved spacing and font size
- Content is concise and scannable
- No viewport edge clipping issues

## Build Status

✓ Build successful
