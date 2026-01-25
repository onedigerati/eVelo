# Phase 22: Mobile Sidebar UX Redesign - Research

**Researched:** 2026-01-24
**Domain:** Mobile UX, CSS animations, responsive layout, touch interactions
**Confidence:** HIGH

## Summary

Phase 22 redesigns the mobile sidebar UX with three key changes: (1) vertical collapse behavior via CSS translateY() instead of horizontal overlay, (2) auto-collapse on simulation button click, and (3) branded "eVelo Parameters" text label with 90-degree rotation in desktop collapsed state.

The current implementation uses a horizontal slide overlay on mobile (`translateX(-100%)` to `translateX(0)`) with a backdrop. The redesign shifts to vertical collapse (`translateY(-100%)` to `translateY(0)`) for more natural mobile interaction, while desktop retains horizontal collapse with a rotated text label for visual interest.

Key technical insight: The existing architecture already separates desktop collapse (via `sidebar-collapsed` attribute on `main-layout`) from mobile overlay (via `sidebar-open` attribute). This separation allows us to implement vertical mobile behavior without breaking desktop horizontal collapse.

**Primary recommendation:** Use CSS transform: translateY() for mobile vertical slide, listen for simulation button clicks in main-layout to auto-collapse sidebar, replace hamburger icon with text label, and use transform: rotate(-90deg) with writing-mode for desktop collapsed label.

## Standard Stack

### Core Technologies
| Technology | Version | Purpose | Why Standard |
|------------|---------|---------|--------------|
| CSS Transforms | CSS3 | Vertical slide animations | Hardware-accelerated, smooth 60fps animations on mobile |
| CSS Transitions | CSS3 | Animation timing/easing | Browser-native, better performance than JS animations |
| Touch Events API | DOM Level 3 | Mobile touch handling | Native browser support, reliable gesture detection |
| ARIA Attributes | WAI-ARIA 1.2 | Accessibility | Screen reader compatibility, keyboard navigation |

### Supporting Patterns
| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| Attribute-based state | Component state via HTML attributes | Already used in codebase (`sidebar-collapsed`, `sidebar-open`) |
| Event bubbling | Child-to-parent communication | Already used for `toggle` events from sidebar-panel |
| CSS custom properties | Theming and dynamic values | Already established in tokens.css |
| Media queries | Responsive breakpoints | 768px breakpoint already established |

### Existing Architecture (No New Dependencies)
This phase requires NO new libraries. All functionality uses existing web platform APIs and follows established patterns from Phase 21 and prior work.

## Architecture Patterns

### Current State (from codebase analysis)

**Desktop Layout:**
```
main-layout[sidebar-collapsed]
├── grid-template-columns: 48px 1fr (collapsed)
└── grid-template-columns: 400px 1fr (expanded)
```

**Mobile Layout:**
```
main-layout[sidebar-open]
├── sidebar-area: fixed overlay with translateX()
├── sidebar-backdrop: rgba(0, 0, 0, 0.5)
└── Mobile menu button visible
```

**Current transition pattern (horizontal):**
```css
.sidebar-area {
  transform: translateX(-100%); /* Hidden */
  transition: transform 0.3s ease;
}
:host([sidebar-open]) .sidebar-area {
  transform: translateX(0); /* Visible */
}
```

### Recommended Pattern 1: Vertical Mobile Collapse

**What:** Replace horizontal slide (`translateX`) with vertical slide (`translateY`) on mobile viewports.

**When to use:** Mobile viewports (max-width: 768px) where vertical space is abundant but horizontal space is constrained.

**Example:**
```css
/* Mobile responsive - REDESIGNED for vertical collapse */
@media (max-width: 768px) {
  .layout {
    grid-template-areas:
      "header"
      "sidebar"
      "main";
    grid-template-rows: auto auto 1fr;
    grid-template-columns: 1fr;
  }

  .sidebar-area {
    position: relative; /* Changed from fixed */
    width: 100%;
    height: auto;
    max-height: 60vh; /* Limit vertical space */
    overflow-y: auto;
    transform: translateY(0); /* Visible by default */
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  /* Collapsed state: slides up and out of view */
  :host([sidebar-collapsed]) .sidebar-area {
    transform: translateY(-100%);
    max-height: 0;
    overflow: hidden;
  }

  /* Remove backdrop on mobile - not needed for vertical collapse */
  .sidebar-backdrop {
    display: none;
  }

  /* Mobile menu button becomes toggle for vertical collapse */
  .mobile-menu-btn {
    display: block;
  }
}
```

