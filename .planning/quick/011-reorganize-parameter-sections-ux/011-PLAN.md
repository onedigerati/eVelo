---
id: quick-011
title: Reorganize Parameter Sections for Intuitive UX
type: quick
status: planned
created: 2026-01-23
estimated_effort: 25 min
files_modified:
  - src/components/app-root.ts
  - src/styles/tokens.css
---

<objective>
Reorganize left panel parameter sections to match the BBD user mental model: "What do I have?" -> "What do I need?" -> "How long?" -> "How risky?" -> "Advanced options". Enhance visual hierarchy with section icons and subtle grouping to improve scannability.

Purpose: Current organization mixes core decisions with technical settings. Users think about wealth, spending, timeline, then risk - not "Portfolio Settings" containing both investment and inflation. A logical flow reduces cognitive load and helps users complete the form confidently.

Output: Reorganized param-sections in app-root.ts with improved visual styling
</objective>

<context>
@src/components/app-root.ts - Main template with 8 param-sections
@src/components/ui/param-section.ts - Collapsible section component
@src/styles/tokens.css - Design tokens

Current order:
1. Portfolio Settings (Investment, LOC Balance, Iterations, Inflation)
2. Timeline (Start Year, Withdrawal Start Year, Period)
3. Withdrawal Strategy (Amount, Raise, Monthly toggle)
4. SBLOC Risk Parameters (Rate, Max Borrowing, Maintenance, Haircut)
5. Asset Allocation (portfolio-composition)
6. Return Distribution Model
7. Withdrawal Chapters (Optional)
8. Tax Modeling (Optional)

Problem: Asset Allocation is buried at position 5, but it's a primary decision. Simulation Iterations and Inflation are technical settings mixed with core decisions. "Portfolio Settings" is a vague label.
</context>

<analysis>
## BBD User Mental Model

When a wealthy individual considers Buy-Borrow-Die, they think:

1. **"What do I have?"** - My current wealth and portfolio composition
2. **"What do I need?"** - How much cash flow do I need annually?
3. **"How long?"** - What time horizon am I planning for?
4. **"How risky is it?"** - What are the loan terms and margin call risks?
5. **"What-ifs?"** - Advanced scenarios (life stage changes, taxes, stress testing)

## Proposed Reorganization

### Primary Decisions (Core Flow)

**1. Your Portfolio** - What you're starting with
- Initial Investment ($)
- Asset Allocation (moved up - the composition IS the portfolio)
- Starting LOC Balance (if any existing debt)

**2. Your Spending Needs** - What you need to withdraw
- Annual Withdrawal ($)
- Annual Raise (%)
- Monthly Withdrawal toggle

**3. Time Horizon** - Planning period
- Simulation Start Year
- First Withdrawal Year
- Period (Years)

**4. Line of Credit Terms** - SBLOC risk parameters
- Interest Rate (%)
- Max Borrowing / Hard Margin (%)
- Maintenance Margin / Warning Zone (%)
- Forced Liquidation Haircut (%)

### Advanced Options (Collapsed by Default)

**5. Simulation Settings** - Technical parameters (moved from scattered locations)
- Simulation Iterations (precision vs speed)
- Expected Inflation Rate (for real return calculation)
- Return Distribution Model (Bootstrap vs Regime-Switching)

**6. Withdrawal Chapters** - Optional multi-phase strategy
- (unchanged content)

**7. Tax Modeling** - Optional tax considerations
- (unchanged content)

## Visual Enhancements

1. **Section Icons** - Small SVG icons before titles improve scannability
2. **Primary vs Advanced visual distinction** - Subtle separator or styling for advanced sections
3. **Better labels** - "Your Portfolio" > "Portfolio Settings", "Line of Credit Terms" > "SBLOC Risk Parameters"
</analysis>

<tasks>

<task type="auto">
  <name>Task 1: Reorganize and rename param-sections in app-root.ts</name>
  <files>src/components/app-root.ts</files>
  <action>
Restructure the template() method param-sections in this order:

1. **"Your Portfolio"** (open by default)
   - Initial Investment (keep as is)
   - Move portfolio-composition HERE (was Asset Allocation section)
   - Initial LOC Balance (keep, add help text "Leave at 0 if starting fresh")

2. **"Your Spending Needs"** (open by default)
   - Annual Withdrawal (rename label to "Annual Cash Need ($)")
   - Annual Raise (rename label to "Annual Increase (%)")
   - Monthly Withdrawal checkbox (keep)

3. **"Time Horizon"** (open by default)
   - Start Year (rename label to "Strategy Start Year")
   - Withdrawal Start Year (rename label to "First Withdrawal Year")
   - Period (keep as "Period (Years)")

4. **"Line of Credit Terms"** (open by default)
   - SBLOC Interest Rate (rename label to "Annual Interest Rate (%)")
   - Max Borrowing % (rename to "Max LTV / Hard Margin (%)")
   - Maintenance Margin % (rename to "Warning Zone LTV (%)")
   - Liquidation Haircut (keep label, keep help text)

5. **"Simulation Settings"** (collapsed by default - remove 'open' attribute)
   - Simulation Iterations (move from Portfolio Settings)
   - Expected Inflation (move from Portfolio Settings)
   - Return Distribution Model (move entire content from section 6)

6. **"Withdrawal Chapters"** (keep as Optional, collapsed)
   - Keep existing content unchanged

7. **"Tax Modeling"** (keep as Optional, collapsed)
   - Keep existing content unchanged

