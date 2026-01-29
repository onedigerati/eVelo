# Quick Task 016: Fix Load Button for Already-Selected Preset

## Problem

When a portfolio preset is already selected in the dropdown (e.g., "mypicks"), clicking the "Load" button does nothing. The current implementation only focuses/clicks the dropdown, expecting the user to change the selection - but if the desired preset is already selected, no `change` event fires.

## Root Cause

In `portfolio-composition.ts`, the `loadPreset()` method (lines 1848-1859) only:
1. Refreshes the dropdown
2. Focuses and clicks the select element

It does NOT actually load the currently selected portfolio. Loading only happens in `handlePresetSelectChange()` which requires a `change` event.

## Solution

Modify `loadPreset()` to:
1. Get the currently selected portfolio ID from the dropdown
2. If a valid portfolio is selected, load it directly (reusing the portfolio loading logic)
3. If no portfolio is selected (empty/default option), then focus the dropdown as current behavior

## Tasks

### Task 1: Fix loadPreset() to load currently selected portfolio

**File:** `src/components/ui/portfolio-composition.ts`

**Changes:**
- Modify `loadPreset()` to check if a valid portfolio is already selected
- If selected, call the portfolio loading logic directly
- If not selected, fall back to current focus/click behavior

## Verification

- [ ] Load button loads the currently selected preset
- [ ] Load button still works when no preset is selected (focuses dropdown)
- [ ] Dirty state and comparison prompts still work correctly
- [ ] Toast notification shows "Loaded portfolio: {name}" on successful load
