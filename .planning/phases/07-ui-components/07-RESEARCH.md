# Phase 7: UI Components - Research

**Researched:** 2026-01-17
**Domain:** Web Components UI patterns, form controls, sidebar layout, toast notifications, responsive design
**Confidence:** HIGH (core patterns), MEDIUM (form-associated elements), LOW (complex searchable selects)

## Summary

Phase 7 builds the interactive UI layer using vanilla Web Components, extending the existing `BaseComponent` pattern established in earlier phases. The architecture uses **native HTML elements wherever possible** (dialog, details/summary, input types) rather than hand-rolling custom controls. CSS custom properties pierce Shadow DOM boundaries, enabling a unified theming system without leaking global styles.

**Key findings:**
1. Use the **native `<dialog>` element** for modals - provides focus management, backdrop, and ESC-to-close for free
2. Use **`<details>/<summary>` elements** for collapsible sections and help guides - accessible out of the box
3. For sidebar layout, use **CSS Grid with `grid-template-columns`** that responds to a `data-collapsed` attribute
4. **ElementInternals API** enables Web Components to participate in form validation (form-associated custom elements)
5. Toast notifications should use **`<output role="status">`** for accessibility with auto-dismiss timers
6. CSS custom properties **inherit through Shadow DOM** - define design tokens on `:host` or document root

**Primary recommendation:** Build UI components using native HTML5 elements with Web Component wrappers for encapsulation and event handling. Avoid libraries like Shoelace/Lit to maintain the framework-free constraint.

## Standard Stack

The established patterns and technologies for this domain.

### Core

| Pattern | Purpose | Why Standard |
|---------|---------|--------------|
| Native `<dialog>` | Modals, popups | Built-in focus trap, backdrop, ESC key handling |
| Native `<details>/<summary>` | Collapsible sections, help guides | Accessible disclosure widget, no JS needed |
| CSS Custom Properties | Theming, design tokens | Pierces Shadow DOM, enables runtime theme switching |
| CSS Grid | Page layout, sidebar | Two-dimensional layout, named grid areas |
| ElementInternals API | Form-associated custom elements | Native form submission and validation |
| CustomEvent | Component communication | Bubbles with `composed: true` for Shadow DOM |

### Supporting

| Pattern | Purpose | When to Use |
|---------|---------|-------------|
| `<output role="status">` | Toast notifications | ARIA live region for screen readers |
| `<input type="range">` | Sliders for weights | Native slider with styling via pseudo-elements |
| ResizeObserver | Responsive sidebar | Detect container size changes for collapse |
| CSS `:host()` selector | Conditional host styling | Style component based on attributes |
| `::part()` pseudo-element | External styling hooks | Allow consumers to style internal elements |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native dialog | Custom modal | More control but must implement focus trap, ESC handling |
| details/summary | Custom accordion | More styling flexibility but must handle ARIA, keyboard |
| CSS Grid sidebar | Flexbox | Grid better for fixed + fluid column patterns |
| Pure CSS collapse | JS-based | CSS uses data attributes; JS more dynamic |

**No new dependencies required.** All patterns use native browser APIs.

## Architecture Patterns

### Recommended Project Structure

```
src/
  components/
    base-component.ts         # Existing abstract base class
    app-root.ts               # Existing root component
    ui/
      sidebar-panel.ts        # Collapsible sidebar container
      param-section.ts        # Collapsible parameter group
      asset-selector.ts       # Asset search/filter/select
      weight-editor.ts        # Weight distribution controls
      toast-container.ts      # Toast notification manager
      toast-notification.ts   # Individual toast element
      progress-indicator.ts   # Simulation progress display
      help-section.ts         # Expandable help/guide
      main-layout.ts          # Grid layout orchestrator
    index.ts                  # Component registration
  styles/
    tokens.css                # CSS custom properties (design tokens)
    utilities.css             # Common utility classes
```

