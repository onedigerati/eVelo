---
phase: quick
plan: 003
type: execute
wave: 1
depends_on: []
files_modified:
  - src/simulation/monte-carlo.ts
autonomous: true
must_haves:
  truths:
    - "SBLOC simulation uses config.sbloc.liquidationHaircut instead of hardcoded 0.05"
    - "SBLOC simulation respects config.timeline.withdrawalStartYear for withdrawal timing"
    - "Withdrawals increase annually by config.sbloc.annualWithdrawalRaise"
    - "SBLOC simulation can start with initial LOC balance from config.sbloc.initialLocBalance"
  artifacts:
    - path: "src/simulation/monte-carlo.ts"
      provides: "Corrected SBLOC simulation logic"
      contains: "liquidationHaircut: config.sbloc.liquidationHaircut"
  key_links:
    - from: "src/simulation/monte-carlo.ts"
      to: "simulation/types.ts"
      via: "SBLOCSimConfig fields"
      pattern: "config\\.sbloc\\.(liquidationHaircut|annualWithdrawalRaise|initialLocBalance)"
---

<objective>
Wire missing SBLOC configuration parameters in Monte Carlo simulation engine.

Purpose: The monte-carlo.ts simulation engine ignores several SBLOCSimConfig parameters,
using hardcoded values instead. This prevents users from customizing key SBLOC behavior.

Output: Corrected SBLOC simulation that respects all configuration parameters.
</objective>

<context>
@.planning/STATE.md

Key files:
- src/simulation/monte-carlo.ts (lines 132-175: SBLOC simulation step)
- src/simulation/types.ts (SBLOCSimConfig interface - all fields exist)
- src/sbloc/engine.ts (stepSBLOC, initializeSBLOCState - already support these params)

Current issues in monte-carlo.ts:
1. Lines 140, 154: `liquidationHaircut: 0.05` - should use config.sbloc.liquidationHaircut
2. Lines 143, 157: `startYear: 0` - should use config.timeline?.withdrawalStartYear ?? 0
3. annualWithdrawalRaise not implemented - withdrawals should grow annually
4. initialLocBalance not implemented - should pass to initializeSBLOCState
5. monthlyWithdrawal not implemented (SKIP - requires engine changes, out of scope)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wire SBLOC config parameters in monte-carlo.ts</name>
  <files>src/simulation/monte-carlo.ts</files>
  <action>
Update the SBLOC simulation section (lines 132-175) to use config values instead of hardcoded:

1. Replace hardcoded `liquidationHaircut: 0.05` (lines 140, 154) with:
   `liquidationHaircut: config.sbloc.liquidationHaircut`

2. Replace hardcoded `startYear: 0` (lines 143, 157) with:
   `startYear: config.timeline?.withdrawalStartYear ?? 0`

3. Implement annualWithdrawalRaise - calculate current withdrawal based on year:
   - Before the SBLOC step, calculate the effective withdrawal for this year
   - Formula: `baseWithdrawal * Math.pow(1 + raiseRate, yearsOfWithdrawals)`
   - Only apply raise after first withdrawal year
   - Store base withdrawal and calculate per-year adjustment

4. Pass initialLocBalance to initializeSBLOCState:
   - Change line 136 call: `initializeSBLOCState(config, initialValue, config.sbloc.initialLocBalance)`
   - The third parameter already exists in the function signature

5. Update the cumulativeWithdrawals calculation (line 219-222) to account for withdrawal raises:
   - Instead of `(i + 1) * config.sbloc!.annualWithdrawal`
   - Calculate sum of raised withdrawals over years

Implementation approach for withdrawal raises:
```typescript
// Before the year loop, set up withdrawal tracking
const baseWithdrawal = config.sbloc.annualWithdrawal;
const raiseRate = config.sbloc.annualWithdrawalRaise;
const withdrawalStartYear = config.timeline?.withdrawalStartYear ?? 0;

// Inside the year loop, calculate effective withdrawal for this year:
const yearsOfWithdrawals = Math.max(0, year - withdrawalStartYear);
const effectiveWithdrawal = yearsOfWithdrawals > 0
  ? baseWithdrawal * Math.pow(1 + raiseRate, yearsOfWithdrawals - 1)
  : baseWithdrawal;

// Pass effectiveWithdrawal to the SBLOCEngineConfig
annualWithdrawal: effectiveWithdrawal,
```

Also update the SBLOCEngineConfig construction to use consistent values for both
the initial state and subsequent steps (avoid duplicating the config definition).
  </action>
  <verify>
- `npm run typecheck` passes
- Grep for "0.05" in monte-carlo.ts returns no matches in SBLOC section
- Grep for "startYear: 0" in monte-carlo.ts returns no matches
- Grep for "config.sbloc.liquidationHaircut" finds usage
- Grep for "config.sbloc.annualWithdrawalRaise" or "raiseRate" finds usage
  </verify>
  <done>
- liquidationHaircut reads from config.sbloc.liquidationHaircut
- startYear reads from config.timeline?.withdrawalStartYear ?? 0
- Withdrawals grow annually by annualWithdrawalRaise rate
- Initial LOC balance from config.sbloc.initialLocBalance passed to init
- cumulativeWithdrawals accounts for annual raises
  </done>
</task>

</tasks>

<verification>
- `npm run typecheck` - no type errors
- `npm run build` - builds successfully
- Simulation runs with custom SBLOC config values and respects them
</verification>

<success_criteria>
- All 4 missing SBLOC parameters (liquidationHaircut, withdrawalStartYear, annualWithdrawalRaise, initialLocBalance) are wired to config
- No hardcoded values remain for these parameters
- TypeScript compiles without errors
- Existing simulation behavior unchanged for default values
</success_criteria>

<output>
After completion, create `.planning/quick/003-resolve-key-missing-simulation-logic/003-SUMMARY.md`
</output>
