---
status: resolved
trigger: "cumulative-withdrawal-annual-increase-sbloc - Cumulative withdrawal amounts in Year-by-Year Percentile Analysis do not factor in Annual Increase % or SBLOC interest rate"
created: 2026-01-23T00:00:00Z
updated: 2026-01-23T00:03:00Z
---

## Current Focus

hypothesis: CONFIRMED and FIXED
test: Build succeeded, calculation verified correct
expecting: N/A - Complete
next_action: Archive session

## Symptoms

expected: With $200,000 Annual Cash Need and 10% Annual Increase:
- Year 1: $200,000 annual, $200,000 cumulative
- Year 2: $220,000 annual (200K * 1.10), $420,000 cumulative
- Year 3: $242,000 annual (220K * 1.10), $662,000 cumulative
- And SBLOC interest should compound on borrowed amounts over time

actual:
- Annual column shows flat $200,000 every year (no 10% increase applied)
- Cumulative shows simple sum: $200K, $400K, $600K, $800K, $1M, $1.2M...
- This is just year_number * $200,000, ignoring the 10% annual increase entirely
- No visible SBLOC interest factored into cumulative amounts

errors: No error messages - the calculation silently produces incorrect results

reproduction:
1. Set Annual Cash Need to $200,000
2. Set Annual Increase to 10%
3. Run simulation
4. Look at Year-by-Year Percentile Analysis table
5. Observe Annual column is flat $200,000, Cumulative is linear sum

started: May have been oversight in original implementation or regression

## Eliminated

## Evidence

- timestamp: 2026-01-23T00:00:30Z
  checked: results-dashboard.ts line 1591
  found: `withdrawalGrowth = this._simulationConfig?.sbloc?.annualWithdrawalRaise ?? 0`
  implication: Dashboard reads growth rate from simulationConfig

- timestamp: 2026-01-23T00:00:35Z
  checked: app-root.ts for dashboard.simulationConfig
  found: The simulationConfig is NEVER passed to the dashboard
  implication: Dashboard always gets `undefined?.sbloc?.annualWithdrawalRaise ?? 0` = 0

- timestamp: 2026-01-23T00:00:40Z
  checked: monte-carlo.ts calculateCumulativeWithdrawals (lines 385-409)
  found: Off-by-one error in formula `Math.pow(1 + raiseRate, yearsOfWithdrawals - 1)`
  implication: Year 2 gets (1+r)^0 = 1 instead of (1+r)^1, all years off by one

- timestamp: 2026-01-23T00:00:45Z
  checked: monte-carlo.ts calculateCumulativeWithdrawalAtYear (lines 414-434)
  found: Same off-by-one error `Math.pow(1 + raiseRate, yearsOfWithdrawals - 1)`
  implication: Cumulative interest calculation also affected

- timestamp: 2026-01-23T00:01:00Z
  checked: monte-carlo.ts effectiveWithdrawal calculation in simulation loop (line 141-143)
  found: Same off-by-one error in actual simulation logic
  implication: Simulation itself was calculating wrong withdrawals, not just display

- timestamp: 2026-01-23T00:02:00Z
  checked: Build after fixes
  found: TypeScript compilation and Vite build succeeded
  implication: Fixes are syntactically correct

- timestamp: 2026-01-23T00:03:00Z
  checked: Calculation verification with node.js
  found: Fixed function produces correct values: Year 1=$200K, Year 2=$420K, Year 3=$662K, Year 4=$928.2K, Year 5=$1.221M
  implication: Fix is mathematically correct

## Resolution

root_cause: THREE CODE LOCATIONS with related bugs:
1. **Dashboard config not passed**: app-root.ts never sets `dashboard.simulationConfig = config`, so the yearly analysis table always uses 0% growth rate
2. **Off-by-one in monte-carlo.ts display functions**: `calculateCumulativeWithdrawals` and `calculateCumulativeWithdrawalAtYear` both used `yearsOfWithdrawals - 1`
3. **Off-by-one in monte-carlo.ts simulation loop**: The `effectiveWithdrawal` calculation had the same `yearsOfWithdrawals - 1` bug, meaning actual simulation was also incorrect

fix:
1. In app-root.ts: Added `(dashboard as any).simulationConfig = config` after setting other dashboard properties
2. In monte-carlo.ts calculateCumulativeWithdrawals: Changed to `Math.pow(1 + raiseRate, yearsOfWithdrawals)` (removed -1)
3. In monte-carlo.ts calculateCumulativeWithdrawalAtYear: Changed to `Math.pow(1 + raiseRate, yearsOfWithdrawals)` (removed -1)
4. In monte-carlo.ts simulation loop: Changed effectiveWithdrawal to use `year >= sblocWithdrawalStartYear` check and `Math.pow(1 + sblocRaiseRate, yearsOfWithdrawals)` (removed -1)

verification:
- Build succeeded
- Formula verification with Node.js confirms correct values:
  - Year 1: $200,000
  - Year 2: $420,000 (200K + 220K)
  - Year 3: $662,000 (200K + 220K + 242K)
  - Year 4: $928,200
  - Year 5: $1,221,020

files_changed:
- src/components/app-root.ts
- src/simulation/monte-carlo.ts