### Pattern 1: Collapsible Sidebar with CSS Grid

**What:** Sidebar that collapses to icons-only or fully hides, with main content expanding to fill space.

**When to use:** UI-01 requirement - Strategy Parameters sidebar.

**Example:**
```typescript
// sidebar-panel.ts
export class SidebarPanel extends BaseComponent {
  static observedAttributes = ['collapsed'];

  protected template(): string {
    return `
      <aside class="sidebar">
        <button class="toggle-btn" aria-label="Toggle sidebar">
          <span class="icon"></span>
        </button>
        <div class="sidebar-content">
          <slot></slot>
        </div>
      </aside>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .sidebar {
        display: grid;
        grid-template-rows: auto 1fr;
        height: 100%;
        width: var(--sidebar-width, 320px);
        transition: width 0.3s ease;
        background: var(--surface-secondary);
        border-right: 1px solid var(--border-color);
      }

      :host([collapsed]) .sidebar {
        width: var(--sidebar-collapsed-width, 48px);
      }

      :host([collapsed]) .sidebar-content {
        display: none;
      }

      .toggle-btn {
        padding: 12px;
        background: transparent;
        border: none;
        cursor: pointer;
      }
    `;
  }

  protected afterRender(): void {
    this.$('.toggle-btn')?.addEventListener('click', () => {
      const isCollapsed = this.hasAttribute('collapsed');
      if (isCollapsed) {
        this.removeAttribute('collapsed');
      } else {
        this.setAttribute('collapsed', '');
      }
      this.dispatchEvent(new CustomEvent('toggle', {
        bubbles: true,
        composed: true,
        detail: { collapsed: !isCollapsed }
      }));
    });
  }
}
```

**Layout container:**
```typescript
// main-layout.ts
protected styles(): string {
  return `
    :host {
      display: grid;
      grid-template-columns: auto 1fr;
      height: 100vh;
    }

    :host([sidebar-collapsed]) {
      grid-template-columns: 48px 1fr;
    }
  `;
}
```

### Pattern 2: Native Dialog for Modals

**What:** Use `<dialog>` element for confirmation dialogs and settings modals.

**When to use:** Confirmation dialogs, asset selection modal, settings popup.

**Example:**
```typescript
// Source: MDN <dialog> element documentation
export class ConfirmDialog extends BaseComponent {
  protected template(): string {
    return `
      <dialog id="confirm-dialog">
        <form method="dialog">
          <h2 class="dialog-title"><slot name="title">Confirm</slot></h2>
          <div class="dialog-content"><slot></slot></div>
          <div class="dialog-actions">
            <button value="cancel" class="btn-secondary">Cancel</button>
            <button value="confirm" class="btn-primary">Confirm</button>
          </div>
        </form>
      </dialog>
    `;
  }

  protected styles(): string {
    return `
      dialog {
        border: none;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
      }

      dialog::backdrop {
        background: rgba(0, 0, 0, 0.5);
      }

      dialog[open] {
        animation: fade-in 0.2s ease-out;
      }

      @keyframes fade-in {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
    `;
  }

  public showModal(): Promise<boolean> {
    const dialog = this.$('#confirm-dialog') as HTMLDialogElement;
    return new Promise((resolve) => {
      dialog.addEventListener('close', () => {
        resolve(dialog.returnValue === 'confirm');
      }, { once: true });
      dialog.showModal();
    });
  }
}
```

### Pattern 3: Details/Summary for Collapsible Sections

**What:** Native disclosure widget for parameter groups and help sections.

**When to use:** UI-05 requirement - expandable help/guide sections; collapsible parameter groups.

**Example:**
```typescript
// Source: MDN <details> element documentation
export class ParamSection extends BaseComponent {
  static observedAttributes = ['title', 'open'];

  protected template(): string {
    const title = this.getAttribute('title') || 'Section';
    const isOpen = this.hasAttribute('open') ? 'open' : '';
    return `
      <details ${isOpen}>
        <summary>
          <span class="section-title">${title}</span>
          <span class="chevron"></span>
        </summary>
        <div class="section-content">
          <slot></slot>
        </div>
      </details>
    `;
  }

  protected styles(): string {
    return `
      details {
        border-bottom: 1px solid var(--border-color);
      }

      summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px;
        cursor: pointer;
        user-select: none;
        list-style: none;
      }

      summary::-webkit-details-marker {
        display: none;
      }

      .chevron {
        transition: transform 0.2s ease;
      }

      details[open] .chevron {
        transform: rotate(180deg);
      }

      .section-content {
        padding: 0 16px 16px;
      }
    `;
  }
}
```

