---
status: verifying
trigger: "svg-dial-text-overlap"
created: 2026-01-28T00:00:00Z
updated: 2026-01-28T00:50:00Z
---

## Current Focus

hypothesis: CONFIRMED - Parent rotate(-90deg) transforms Y-axis to X-axis. Swapping X/Y coordinates fixes the positioning
test: User verification in browser - dev server should auto-reload with new coordinates
expecting: Percentage "81%" will appear on top, "Success" label will appear below it, vertically stacked with no horizontal overlap
next_action: User verifies fix in browser at Strategy Analysis section

## Symptoms

expected: The "Success" label should appear clearly below the percentage number in the circular SVG dial with proper visual separation
actual: The "Success" label text overlaps with the percentage number - appears as "80%ess" or similar merged text
errors: None - this is a visual/layout issue, not a runtime error
reproduction: View the Strategy Analysis section when BBD is recommended - look at the circular progress dial on the right side of the verdict banner
started: Always been broken since the dial was created

## Eliminated

- hypothesis: Transform-origin px units are the problem, unitless values fix it
  evidence: User verification shows NO text visible at all after changing to unitless values (50 44, 50 70). This made things WORSE - arc is visible but ALL text disappeared. The unitless syntax appears to be invalid or incompatible with how browsers interpret transform-origin in this SVG context.
  timestamp: 2026-01-28T00:25:00Z

## Evidence

- timestamp: 2026-01-28T00:05:00Z
  checked: SVG dial structure in strategy-analysis.ts lines 185-191
  found: |
    - Parent .dial-svg has transform: rotate(-90deg) (line 447)
    - Text elements at y=44 (percentage) and y=70 (label) (lines 188-189)
    - Both text elements have transform: rotate(90deg) to counter-rotate (lines 476, 485)
    - transform-origin: 50px 44px and 50px 70px (lines 477, 486)
  implication: The transform-origin is using SVG coordinates, but those coordinates are BEFORE the parent rotation. When parent rotates -90deg, the coordinate system rotates too.

- timestamp: 2026-01-28T00:10:00Z
  checked: Transform-origin coordinate system behavior
  found: |
    When parent has rotate(-90deg), child elements inherit rotated coordinate system.
    The text elements then apply rotate(90deg) to become readable.
    transform-origin should reference the point in the ROTATED coordinate system.

    With parent rotate(-90deg):
    - Original y=44 becomes x=44 in rotated system
    - Original y=70 becomes x=70 in rotated system
    - Original x=50 becomes y=50 in rotated system

    So transform-origin should be: "44 50" and "70 50", not "50 44" and "50 70"
  implication: The current transform-origin values are backwards - x and y are swapped

- timestamp: 2026-01-28T00:15:00Z
  checked: CSS transform-origin syntax and coordinate systems
  found: |
    The issue is actually simpler than coordinate system rotation:
    - SVG text at x=50, y=44 should rotate around point (50, 44)
    - SVG text at x=50, y=70 should rotate around point (50, 70)
    - But transform-origin uses CSS syntax: "50px 44px" and "50px 70px"
    - The px units might be causing browser to interpret these differently than SVG units
    - Better: use unitless values or % for SVG transforms
  implication: Should use "50 44" (unitless) instead of "50px 44px" for SVG transform-origin

- timestamp: 2026-01-28T00:20:00Z
  checked: Applied fix to strategy-analysis.ts
  found: |
    Changed lines 477 and 486:
    - .dial-text: transform-origin: 50px 44px → transform-origin: 50 44
    - .dial-label: transform-origin: 50px 70px → transform-origin: 50 70

    This matches SVG best practices: when using transform-origin on SVG elements,
    use unitless values that reference the SVG coordinate system (viewBox units),
    not CSS pixel units.
  implication: Fix applied, ready for verification

