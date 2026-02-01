# eVelo Design System Specification

Use this specification to apply the eVelo visual style to another application.

## Design Philosophy

Professional financial application with a calm, trustworthy aesthetic. Uses teal as the primary accent color against neutral grays. Emphasizes readability, accessibility (WCAG 2.1 AA compliant), and clean data visualization. Supports both light and dark themes.

---

## Color Palette

### Light Theme

```css
/* Primary Accent (Teal) */
--color-primary: #0d9488;
--color-primary-hover: #0f766e;

/* Semantic Colors */
--color-success: #047857;  /* For positive states, confirmations */
--color-warning: #b45309;  /* For caution states */
--color-error: #dc2626;    /* For errors, danger */

/* Surfaces (White to Light Gray progression) */
--surface-primary: #ffffff;     /* Main content background */
--surface-secondary: #f8fafc;   /* Sidebar, card backgrounds */
--surface-tertiary: #e2e8f0;    /* Borders, dividers */

/* Text (Slate palette) */
--text-primary: #1e293b;        /* Main text - high contrast */
--text-secondary: #64748b;      /* Labels, descriptions */
--text-tertiary: #94a3b8;       /* Muted text, timestamps */
--text-inverse: #ffffff;        /* Text on colored backgrounds */
--text-disabled: #9ca3af;

/* Borders */
--border-color: #e2e8f0;
--border-color-light: #f1f5f9;
```

### Dark Theme

```css
/* Primary Accent (Brighter Teal) */
--color-primary: #14b8a6;
--color-primary-hover: #2dd4bf;

/* Semantic Colors (Vibrant on dark) */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;

/* Surfaces (Dark Navy/Slate progression) */
--surface-primary: #0f172a;     /* Main background */
--surface-secondary: #1e293b;   /* Cards, sidebars */
--surface-tertiary: #334155;    /* Elevated elements */

/* Text */
--text-primary: #f1f5f9;
--text-secondary: #94a3b8;
--text-inverse: #0f172a;

/* Borders */
--border-color: #334155;
```

---

## Typography

```css
--font-family: system-ui, -apple-system, sans-serif;

/* Fixed sizes */
--font-size-xs: 0.75rem;   /* 12px - Labels, captions */
--font-size-sm: 0.875rem;  /* 14px - Secondary text */
--font-size-md: 1rem;      /* 16px - Body */
--font-size-lg: 1.25rem;   /* 20px - Subheadings */

/* Fluid sizes (responsive) */
--font-size-fluid-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
--font-size-fluid-lg: clamp(1.125rem, 1rem + 0.5vw, 1.375rem);
--font-size-fluid-xl: clamp(1.25rem, 1rem + 1vw, 2rem);
--font-size-fluid-hero: clamp(2rem, 1.5rem + 2vw, 3.5rem);
```

### Font Weights

| Weight | Usage |
|--------|-------|
| 400 | Regular - body text |
| 500 | Medium - buttons, labels |
| 600 | Semibold - card titles, subheadings |
| 700 | Bold - headings, emphasis |

---

## Spacing Scale

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 16px;
--spacing-lg: 24px;
--spacing-xl: 32px;

/* Fluid spacing (responsive) */
--spacing-fluid-sm: clamp(8px, 1vw, 12px);
--spacing-fluid-md: clamp(16px, 2vw, 24px);
--spacing-fluid-lg: clamp(24px, 3vw, 40px);
```

---

## Border Radii

```css
--border-radius-sm: 4px;   /* Small elements, badges */
--border-radius-md: 8px;   /* Buttons, inputs */
--border-radius-lg: 12px;  /* Cards, modals, panels */
```

---

## Shadows

### Light Theme

```css
--shadow-sm: 0 1px 3px rgba(26, 36, 36, 0.06);
--shadow-md: 0 4px 12px rgba(26, 36, 36, 0.08);
--shadow-lg: 0 8px 32px rgba(26, 36, 36, 0.12);
--shadow-hover: 0 12px 40px rgba(26, 36, 36, 0.15);
```

### Dark Theme

```css
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.5);
--shadow-hover: 0 12px 40px rgba(0, 0, 0, 0.6);
--shadow-glow: 0 0 16px rgba(77, 184, 160, 0.15);
```

---

## Component Patterns

### Primary Button

```css
background: var(--color-primary);
color: var(--text-inverse);
border: 1px solid var(--color-primary);
border-radius: var(--border-radius-md);
padding: 8px 16px;
font-weight: 500;
transition: background-color 0.15s ease;

&:hover {
  background: var(--color-primary-hover);
}
```

### Secondary/Ghost Button

```css
background: var(--surface-primary);
color: var(--text-primary);
border: 1px solid var(--border-color);
border-radius: var(--border-radius-md);

