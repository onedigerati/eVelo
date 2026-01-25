/**
 * Debug utilities for diagnosing layout and scrollbar issues.
 *
 * These utilities help debug complex layout problems, especially in nested
 * shadow DOM structures where DevTools inspection can be challenging.
 *
 * Usage in browser console:
 *   import('/src/utils/debug-layout.ts').then(m => m.debugScrollContainer('main-layout'))
 *
 * Or with shadow DOM path:
 *   import('/src/utils/debug-layout.ts').then(m =>
 *     m.debugShadowElement('main-layout', ['.main-area', '.main-content'])
 *   )
 */

export interface ScrollDebugInfo {
  element: HTMLElement;
  clientHeight: number;
  scrollHeight: number;
  isScrollable: boolean;
  offsetWidth: number;
  clientWidth: number;
  scrollbarWidth: number;
  overflowY: string;
  parent: {
    element: HTMLElement | null;
    offsetWidth: number;
    widthMismatch: number;
    isClipping: boolean;
  };
}

/**
 * Navigate through nested shadow DOMs to find an element.
 *
 * @param baseSelector - Selector for the initial element (or tag name for custom elements)
 * @param shadowSelectors - Array of selectors to traverse through shadow roots
 * @returns The found element or null
 *
 * @example
 * // Find .main-content inside main-layout's shadow DOM
 * const el = navigateShadowDOM('main-layout', ['.main-content']);
 *
 * @example
 * // Navigate through multiple shadow boundaries
 * const el = navigateShadowDOM('app-root', ['main-layout', '.main-area', '.main-content']);
 */
export function navigateShadowDOM(
  baseSelector: string,
  shadowSelectors: string[] = []
): HTMLElement | null {
  let element: Element | null = document.querySelector(baseSelector);

  for (const selector of shadowSelectors) {
    if (!element?.shadowRoot) {
      console.warn(`No shadow root found at:`, element);
      return null;
    }
    element = element.shadowRoot.querySelector(selector);
    if (!element) {
      console.warn(`Selector "${selector}" not found in shadow root`);
      return null;
    }
  }

  return element as HTMLElement | null;
}

/**
 * Debug a scroll container, checking for common issues like clipped scrollbars.
 *
 * @param element - The element to debug (HTMLElement or selector string)
 * @param shadowPath - Optional array of selectors to navigate shadow DOMs
 *
 * Key checks performed:
 * 1. Whether the element has scrollable content (scrollHeight > clientHeight)
 * 2. Scrollbar width (offsetWidth - clientWidth)
 * 3. Parent width comparison (detects clipped scrollbars)
 * 4. Parent overflow settings
 *
 * @example
 * // Debug by selector
 * debugScrollContainer('.main-content');
 *
 * @example
 * // Debug through shadow DOM
 * debugScrollContainer('main-layout', ['.main-content']);
 */
export function debugScrollContainer(
  element: HTMLElement | string,
  shadowPath?: string[]
): ScrollDebugInfo | null {
  let el: HTMLElement | null;

  if (typeof element === 'string') {
    el = shadowPath
      ? navigateShadowDOM(element, shadowPath)
      : (document.querySelector(element) as HTMLElement);
  } else {
    el = element;
  }

  if (!el) {
    console.error('Element not found');
    return null;
  }

  const parent = el.parentElement;
  const styles = getComputedStyle(el);
  const parentStyles = parent ? getComputedStyle(parent) : null;

  const info: ScrollDebugInfo = {
    element: el,
    clientHeight: el.clientHeight,
    scrollHeight: el.scrollHeight,
    isScrollable: el.scrollHeight > el.clientHeight,
    offsetWidth: el.offsetWidth,
    clientWidth: el.clientWidth,
    scrollbarWidth: el.offsetWidth - el.clientWidth,
    overflowY: styles.overflowY,
    parent: {
      element: parent,
      offsetWidth: parent?.offsetWidth ?? 0,
      widthMismatch: parent ? el.offsetWidth - parent.offsetWidth : 0,
      isClipping:
        parentStyles?.overflow === 'hidden' ||
        parentStyles?.overflowX === 'hidden',
    },
  };

  // Console output with visual grouping
  console.group('Scroll Container Debug');
  console.log('Element:', el);
  console.log('clientHeight:', info.clientHeight);
  console.log('scrollHeight:', info.scrollHeight);
  console.log('Is scrollable:', info.isScrollable);
  console.log('offsetWidth:', info.offsetWidth);
  console.log('clientWidth:', info.clientWidth);
  console.log('Scrollbar width:', info.scrollbarWidth);
  console.log('overflow-y:', info.overflowY);

  if (parent) {
    console.log('--- Parent ---');
    console.log('Parent:', parent);
    console.log('Parent offsetWidth:', info.parent.offsetWidth);
    console.log('Width mismatch:', info.parent.widthMismatch);
    console.log('Parent overflow:', parentStyles?.overflow);

    if (info.parent.widthMismatch > 0 && info.parent.isClipping) {
      console.warn(
        '⚠️ CHILD WIDER THAN PARENT with overflow:hidden - scrollbar may be clipped!'
      );
    }
  }
  console.groupEnd();

  return info;
}

/**
 * Debug an element within nested shadow DOMs.
 * Convenience wrapper around debugScrollContainer for shadow DOM traversal.
 *
 * @param baseSelector - Selector for the initial element
 * @param shadowSelectors - Array of selectors to traverse shadow roots
 *
 * @example
 * // Debug .main-content inside main-layout's shadow DOM
 * debugShadowElement('main-layout', ['.main-content']);
 */
export function debugShadowElement(
  baseSelector: string,
  shadowSelectors: string[]
): ScrollDebugInfo | null {
  const element = navigateShadowDOM(baseSelector, shadowSelectors);
  if (!element) return null;
  return debugScrollContainer(element);
}

/**
 * Run a comprehensive layout check on common problematic areas.
 * Useful for quick diagnosis of scroll/layout issues.
 *
 * @example
 * runLayoutDiagnostics();
 */
export function runLayoutDiagnostics(): void {
  console.group('Layout Diagnostics');

  // Check main-layout's scrollable areas
  const mainLayout = document.querySelector('main-layout');
  if (mainLayout?.shadowRoot) {
    console.log('=== Main Layout ===');

    const mainContent = mainLayout.shadowRoot.querySelector('.main-content');
    if (mainContent) {
      debugScrollContainer(mainContent as HTMLElement);
    }

    const sidebar = mainLayout.shadowRoot.querySelector('.sidebar');
    if (sidebar) {
      console.log('--- Sidebar ---');
      debugScrollContainer(sidebar as HTMLElement);
    }
  }

  console.groupEnd();
}

// Expose to window for console debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).debugLayout = {
    debugScrollContainer,
    debugShadowElement,
    navigateShadowDOM,
    runLayoutDiagnostics,
  };
  console.info(
    'Debug utilities loaded. Use window.debugLayout.runLayoutDiagnostics() or window.debugLayout.debugScrollContainer(...)'
  );
}
