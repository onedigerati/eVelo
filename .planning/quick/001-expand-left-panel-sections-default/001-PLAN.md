---
quick: 001-expand-left-panel-sections-default
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/app-root.ts
autonomous: true
must_haves:
  truths:
    - "All three param-section elements in the left panel are expanded on load"
    - "Portfolio Settings section is expanded"
    - "SBLOC Settings section is expanded"
    - "Asset Allocation section is expanded"
  artifacts:
    - path: "src/components/app-root.ts"
      provides: "Sidebar param-section declarations"
      contains: "param-section"
  key_links:
    - from: "src/components/app-root.ts"
      to: "src/components/ui/param-section.ts"
      via: "open attribute"
      pattern: 'param-section.*open'
---

<objective>
Make all sections in the left sidebar panel fully expanded by default.

Purpose: Improve UX by showing all parameter controls immediately without requiring clicks to expand.
Output: All three param-section elements have the `open` attribute set.
</objective>

<context>
The sidebar contains three `<param-section>` components:
1. "Portfolio Settings" - already has `open` attribute (line 40)
2. "SBLOC Settings" - missing `open` attribute (line 70)
3. "Asset Allocation" - has incorrect `expanded` attribute instead of `open` (line 93)

The `param-section` component uses native `<details>` element and checks for `open` attribute:
```typescript
const isOpen = this.hasAttribute('open') ? 'open' : '';
```
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add open attribute to all param-section elements</name>
  <files>src/components/app-root.ts</files>
  <action>
    In the template() method of AppRoot:

    1. Line 70: Add `open` attribute to SBLOC Settings section
       Before: `<param-section title="SBLOC Settings">`
       After:  `<param-section title="SBLOC Settings" open>`

    2. Line 93: Change `expanded` to `open` on Asset Allocation section
       Before: `<param-section title="Asset Allocation" expanded>`
       After:  `<param-section title="Asset Allocation" open>`

    The Portfolio Settings section (line 40) already has `open` - no change needed.
  </action>
  <verify>
    1. Run: `npm run build` to ensure TypeScript compiles
    2. Visually verify: Open app in browser - all three sidebar sections should be expanded
  </verify>
  <done>
    All three param-section elements have the `open` attribute:
    - Portfolio Settings: open
    - SBLOC Settings: open
    - Asset Allocation: open
  </done>
</task>

</tasks>

<verification>
1. Build succeeds: `npm run build` completes without errors
2. Visual check: Load app, sidebar shows all three sections expanded by default
3. Code check: All `<param-section>` tags in app-root.ts have `open` attribute
</verification>

<success_criteria>
- All three sidebar sections display expanded on initial page load
- No collapsed sections requiring user clicks to expand
- Build passes with no errors
</success_criteria>

<output>
After completion, create `.planning/quick/001-expand-left-panel-sections-default/001-SUMMARY.md`
</output>