**Why this works:**
- Vertical collapse feels more natural on mobile (similar to accordion/drawer patterns)
- No backdrop needed - sidebar pushes content down rather than overlaying
- Smooth GPU-accelerated animation via transform
- Preserves scroll position in main content
- Max-height transition provides graceful height animation

### Recommended Pattern 2: Auto-Collapse on Simulation

**What:** Listen for simulation button clicks and programmatically collapse sidebar on mobile.

**When to use:** When user triggers an action that should reveal results dashboard.

**Example:**
```typescript
// In main-layout.ts afterRender()
protected override afterRender(): void {
  // ... existing toggle listener ...

  // NEW: Auto-collapse sidebar when simulation runs (mobile only)
  this.addEventListener('simulation-start', () => {
    // Only auto-collapse on mobile
    if (window.matchMedia('(max-width: 768px)').matches) {
      this.setAttribute('sidebar-collapsed', '');
    }
  });
}
```

**In app-root.ts:**
```typescript
// Before starting simulation, dispatch event
runBtn?.addEventListener('click', async () => {
  // Dispatch event to trigger auto-collapse
  this.dispatchEvent(
    new CustomEvent('simulation-start', {
      bubbles: true,
      composed: true,
    })
  );

  // ... existing simulation logic ...
});
```

**Why this pattern:**
- Event-based communication maintains separation of concerns
- Uses existing event bubbling architecture (like `toggle` event)
- Conditional logic based on viewport size prevents desktop disruption
- Non-invasive to existing simulation flow

### Recommended Pattern 3: Branded Text Label with Rotation

**What:** Replace hamburger icon (☰) with "eVelo Parameters" text label. On desktop collapsed state, rotate label 90 degrees.

**When to use:**
- Mobile: Always show "eVelo Parameters" as toggle button text
- Desktop collapsed: Rotate text 90 degrees for compact vertical display
- Desktop expanded: Show text horizontally with collapse arrow

**Example for sidebar-panel.ts:**
```typescript
protected template(): string {
  const isCollapsed = this.hasAttribute('collapsed');
  return `
    <aside class="sidebar">
      <button class="toggle-btn"
              aria-label="Toggle sidebar"
              aria-expanded="${!isCollapsed}">
        <span class="toggle-text">eVelo Parameters</span>
        <span class="toggle-icon" aria-hidden="true">${isCollapsed ? '>' : '<'}</span>
      </button>
      <!-- ... rest of template ... -->
    </aside>
  `;
}
```

**CSS for rotation:**
```css
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 16px);
}

.toggle-text {
  font-weight: 600;
  font-size: var(--font-size-sm, 0.875rem);
  white-space: nowrap;
  transition: transform 0.3s ease;
}

.toggle-icon {
  transition: transform 0.3s ease;
}

/* Desktop collapsed: rotate text 90 degrees */
:host([collapsed]) .toggle-text {
  transform: rotate(-90deg);
  transform-origin: center;
  /* Optional: adjust position for better visual balance */
  writing-mode: vertical-rl; /* Alternative approach for vertical text */
}

/* Mobile: Always horizontal, never rotated */
@media (max-width: 768px) {
  .toggle-text {
    transform: none !important;
    writing-mode: horizontal-tb !important;
  }

  /* Hide collapse icon on mobile, only show on desktop */
  .toggle-icon {
    display: none;
  }
}
```

**Alternative using writing-mode (simpler for vertical text):**
```css
:host([collapsed]) .toggle-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
```

**Why this pattern:**
- `transform: rotate(-90deg)` provides precise control over rotation
- `writing-mode: vertical-rl` is browser-native vertical text (simpler, better support)
- `white-space: nowrap` prevents text wrapping during rotation
- Mobile override ensures text stays horizontal on small screens
- Branded label improves clarity over generic hamburger icon

