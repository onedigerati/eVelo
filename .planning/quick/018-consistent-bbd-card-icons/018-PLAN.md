---
phase: quick-018
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/ui/welcome-screen.ts
autonomous: true

must_haves:
  truths:
    - "All three BBD step cards display flat, simple Unicode icons"
    - "Icons are visually consistent in weight and style"
    - "Icons intuitively convey their meaning (growth, borrowing, inheritance)"
  artifacts:
    - path: "src/components/ui/welcome-screen.ts"
      provides: "Updated BBD step card icons"
      contains: "&#x25B2;"
  key_links: []
---

<objective>
Replace the Buy and Borrow card icons with flat, simple Unicode symbols that match the Die card's balance scale icon style.

Purpose: Visual consistency across the three BBD step cards. Currently Buy uses a 3D chart emoji and Borrow uses a detailed bank emoji, while Die uses a clean balance scale symbol. All three should share the same flat, line-art aesthetic.

Output: Updated welcome-screen.ts with consistent, flat icons for all three BBD cards.
</objective>

<execution_context>
@C:\Users\ungac\.claude/get-shit-done/workflows/execute-plan.md
@C:\Users\ungac\.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/ui/welcome-screen.ts

Current icons (lines 64, 74, 84):
- Buy: `&#x1F4C8;` - 3D styled chart emoji
- Borrow: `&#x1F3E6;` - detailed bank building emoji
- Die: `&#x2696;` - flat balance scale (the target style)
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace BBD card icons with flat Unicode symbols</name>
  <files>src/components/ui/welcome-screen.ts</files>
  <action>
Update the three step-card icon HTML entities in the template() method:

1. **Buy icon (line 64)**: Change `&#x1F4C8;` to `&#x25B2;`
   - This is the black up-pointing triangle (solid)
   - Represents upward growth/appreciation
   - Clean geometric shape, matches flat style

2. **Borrow icon (line 74)**: Change `&#x1F3E6;` to `&#x21BB;`
   - This is the clockwise open circle arrow
   - Represents money circulation/borrowing cycle
   - Line-art style consistent with balance scale

3. **Die icon (line 84)**: Keep `&#x2696;` unchanged
   - Already uses the flat balance scale style
   - This is the reference style for the other two

Note: These are Unicode code points, NOT emoji. They render consistently as simple glyphs across all platforms without emoji-style variation.
  </action>
  <verify>
1. Run `npm run build` - should compile without errors
2. Open the app in browser
3. View the welcome screen
4. Confirm all three icons are:
   - Flat, simple shapes (no 3D/detailed emoji rendering)
   - Similar visual weight
   - Intuitively meaningful (triangle=up/growth, circle arrow=cycle/borrow, scale=balance/inheritance)
  </verify>
  <done>
All three BBD step cards display consistent flat Unicode icons:
- Buy shows solid upward triangle
- Borrow shows clockwise circle arrow
- Die shows balance scale
No emoji-style variation, all have same visual weight.
  </done>
</task>

</tasks>

<verification>
- Build completes without TypeScript errors
- Welcome screen renders all three icons
- Icons display as flat symbols, not detailed emojis
- Visual consistency across the three cards
</verification>

<success_criteria>
- All three BBD icons are flat, simple Unicode symbols
- Icons match in visual weight and style
- Each icon intuitively conveys its meaning
- No regression in welcome screen functionality
</success_criteria>

<output>
After completion, create `.planning/quick/018-consistent-bbd-card-icons/018-SUMMARY.md`
</output>
