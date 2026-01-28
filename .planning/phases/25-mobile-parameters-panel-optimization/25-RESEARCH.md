# Phase 25: Mobile Parameters Panel Optimization - Research

**Researched:** 2026-01-28
**Domain:** Mobile sidebar UX, sticky button patterns, independent scrolling panels
**Confidence:** HIGH

## Summary

This research investigated mobile-optimized parameter panel patterns with sticky/fixed action buttons, focusing on Android Chrome behavior and touch interaction patterns. The eVelo sidebar-panel already supports mobile layouts but needs optimization for the "Run Monte Carlo Simulation" button placement and scrolling behavior.

The standard approach for 2026 involves: (1) `position: sticky` for footer buttons within scrollable containers (more reliable than `position: fixed` on mobile), (2) explicit padding-bottom on scrollable content to prevent overlap with sticky buttons, (3) safe-area-inset padding for iOS notch/home bar compatibility, and (4) independent scroll behavior using CSS Grid with proper `min-height: 0` constraints.

Phase 24 recently resolved a critical mobile sidebar button visibility issue where the Run Simulation button wasn't visible until scrolling to the bottom. The fix added `min-height: 0` throughout the height cascade chain and `::slotted(*) { height: 100% }` to ensure proper height constraint propagation across shadow DOM boundaries.

The current codebase has the architectural foundation in place (Grid layout with auto/1fr/auto rows for header/content/footer) but needs explicit mobile optimizations: ensure sticky button remains visible during parameter scroll, add sufficient bottom padding to prevent content hiding behind button, and optimize touch targets for mobile interactions.

**Primary recommendation:** Use `position: sticky` with `bottom: 0` for the Run Simulation button (already in sidebar-footer slot), ensure .sidebar-content has explicit `padding-bottom` equal to button height + safe spacing, and add `env(safe-area-inset-bottom)` for iOS compatibility.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| CSS Grid | - | Sidebar layout structure | Native CSS; grid-template-rows auto/1fr/auto is standard pattern for header/scrollable-content/sticky-footer |
| position: sticky | - | Sticky footer button | Native CSS; more reliable than fixed on mobile with virtual keyboards |
| env() CSS function | - | Safe area insets | Native CSS; handles iOS notch, home bar, Android gesture areas |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dvh viewport units | - | Dynamic viewport height | Accounts for mobile browser chrome (address bar); fallback to vh for older browsers |
| -webkit-overflow-scrolling | - | iOS momentum scrolling | Touch-friendly scrolling on iOS (default in Safari 13+, still safe to include) |
| touch-action | CSS | Prevent gesture conflicts | Control touch gestures on scrollable areas |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| position: sticky | position: fixed | Fixed breaks with virtual keyboards; sticky stays within parent container |
| Bottom sticky button | Floating action button (FAB) | FAB obscures more content and is less conventional for form submissions |
| Grid layout | Flexbox layout | Grid's auto/1fr/auto pattern is more explicit and robust for header/content/footer |

**Installation:**
```bash
# No new dependencies needed - all solutions use native CSS
```

## Architecture Patterns

### Recommended Project Structure
```
src/components/ui/
├── sidebar-panel.ts       # Container with grid layout
├── param-section.ts       # Collapsible parameter groups
├── main-layout.ts         # Mobile sidebar placement
└── app-root.ts            # Button in sidebar footer slot
```