### Anti-Patterns to Avoid

- **JavaScript height animations:** Don't use JS to animate height changes. CSS transitions are GPU-accelerated and smoother.
- **Inline styles for state:** Don't use `element.style.transform = ...`. Use attribute-based CSS classes/selectors.
- **Fixed positioning on mobile:** Don't keep sidebar as `position: fixed` for vertical collapse. Use relative positioning within grid.
- **Max-height: 9999px:** Don't use arbitrarily large max-height values. It causes jerky transitions. Use reasonable estimates (60vh).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Touch gesture detection | Custom touchstart/touchmove logic | Native click events + CSS :active | Modern browsers normalize touch to clicks; CSS handles visual feedback |
| Smooth animations | requestAnimationFrame loops | CSS transitions/transforms | Hardware-accelerated, 60fps by default, less code |
| Mobile detection | navigator.userAgent parsing | CSS @media queries + matchMedia() | More reliable, responds to actual viewport size |
| Vertical text rendering | Canvas/SVG rotation | CSS writing-mode or transform: rotate() | Native browser support, accessible, better performance |

**Key insight:** The web platform already solves all the hard problems in this phase. CSS transitions are GPU-accelerated on mobile. Touch events auto-convert to click events. Media queries handle responsive behavior. The implementation is primarily CSS with minimal JS event wiring.

## Common Pitfalls

### Pitfall 1: Conflicting Mobile States

**What goes wrong:** Mobile sidebar has both `sidebar-open` (overlay) and `sidebar-collapsed` (vertical) states, causing visual conflicts.

**Why it happens:** Current code uses `sidebar-open` for mobile overlay. New vertical design uses `sidebar-collapsed` for the same purpose.

**How to avoid:**
1. Remove `sidebar-open` attribute handling on mobile (only keep for desktop if needed)
2. Use only `sidebar-collapsed` attribute for both desktop and mobile
3. CSS media queries differentiate behavior:
   - Desktop: `sidebar-collapsed` = horizontal shrink to 48px
   - Mobile: `sidebar-collapsed` = vertical slide up (translateY)

**Warning signs:**
- Sidebar flickers between states on resize
- Backdrop appears when it shouldn't
- Two different attributes controlling same visual state

**Prevention code:**
```typescript
// In main-layout.ts, remove mobile overlay logic
// OLD (remove):
this.setAttribute('sidebar-open', '');

// NEW (use sidebar-collapsed for both):
if (this.hasAttribute('sidebar-collapsed')) {
  this.removeAttribute('sidebar-collapsed');
} else {
  this.setAttribute('sidebar-collapsed', '');
}
```

### Pitfall 2: Transform vs. Display/Visibility

**What goes wrong:** Using `display: none` or `visibility: hidden` instead of transforms prevents smooth animations.

**Why it happens:** Developers think hiding elements should use display properties, but these can't be animated.

**How to avoid:**
- Use `transform: translateY(-100%)` for animated hiding
- Use `max-height: 0` + `overflow: hidden` for graceful height collapse
- Keep `display: block` always, control visibility via transforms
- Only use `display: none` for complete removal (e.g., desktop hiding mobile menu button)

**Warning signs:**
- Sidebar "pops" in/out instead of sliding
- No transition animation visible
- Console warnings about transitioning non-animatable properties

**Prevention pattern:**
```css
/* WRONG - can't animate display */
.sidebar-area {
  display: none;
}
.sidebar-area.visible {
  display: block;
}

/* RIGHT - animatable transforms */
.sidebar-area {
  transform: translateY(-100%);
  transition: transform 0.3s ease;
}
.sidebar-area.visible {
  transform: translateY(0);
}
```

### Pitfall 3: Touch Event Double-Firing

**What goes wrong:** Both touch and click events fire on mobile, causing double toggles or double simulation runs.

**Why it happens:** Mobile browsers fire touchstart/touchend AND click events (300ms delay) for compatibility.

**How to avoid:**
- Use only `click` event listeners (browsers normalize touch to clicks)
- Don't add both `touchstart` and `click` listeners
- If you must use touch events, call `event.preventDefault()` to stop click

