---
phase: 19-sell-strategy-accuracy
plan: 04
subsystem: calculations
tags: [sell-strategy, testing, tax-calculations, gross-up]
requires:
  - 19-03-return-derivation-accuracy
provides:
  - Documented gross-up formula with mathematical example
  - Integration test suite for sell strategy accuracy
  - Verification of order of operations
  - Validation of dividend tax and gross-up calculations
affects:
  - Future sell strategy modifications (tests provide regression protection)
tech-stack:
  added: []
  patterns:
    - Integration testing with tsx for TypeScript execution
    - Mock percentile data generation for controlled testing
    - Mathematical validation with tolerance for floating-point precision
key-files:
  created:
    - test/e2e/sell-strategy-accuracy.test.js
  modified:
    - src/calculations/sell-strategy.ts
decisions:
  - decision: Document gross-up formula inline with detailed example
    rationale: Critical tax calculation deserves clear explanation
    alternatives: [External documentation, JSDoc only]
    impact: Improved code maintainability and understanding
  - decision: Use tsx for TypeScript test execution
    rationale: Allows direct import of TS modules without build step
    alternatives: [Compile to JS first, Use Vite dev server, Browser-based tests]
    impact: Simpler test execution, no build artifacts needed
  - decision: Three focused integration tests
    rationale: Cover key behaviors (order, dividends, gross-up) with clear validation
    alternatives: [More granular unit tests, E2E browser tests]
    impact: Fast feedback, easy to debug, clear regression detection
metrics:
  duration: 3.5 min
  completed: 2026-01-24
---

# Phase 19 Plan 04: Gross-Up Formula & Integration Tests Summary

**One-liner:** Documented gross-up tax calculation with mathematical example and created 3 integration tests validating sell strategy accuracy.

## What Was Built

### 1. Gross-Up Formula Documentation (Task 1)
Added comprehensive inline documentation to `sell-strategy.ts` explaining the gross-up calculation:

**Formula:** `grossSale = withdrawal + capitalGainsTax`

**Example provided:**
- Portfolio: $1,000,000 (60% gain, 40% basis)
- Withdrawal needed: $100,000
- Basis portion: $40,000
- Gain portion: $60,000
- Tax on gain: $14,280
- **Gross sale needed: $114,280**

The documentation explains why the portfolio is reduced by the GROSS amount, not just the withdrawal, because extra assets must be liquidated to pay taxes.

### 2. Integration Test Suite (Task 2)
Created `test/e2e/sell-strategy-accuracy.test.js` with 3 comprehensive tests:

**Test 1: Order of Operations**
- Validates withdrawal happens BEFORE returns (not after)
- Verifies portfolio compounds on reduced base
- Expected behavior: Less favorable to Sell strategy but matches reference

**Test 2: Dividend Tax Deduction**
- Verifies dividend taxes reduce portfolio value
- Validates total taxes = capital gains + dividend taxes
- Compares terminal value with/without dividends

**Test 3: Gross-Up Tax Calculation**
- Single-year test with known inputs
- Manual calculation: $100k withdrawal → $114,280 gross sale
- Validates mathematical accuracy within tolerance

### 3. Test Execution & Verification (Task 3)
Ran tests using `npx tsx` (TypeScript execution):

**Results:**
- ✅ Test 1: Terminal P50 $6.39M (expected $4-8M range), 100% success rate
- ✅ Test 2: Dividend taxes $0.26M, terminal $0.37M lower with dividends
- ✅ Test 3: Tax $14,280, terminal $885,720 (matches expected)

**All tests PASS** - Sell strategy implementation validated.

## How It Works

### Documentation Pattern
The gross-up calculation section includes:
1. **Formula statement** - Clear mathematical equation
2. **Variable definitions** - What each term represents
3. **Purpose explanation** - Why gross-up is necessary
4. **Concrete example** - Real numbers showing calculation
5. **Impact statement** - How it affects portfolio

This documentation appears at both calculation sites (single and interpolated scenarios).

### Integration Test Pattern
Each test follows a consistent structure:
1. **Configuration** - Set up test parameters
2. **Mock Data Generation** - Create percentile data with known growth rates
3. **Calculation** - Run `calculateSellStrategy()`
4. **Manual Calculation** - Show expected values
5. **Validation** - Compare actual vs expected with tolerance
6. **Pass/Fail Output** - Clear console reporting

### Test Execution Approach
- Uses `npx tsx` to run TypeScript directly
- No build step required (imports TS modules on-the-fly)
- Mock percentile generation provides controlled test environment
- Floating-point tolerance (<$100 for taxes, <$1000 for terminal values)

## Key Decisions

### 1. Inline Documentation Over External
**Decision:** Document gross-up formula directly in code with detailed example

**Rationale:**
- Developers encounter explanation exactly where calculation occurs
- Example provides concrete understanding (not just abstract formula)
- Maintenance: documentation stays with code

**Impact:** Future modifications will preserve understanding of tax math

### 2. tsx for TypeScript Test Execution
**Decision:** Use `npx tsx` to run tests directly on TypeScript source

**Alternatives considered:**
- Compile to JS first (extra build step, artifacts to manage)
- Use Vite dev server (requires server lifecycle, slower)
- Browser-based tests (complex setup for calculation module)

**Rationale:**
- Direct execution is simplest
- No build artifacts or cleanup
- Fast feedback loop
- Works with ES modules

**Impact:** Tests can run against current source code immediately