### Pattern 1: Sticky Footer Button with Scrollable Content
**What:** Sidebar with independent scrolling parameter sections and always-visible action button
**When to use:** Forms with many inputs requiring scroll but needing constant access to submit/action button
**Example:**
```typescript
// Source: eVelo current implementation with improvements
// Component structure (sidebar-panel.ts)
protected template(): string {
  return `
    <aside class="sidebar">
      <button class="toggle-btn">...</button>
      <div class="sidebar-content">
        <slot></slot>
      </div>
      <div class="sidebar-footer">
        <slot name="footer"></slot>
      </div>
    </aside>
  `;
}

protected styles(): string {
  return `
    .sidebar {
      display: grid;
      grid-template-rows: auto 1fr auto;  /* header / content / footer */
      height: 100%;
      min-height: 0;
    }

    .sidebar-content {
      overflow-y: auto;
      overflow-x: hidden;
      padding: var(--spacing-sm, 8px);
      /* CRITICAL: Add padding-bottom equal to footer height + spacing */
      padding-bottom: calc(var(--button-height, 68px) + var(--spacing-lg, 24px));
      min-height: 0;  /* Allow grid item to shrink */
      -webkit-overflow-scrolling: touch;  /* iOS momentum scroll */
    }

    .sidebar-footer {
      /* Sticky positioning within sidebar */
      position: sticky;
      bottom: 0;
      z-index: 10;
      padding: var(--spacing-md, 16px);
      padding-bottom: max(var(--spacing-md, 16px), env(safe-area-inset-bottom, 0px));
      border-top: 1px solid var(--border-color);
      background: var(--surface-secondary);
      box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 768px) {
      .sidebar-content {
        /* More aggressive padding on mobile for thumb clearance */
        padding-bottom: calc(var(--button-height, 68px) + var(--spacing-xl, 32px) + env(safe-area-inset-bottom, 0px));
      }
    }
  `;
}
```

### Pattern 2: Safe Area Insets for iOS/Android
**What:** Padding adjustments for device-specific UI elements (notch, home bar, gesture areas)
**When to use:** Any bottom-positioned sticky/fixed elements on mobile
**Example:**
```css
/* Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env */
.sidebar-footer {
  position: sticky;
  bottom: 0;
  padding: var(--spacing-md, 16px);
  /* Add safe area for iOS home bar, Android gesture bar */
  padding-bottom: max(
    var(--spacing-md, 16px),
    env(safe-area-inset-bottom, 0px)
  );
  /* Ensure button touch target clearance (44px minimum) */
  padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
}

/* For content that needs to avoid sticky footer */
.sidebar-content {
  /* Account for sticky footer height + safe area */
  padding-bottom: calc(
    var(--footer-height, 80px) +
    env(safe-area-inset-bottom, 0px) +
    var(--spacing-lg, 24px)
  );
}
```

### Pattern 3: Mobile Grid Layout with Constrained Height
**What:** Grid structure that properly constrains scrollable content height on mobile
**When to use:** Mobile sidebar/panel layouts where content should scroll independently
**Example:**
```typescript
// Source: eVelo main-layout.ts and sidebar-panel.ts (Phase 24 fix)
// main-layout.ts
protected styles(): string {
  return `
    @media (max-width: 768px) {
      .layout {
        display: grid;
        grid-template-areas:
          "header"
          "toggle"
          "sidebar"
          "main";
        grid-template-rows: auto auto 1fr auto;
        height: 100vh;
      }

      .sidebar-area {
        grid-area: sidebar;
        min-height: 0;  /* CRITICAL: allows grid item to constrain content */
        overflow: hidden;
      }

      /* Ensure slotted content respects height constraints */
      .sidebar-area ::slotted(*) {
        height: 100%;
        min-height: 0;
      }
    }
  `;
}

// sidebar-panel.ts
protected styles(): string {
  return `
    :host {
      display: block;
      height: 100%;
      min-height: 0;  /* Allow shrinking in flex/grid parent */
    }

    .sidebar {
      display: grid;
      grid-template-rows: auto 1fr auto;
      height: 100%;
      min-height: 0;  /* Allow grid to constrain content height */
    }
  `;
}
```

### Pattern 4: Touch-Friendly Button Sizing
**What:** Minimum 48x48px touch targets with adequate spacing from screen edges
**When to use:** All interactive elements on mobile
**Example:**
```css
/* Source: Material Design and iOS Human Interface Guidelines */
.btn-primary {
  /* Minimum 48px height for touch targets (44px iOS, 48px Material) */
  min-height: 48px;
  padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);
  font-size: var(--font-size-base, 1rem);
  font-weight: 600;
  width: 100%;

  /* Improve tap responsiveness */
  touch-action: manipulation;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);
}

/* Add spacing from screen edges on mobile */
@media (max-width: 768px) {
  .sidebar-footer {
    padding: var(--spacing-md, 16px);
    /* Extra bottom padding to avoid accidental browser toolbar triggers */
    padding-bottom: calc(var(--spacing-md, 16px) + env(safe-area-inset-bottom, 16px));
  }
}
```

