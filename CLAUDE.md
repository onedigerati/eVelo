# eVelo Project

## Development

Dev server is already running (`npm run dev`). Changes auto-reload.

## Build & Test

```bash
npm run build          # TypeScript compile + Vite build
npm run test:e2e       # Run all E2E tests
npm run test:e2e:smoke # Quick smoke test
```

## Project Structure

- `src/components/ui/` - UI components (TypeScript)
- `src/charts/` - Chart.js visualizations
- `src/simulation/` - Monte Carlo simulation engine
- `src/styles/` - CSS with design tokens

## Tech Stack

- Vite + TypeScript
- Chart.js for visualizations
- Dexie (IndexedDB) for storage
- Web Workers via Comlink

## Layout & Scrollbar Debugging

### Common Pitfall: Flex Child Width + Scrollbar Clipping

When a scrollable flex child uses `width: 100%`, the scrollbar can be clipped by a parent's `overflow: hidden`. The scrollbar is inside the element's `offsetWidth`, but the parent clips it.

**Problem pattern:**
```css
.parent { overflow: hidden; }
.child {
  flex: 1;
  width: 100%;      /* Problematic */
  overflow-y: auto;
}
```

**Fix:** Use `min-width: 0` instead of `width: 100%` for flex children:
```css
.child {
  flex: 1;
  min-width: 0;  /* Allows flex shrinking, no scrollbar clipping */
  overflow-y: auto;
}
```

### Debug Checklist for Invisible Scrollbars

1. Check `scrollHeight > clientHeight` (does overflow content exist?)
2. Check `offsetWidth - clientWidth` (does scrollbar have width?)
3. **Compare element `offsetWidth` to parent `offsetWidth`** (is child wider than parent?)
4. Check parent's `overflow` property (is it clipping?)
5. Try programmatic scroll (`element.scrollTop = 500`) to verify scrolling works

### Debug Utility

Use `src/utils/debug-layout.ts` for systematic debugging:

```javascript
// In browser console:
window.debugLayout.runLayoutDiagnostics();

// Or debug specific element through shadow DOM:
window.debugLayout.debugShadowElement('main-layout', ['.main-content']);
```

### Shadow DOM Debugging Notes

This project uses nested shadow DOM (app-root → main-layout → child components). DevTools doesn't clearly show parent-child width mismatches across shadow boundaries. Use the debug utility or manual console inspection:

```javascript
// Navigate through shadow DOM manually:
const mainLayout = document.querySelector('main-layout');
const mainContent = mainLayout.shadowRoot.querySelector('.main-content');
console.log('Content width:', mainContent.offsetWidth);
console.log('Parent width:', mainContent.parentElement.offsetWidth);
```