&:hover {
  background: var(--surface-secondary);
  border-color: var(--text-secondary);
}
```

### Card

```css
background: var(--surface-primary);
border: 1px solid var(--border-color);
border-radius: var(--border-radius-lg);
box-shadow: var(--shadow-sm);
padding: 24px;
transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);

&:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-hover);
  border-color: var(--color-primary);
}
```

### Card with Accent Bar

```css
/* 4px colored top border indicating status */
border-top: 4px solid var(--color-primary);

/* Or for sections (left accent): */
border-left: 4px solid var(--color-primary);
```

### Form Input

```css
background: var(--surface-primary);
border: 1px solid var(--border-color);
border-radius: var(--border-radius-md);
padding: 8px 16px;
color: var(--text-primary);
transition: border-color 0.15s ease, box-shadow 0.15s ease;

&:hover {
  border-color: #cbd5e1;
}

&:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(13, 148, 136, 0.1);
  outline: none;
}
```

### Collapsible Section (Accordion)

```css
background: var(--surface-secondary);
border-radius: var(--border-radius-lg);
border-left: 4px solid var(--color-primary);
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);

summary {
  padding: 16px 24px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
```

### Modal/Dialog

```css
/* Backdrop */
background: rgba(0, 0, 0, 0.3);
backdrop-filter: blur(4px);

/* Card */
background: var(--surface-primary);
border-radius: var(--border-radius-lg);
padding: 24px;
box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
max-width: 360px;
```

### Toast Notification

```css
display: flex;
align-items: center;
gap: 12px;
padding: 12px 16px;
border-radius: var(--border-radius-md);
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
/* Background color varies by type: success/error/warning/info */
```

---

## Header Pattern

```css
/* Teal header with white text */
background: var(--color-primary);
color: var(--text-inverse);
padding: 16px 24px;

/* Dark theme variant: */
background: linear-gradient(135deg, #1a2d3d 0%, #0f1922 100%);
color: #14b8a6; /* Teal text on dark */
```

### Header Watermark

```css
/* Large faded logo positioned right */
position: absolute;
right: -20px;
opacity: 0.08;
filter: brightness(0) invert(1);
```

---

## Sidebar Pattern

```css
background: var(--surface-secondary);
border-right: 1px solid var(--border-color);
width: 320px; /* Collapsed: 48px */

/* Toggle button uses gradient: */
background: linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 100%);
border-bottom: 2px solid #0d9488;
color: #065f56;
font-weight: 700;
```

---

## Animation/Transitions

```css
/* Standard transitions */
transition: all 0.2s ease;
transition: all 0.15s ease;

/* Card hover lift */
transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);

/* Shimmer effect for hero banners */
@keyframes shimmerGlow {
  0% { transform: translateX(-100%); }
  50% { transform: translateX(0); }
  100% { transform: translateX(100%); }
}

/* Slide-in for toasts */
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Scale entrance for modals */
transform: scale(0.95) → scale(1);
```

---

## Responsive Breakpoints

| Breakpoint | Media Query | Usage |
|------------|-------------|-------|
| Mobile | `max-width: 768px` | Single column, stacked layout |
| Tablet | `max-width: 1024px` | Reduced spacing |
| Large Desktop | `min-width: 1440px` | Enhanced spacing |
| Full HD | `min-width: 1920px` | Max-width constraints |
| Ultrawide/4K | `min-width: 2560px` | Stricter max-width |

---

## Scrollbar Styling

```css
/* Thin, subtle scrollbars - hidden until hover */
scrollbar-width: thin;
scrollbar-color: transparent transparent;

&:hover {
  scrollbar-color: #b4bcc5 transparent;
}

&::-webkit-scrollbar {
  width: 8px;
}

&::-webkit-scrollbar-track {
  background: transparent;
}

&::-webkit-scrollbar-thumb {
  background: transparent;
  border-radius: 4px;
}

&:hover::-webkit-scrollbar-thumb {
  background: #b4bcc5;
}
```

---

## Focus States (Accessibility)

```css
&:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
```

---

## Status Colors Summary

| Status | Light Theme | Dark Theme | Usage |
|--------|-------------|------------|-------|
| Success | `#047857` | `#10b981` | Confirmations, positive metrics |
| Warning | `#b45309` | `#f59e0b` | Caution, needs attention |
| Error | `#dc2626` | `#ef4444` | Errors, failures, danger |
| Info/Primary | `#0d9488` | `#14b8a6` | Neutral info, branding |

---

## Key Visual Characteristics

1. **Teal accent** as primary brand color throughout
2. **Slate gray text** on light backgrounds for readability
3. **4px accent bars** on cards and sections (left or top edge)
4. **Subtle shadows** that lift on hover
5. **Smooth transitions** (0.15s-0.3s) for all interactions
6. **Rounded corners** (8-12px) for a modern, friendly feel
7. **Gradient backgrounds** for headers and toggle buttons
8. **Watermark logos** at low opacity for branding depth
9. **System fonts** for fast loading and native feel
