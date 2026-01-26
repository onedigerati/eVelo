# User Guide UX Redesign Recommendations

**Date:** January 2025
**Status:** Proposal for Review

---

## Executive Summary

The current User Guide is implemented as a **modal overlay** that blocks the entire interface, preventing users from referencing help while adjusting parameters. This document proposes alternative UX patterns that provide **contextual, non-blocking help** accessible during the parameter configuration workflow.

---

## Current Implementation Analysis

### What Exists Today

| Component | Location | Purpose |
|-----------|----------|---------|
| `UserGuideModal` | `src/components/ui/user-guide-modal.ts` | Full guide modal with 8 accordion sections |
| `HelpTooltip` | `src/components/ui/help-tooltip.ts` | Small inline `?` icons with hover tooltips |
| `HelpSection` | `src/components/ui/help-section.ts` | Accordion component used in guide |
| `ParamSection` | `src/components/ui/param-section.ts` | Collapsible parameter groups |

### Current User Flow

1. User clicks `?` button in header
2. Modal overlay appears (blocks entire UI)
3. User reads guide content
4. User closes modal to make adjustments
5. User forgets detail, must reopen modal
6. **Friction point:** Context switching between help and parameters

### Existing Strengths

- Well-structured accordion sections (8 topics)
- Progressive disclosure pattern
- Semantic HTML (`<details>`/`<summary>`)
- Consistent design tokens
- WCAG 1.4.13 compliant tooltips
- Mobile-responsive modal

### Current Limitations

- **Blocking modal** - can't adjust parameters while reading
- **Generic entry point** - only header `?` button opens guide
- **No contextual linking** - can't jump to "SBLOC Terms" help from SBLOC section
- **Tooltips are ephemeral** - disappear on hover-out, max 250px width

---

## Proposed UX Patterns

### Option A: Hybrid (Inline + Panel/Sheet) — **RECOMMENDED**

**Concept:** Each param-section header has a `?` button that expands help **inline**. The header `?` button opens a **side panel** (desktop) or **bottom sheet** (mobile) for the full guide.

#### Desktop Experience (>768px)
```
┌─────────────────────────────────────────────────────────────────────┐
│  eVelo Portfolio Simulator                              [?] [⚙️]   │
├──────────────────────┬──────────────────────────────────────────────┤
│ YOUR PORTFOLIO   [?]│                                    ┌─────────┤
│ ├─ Initial Inv.     │                                    │ GUIDE   │
│ ├─ Composition      │      [Main Content Area]           │─────────│
│ └─ LOC Balance      │                                    │ 📍 You  │
│                     │                                    │ are here│
│ ▼ INLINE HELP ──────│                                    │─────────│
│ │ Initial Investment│      (Charts / Results)           │ Portfolio│
│ │ is your starting  │                                    │ Params   │
│ │ portfolio value...│                                    │ • Initial│
│ └───────────────────│                                    │ • Assets │
│                     │                                    │ • LOC    │
│ SPENDING NEEDS  [?]│                                    │─────────│
│ └─ ...              │                                    │ [More   │
│                     │                                    │ sections]│
└──────────────────────┴──────────────────────────────────┴─────────┘
```

#### Mobile Experience (<768px)
```
┌────────────────────┐
│ [Header]      [?]  │ ◄── Opens bottom sheet
├────────────────────┤
│ YOUR PORTFOLIO [?] │ ◄── Expands inline help
│ ├─ Initial Inv.    │
│ └─ Composition     │
│                    │
│ ▼ INLINE HELP ─────│
│ │ Portfolio setup  │
│ │ determines your  │
│ │ starting point...│
│ └──────────────────│
│                    │
│ SPENDING NEEDS [?] │
│ └─ ...             │
├────────────────────┤◄─── Bottom sheet (when opened)
│ ▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔▔ │    Drag handle
│ 📍 Portfolio Params│
│ ─────────────────  │
│ Full guide content │
│ scrollable here... │
└────────────────────┘
```

#### Pros
- **Best of both worlds** - quick inline help + comprehensive guide
- **Non-blocking** - users can adjust while reading
- **Contextual** - section `?` opens relevant help
- **Familiar pattern** - similar to VS Code, Notion, Figma
- **Progressive disclosure** - inline for quick, panel for deep

#### Cons
- **More complex** to implement (two help systems)
- **Potential redundancy** - inline help vs panel content
- **State management** - track which inline sections are open

---

### Option B: Pure Inline Expansion

**Concept:** All help expands **inline** within param-sections. No separate panel or modal. Each section header has a `?` that toggles an inline help block.

```
┌──────────────────────┐
│ YOUR PORTFOLIO   [?]│ ◄── Click to toggle
├──────────────────────┤
│ ▼ HELP ─────────────│
│ │ 💼 Portfolio Setup │
│ │                   │
│ │ Your portfolio    │
│ │ consists of:      │
│ │ • Initial Inv.    │
│ │ • Asset mix       │
│ │ • LOC balance     │
│ │                   │
│ │ [Learn more →]    │ ◄── Links to full guide
│ └───────────────────│
│ Initial Investment  │
│ [_______________]   │
│ Portfolio Comp.     │
│ [Asset Selector]    │
└──────────────────────┘
```

#### Pros
- **Simplest implementation** - reuses existing `HelpSection` pattern
- **Always contextual** - help is right where you need it
- **Works everywhere** - no positioning/overlay issues
- **Naturally responsive** - flows with content

#### Cons
- **Increases scroll length** - expanded help pushes content down
- **Fragmented** - no single place for comprehensive reading
- **No glossary access** - terms like "LTV" require hunting

---

### Option C: Responsive Panel Only