**Warning signs:**
- Button appears to be clicked twice on mobile
- Simulation starts twice when button tapped once
- Sidebar toggles open then immediately closed

**Prevention pattern:**
```typescript
// WRONG - double events
button.addEventListener('touchstart', handler);
button.addEventListener('click', handler); // Will fire twice!

// RIGHT - use click only
button.addEventListener('click', handler); // Works for touch AND mouse

// OR if you need touch-specific behavior:
button.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevent subsequent click event
  handler();
});
```

### Pitfall 4: Rotated Text Positioning

**What goes wrong:** Rotated text using `transform: rotate(-90deg)` appears in wrong position or causes layout overflow.

**Why it happens:** Transform doesn't affect layout flow; origin point matters for rotation.

**How to avoid:**
1. Set explicit `transform-origin` (default is `center`)
2. Use `writing-mode: vertical-rl` as simpler alternative for vertical text
3. Add `white-space: nowrap` to prevent wrapping
4. Test with different text lengths

**Warning signs:**
- Text overlaps other elements
- Text rotates from unexpected corner
- Sidebar width changes when text rotates

**Prevention pattern:**
```css
/* Transform approach - needs careful positioning */
.rotated-text {
  transform: rotate(-90deg);
  transform-origin: left center; /* Explicit origin */
  white-space: nowrap;
  /* May need positioning adjustments */
  position: relative;
  left: 50%; /* Center in collapsed sidebar */
}

/* Writing-mode approach - simpler, self-contained */
.vertical-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  /* Just works, no positioning issues */
}
```

**Recommendation:** Use `writing-mode: vertical-rl` for sidebar label rotation. It's simpler, better supported, and avoids positioning complexity.

## Code Examples

Verified patterns from existing codebase and web standards:

### Mobile Vertical Collapse (New Pattern)

```css
/* Source: Adapted from main-layout.ts existing responsive pattern */
@media (max-width: 768px) {
  .layout {
    grid-template-areas:
      "header"
      "sidebar"
      "main";
    grid-template-rows: auto auto 1fr;
    grid-template-columns: 1fr;
  }

  .sidebar-area {
    position: relative;
    width: 100%;
    max-height: 60vh;
    overflow-y: auto;
    transform: translateY(0);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }

  :host([sidebar-collapsed]) .sidebar-area {
    transform: translateY(-100%);
    max-height: 0;
    overflow: hidden;
  }

  .sidebar-backdrop {
    display: none; /* No overlay needed for vertical collapse */
  }
}
```

### Auto-Collapse Event Pattern

```typescript
// Source: Adapted from existing toggle event pattern in main-layout.ts
// In main-layout.ts
protected override afterRender(): void {
  // Existing toggle listener
  this.addEventListener('toggle', ((e: CustomEvent) => {
    // ... existing code ...
  }) as EventListener);

  // NEW: Auto-collapse on simulation start (mobile only)
  this.addEventListener('simulation-start', () => {
    if (window.matchMedia('(max-width: 768px)').matches) {
      this.setAttribute('sidebar-collapsed', '');
    }
  });
}

// In app-root.ts
runBtn?.addEventListener('click', async () => {
  // Dispatch event before simulation
  this.dispatchEvent(
    new CustomEvent('simulation-start', {
      bubbles: true,
      composed: true,
    })
  );

  // ... existing simulation code ...
});
```

### Branded Label with Rotation

```typescript
// Source: Adapted from sidebar-panel.ts template pattern
protected template(): string {
  const isCollapsed = this.hasAttribute('collapsed');
  return `
    <aside class="sidebar">
      <button class="toggle-btn"
              aria-label="${isCollapsed ? 'Expand' : 'Collapse'} parameters sidebar"
              aria-expanded="${!isCollapsed}">
        <span class="toggle-label">eVelo Parameters</span>
        <span class="toggle-icon" aria-hidden="true">${isCollapsed ? '▸' : '◂'}</span>
      </button>
      <div class="sidebar-content">
        <slot></slot>
      </div>
      <div class="sidebar-footer">
        <slot name="footer"></slot>
      </div>
    </aside>
  `;
}
```