Key changes:
- Delete the old "Asset Allocation" param-section (content merged into "Your Portfolio")
- Delete the old "Return Distribution Model" param-section (merged into "Simulation Settings")
- Update labels for clarity
- Primary sections (1-4) stay open, advanced sections (5-7) collapsed by default
  </action>
  <verify>
Run `npm run dev`, verify:
- 7 param-sections visible (down from 8)
- Order: Your Portfolio, Your Spending Needs, Time Horizon, Line of Credit Terms, Simulation Settings, Withdrawal Chapters, Tax Modeling
- First 4 sections expanded by default
- Last 3 sections collapsed by default
- All inputs still functional (change values, run simulation)
  </verify>
  <done>
Param-sections reorganized to match BBD mental model. Primary decisions (portfolio, spending, timeline, risk) come first and are expanded. Advanced options (simulation settings, chapters, taxes) are grouped at bottom and collapsed.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add section icons and visual hierarchy styling</name>
  <files>src/components/app-root.ts, src/components/ui/param-section.ts, src/styles/tokens.css</files>
  <action>
1. **Update param-section.ts** to support an optional `icon` attribute:
   - Add 'icon' to observedAttributes
   - In template(), if icon attribute present, render it before the title:
     ```html
     <summary>
       ${icon ? `<span class="section-icon">${icon}</span>` : ''}
       <span class="section-title">${title}</span>
       <span class="chevron" aria-hidden="true"></span>
     </summary>
     ```
   - Add styles for .section-icon (flex-shrink: 0, margin-right: 8px, color: var(--color-primary))

2. **Update app-root.ts** template with icons for each section:
   - Your Portfolio: wallet icon (simple SVG)
   - Your Spending Needs: banknotes/cash icon
   - Time Horizon: calendar icon
   - Line of Credit Terms: shield/warning icon
   - Simulation Settings: gear/cog icon
   - Withdrawal Chapters: layers/chapters icon
   - Tax Modeling: receipt/document icon

   Use inline SVG in the icon attribute, e.g.:
   ```html
   <param-section title="Your Portfolio" icon="<svg>...</svg>" open>
   ```

3. **Add visual separator before advanced sections** in app-root.ts:
   - Before "Simulation Settings", add a div with class "section-divider":
     ```html
     <div class="section-divider">
       <span>Advanced Options</span>
     </div>
     ```
   - Style in app-root.ts styles():
     ```css
     .section-divider {
       display: flex;
       align-items: center;
       gap: var(--spacing-sm);
       padding: var(--spacing-md) var(--spacing-md);
       color: var(--text-secondary);
       font-size: var(--font-size-sm);
       font-weight: 500;
       text-transform: uppercase;
       letter-spacing: 0.05em;
     }
     .section-divider::before,
     .section-divider::after {
       content: '';
       flex: 1;
       height: 1px;
       background: var(--border-color);
     }
     ```

4. **Add tokens.css variable** for section icon color:
   ```css
   --section-icon-color: #0d9488;
   ```
  </action>
  <verify>
Run `npm run dev`, verify:
- Each param-section shows a small teal icon before the title
- "Advanced Options" divider line visible between Line of Credit Terms and Simulation Settings
- Icons are properly aligned with section titles
- Visual hierarchy clearly distinguishes core from advanced sections
  </verify>
  <done>
Section icons added to all 7 param-sections. Visual "Advanced Options" divider separates primary decisions from optional settings. Improved scannability and visual hierarchy.
  </done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
Reorganized parameter sections following BBD user mental model with visual enhancements:
- 7 sections (down from 8) in logical order
- Section icons for quick identification
- Clear "Advanced Options" divider
- Primary sections expanded, advanced collapsed
  </what-built>
  <how-to-verify>
1. Open http://localhost:5173
2. Verify left panel section order:
   - Your Portfolio (wallet icon, expanded)
   - Your Spending Needs (cash icon, expanded)
   - Time Horizon (calendar icon, expanded)
   - Line of Credit Terms (shield icon, expanded)
   - [Advanced Options divider]
   - Simulation Settings (gear icon, collapsed)
   - Withdrawal Chapters (layers icon, collapsed)
   - Tax Modeling (receipt icon, collapsed)
3. Click expand/collapse on all sections - verify smooth animation
4. Change values in each section and run simulation - verify all inputs work
5. Assess overall UX: Does the flow feel intuitive? Do icons help scannability?
  </how-to-verify>
  <resume-signal>Type "approved" if UX feels right, or describe issues</resume-signal>
</task>

</tasks>

<verification>
- [ ] 7 param-sections rendered (Asset Allocation merged, Return Model merged)
- [ ] Section order matches BBD mental model: Portfolio -> Spending -> Timeline -> Risk -> Advanced
- [ ] Primary sections (1-4) expanded by default
- [ ] Advanced sections (5-7) collapsed by default
- [ ] Section icons visible and properly styled (teal color)
- [ ] "Advanced Options" divider separates core from optional
- [ ] All form inputs functional (values change, simulation runs)
- [ ] No JavaScript console errors
</verification>

<success_criteria>
- User can see their core decisions (portfolio, spending, timeline, risk) at a glance
- Advanced technical options are accessible but not overwhelming
- Visual hierarchy clearly communicates primary vs optional
- All simulation parameters still configurable and functional
</success_criteria>

<references>
- Financial planning UX best practices: Primary decisions first, technical settings later
- BBD strategy flow: Buy (portfolio) -> Borrow (LOC terms) -> Die (timeline/estate)
- Progressive disclosure: Show essentials, hide complexity until needed
</references>