### Pattern 4: Toast Notifications with ARIA Live Region

**What:** Non-blocking feedback messages that auto-dismiss.

**When to use:** UI-06 requirement - toast notifications for user feedback.

**Example:**
```typescript
// Source: web.dev Toast component pattern
export class ToastContainer extends BaseComponent {
  protected template(): string {
    return `
      <div id="toast-container" role="status" aria-live="polite" aria-atomic="false">
        <!-- Toasts inserted here -->
      </div>
    `;
  }

  protected styles(): string {
    return `
      #toast-container {
        position: fixed;
        bottom: 24px;
        right: 24px;
        display: flex;
        flex-direction: column-reverse;
        gap: 8px;
        z-index: 1000;
        pointer-events: none;
      }
    `;
  }

  public show(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 5000): void {
    const container = this.$('#toast-container');
    if (!container) return;

    const toast = document.createElement('toast-notification');
    toast.setAttribute('type', type);
    toast.textContent = message;
    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
}

export class ToastNotification extends BaseComponent {
  protected template(): string {
    return `
      <output class="toast">
        <span class="icon"></span>
        <span class="message"><slot></slot></span>
        <button class="close" aria-label="Dismiss">&times;</button>
      </output>
    `;
  }

  protected styles(): string {
    return `
      .toast {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        background: var(--toast-bg, #333);
        color: var(--toast-color, #fff);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        pointer-events: auto;
        animation: slide-in 0.3s ease;
      }

      :host([type="success"]) .toast {
        --toast-bg: var(--color-success);
      }

      :host([type="error"]) .toast {
        --toast-bg: var(--color-error);
      }

      @keyframes slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }

      :host(.removing) .toast {
        animation: fade-out 0.3s ease forwards;
      }

      @keyframes fade-out {
        to { opacity: 0; transform: translateY(10px); }
      }
    `;
  }

  protected afterRender(): void {
    this.$('.close')?.addEventListener('click', () => {
      this.remove();
    });
  }
}
```

### Pattern 5: Progress Indicator for Simulation

**What:** Visual feedback during long-running Monte Carlo simulation.

**When to use:** UI-03 requirement - simulation progress indicator.

**Example:**
```typescript
export class ProgressIndicator extends BaseComponent {
  static observedAttributes = ['value', 'indeterminate'];

  protected template(): string {
    const value = parseInt(this.getAttribute('value') || '0', 10);
    const indeterminate = this.hasAttribute('indeterminate');
    return `
      <div class="progress-container"
           role="progressbar"
           aria-valuenow="${indeterminate ? '' : value}"
           aria-valuemin="0"
           aria-valuemax="100"
           ${indeterminate ? 'aria-busy="true"' : ''}>
        <div class="progress-bar" style="width: ${indeterminate ? '30%' : value + '%'}"></div>
        <span class="progress-text">${indeterminate ? 'Processing...' : value + '%'}</span>
      </div>
    `;
  }

  protected styles(): string {
    return `
      .progress-container {
        position: relative;
        height: 24px;
        background: var(--surface-tertiary);
        border-radius: 12px;
        overflow: hidden;
      }

      .progress-bar {
        height: 100%;
        background: var(--color-primary);
        transition: width 0.2s ease;
      }

      :host([indeterminate]) .progress-bar {
        animation: indeterminate 1.5s infinite linear;
      }

      @keyframes indeterminate {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(400%); }
      }

      .progress-text {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 500;
      }
    `;
  }

  set value(val: number) {
    this.setAttribute('value', String(Math.min(100, Math.max(0, val))));
  }
}
```

