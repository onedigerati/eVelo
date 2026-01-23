---
status: verifying
trigger: "SBLOC interest rate is not being factored into cumulative withdrawal amounts in the Year-by-Year Percentile Analysis"
created: 2026-01-23T00:00:00Z
updated: 2026-01-23T00:10:00Z
---

## Current Focus

hypothesis: CONFIRMED AND FIXED - Year-by-Year Percentile Analysis table now uses actual loan balances from sblocTrajectory instead of synthetic principal-only sums
test: Build project and visually verify loan balance reflects interest
expecting: Changing SBLOC interest rate should now change the "Loan Balance" column values
next_action: Verify fix by running simulation with different interest rates

## Symptoms

expected: When using SBLOC strategy, cumulative withdrawals should include both principal borrowed AND accrued interest. For example, if you borrow $200K at 7% interest, after 1 year you owe ~$214K (principal + interest).

actual: Cumulative withdrawals appear to only sum the principal withdrawal amounts. SBLOC interest rate setting doesn't appear to affect the cumulative totals shown. Changing the SBLOC interest rate doesn't visibly change the cumulative withdrawal column.

errors: No error messages - calculation silently ignores SBLOC interest

reproduction:
1. Set Annual Cash Need to $200,000
2. Set SBLOC interest rate (e.g., 7%)
3. Run simulation
4. Look at Year-by-Year Percentile Analysis table
5. Observe cumulative amounts don't reflect interest accrual

started: May have never been implemented correctly

## Eliminated

## Evidence

- timestamp: 2026-01-23T00:01:00Z
  checked: monte-carlo.ts simulation engine
  found: Interest IS correctly calculated in the SBLOC simulation engine:
    1. stepSBLOC() applies interest to loan balance (lines 188-202)
    2. stepSBLOCYear() aggregates interest across months
    3. loanBalance (principal + accumulated interest) is tracked per iteration per year
    4. sblocTrajectory.loanBalance contains P10/P25/P50/P75/P90 percentiles of ACTUAL loan balance
    5. sblocTrajectory.cumulativeInterest.p50 is explicitly calculated
  implication: The simulation DOES calculate interest correctly - the bug is in DISPLAY only

- timestamp: 2026-01-23T00:02:00Z
  checked: monte-carlo.ts calculateCumulativeWithdrawals function (lines 387-412)
  found: This function computes theoretical cumulative withdrawals WITHOUT interest:
    - Takes baseWithdrawal, raiseRate, startYear
    - Simply sums withdrawal amounts: cumulative += baseWithdrawal * (1 + raiseRate)^years
    - Does NOT factor in interest at all
  implication: This is used in sblocTrajectory.cumulativeWithdrawals

- timestamp: 2026-01-23T00:03:00Z
  checked: results-dashboard.ts updateYearlyAnalysisTable() (lines 1583-1614)
  found: The table data comes from calculateWithdrawals() helper:
    ```
    const withdrawals = calculateWithdrawals(
      this._annualWithdrawal,
      withdrawalGrowth,
      this._timeHorizon
    );
    ```
    This function (in yearly-analysis-table.ts lines 59-82) ONLY sums principal:
    - runningTotal += currentWithdrawal
    - Does NOT use sblocTrajectory.loanBalance data at all
  implication: The Year-by-Year table displays WRONG cumulative data

- timestamp: 2026-01-23T00:04:00Z
  checked: SBLOC Balance Over Time chart (results-dashboard.ts lines 848-874)
  found: This chart CORRECTLY shows:
    - traj.loanBalance.p50 (actual loan balance including interest)
    - traj.cumulativeWithdrawals (principal only)
    - traj.cumulativeInterest.p50 (interest portion)
  implication: The data exists and is displayed correctly in one place, but not in Year-by-Year table

## Resolution

root_cause: Year-by-Year Percentile Analysis table uses calculateWithdrawals() which only sums principal withdrawal amounts. The actual SBLOC loan balance (which includes accrued interest) is stored in sblocTrajectory.loanBalance but is NOT passed to the yearly-analysis-table component.

The simulation correctly tracks:
1. loanBalance = principal + all accrued interest (compound interest applied each year)
2. cumulativeInterest = loanBalance - cumulative principal withdrawals

But the Year-by-Year table only shows: cumulative principal withdrawals (no interest)

fix: Modified results-dashboard.ts to pass sblocTrajectory.loanBalance.p50 to the yearly-analysis-table instead of the synthetic calculateWithdrawals() output. Also updated yearly-analysis-table.ts to:
1. Accept isSBLOCLoanBalance flag
2. Change column header from "Cumulative" to "Loan Balance" when SBLOC data is present
3. Display actual loan balances (principal + interest) for SBLOC scenarios

verification: Build succeeds (npm run build). Need manual verification by running simulation.

files_changed:
- src/components/ui/results-dashboard.ts
- src/components/ui/yearly-analysis-table.ts