### Anti-Patterns to Avoid
- **position: fixed on mobile forms**: Fixed positioning breaks with virtual keyboards (iOS especially). Virtual keyboard appearance can scroll fixed elements out of view. Use `position: sticky` instead.
- **No padding-bottom on scrollable content**: Sticky footer obscures last parameter inputs. Always add padding equal to footer height + spacing.
- **Missing min-height: 0 in grid/flex**: Grid items with 1fr tracks grow to fit content without `min-height: 0`, preventing proper scroll constraint.
- **Ignoring safe-area-insets**: Bottom buttons on iPhone X+ or Android gesture devices can overlap home bar. Always use `env(safe-area-inset-bottom)`.
- **Touch targets < 44px**: Small buttons cause tap errors on mobile. iOS requires 44x44pt minimum, Material Design recommends 48x48dp.
- **Sticky footer without box-shadow**: Users can't tell where scrollable content ends. Add subtle top shadow for depth cue.
- **Double-tap issues on iOS**: ~40px invisible tap area at bottom of screen triggers Safari toolbar. Add extra padding (16-24px) to avoid.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sticky footer positioning | Custom scroll listeners + JS | CSS `position: sticky` | Native, performant, handles edge cases (keyboard, rotation) |
| Safe area padding | Device detection + hardcoded values | `env(safe-area-inset-bottom)` | Handles all devices (iPhone notch, Android gestures) automatically |
| Momentum scrolling | Custom touch event handlers | `-webkit-overflow-scrolling: touch` | Native iOS smooth scrolling, no JS overhead |
| Virtual keyboard handling | JS window resize listeners | CSS `dvh` units (dynamic viewport) | Browser handles viewport changes automatically |
| Touch target sizing | Pixel-perfect custom sizing | Material/iOS guidelines (48px/44px) | Research-backed minimum sizes prevent tap errors |

**Key insight:** Mobile browser vendors have standardized solutions for common layout issues. CSS-first approaches (sticky positioning, env() functions, safe-area-insets) are more robust than JS workarounds and handle edge cases (keyboard appearance, orientation changes, notches) automatically.

## Common Pitfalls

### Pitfall 1: Sticky Footer Obscures Last Parameter Inputs
**What goes wrong:** User scrolls to bottom, last parameter input is hidden behind sticky Run Simulation button
**Why it happens:** Scrollable container has no padding-bottom; sticky footer overlays content
**How to avoid:**
1. Add `padding-bottom` to `.sidebar-content` equal to footer height + spacing (60-80px typical)
2. Use CSS variable for footer height so padding can reference it
3. Test by scrolling to bottom and ensuring last input fully visible with button present
**Warning signs:**
- Last parameter section partially hidden
- Scrollbar reaches bottom but content cut off
- User can't tap last input without scrolling button away

**Example fix:**
```css
.sidebar-content {
  overflow-y: auto;
  padding: var(--spacing-sm, 8px);
  /* Footer height (68px) + safe spacing (24px) + safe-area (env) */
  padding-bottom: calc(68px + 24px + env(safe-area-inset-bottom, 0px));
}
```

### Pitfall 2: position: fixed Breaks with Virtual Keyboard on iOS
**What goes wrong:** Run Simulation button scrolls off-screen when user taps input and keyboard appears
**Why it happens:** iOS shrinks visual viewport but keeps fixed-position viewport the same; fixed elements scroll out of view
**How to avoid:**
1. Use `position: sticky` instead of `position: fixed` for form buttons
2. Sticky button stays within parent container, respects scrolling
3. If must use fixed, add JS listener for keyboard events and toggle visibility
**Warning signs:**
- Button disappears when keyboard appears
- Button visible on Android but not iOS
- Button reappears only after keyboard dismissed