### Pattern 6: Form-Associated Custom Elements with ElementInternals

**What:** Custom form controls that participate in native form submission and validation.

**When to use:** Custom input components that need to work with `<form>` elements.

**Example:**
```typescript
// Source: MDN ElementInternals API
export class WeightInput extends HTMLElement {
  static formAssociated = true;
  private internals: ElementInternals;
  private _value = 0;

  constructor() {
    super();
    this.internals = this.attachInternals();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback(): void {
    this.render();
  }

  get value(): number {
    return this._value;
  }

  set value(val: number) {
    this._value = val;
    this.internals.setFormValue(String(val));

    // Validation
    if (val < 0 || val > 100) {
      this.internals.setValidity({ rangeOverflow: true }, 'Weight must be 0-100');
    } else {
      this.internals.setValidity({});
    }
  }

  private render(): void {
    this.shadowRoot!.innerHTML = `
      <style>
        input {
          width: 60px;
          padding: 8px;
          border: 1px solid var(--border-color);
          border-radius: 4px;
        }
        input:invalid {
          border-color: var(--color-error);
        }
      </style>
      <input type="number" min="0" max="100" step="1" />
    `;

    const input = this.shadowRoot!.querySelector('input')!;
    input.value = String(this._value);
    input.addEventListener('input', () => {
      this.value = parseFloat(input.value) || 0;
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    });
  }
}
```

### Pattern 7: CSS Custom Properties Design Tokens

**What:** Centralized design tokens that pierce Shadow DOM for consistent theming.

**When to use:** All components - establish once, use everywhere.

**Example:**
```css
/* src/styles/tokens.css */
:root {
  /* Colors - Light theme */
  --color-primary: #0d9488;
  --color-primary-hover: #0f766e;
  --color-success: #059669;
  --color-warning: #d97706;
  --color-error: #dc2626;

  /* Surfaces */
  --surface-primary: #ffffff;
  --surface-secondary: #f8fafc;
  --surface-tertiary: #e2e8f0;

  /* Text */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-inverse: #ffffff;

  /* Borders */
  --border-color: #e2e8f0;
  --border-radius-sm: 4px;
  --border-radius-md: 8px;
  --border-radius-lg: 12px;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;

  /* Typography */
  --font-family: system-ui, -apple-system, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;

  /* Sidebar */
  --sidebar-width: 320px;
  --sidebar-collapsed-width: 48px;
}

/* Dark theme */
[data-theme="dark"] {
  --color-primary: #2dd4bf;
  --surface-primary: #0f172a;
  --surface-secondary: #1e293b;
  --surface-tertiary: #334155;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border-color: #334155;
}
```

**Usage in component:**
```typescript
protected styles(): string {
  return `
    :host {
      font-family: var(--font-family);
    }

    .button {
      background: var(--color-primary);
      color: var(--text-inverse);
      padding: var(--spacing-sm) var(--spacing-md);
      border-radius: var(--border-radius-md);
    }

    .button:hover {
      background: var(--color-primary-hover);
    }
  `;
}
```

### Anti-Patterns to Avoid

- **Creating custom accordion when details/summary works:** Native elements are more accessible.
- **Custom modal without focus management:** Use `<dialog>` or implement full focus trap.
- **Global CSS that conflicts with Shadow DOM:** Use CSS custom properties for theming.
- **Forgetting `composed: true` on CustomEvents:** Events won't cross Shadow DOM boundary.
- **Inline styles over design tokens:** Breaks theming consistency.
- **Synchronous heavy operations in components:** Use requestAnimationFrame for DOM-heavy updates.

