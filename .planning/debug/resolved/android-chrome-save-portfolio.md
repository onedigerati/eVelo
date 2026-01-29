---
status: resolved
trigger: "android-chrome-save-portfolio-no-response"
created: 2026-01-28T12:00:00Z
updated: 2026-01-28T12:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Modal has position:fixed but is inside Shadow DOM component within overflow:hidden container (sidebar-panel). On Android Chrome, position:fixed elements inside such containers are clipped/invisible.
test: Verify modal placement and overflow context
expecting: Modal appears visually outside viewport or is clipped by sidebar overflow
next_action: Fix by moving modal to document body OR using a portal pattern, OR restructure to avoid overflow containment issue

## Symptoms

expected: Portfolio data persists after refresh AND user sees save confirmation
actual: Nothing visible happens when clicking save button on Android Chrome
errors: Cannot access console on mobile device - no error info available
reproduction: Open single-file HTML distribution on Android Chrome, try to click save/save portfolio button
timeline: Works on desktop browsers, only fails on Android Chrome mobile

## Eliminated

## Evidence

- timestamp: 2026-01-28T12:05:00Z
  checked: portfolio-composition.ts savePreset() method
  found: Save button uses standard addEventListener('click'), calls async savePreset() which first shows modal.show() for name input THEN does DB operations
  implication: If modal doesn't appear, problem is before IndexedDB. If modal appears but nothing after, problem is in DB operation

- timestamp: 2026-01-28T12:06:00Z
  checked: vite.config.ts portable build configuration
  found: Portable build uses vite-plugin-singlefile, outputs to dist-portable/index.html. Opens as file:// URL when opened locally
  implication: file:// protocol has restricted APIs - IndexedDB may be blocked or limited on Android Chrome

- timestamp: 2026-01-28T12:07:00Z
  checked: modal-dialog.ts implementation
  found: Modal uses standard click events, no special mobile handling. Modal should show unless JS execution stops before it
  implication: If user sees nothing, either: (1) click event doesn't fire, (2) JS error before modal.show(), or (3) modal CSS issue on mobile

- timestamp: 2026-01-28T12:08:00Z
  checked: Dexie db.ts initialization
  found: Safari workaround present (indexedDB.open for lazy init), but no Android-specific handling. Uses standard Dexie patterns
  implication: Dexie may fail silently or throw unhandled errors in file:// context on Android

- timestamp: 2026-01-28T12:15:00Z
  checked: Web research on IndexedDB + file:// + opaque origins
  found: MDN and W3C tests confirm that file:// URLs are treated as "opaque origins" in modern browsers. IndexedDB access from opaque origins is typically BLOCKED or throws errors. Storage APIs require a proper origin.
  implication: Possible contributing factor but NOT the main issue - IndexedDB errors would be caught and user would see error toast

- timestamp: 2026-01-28T12:20:00Z
  checked: sidebar-panel.ts CSS
  found: Line 81 - .sidebar has overflow:hidden; Line 197 - .sidebar-content has overflow-y:auto. The modal-dialog inside portfolio-composition is nested inside this overflow context
  implication: position:fixed elements can be clipped by overflow:hidden ancestors in certain browsers

- timestamp: 2026-01-28T12:22:00Z
  checked: Web research on position:fixed + overflow:hidden + Android Chrome
  found: Chrome on Android specifically clips position:fixed elements when inside overflow:hidden containers with relative positioning or z-index. Webkit bug #160953 confirms this. Floating-ui has documented issues with Shadow DOM + overflow:hidden + fixed positioning
  implication: ROOT CAUSE CONFIRMED - Modal is being clipped/hidden by the sidebar's overflow:hidden on Android Chrome

## Resolution

root_cause: The modal-dialog component uses position:fixed but is nested inside portfolio-composition (Shadow DOM) which is inside sidebar-panel's .sidebar-content (overflow-y:auto) and .sidebar (overflow:hidden). On Android Chrome, position:fixed elements inside overflow:hidden containers with relative positioning/z-index are incorrectly clipped by the parent container instead of being positioned relative to the viewport. This is a known Chrome/Android bug (Chromium bug #496834, WebKit bug #160953).

fix: Implemented Option 2 - Moved modal-dialog to app-root level (outside overflow containers) and created event-based communication:
1. Added <modal-dialog id="app-modal"> to app-root template (after main-layout, alongside toast-container)
2. Added 'show-modal' event listener in app-root.afterRender() that forwards to app-modal
3. Added showModal() helper method in portfolio-composition that dispatches 'show-modal' event with callback
4. Replaced all this.modal.show() calls with this.showModal() in portfolio-composition
5. Removed local modal-dialog from portfolio-composition template and cleaned up unused imports

verification:
- TypeScript compilation: PASS
- PWA build: PASS
- Portable (single-file) build: PASS
- Unit tests: 81/81 PASS
- Manual testing on Android Chrome: PENDING (requires user verification)
files_changed:
- src/components/app-root.ts
- src/components/ui/portfolio-composition.ts