### 3. Three Focused Integration Tests
**Decision:** Create 3 tests covering order, dividends, and gross-up

**Rationale:**
- Each test validates one key behavior
- Clear pass/fail criteria
- Fast execution (~3 seconds total)
- Easy to debug failures

**Alternatives:**
- More granular unit tests (would duplicate existing logic testing)
- E2E browser tests (overkill for calculation validation)

**Impact:** Clear regression detection if sell strategy changes

## Deviations from Plan

None - plan executed exactly as written.

## Challenges & Solutions

### Challenge 1: ES Module Import Path
**Problem:** Node couldn't find `sell-strategy.js` (source is TypeScript)

**Solution:** Used `npx tsx` which handles TypeScript imports automatically

**Learning:** For TypeScript projects, tsx provides seamless test execution without build configuration

### Challenge 2: Floating-Point Precision
**Problem:** Exact equality checks would fail due to rounding

**Solution:** Used tolerance-based validation (<$100 for taxes, <$1000 for terminal)

**Learning:** Financial calculations need tolerance in tests to account for floating-point arithmetic

## Testing & Validation

### Integration Test Results
```
Test 1: Order of Operations
  Terminal P50: $6.39M ✓
  Success Rate: 100% ✓

Test 2: Dividend Tax Deduction
  Dividend Taxes: $0.26M ✓
  Terminal Impact: -$0.37M ✓
  Total Taxes Sum: Correct ✓

Test 3: Gross-Up Calculation
  Tax: $14,280 ✓
  Gross Sale: $114,280 ✓
  Terminal: $885,720 ✓
```

**All tests PASS** - Sell strategy accuracy verified.

### Build Verification
```bash
npm run build
✓ 103 modules transformed
✓ built in 1.76s
```

TypeScript compilation succeeds without errors.

## What's Next

**Phase 19 Complete:** All 4 plans executed successfully.

Sell strategy now has:
1. ✅ Correct order of operations (withdrawal before returns)
2. ✅ Dividend tax modeling
3. ✅ Return derivation from BBD percentiles (identical market paths)
4. ✅ Documented gross-up formula
5. ✅ Integration test coverage

**Result:** BBD vs Sell comparison is now accurate and trustworthy. Both strategies experience identical market conditions, with differences arising purely from tax treatment and borrowing mechanics.

## Lessons Learned

### Technical
1. **tsx tool** - Excellent for TypeScript testing without build complexity
2. **Mock data generation** - Controlled test environment beats real simulation data
3. **Tolerance-based validation** - Essential for financial calculations with floating-point

### Process
1. **Inline documentation** - Examples make complex math accessible
2. **Focused tests** - Three clear tests beat many unclear ones
3. **Mathematical validation** - Show expected calculation alongside actual result

### Testing Strategy
1. **Integration over unit** - For calculation modules, end-to-end validation is more valuable
2. **Console output** - Clear logging helps debugging and provides documentation
3. **Fast feedback** - Tests run in <5 seconds encourage frequent execution

## Files Changed

### Created (1 file)
- `test/e2e/sell-strategy-accuracy.test.js` (260 lines)
  - 3 integration tests with mock data generation
  - Manual calculation examples
  - Pass/fail validation with tolerance

### Modified (1 file)
- `src/calculations/sell-strategy.ts`
  - Added 33-line documentation block for gross-up calculation
  - Example: $100k withdrawal → $114,280 gross sale
  - Inline comment referencing detailed explanation

## Impact Assessment

### Immediate Impact
- Sell strategy formula is now clearly documented
- Integration tests provide regression protection
- Developers can understand tax calculation math

### Long-Term Impact
- Future modifications to sell strategy can be validated quickly
- Tests serve as executable documentation
- Mathematical accuracy is preserved

### Risk Reduction
- Prevents accidental changes to gross-up formula
- Validates order of operations remains correct
- Ensures dividend tax integration stays accurate

## Commits

1. **c9b551b** - `docs(19-04): document gross-up formula with example`
   - 33-line documentation block
   - Formula, variables, example, impact
   - Files: src/calculations/sell-strategy.ts

2. **05eee1b** - `test(19-04): create sell strategy accuracy integration tests`
   - 3 integration tests (order, dividends, gross-up)
   - Mock percentile data generation
   - 260 lines with validation logic
   - Files: test/e2e/sell-strategy-accuracy.test.js

3. **7b856ca** - `test(19-04): verify sell strategy accuracy tests pass`
   - Documented test execution results
   - All 3 tests PASS
   - Build verification successful

## Metrics

- **Tasks Completed:** 3/3
- **Files Created:** 1
- **Files Modified:** 1
- **Lines Added:** 293 (33 documentation + 260 tests)
- **Tests Created:** 3
- **Test Pass Rate:** 100%
- **Build Status:** ✅ Success
- **Duration:** 3.5 minutes

## Next Phase Readiness

**Phase 19 Complete** - No next phase (Phase 19 is final phase).

### What's Working
- Sell strategy order of operations correct
- Dividend tax modeling accurate
- Gross-up formula documented and tested
- BBD vs Sell comparison uses identical returns

### No Blockers
All 4 plans in Phase 19 successfully completed.

### Recommendations
1. **Consider adding gross-up tests to CI pipeline** - Currently manual execution
2. **Document test execution in README** - How to run `npx tsx test/e2e/sell-strategy-accuracy.test.js`
3. **Consider snapshot testing** - Lock down sell strategy outputs for regression detection