## Don't Hand-Roll

Problems that look simple but have existing solutions.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Modal dialogs | Custom overlay + trap | Native `<dialog>` element | Focus management, ESC, backdrop built-in |
| Collapsible sections | Toggle visibility JS | `<details>/<summary>` | Accessible, keyboard support, no JS |
| Form validation | Custom validators | ElementInternals + native constraints | Browser-native validation UI |
| Focus management | Manual tabindex logic | Native focus delegation | `<dialog>` and focusable elements handle it |
| ARIA live regions | Custom announcements | `<output role="status">` | Screen readers announce automatically |
| Range slider track styling | Custom slider | `<input type="range">` + CSS | Cross-browser with pseudo-elements |
| Theme switching | CSS class toggles | `[data-theme]` + custom properties | Runtime switching, no re-render |

**Key insight:** HTML5 provides sophisticated built-in controls. The job is to wrap them in Web Components for encapsulation, not rebuild them.

## Common Pitfalls

### Pitfall 1: Events Not Crossing Shadow DOM

**What goes wrong:** Parent component doesn't receive events from child.

**Why it happens:** CustomEvents default to `bubbles: false, composed: false`.

**How to avoid:**
```typescript
// WRONG
this.dispatchEvent(new CustomEvent('change', { detail: value }));

// CORRECT
this.dispatchEvent(new CustomEvent('change', {
  bubbles: true,
  composed: true,  // Crosses shadow boundary
  detail: value
}));
```

**Warning signs:** Event listeners on parent components never fire.

### Pitfall 2: CSS Not Reaching Shadow DOM

**What goes wrong:** Global styles don't apply inside components.

**Why it happens:** Shadow DOM encapsulation blocks external styles (by design).

**How to avoid:**
- Use CSS custom properties (they inherit through Shadow DOM)
- Define tokens on `:root`, consume with `var(--token-name)` in components
- Use `::part()` pseudo-element for explicit styling hooks

**Warning signs:** Components look unstyled; theme changes don't apply.

### Pitfall 3: Details/Summary Losing Heading Semantics

**What goes wrong:** Screen readers don't announce headings inside `<summary>`.

**Why it happens:** `<summary>` overrides child semantics to expose as button.

**How to avoid:**
- Don't put `<h1>`-`<h6>` inside `<summary>`
- Use CSS to style text visually like heading
- Add `aria-level` if heading semantics needed

**Warning signs:** Heading structure broken in accessibility tree.

### Pitfall 4: Dialog Focus Not Returning

**What goes wrong:** After closing dialog, focus is lost (goes to body).

**Why it happens:** Not tracking the trigger element.

**How to avoid:**
```typescript
public showModal(triggerElement: HTMLElement): Promise<boolean> {
  const dialog = this.$('#dialog') as HTMLDialogElement;
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      triggerElement.focus(); // Return focus
      resolve(dialog.returnValue === 'confirm');
    }, { once: true });
    dialog.showModal();
  });
}
```

**Warning signs:** Keyboard users lose their place after dialog closes.

### Pitfall 5: Range Slider Styling Inconsistency

**What goes wrong:** Slider looks different in Chrome vs Firefox.

**Why it happens:** Each browser uses different pseudo-elements.

**How to avoid:**
```css
/* Reset defaults */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
}

/* WebKit (Chrome, Safari, Edge) */
input[type="range"]::-webkit-slider-thumb { ... }
input[type="range"]::-webkit-slider-runnable-track { ... }

/* Firefox */
input[type="range"]::-moz-range-thumb { ... }
input[type="range"]::-moz-range-track { ... }
```

**Warning signs:** Slider thumb/track look broken in some browsers.

### Pitfall 6: Toast Spam on Rapid Actions