### Pitfall 3: Missing min-height: 0 Breaks Grid Height Constraints
**What goes wrong:** Sidebar-content doesn't scroll; entire sidebar extends beyond viewport
**Why it happens:** Grid items with `1fr` tracks default to `min-height: auto`, growing to fit content
**How to avoid:**
1. Add `min-height: 0` to ALL grid items using `1fr` tracks
2. Add `min-height: 0` to `:host` element and container elements
3. Verify height cascade: parent with height → grid child with min-height:0 → scrollable grandchild
**Warning signs:**
- Scrollbar doesn't appear on sidebar-content
- Sidebar extends below viewport
- Button not visible until scroll (Phase 24 bug pattern)

**Context:** Phase 24 fixed this exact issue by adding `min-height: 0` to sidebar-area, sidebar-panel :host, and .sidebar.

### Pitfall 4: Accidental Safari Toolbar Trigger on Bottom Tap
**What goes wrong:** User tries to tap Run Simulation button, Safari toolbar appears instead
**Why it happens:** iOS Safari has ~40px invisible tap area at bottom that triggers toolbar UI
**How to avoid:**
1. Add extra padding-bottom (16-24px) to sticky footer on mobile
2. Position button slightly above absolute bottom of screen
3. Test on actual iOS device (simulator doesn't reproduce issue reliably)
**Warning signs:**
- User reports "button requires two taps"
- Safari toolbar appears when tapping button area
- Button works fine on Android but not iOS

**Example fix:**
```css
@media (max-width: 768px) {
  .sidebar-footer {
    /* Extra padding to avoid iOS tap zone */
    padding-bottom: max(24px, env(safe-area-inset-bottom, 0px));
  }
}
```

### Pitfall 5: Sticky Element Lacks Visual Separation from Content
**What goes wrong:** User can't tell where scrollable parameters end and sticky button begins
**Why it happens:** No visual cue (border, shadow) to separate sticky footer from content
**How to avoid:**
1. Add subtle `box-shadow` on top of sticky footer (inset or drop shadow)
2. Add `border-top` with subtle color
3. Ensure background color is opaque (not transparent)
**Warning signs:**
- Content appears to "run into" button
- No clear boundary between parameters and action button
- Users report confusion about what's scrollable

**Example fix:**
```css
.sidebar-footer {
  position: sticky;
  bottom: 0;
  border-top: 1px solid var(--border-color);
  background: var(--surface-secondary);  /* Opaque background */
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);  /* Top shadow */
}
```

## Code Examples

Verified patterns from official sources:

### Complete Mobile Parameters Panel with Sticky Button
```typescript
// Source: eVelo sidebar-panel.ts with mobile optimizations
export class SidebarPanel extends BaseComponent {
  protected template(): string {
    return `
      <aside class="sidebar">
        <button class="toggle-btn">eVelo Parameters</button>
        <div class="sidebar-content">
          <slot></slot>
        </div>
        <div class="sidebar-footer">
          <slot name="footer"></slot>
        </div>
      </aside>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
      }

      .sidebar {
        display: grid;
        grid-template-rows: auto 1fr auto;
        height: 100%;
        min-height: 0;
        width: var(--sidebar-width, 320px);
        background: var(--surface-secondary);
        border-right: 1px solid var(--border-color);
      }

      .sidebar-content {
        overflow-y: auto;
        overflow-x: hidden;
        padding: var(--spacing-sm, 8px);
        min-height: 0;
        /* CRITICAL: Padding to prevent content hiding behind sticky footer */
        padding-bottom: calc(68px + 24px);  /* footer height + spacing */
        -webkit-overflow-scrolling: touch;
        scrollbar-width: thin;
        scrollbar-color: #b4bcc5 transparent;
      }

      .sidebar-footer {
        position: sticky;
        bottom: 0;
        z-index: 10;
        padding: var(--spacing-md, 16px);
        border-top: 1px solid var(--border-color);
        background: var(--surface-secondary);
        box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
      }

      /* Mobile optimizations */
      @media (max-width: 768px) {
        .toggle-btn {
          display: none;  /* Mobile toggle handled by main-layout */
        }

        .sidebar {
          width: 100%;
        }

        .sidebar-content {
          /* More aggressive padding on mobile */
          padding-bottom: calc(68px + 32px + env(safe-area-inset-bottom, 0px));
        }

        .sidebar-footer {
          /* Safe area insets for iOS/Android */
          padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
        }
      }
    `;
  }
}
```