```css
/* Source: Web standards - CSS writing-mode for vertical text */
.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm, 8px);
  padding: var(--spacing-md, 16px);
  transition: all 0.3s ease;
}

.toggle-label {
  font-weight: 600;
  font-size: var(--font-size-sm, 0.875rem);
  color: var(--text-primary);
  white-space: nowrap;
  transition: writing-mode 0.3s ease;
}

.toggle-icon {
  font-size: 1.2em;
  transition: transform 0.3s ease;
}

/* Desktop collapsed: vertical text using writing-mode */
:host([collapsed]) .toggle-label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}

/* Mobile: Always horizontal */
@media (max-width: 768px) {
  .toggle-label {
    writing-mode: horizontal-tb !important;
  }

  /* Optionally hide icon on mobile for cleaner look */
  .toggle-icon {
    display: none;
  }
}
```

### Touch-Friendly Button Sizing

```css
/* Source: Accessibility best practices - WCAG 2.5.5 Target Size */
.toggle-btn,
.mobile-menu-btn {
  min-width: 48px; /* WCAG AAA minimum touch target */
  min-height: 48px;
  padding: var(--spacing-md, 16px);

  /* Touch feedback */
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
  touch-action: manipulation; /* Disable double-tap zoom */
}

.toggle-btn:active {
  transform: scale(0.98); /* Subtle press feedback */
  transition: transform 0.1s ease;
}
```

### Responsive Breakpoint Detection