**What goes wrong:** Many toasts stack up, overwhelming UI.

**Why it happens:** Each action triggers a toast without deduplication.

**How to avoid:**
- Limit visible toasts (e.g., max 3)
- Deduplicate identical messages within short window
- Use shorter durations for non-critical feedback

**Warning signs:** Toast container fills screen; toasts overlap.

## Code Examples

Verified patterns from official sources.

### Responsive Grid Layout with Sidebar

```css
/* Source: CSS-Tricks + MDN CSS Grid */
.main-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width, 320px) 1fr;
  grid-template-areas: "sidebar main";
  height: 100vh;
}

.sidebar {
  grid-area: sidebar;
  overflow-y: auto;
}

.main-content {
  grid-area: main;
  overflow-y: auto;
  padding: var(--spacing-lg);
}

/* Collapsed state */
.main-layout[data-sidebar-collapsed] {
  grid-template-columns: var(--sidebar-collapsed-width, 48px) 1fr;
}

/* Mobile: sidebar becomes overlay */
@media (max-width: 768px) {
  .main-layout {
    grid-template-columns: 1fr;
    grid-template-areas: "main";
  }

  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100%;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
  }

  .main-layout[data-sidebar-open] .sidebar {
    transform: translateX(0);
  }
}
```

### Weight Distribution Editor

```typescript
// Pattern for multiple inputs that must sum to 100%
export class WeightEditor extends BaseComponent {
  private weights: Map<string, number> = new Map();

  protected template(): string {
    return `
      <div class="weight-editor">
        <div class="weights-list">
          <slot></slot>
        </div>
        <div class="controls">
          <button class="balance-btn">Balance Equally</button>
          <button class="clear-btn">Clear All</button>
        </div>
        <div class="total">
          Total: <span class="total-value">0</span>%
          <span class="validation"></span>
        </div>
      </div>
    `;
  }

  protected afterRender(): void {
    this.$('.balance-btn')?.addEventListener('click', () => this.balanceWeights());
    this.$('.clear-btn')?.addEventListener('click', () => this.clearWeights());

    // Listen for weight changes from child components
    this.addEventListener('weight-change', ((e: CustomEvent) => {
      this.weights.set(e.detail.asset, e.detail.weight);
      this.updateTotal();
    }) as EventListener);
  }

  private updateTotal(): void {
    const total = Array.from(this.weights.values()).reduce((a, b) => a + b, 0);
    const totalEl = this.$('.total-value');
    const validationEl = this.$('.validation');

    if (totalEl) totalEl.textContent = String(Math.round(total * 10) / 10);

    if (validationEl) {
      if (Math.abs(total - 100) < 0.01) {
        validationEl.textContent = '';
        validationEl.className = 'validation valid';
      } else {
        validationEl.textContent = total > 100 ? '(exceeds 100%)' : '(below 100%)';
        validationEl.className = 'validation invalid';
      }
    }
  }

  private balanceWeights(): void {
    const count = this.weights.size;
    if (count === 0) return;

    const equalWeight = 100 / count;
    this.weights.forEach((_, key) => this.weights.set(key, equalWeight));

    this.dispatchEvent(new CustomEvent('weights-balanced', {
      bubbles: true,
      composed: true,
      detail: { weights: Object.fromEntries(this.weights) }
    }));
  }

  private clearWeights(): void {
    this.weights.clear();
    this.updateTotal();
    this.dispatchEvent(new CustomEvent('weights-cleared', {
      bubbles: true,
      composed: true
    }));
  }
}
```

### Asset Selector with Search/Filter

