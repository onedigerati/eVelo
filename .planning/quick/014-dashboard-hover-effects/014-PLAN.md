---
phase: quick
plan: 014
type: execute
wave: 1
depends_on: []
files_modified:
  - src/styles/tokens.css
  - src/components/ui/results-dashboard.ts
autonomous: true

must_haves:
  truths:
    - "Dashboard cards lift on hover with translateY effect"
    - "Shadow depth increases on hover for visual feedback"
    - "Border color transitions to brand primary on hover"
    - "Transitions are smooth with cubic-bezier easing"
  artifacts:
    - path: "src/styles/tokens.css"
      provides: "Shadow CSS variables for hover states"
      contains: "--shadow-lg"
    - path: "src/components/ui/results-dashboard.ts"
      provides: "Hover effects on dashboard sections"
      contains: "translateY"
  key_links:
    - from: "src/components/ui/results-dashboard.ts"
      to: "src/styles/tokens.css"
      via: "CSS variable references"
      pattern: "var\\(--shadow"
---

<objective>
Implement hover effects for dashboard cards/sections matching reference PortfolioStrategySimulator.html.

Purpose: Add visual polish and interactivity feedback to dashboard sections, improving perceived quality and user experience.

Output: Dashboard cards with lift effect, enhanced shadows, and border color change on hover with smooth transitions.
</objective>

<execution_context>
@C:\Users\ungac\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\ungac\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/styles/tokens.css
@src/components/ui/results-dashboard.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add shadow CSS variables to tokens.css</name>
  <files>src/styles/tokens.css</files>
  <action>
Add shadow design tokens for hover states matching reference implementation:

In `:root` section:
```css
/* Shadows */
--shadow-sm: 0 1px 3px rgba(26, 36, 36, 0.06);
--shadow-md: 0 4px 12px rgba(26, 36, 36, 0.08);
--shadow-lg: 0 8px 32px rgba(26, 36, 36, 0.12);
--shadow-hover: 0 12px 40px rgba(26, 36, 36, 0.15);
```

In `[data-theme="dark"]` section:
```css
/* Shadows - more dramatic for dark theme */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
--shadow-hover: 0 12px 40px rgba(0, 0, 0, 0.6);
--shadow-glow: 0 0 16px rgba(77, 184, 160, 0.15);
```
  </action>
  <verify>Grep for "--shadow-lg" in tokens.css returns matches in both light and dark theme sections</verify>
  <done>Shadow tokens exist for sm/md/lg/hover in both light and dark themes</done>
</task>

<task type="auto">
  <name>Task 2: Add hover effects to dashboard sections</name>
  <files>src/components/ui/results-dashboard.ts</files>
  <action>
In the `styles()` method, update the `.chart-section, .stats-section` rule to add hover effects:

```css
.chart-section,
.stats-section {
  background: var(--surface-primary, #ffffff);
  border: 1px solid var(--border-color, #e2e8f0);
  border-radius: var(--radius-lg, 8px);
  padding: var(--spacing-lg, 24px);
  /* Add hover transition */
  transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1),
              box-shadow 0.3s cubic-bezier(0.23, 1, 0.32, 1),
              border-color 0.3s ease;
}

.chart-section:hover,
.stats-section:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg, 0 8px 32px rgba(26, 36, 36, 0.12));
  border-color: var(--color-primary, #0d9488);
}
```

Also add hover effects to these additional card-like elements:

1. `.stat-item` - subtle lift (translateY -2px, shadow-md on hover)
2. `.comparison-chart-card` - standard lift (translateY -4px, shadow-lg on hover)
3. `.debt-spectrum-wrapper` - standard lift effect
4. `.comparison-wrapper` - standard lift effect

Add reduced motion support:
```css
@media (prefers-reduced-motion: reduce) {
  .chart-section,
  .stats-section,
  .stat-item,
  .comparison-chart-card,
  .debt-spectrum-wrapper,
  .comparison-wrapper {
    transition: none;
  }

  .chart-section:hover,
  .stats-section:hover,
  .stat-item:hover,
  .comparison-chart-card:hover,
  .debt-spectrum-wrapper:hover,
  .comparison-wrapper:hover {
    transform: none;
  }
}
```
  </action>
  <verify>Run `npm run build` - no TypeScript errors. Visually verify in browser that hovering over dashboard cards produces lift effect with shadow.</verify>
  <done>Dashboard sections lift on hover with smooth transitions; reduced motion is respected</done>
</task>

</tasks>

<verification>
1. `npm run build` completes without errors
2. Open app in browser, hover over any dashboard section - should see:
   - Card lifts up by 4px (translateY)
   - Shadow becomes more prominent
   - Border transitions to teal color
   - Transition is smooth (0.3s cubic-bezier)
3. Test in dark mode - shadows should be more dramatic
4. Test with prefers-reduced-motion: reduce - no animations should occur
</verification>

<success_criteria>
- Shadow CSS variables exist in tokens.css (light and dark)
- Dashboard sections have hover effects matching reference
- Stat items have subtle hover lift
- Comparison charts have hover lift
- Transitions use cubic-bezier(0.23, 1, 0.32, 1) for smooth easing
- Reduced motion preference is respected
- Build passes without errors
</success_criteria>

<output>
After completion, create `.planning/quick/014-dashboard-hover-effects/014-SUMMARY.md`
</output>