```typescript
// Source: Web APIs - MediaQueryList for responsive JS logic
// In main-layout.ts or app-root.ts
const mobileQuery = window.matchMedia('(max-width: 768px)');

// Listen for viewport changes
mobileQuery.addEventListener('change', (e) => {
  if (e.matches) {
    // Switched to mobile
    console.log('Mobile viewport detected');
  } else {
    // Switched to desktop
    console.log('Desktop viewport detected');
  }
});

// Check current state
if (mobileQuery.matches) {
  // Mobile-specific logic
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| jQuery slideDown/slideUp | CSS transitions + transforms | ~2015 | 60fps GPU-accelerated, smaller bundle size |
| Fixed overlays for mobile sidebars | Vertical collapse in grid flow | ~2020 | More natural mobile UX, no z-index battles |
| Hamburger icon (☰) | Branded text labels | ~2023 | Better clarity, accessibility, SEO |
| JavaScript touch libraries | Native touch → click events | ~2018 | Simpler code, better performance |
| transform: rotate() | writing-mode for vertical text | ~2019 | Better browser support, simpler CSS |

**Deprecated/outdated:**
- **jQuery animations:** Replaced by CSS transitions (GPU-accelerated)
- **Modernizr touch detection:** Replaced by CSS @media (hover: none)
- **FastClick library:** No longer needed (iOS removed 300ms delay in 2015)
- **vh units for mobile height:** Use dvh (dynamic viewport height) for mobile browsers with collapsing URL bars

**Modern best practices (2026):**
- **CSS containment:** Use `contain: layout style` on sidebar for performance
- **Reduced motion:** Respect `prefers-reduced-motion` media query
- **Dynamic viewport units:** Use `dvh` instead of `vh` for mobile (accounts for browser chrome)

## Open Questions

### Question 1: Should mobile sidebar be collapsed or expanded by default?

**What we know:**
- Current implementation: Sidebar hidden on mobile (overlay pattern)
- User research from UX-RECOMMENDATIONS.md suggests non-blocking parameter access is valuable
- Mobile vertical space is limited but scrollable

**What's unclear:**
- User workflow: Do users set parameters once then review results repeatedly?
- Or do they iterate on parameters while reviewing results?

**Recommendation:**
- **Default to collapsed on mobile** to prioritize results dashboard
- Provide clear, easy toggle button ("eVelo Parameters") to expand when needed
- Implement smooth animation so expansion feels lightweight, not disruptive
- Consider localStorage to remember user preference across sessions

### Question 2: Max-height for collapsed mobile sidebar

**What we know:**
- Need max-height value for smooth CSS transition
- Too large causes jerky animation, too small cuts off content

**What's unclear:**
- Typical parameter section count varies (user may collapse some param-sections)
- Mobile viewport heights range from 667px (iPhone SE) to 1080px+ (large Android)

**Recommendation:**
- Use `max-height: 60vh` (60% of viewport height) as reasonable default
- Add scrollbar within sidebar if content exceeds height
- Test on iPhone SE (smallest common viewport) to ensure usability
- Provide visual affordance (gradient fade) when content is scrollable

### Question 3: Transition timing and easing

**What we know:**
- Current code uses `transition: transform 0.3s ease`
- Material Design recommends 200-300ms for mobile transitions
- Easing curves affect perceived responsiveness

**What's unclear:**
- Optimal duration for vertical slide (may differ from horizontal)
- Whether custom cubic-bezier provides better UX than `ease`

**Recommendation:**
- Start with `cubic-bezier(0.4, 0, 0.2, 1)` (Material Design standard easing)
- Duration: 300ms for enter, 250ms for exit (asymmetric feels more responsive)
- Test on real mobile devices, not just Chrome DevTools
- Respect `prefers-reduced-motion` with fallback:
  ```css
  @media (prefers-reduced-motion: reduce) {
    .sidebar-area {
      transition: none; /* Instant for motion-sensitive users */
    }
  }
  ```

### Question 4: Should simulation button auto-collapse be immediate or delayed?

**What we know:**
- User clicks "Run Monte Carlo Simulation" button
- Simulation shows progress indicator and takes 1-5 seconds
- Goal is to reveal results dashboard

**What's unclear:**
- Should sidebar collapse immediately on click (before simulation)?
- Or after simulation completes (when results are ready)?
- Does immediate collapse feel jarring if user wants to see progress indicator in sidebar footer?

**Recommendation:**
- **Immediate collapse on button click** for best UX
- Rationale: User has committed to running simulation, wants to see results space
- Progress indicator should move to main content area (not sidebar footer)
- If simulation fails, sidebar can re-expand automatically to show error in context

## Sources

### Primary (HIGH confidence)
- **Codebase analysis**: `main-layout.ts`, `sidebar-panel.ts`, `app-root.ts`, `tokens.css`
  - Confirmed: CSS Grid layout, attribute-based state, 768px breakpoint, existing transition patterns
- **MDN Web Docs - Touch Events**: https://developer.mozilla.org/en-US/docs/Web/API/Touch_events
  - Verified: Touch event API, click normalization, preventDefault() patterns
- **MDN Web Docs - CSS Transforms**: https://developer.mozilla.org/en-US/docs/Web/CSS/transform
  - Verified: translateY(), rotate(), transform-origin properties
- **MDN Web Docs - writing-mode**: https://developer.mozilla.org/en-US/docs/Web/CSS/writing-mode
  - Verified: vertical-rl value, browser support (all modern browsers)

### Secondary (MEDIUM confidence)
- **CSS-Tricks - Text Rotation**: https://css-tricks.com/snippets/css/text-rotation/
  - Guidance on transform vs writing-mode for vertical text
- **LogRocket - Rotate Text CSS Guide**: https://blog.logrocket.com/rotate-text-css-guide/
  - Verified: Best practices for rotated text positioning
- **Material Design Motion Guidelines** (2023 update)
  - Referenced: Transition timing (200-300ms), cubic-bezier easing curves
- **WCAG 2.5.5 - Target Size**: https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
  - Verified: 48x48px minimum touch target for Level AAA

### Tertiary (LOW confidence - flagged for validation)
- Various blog posts on CSS slide animations (2020-2025)
  - Common patterns observed: max-height transitions, translateY() for vertical
  - Not authoritative but align with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All web platform APIs, well-documented and stable
- Architecture: HIGH - Existing codebase patterns clearly established
- Pitfalls: HIGH - Derived from MDN docs and common web development issues
- Code examples: HIGH - Adapted from existing codebase + verified web standards

**Research date:** 2026-01-24
**Valid until:** 60 days (stable web platform features, unlikely to change)

**Technologies are mature and stable:**
- CSS Transforms: Stable since 2013, excellent browser support
- Touch Events API: Stable since 2015, universal mobile support
- CSS Transitions: Stable since 2012, hardware-accelerated everywhere
- ARIA attributes: WAI-ARIA 1.2 stable since 2023

**No breaking changes expected** - all features have been stable for years.