```typescript
export class AssetSelector extends BaseComponent {
  static observedAttributes = ['assets', 'selected'];
  private filteredAssets: string[] = [];

  protected template(): string {
    return `
      <div class="asset-selector">
        <input type="search"
               placeholder="Search assets..."
               class="search-input"
               aria-label="Search available assets" />
        <ul class="asset-list" role="listbox" aria-label="Available assets">
          <!-- Populated dynamically -->
        </ul>
      </div>
    `;
  }

  protected styles(): string {
    return `
      .search-input {
        width: 100%;
        padding: var(--spacing-sm) var(--spacing-md);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-md);
        font-size: var(--font-size-md);
      }

      .asset-list {
        list-style: none;
        padding: 0;
        margin: var(--spacing-sm) 0 0;
        max-height: 200px;
        overflow-y: auto;
      }

      .asset-item {
        padding: var(--spacing-sm) var(--spacing-md);
        cursor: pointer;
        border-radius: var(--border-radius-sm);
      }

      .asset-item:hover {
        background: var(--surface-tertiary);
      }

      .asset-item[aria-selected="true"] {
        background: var(--color-primary);
        color: var(--text-inverse);
      }
    `;
  }

  protected afterRender(): void {
    const searchInput = this.$('.search-input') as HTMLInputElement;
    searchInput?.addEventListener('input', () => {
      this.filterAssets(searchInput.value);
    });
  }

  private filterAssets(query: string): void {
    const allAssets = JSON.parse(this.getAttribute('assets') || '[]');
    const lowerQuery = query.toLowerCase();

    this.filteredAssets = allAssets.filter((asset: string) =>
      asset.toLowerCase().includes(lowerQuery)
    );

    this.renderAssetList();
  }

  private renderAssetList(): void {
    const list = this.$('.asset-list');
    if (!list) return;

    list.innerHTML = this.filteredAssets.map(asset => `
      <li class="asset-item"
          role="option"
          data-asset="${asset}"
          aria-selected="false">
        ${asset}
      </li>
    `).join('');

    // Add click handlers
    this.$$('.asset-item').forEach(item => {
      item.addEventListener('click', () => {
        const asset = (item as HTMLElement).dataset.asset;
        this.dispatchEvent(new CustomEvent('asset-selected', {
          bubbles: true,
          composed: true,
          detail: { asset }
        }));
      });
    });
  }
}
```

## State of the Art (2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom modal JS | Native `<dialog>` | Safari 15.4 (2022) | Full browser support, accessible by default |
| jQuery toggles | `<details>/<summary>` | Always existed, underused | Zero JS for disclosure widgets |
| Manual focus trap | `<dialog>` focus management | 2022-2023 | Browser handles inert background |
| Global CSS frameworks | CSS custom properties + Shadow DOM | 2020+ mature | True encapsulation with theming |
| Polyfilled form elements | ElementInternals | Safari 16.4 (2023) | Native form integration for custom elements |
| Media queries for responsive | Container queries | 2023+ | Component-scoped responsive design |

**New patterns to consider:**
- **Container Queries:** Style components based on their container size, not viewport. Use `@container` for truly responsive components.
- **Popover API:** Native popover/dropdown without positioning libraries. Use `popover` attribute and `.showPopover()`.
- **CSS `:has()` selector:** Parent selection based on children. Style sidebar based on its contents.

**Deprecated/outdated:**
- **Polyfills for dialog/details:** All modern browsers support natively.
- **jQuery UI widgets:** Native elements + Web Components are lighter.
- **Framework-specific component libraries:** Prefer native + Web Components for portability.

## Open Questions

Things that couldn't be fully resolved.

1. **Complex searchable select with virtual scrolling**
   - What we know: Libraries like SlimSelect and Virtual Select handle large datasets (1000+ options)
   - What's unclear: Whether the asset list will be large enough to need virtual scrolling
   - **Recommendation:** Build simple search/filter first. Add virtual scrolling only if performance issues arise with actual data.

2. **Sidebar animation smoothness**
   - What we know: CSS Grid column transitions don't animate smoothly in all browsers
   - What's unclear: Whether to use Grid or absolute positioning for sidebar collapse
   - **Recommendation:** Use CSS Grid for layout, but animate using `transform` or `width` rather than `grid-template-columns`. Test across browsers.

