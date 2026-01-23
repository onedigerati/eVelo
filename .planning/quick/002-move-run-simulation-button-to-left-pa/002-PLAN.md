---
phase: quick
plan: 002
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/sidebar-panel.ts
  - src/components/app-root.ts
autonomous: true

must_haves:
  truths:
    - "Run Simulation button is visible at bottom of sidebar without scrolling"
    - "Button remains fixed when sidebar content scrolls"
    - "Progress indicator appears in sidebar next to button during simulation"
    - "Button click still triggers simulation correctly"
  artifacts:
    - path: "src/components/ui/sidebar-panel.ts"
      provides: "Footer slot for fixed bottom content"
      contains: "slot name=\"footer\""
    - path: "src/components/app-root.ts"
      provides: "Button moved to sidebar slot"
      contains: "slot=\"footer\""
  key_links:
    - from: "src/components/app-root.ts"
      to: "src/components/ui/sidebar-panel.ts"
      via: "footer slot for button placement"
      pattern: "slot=\"footer\""
---

<objective>
Move the "Run Simulation" button from the main dashboard area to a fixed footer position in the left sidebar panel.

Purpose: Ensure the Run Simulation button is always visible regardless of sidebar scroll position, improving UX when many parameters are configured.
Output: Button fixed to sidebar bottom with progress indicator, all simulation logic preserved.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/ui/sidebar-panel.ts - Sidebar with grid layout (auto 1fr), needs footer area
@src/components/app-root.ts - Contains button at lines 119-127, handler at lines 349-454
@src/styles/tokens.css - Design tokens for styling
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add footer slot to sidebar-panel</name>
  <files>src/components/ui/sidebar-panel.ts</files>
  <action>
Update sidebar-panel.ts to support a fixed footer area:

1. Modify grid-template-rows from `auto 1fr` to `auto 1fr auto` to add footer row
2. Add a footer container after sidebar-content div:
   ```html
   <div class="sidebar-footer">
     <slot name="footer"></slot>
   </div>
   ```
3. Add CSS for sidebar-footer:
   - Padding: var(--spacing-md)
   - Border-top: 1px solid var(--border-color)
   - Background: var(--surface-secondary) to match sidebar
   - Should NOT scroll (stays fixed at bottom)
4. Update collapsed state: hide footer when sidebar is collapsed (same as sidebar-content)
  </action>
  <verify>
Inspect sidebar-panel.ts for:
- grid-template-rows includes three values (auto 1fr auto)
- slot name="footer" exists
- .sidebar-footer class has appropriate styles
- Collapsed state hides footer
  </verify>
  <done>Sidebar-panel has footer slot that remains fixed at bottom while content scrolls</done>
</task>

<task type="auto">
  <name>Task 2: Move button to sidebar footer</name>
  <files>src/components/app-root.ts</files>
  <action>
Move the Run Simulation button from dashboard to sidebar:

1. In template(), remove the entire .simulation-controls div from inside .dashboard (lines 119-127)

2. Add a new slot="footer" element inside sidebar-panel, after the last param-section:
   ```html
   <div slot="footer" class="simulation-controls">
     <button class="btn-primary" id="run-sim">Run Simulation</button>
     <progress-indicator
       id="sim-progress"
       value="0"
       label="Running simulation..."
       class="hidden"
     ></progress-indicator>
   </div>
   ```

3. Update .simulation-controls CSS in styles() to work in sidebar context:
   - Change flex layout to column direction for narrow sidebar
   - Progress indicator should be below button, full width
   - Keep existing button styles (.btn-primary)
   - Make button full width: width: 100%

4. Verify afterRender() button selector still works - it queries by ID so should work fine with Shadow DOM piercing through slots
  </action>
  <verify>
npm run build && npm run dev
- Open app in browser
- Verify button appears at bottom of sidebar
- Scroll sidebar content - button should stay fixed
- Click Run Simulation - should work exactly as before
- Progress indicator appears below button during simulation
  </verify>
  <done>
Button is in sidebar footer, visible without scrolling.
Clicking button runs simulation and updates results dashboard.
Progress indicator shows during simulation.
  </done>
</task>

</tasks>

<verification>
1. Visual check: Button visible at sidebar bottom without scrolling
2. Scroll test: Add many parameters or resize window - button stays fixed
3. Functional test: Click Run Simulation, verify:
   - Button disables during run
   - Progress indicator appears
   - Results dashboard updates on completion
   - Toast notification shows success
4. Collapsed test: Collapse sidebar - button should be hidden
5. Mobile test: At 768px breakpoint, sidebar overlay should still show button
</verification>

<success_criteria>
- Run Simulation button is always visible at bottom of sidebar
- Button functionality unchanged (runs simulation, shows progress, displays results)
- Responsive behavior preserved (works on mobile overlay)
- No console errors
</success_criteria>

<output>
After completion, create `.planning/quick/002-move-run-simulation-button-to-left-pa/002-SUMMARY.md`
</output>
