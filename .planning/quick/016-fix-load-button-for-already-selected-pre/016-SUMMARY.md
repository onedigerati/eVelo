# Quick Task 016: Fix Load Button for Already-Selected Preset

## Summary

Fixed the Load button in the portfolio preset section to actually load the currently selected portfolio instead of just focusing the dropdown.

## Problem

When a portfolio preset (e.g., "mypicks") was already selected in the dropdown and the user clicked the "Load" button, nothing happened. The button only focused/clicked the dropdown, expecting the user to change the selection - but since the desired preset was already selected, no `change` event would fire.

## Root Cause

The `loadPreset()` method only refreshed the dropdown and focused/clicked it. The actual portfolio loading logic was in `handlePresetSelectChange()` which only triggered on `change` events.

## Solution

Modified `loadPreset()` to:
1. Check if a valid portfolio is already selected in the dropdown
2. If selected, load it directly using the same logic as `handlePresetSelectChange()`
3. Handle unsaved changes prompts before loading
4. Show success toast on successful load
5. Fall back to focus/click behavior only when no portfolio is selected

## Files Changed

- `src/components/ui/portfolio-composition.ts` - Updated `loadPreset()` method

## Verification

- [x] Load button loads the currently selected preset
- [x] Load button prompts for unsaved changes if needed
- [x] Load button shows toast notification on success
- [x] Load button still focuses dropdown when no preset is selected
- [x] Build passes without errors