3. **Form-associated elements browser support**
   - What we know: ElementInternals fully supported since Safari 16.4 (March 2023)
   - What's unclear: Whether older Safari users are in target audience
   - **Recommendation:** Use ElementInternals for new custom form controls. The PROJECT.md specifies "last 2 versions" which should have full support.

## Sources

### Primary (HIGH confidence)

- [MDN: `<dialog>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) - Authoritative reference for native dialogs
- [MDN: `<details>` element](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/details) - Native disclosure widget documentation
- [MDN: ElementInternals API](https://developer.mozilla.org/en-US/docs/Web/API/ElementInternals) - Form-associated custom elements
- [MDN: CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) - Design tokens through Shadow DOM
- [MDN: Using Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/API/Web_components/Using_shadow_DOM) - Shadow DOM events and styling
- [web.dev: Toast component pattern](https://web.dev/patterns/components/toast) - Accessible toast implementation

### Secondary (MEDIUM confidence)

- [CSS-Tricks: Multi-thumb slider](https://css-tricks.com/lets-make-a-multi-thumb-slider-that-calculates-the-width-between-thumbs/) - Weight distribution pattern
- [CSS-Tricks: Range input styling](https://css-tricks.com/styling-cross-browser-compatible-range-inputs-css/) - Cross-browser slider CSS
- [web.dev: Details and summary](https://web.dev/learn/html/details) - Comprehensive details/summary guide
- [Open-WC: Styles piercing Shadow DOM](https://open-wc.org/guides/knowledge/styling/styles-piercing-shadow-dom/) - CSS custom properties in Shadow DOM
- [Deque: Expand/Collapse accessibility](https://dequeuniversity.com/library/aria/expand-collapse-summary) - ARIA patterns for disclosure
- [Shadow DOM and events (javascript.info)](https://javascript.info/shadow-dom-events) - Event composed property explained

### Tertiary (LOW confidence)

- [DEV Community: Building Accessible Web Components](https://dev.to/adamgolan/building-accessible-web-components-a-deep-dive-into-aria-best-practices-2e7i) - ARIA best practices summary
- [jaredcunha.com: HTML dialog accessibility](https://jaredcunha.com/blog/html-dialog-getting-accessibility-and-ux-right) - Dialog UX considerations
- [Shoelace/Web Awesome](https://shoelace.style/) - Web Components library for reference patterns (not used directly)

## Metadata

**Confidence breakdown:**
- Native elements (dialog, details, dialog): HIGH - MDN authoritative source, universal browser support
- CSS custom properties + Shadow DOM: HIGH - Well-documented, widely used pattern
- Grid layout patterns: HIGH - Mature CSS spec, extensive documentation
- Form-associated elements: MEDIUM - Relatively new API, but well-supported in modern browsers
- Complex search/filter: LOW - May need experimentation with large datasets
- Animation/transitions: MEDIUM - Browser inconsistencies in CSS Grid animations

**Research date:** 2026-01-17
**Valid until:** ~60 days (stable patterns, native APIs unlikely to change)

---

## Appendix: Existing BaseComponent Methods

Phase 7 UI components extend `BaseComponent` from earlier phases. Available methods:

| Method | Purpose |
|--------|---------|
| `this.shadow` | ShadowRoot reference |
| `this.$()` | Query single element in shadow DOM |
| `this.$$()` | Query all elements in shadow DOM |
| `template()` | Override to return HTML template |
| `styles()` | Override to return CSS styles |
| `render()` | Re-render component (call on state change) |
| `afterRender()` | Hook for event listener attachment |
| `connectedCallback()` | Override for mount logic |
| `disconnectedCallback()` | Override for cleanup |
| `attributeChangedCallback()` | Override for attribute reactivity |

All UI components should use this pattern for consistency.
