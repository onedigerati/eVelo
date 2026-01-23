---
phase: quick
plan: 004
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true

must_haves:
  truths:
    - "Feasibility of agent-browser integration is clearly determined"
    - "Specific testing use cases for eVelo are documented"
    - "Installation and compatibility requirements are identified"
  artifacts:
    - path: ".planning/quick/004-research-agent-browser-integration/004-RESEARCH.md"
      provides: "Complete research findings and recommendations"
      min_lines: 100
  key_links: []
---

<objective>
Research the Vercel agent-browser tool to determine its suitability for UI testing, validation, and layout verification in the eVelo Portfolio Strategy Simulator.

Purpose: Evaluate whether agent-browser can address eVelo's testing gaps - specifically Web Component functionality testing, Chart.js rendering validation, Shadow DOM interaction, and cross-viewport layout verification.

Output: A comprehensive research document with feasibility assessment, integration approach, and actionable recommendations.
</objective>

<execution_context>
@~/.claude/get-shit-done/workflows/execute-plan.md
@~/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md

Key facts about agent-browser:
- CLI tool built in Rust with Node.js fallback for AI agents to control browsers
- Uses Chromium via Playwright under the hood
- Supports semantic locators (ARIA roles, labels, text content)
- Snapshot-based element selection (@e1, @e2 refs) optimized for AI workflows
- Features: navigation, clicking, typing, screenshots, accessibility tree inspection
- Supports headed mode for visual debugging
- JSON output mode for programmatic consumption
- Session/profile persistence for authenticated workflows

Key facts about eVelo:
- TypeScript + Web Components (no framework)
- Shadow DOM components with open mode
- Chart.js for visualizations (probability cone, histogram, donut, heatmap)
- Vite build system with dev server (likely localhost:5173)
- No existing test infrastructure
- 28+ custom UI components in src/components/ui/
</context>

<tasks>

<task type="auto">
  <name>Task 1: Analyze integration feasibility and document findings</name>
  <files>.planning/quick/004-research-agent-browser-integration/004-RESEARCH.md</files>
  <action>
Create a comprehensive research document covering:

1. **Shadow DOM Compatibility Analysis**
   - Determine if agent-browser can pierce Shadow DOM boundaries
   - Test if accessibility tree snapshots include Shadow DOM content
   - Evaluate if semantic locators work with custom elements
   - Note: Web Components use shadow.mode = 'open' which may help

2. **Chart.js Testing Capabilities**
   - Canvas-based charts are NOT in accessibility tree (no DOM elements)
   - Assess screenshot + visual comparison as alternative
   - Consider canvas.toDataURL() for chart state verification
   - Evaluate if chart legend/tooltip interactions are testable

3. **Specific Use Cases for eVelo**
   Document how agent-browser could test:
   - Form interactions (range-slider, number-input, select-input, checkbox-input)
   - Simulation workflow (set params -> run -> verify results)
   - Dashboard rendering (results-dashboard, charts appear after simulation)
   - Settings panel (modal overlay interaction)
   - Toast notifications (transient UI elements)
   - Responsive layout at different viewports (--viewport flag)

4. **Integration Approach**
   - Installation: npm install -g agent-browser && agent-browser install
   - Vite dev server integration (localhost:5173)
   - Test script structure for AI-assisted testing
   - Example commands for common testing scenarios

5. **Limitations and Alternatives**
   - What agent-browser cannot do well (canvas testing, pixel-perfect validation)
   - Alternative/complementary tools (Playwright direct, @testing-library/dom)
   - Whether Playwright (agent-browser's engine) might be better for traditional tests

6. **Recommendation**
   - Clear verdict: Integrate / Don't Integrate / Hybrid Approach
   - If integrate: prioritized use cases
   - If not: recommended alternative for each testing need
  </action>
  <verify>
File exists at .planning/quick/004-research-agent-browser-integration/004-RESEARCH.md with:
- Shadow DOM section with feasibility assessment
- Chart.js section with workaround strategies
- At least 5 specific eVelo testing use cases
- Clear integration recommendation with rationale
- File is at least 100 lines
  </verify>
  <done>
Research document provides actionable guidance on whether and how to integrate agent-browser for eVelo UI testing.
  </done>
</task>

</tasks>

<verification>
- [ ] 004-RESEARCH.md exists and is comprehensive
- [ ] Shadow DOM compatibility clearly assessed
- [ ] Chart.js testing approach documented
- [ ] Integration recommendation is clear and actionable
</verification>

<success_criteria>
- Research document answers: "Should we use agent-browser for eVelo testing?"
- Document provides specific next steps if recommendation is positive
- Document identifies alternative approaches if recommendation is negative
</success_criteria>

<output>
After completion, create `.planning/quick/004-research-agent-browser-integration/004-SUMMARY.md`
</output>