### Safe Area Inset Implementation
```css
/* Source: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env */
/* viewport meta tag required in HTML head */
/* <meta name="viewport" content="viewport-fit=cover"> */

.sidebar-footer {
  position: sticky;
  bottom: 0;

  /* Use max() to ensure minimum padding even if safe-area is 0 */
  padding-bottom: max(
    var(--spacing-md, 16px),
    env(safe-area-inset-bottom, 0px)
  );

  /* For iOS devices with home bar, add extra spacing */
  padding-bottom: calc(
    var(--spacing-md, 16px) +
    env(safe-area-inset-bottom, 0px)
  );
}

/* Scrollable content must account for both footer height and safe area */
.sidebar-content {
  padding-bottom: calc(
    var(--footer-height, 68px) +
    var(--spacing-lg, 24px) +
    env(safe-area-inset-bottom, 0px)
  );
}

/* Handle left/right safe areas for landscape or notched devices */
.sidebar {
  padding-left: env(safe-area-inset-left, 0px);
  padding-right: env(safe-area-inset-right, 0px);
}
```

### Dynamic Viewport Height (dvh) for Mobile Chrome
```css
/* Source: https://developer.chrome.com/docs/css-ui/viewport-units */
/* dvh accounts for browser chrome (address bar) on mobile */
.layout {
  /* Fallback to vh for older browsers */
  height: 100vh;
  /* Use dvh where supported (Chrome 108+, Safari 15.4+) */
  height: 100dvh;
}

/* Alternative: Use svh (small viewport height) for minimum height */
.sidebar {
  min-height: 100svh;  /* Smallest possible viewport (address bar visible) */
}

/* Or lvh (large viewport height) for maximum height */
.main-content {
  max-height: 100lvh;  /* Largest possible viewport (address bar hidden) */
}
```