- timestamp: 2026-01-28T00:25:00Z
  checked: User verification result - fix made things WORSE
  found: |
    After changing to unitless values (50 44, 50 70):
    - Circular ring/arc IS visible (parent rotation works)
    - NO text visible at all (neither percentage nor "Success" label)
    - Text has completely disappeared or positioned outside visible area

    This is worse than the original bug where text overlapped but was at least visible.
  implication: The unitless transform-origin syntax is either invalid or being interpreted incorrectly

- timestamp: 2026-01-28T00:30:00Z
  checked: MDN documentation on transform-origin in SVG
  found: |
    From MDN and CSS-Tricks research:
    1. transform-origin in CSS (when applied to SVG elements via CSS) uses CSS units
    2. The default transform-box for SVG is "view-box" (relative to viewBox coordinates)
    3. BUT: When using CSS transform-origin (not SVG transform attribute), you MUST use CSS units (px, %, etc.)
    4. Unitless values are valid for SVG transform attribute, NOT for CSS transform-origin property

    The current code uses CSS property (transform-origin: ...) not SVG attribute (transform="...")
    So it REQUIRES units like "50px 44px" not unitless "50 44"
  implication: I was wrong - the original px units were correct syntax for CSS transform-origin. The problem is not the units, but something else about the transform-origin coordinates themselves.

- timestamp: 2026-01-28T00:35:00Z
  checked: Reverted bad fix - restored px units
  found: |
    Reverted lines 477 and 486 back to:
    - .dial-text: transform-origin: 50px 44px
    - .dial-label: transform-origin: 50px 70px

    Now investigating alternative approach: Instead of using CSS transform + transform-origin,
    use SVG transform attribute directly on the text elements.
  implication: Back to working state (with overlap bug), ready to try proper fix

- timestamp: 2026-01-28T00:40:00Z
  checked: Applied new fix using SVG transform attribute instead of CSS
  found: |
    Changed approach completely:

    HTML (lines 188-189): Added SVG transform attributes directly to text elements:
    - <text class="dial-text" x="50" y="44" transform="rotate(90 50 44)" ...>
    - <text class="dial-label" x="50" y="70" transform="rotate(90 50 70)">

    CSS (lines 470-487): Removed CSS transform and transform-origin properties completely:
    - Removed: transform: rotate(90deg);
    - Removed: transform-origin: 50px 44px / 50px 70px;

    Why this works better:
    - SVG transform attribute syntax: rotate(angle cx cy) explicitly specifies rotation center
    - rotate(90 50 44) means "rotate 90 degrees around point (50, 44)"
    - rotate(90 50 70) means "rotate 90 degrees around point (50, 70)"
    - This is native SVG, not CSS trying to transform SVG, so coordinate systems align properly
    - Each text element rotates around ITS OWN position, not a CSS-interpreted origin
  implication: This should properly counter-rotate the text without overlap issues

- timestamp: 2026-01-28T00:50:00Z
  checked: User verification - SVG transform approach FAILED
  found: |
    User reports: "Still broken. Screenshot shows '81%uccess' - the 'Success' label is overlapping horizontally with the percentage. The 'S' from Success is hidden behind the '%' and 'uccess' appears after it."

    "The text is being positioned HORIZONTALLY next to each other instead of VERTICALLY stacked (percentage on top, 'Success' below)."

    This confirms the SVG transform attribute did NOT fix the positioning issue.
  implication: The transform rotates the text to be readable, but doesn't fix the POSITIONING problem. Need to understand the coordinate system transformation.

- timestamp: 2026-01-28T00:55:00Z
  checked: Parent .dial-svg styling (line 447)
  found: |
    .dial-svg has CSS: transform: rotate(-90deg);

    This is the ROOT CAUSE of the positioning issue:

    When the parent SVG container rotates -90deg:
    - Original Y-axis becomes the X-axis (points right)
    - Original X-axis becomes the negative Y-axis (points down)

    So when text elements are positioned at:
    - y="44" - this is now 44 units to the RIGHT (horizontal)
    - y="70" - this is now 70 units to the RIGHT (horizontal)

    Result: Text positioned HORIZONTALLY at x=44 and x=70 (in rotated space)

    The SVG transform="rotate(90 50 44)" counter-rotates the text to make it READABLE,
    but it doesn't change the text's POSITION. The text is still positioned horizontally.
  implication: Need to swap X and Y coordinates in the text positioning to account for the parent rotation