**Concept:** Side panel on desktop, full-screen bottom sheet on mobile. Contextual links in each param-section header open the panel/sheet at the relevant section.

#### Desktop
- 320px side panel slides in from right
- Panel coexists with main content
- Clicking section `?` opens panel + scrolls to section
- Can be pinned open or auto-close

#### Mobile
- Bottom sheet slides up (60-70% height)
- Swipe down to dismiss
- Same contextual linking

#### Pros
- **Unified guide experience** - all content in one place
- **Non-blocking** - coexists with params
- **Familiar mobile pattern** - bottom sheet is standard

#### Cons
- **Takes screen space** - 320px less for main content
- **Desktop only coexistence** - mobile still overlays
- **May feel heavy** - opening a panel for quick questions

---

### Option D: Keep Modal, Add Section Links (Minimal Change)

**Concept:** Keep the current modal but add `?` buttons to each param-section header that open the modal **and scroll to the relevant section**.

```
┌──────────────────────┐
│ YOUR PORTFOLIO   [?]│ ◄── Opens modal at "Portfolio Parameters"
│ ├─ Initial Inv.     │
│ └─ Composition      │
│                     │
│ SBLOC TERMS     [?]│ ◄── Opens modal at "SBLOC Terms"
│ └─ ...              │
└──────────────────────┘
```

#### Pros
- **Minimal code changes** - add buttons + scroll logic
- **Preserves existing work** - modal content stays
- **Quick win** - could implement today

#### Cons
- **Still blocking** - doesn't solve core UX issue
- **Context switching** - must close modal to adjust
- **Bandaid** - doesn't address fundamental friction

---

## Recommendation Summary

| Option | Elegance | Implementation | Mobile | Recommended |
|--------|----------|----------------|--------|-------------|
| A: Hybrid | ⭐⭐⭐⭐⭐ | Medium-High | ⭐⭐⭐⭐⭐ | **YES** |
| B: Pure Inline | ⭐⭐⭐⭐ | Low | ⭐⭐⭐⭐⭐ | Maybe |
| C: Panel Only | ⭐⭐⭐⭐ | Medium | ⭐⭐⭐ | Maybe |
| D: Modal + Links | ⭐⭐ | Low | ⭐⭐⭐⭐ | No |

**Primary Recommendation:** Option A (Hybrid)

**Fallback if scope is tight:** Option B (Pure Inline) - simpler, still solves the core problem

---

## Implementation Notes (Option A)

### New Components Needed

1. **`<guide-panel>`** - Slide-out side panel (desktop) / bottom sheet (mobile)
2. **`<section-help>`** - Inline expandable help block for param-sections

### Modifications to Existing Components

1. **`ParamSection`** - Add optional `?` button with `help-id` attribute
2. **`AppRoot`** - Wire up contextual help triggers
3. **`UserGuideModal`** - May deprecate or keep as "print-friendly" option

### CSS Considerations

```css
/* Side Panel (Desktop) */
.guide-panel {
  position: fixed;
  right: 0;
  top: var(--header-height);
  width: 320px;
  height: calc(100vh - var(--header-height));
  transform: translateX(100%);
  transition: transform 0.3s ease;
}

.guide-panel.open {
  transform: translateX(0);
}

/* Bottom Sheet (Mobile) */
@media (max-width: 768px) {
  .guide-panel {
    width: 100%;
    height: auto;
    max-height: 70vh;
    top: auto;
    bottom: 0;
    border-radius: 16px 16px 0 0;
    transform: translateY(100%);
  }
}

/* Inline Help Block */
.section-help {
  background: var(--surface-secondary);
  border-left: 4px solid var(--color-primary);
  padding: var(--spacing-md);
  margin: var(--spacing-sm) 0;
  border-radius: var(--border-radius-md);
}
```

### State Management

- Track panel open/closed state
- Track which inline help sections are expanded
- Persist user preference (localStorage): `helpPanel: 'open' | 'closed'`
- Auto-close inline help when another section opens (optional)

### Accessibility

- Panel should trap focus when open
- Escape key closes panel
- Announce panel open/close to screen readers
- Inline help should use `aria-expanded` and `aria-controls`

---

## Content Strategy

### Inline Help (Brief)
- 2-3 sentences max
- Focus on "what is this?" and "why does it matter?"
- Link to full guide section for details

### Panel Guide (Comprehensive)
- Full explanations with examples
- Glossary terms linked inline
- Charts/metrics explanations
- "Quick Start" section at top

### Example: SBLOC Terms

**Inline Help:**
> SBLOC (Securities-Backed Line of Credit) lets you borrow against your portfolio without selling. Configure the interest rate and LTV limits your lender offers.

**Panel Guide:**
> (Full section with Max LTV explanation, Warning Zone purpose, Liquidation Haircut mechanics, real-world examples, link to glossary terms)

---

## Next Steps

1. **Review this document** and choose preferred option
2. **Prototype** the selected approach (low-fidelity mockup)
3. **User test** with 2-3 people if possible
4. **Implement** in phases:
   - Phase 1: Add contextual `?` buttons to param-sections
   - Phase 2: Build guide panel component
   - Phase 3: Wire up contextual scrolling
   - Phase 4: Add inline help option
   - Phase 5: Mobile bottom sheet adaptation

---

## Appendix: Current File Locations

| File | Purpose |
|------|---------|
| `src/components/ui/user-guide-modal.ts` | Current modal implementation |
| `src/components/ui/help-tooltip.ts` | Inline hover tooltips |
| `src/components/ui/help-section.ts` | Accordion sections |
| `src/components/ui/param-section.ts` | Parameter group component |
| `src/components/app-root.ts` | Main app, modal trigger logic |
| `src/styles/tokens.css` | Design tokens for theming |