### Touch-Optimized Button Component
```typescript
// Source: Material Design and iOS Human Interface Guidelines
protected styles(): string {
  return `
    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--spacing-sm, 8px);

      /* Touch target: 48px minimum (Material), 44px (iOS) */
      min-height: 48px;
      padding: var(--spacing-md, 16px) var(--spacing-lg, 24px);

      /* Full width on mobile */
      width: 100%;

      /* Typography */
      font-size: var(--font-size-base, 1rem);
      font-weight: 600;

      /* Touch improvements */
      touch-action: manipulation;  /* Disable double-tap zoom */
      -webkit-tap-highlight-color: rgba(0, 0, 0, 0.1);  /* Tap feedback */

      /* Visual */
      background: var(--color-primary, #0d9488);
      color: white;
      border: none;
      border-radius: var(--radius-md, 6px);
      cursor: pointer;

      /* Transitions */
      transition: background 0.2s, transform 0.1s;
    }

    .btn-primary:active {
      transform: scale(0.98);  /* Tactile feedback */
    }

    .btn-primary:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }

    /* Ensure adequate spacing from screen edges on mobile */
    @media (max-width: 768px) {
      .sidebar-footer {
        padding: var(--spacing-md, 16px);
      }
    }
  `;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| position: fixed for mobile footers | position: sticky within container | 2020+ (better keyboard support) | Sticky respects parent, doesn't break with virtual keyboard |
| Hardcoded safe area padding | env(safe-area-inset-*) CSS | 2018 (iOS 11.2+) | Handles all notch/home bar devices automatically |
| vh units for mobile height | dvh/svh/lvh viewport units | 2023 (Chrome 108, Safari 15.4) | Accounts for dynamic browser chrome (address bar) |
| JS resize listeners for keyboard | CSS-only solutions with sticky | 2020+ (improved browser APIs) | CSS handles keyboard appearance automatically |
| Separate mobile/desktop CSS | Container queries | 2023 (widespread support) | Components adapt to container, not just viewport |

**Deprecated/outdated:**
- **position: fixed for form footers on mobile**: Breaks with keyboards; use sticky instead
- **-webkit-device-pixel-ratio media queries**: Use resolution media queries or container queries
- **Manual touch event handling for scrolling**: Native `-webkit-overflow-scrolling` and `scroll-behavior` sufficient
- **iOS-only webkit prefixes required**: Most now standard (safe-area-inset still uses env())

## Open Questions

Things that couldn't be fully resolved:

1. **Container query adoption for sidebar**
   - What we know: Container queries supported in all major browsers since 2023; allow component-level responsiveness
   - What's unclear: Whether sidebar-panel should use container queries instead of media queries
   - Recommendation: Defer to future phase; media queries work for Phase 25 scope

2. **Optimal padding-bottom value**
   - What we know: Need footer height + spacing + safe-area-inset; typical range 60-100px
   - What's unclear: Exact value that balances content visibility vs. thumb reach on different devices
   - Recommendation: Use `calc(68px + 24px + env(safe-area-inset-bottom))` as starting point, test on devices

3. **dvh browser support threshold**
   - What we know: dvh supported in Chrome 108+ (Nov 2022), Safari 15.4+ (Mar 2022), Firefox 101+ (May 2022)
   - What's unclear: Whether eVelo's browser support policy includes older versions
   - Recommendation: Use `height: 100vh; height: 100dvh;` pattern for progressive enhancement

4. **Performance of position: sticky on low-end Android**
   - What we know: Sticky positioning can have performance issues on older Android devices
   - What's unclear: Whether eVelo's target devices experience performance problems
   - Recommendation: Test on low-end Android device; fallback to static positioning if issues detected

5. **Double-tap Safari toolbar trigger threshold**
   - What we know: ~40px invisible tap zone at bottom, varies by device
   - What's unclear: Exact threshold and whether it varies by iOS version
   - Recommendation: Add 20-24px extra padding on mobile; test on actual iOS device

## Sources

### Primary (HIGH confidence)
- [CSS position - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position) - Official CSS specification
- [env() - MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/env) - Safe area insets documentation
- [Chrome Edge-to-Edge Migration Guide](https://developer.chrome.com/docs/css-ui/edge-to-edge) - Android Chrome viewport handling
- eVelo codebase - `src/components/ui/sidebar-panel.ts`, `src/components/ui/main-layout.ts`, `.planning/debug/resolved/mobile-sticky-button-visibility.md`

### Secondary (MEDIUM confidence)
- [UX Tip #13: Sticky Buttons on Mobile Web](https://blog.designary.com/p/sticky-buttons-navigation-elements-in-mobile-web) - Mobile sticky button UX best practices
- [Best Practices for Sticky Elements - CafeMedia](https://cafemedia.com/best-practices-for-sticky-elements-in-ux-design/) - UX design patterns for sticky elements
- [Mobile Form Best Practices - IvyForms](https://ivyforms.com/blog/mobile-form-best-practices/) - Mobile form UX guidelines (2026)
- [Position Fixed on Mobile - w3tutorials](https://www.w3tutorials.net/blog/position-fixed-not-working-in-mobile-browser/) - Mobile browser positioning issues

### Tertiary (LOW confidence)
- [Sticky Footer Recipe - React Native Avoid SoftInput](https://mateusz1913.github.io/react-native-avoid-softinput/docs/recipes/recipes-sticky-footer/) - React Native patterns (may not apply directly to web)
- [CSS Position Sticky - Elad Shechter](https://elad.medium.com/css-position-sticky-how-it-really-works-54cd01dc2d46) - Community tutorial (single source)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - position: sticky and safe-area-insets verified in official MDN and Chrome docs
- Architecture: HIGH - Patterns verified in eVelo codebase (Phase 24 fix) and official documentation
- Pitfalls: HIGH - Common issues documented in Phase 24 debug logs and mobile UX research

**Research date:** 2026-01-28
**Valid until:** 2026-04-28 (90 days - stable domain, established patterns)