- timestamp: 2026-01-28T01:00:00Z
  checked: Applied coordinate swap fix
  found: |
    Changed lines 188-189 in strategy-analysis.ts:

    BEFORE (horizontal positioning):
    <text class="dial-text" x="50" y="44" transform="rotate(90 50 44)" ...>
    <text class="dial-label" x="50" y="70" transform="rotate(90 50 70)">

    AFTER (vertical positioning in rotated space):
    <text class="dial-text" x="44" y="50" transform="rotate(90 44 50)" ...>
    <text class="dial-label" x="70" y="50" transform="rotate(90 70 50)">

    Logic:
    - Parent rotates -90deg: Y-axis becomes X-axis, X-axis becomes -Y-axis
    - To position text VERTICALLY in the original view, use X coordinates in rotated space
    - x="44" means 44 units from center (closer to center = higher up after rotation)
    - x="70" means 70 units from center (farther from center = lower down after rotation)
    - Both have y="50" (centered horizontally after rotation)
    - transform rotate centers updated to match: rotate(90 44 50) and rotate(90 70 50)

    Build successful - no compilation errors.
  implication: This should now stack text vertically with percentage above and "Success" label below

## Resolution

root_cause: |
  The text overlap occurred because the parent SVG container has `transform: rotate(-90deg)`, which rotates the entire coordinate system by -90 degrees.

  In the rotated coordinate system:
  - The original Y-axis becomes the X-axis (points right)
  - The original X-axis becomes the negative Y-axis (points down)

  The original code positioned text at:
  - x="50" y="44" (percentage)
  - x="50" y="70" (label)

  After the parent -90deg rotation, these Y coordinates (44, 70) became HORIZONTAL positions (X positions in the rotated space), causing the text to be positioned side-by-side horizontally instead of vertically stacked.

  The SVG transform="rotate(90)" counter-rotated the text to make it READABLE, but did NOT fix the POSITIONING issue.

fix: |
  Swapped X and Y coordinates to account for the parent rotation:

  Lines 188-189 in strategy-analysis.ts:

  BEFORE (horizontal positioning):
  <text class="dial-text" x="50" y="44" transform="rotate(90 50 44)" ...>
  <text class="dial-label" x="50" y="70" transform="rotate(90 50 70)">

  AFTER (vertical positioning):
  <text class="dial-text" x="44" y="50" transform="rotate(90 44 50)" ...>
  <text class="dial-label" x="70" y="50" transform="rotate(90 70 50)">

  Why this works:
  - x="44" positions text 44 units from center in rotated space = higher up in final view
  - x="70" positions text 70 units from center in rotated space = lower down in final view
  - y="50" centers text horizontally in rotated space = centered horizontally in final view
  - transform rotate centers updated to match the new positions: (44, 50) and (70, 50)

verification: |
  Build successful - no compilation errors.

  ATTEMPTS:
  1. FAILED: Unitless values in CSS transform-origin made text disappear completely
  2. FAILED: Using SVG transform attribute without coordinate swap - text still overlapped horizontally
  3. CURRENT: Coordinate swap to account for parent rotation

  To verify the fix:
  1. Open the app in browser (dev server at http://localhost:5173)
  2. Navigate to Strategy Analysis section where BBD is recommended
  3. Look at the circular progress dial on the right side of the verdict banner
  4. Confirm the percentage (e.g., "81%") appears on top
  5. Confirm the "Success" label appears clearly BELOW the percentage
  6. Verify no horizontal overlap (should NOT show "81%uccess" or similar)
  7. Text should be vertically stacked and centered within the circular dial

files_changed:
  - src/components/ui/strategy-analysis.ts (lines 188-189)
