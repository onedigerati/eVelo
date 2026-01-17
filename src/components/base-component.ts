/**
 * Base class for all Web Components in eVelo.
 * Provides Shadow DOM encapsulation and lifecycle helpers.
 */
export abstract class BaseComponent extends HTMLElement {
  protected shadow: ShadowRoot;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  /**
   * Called when component is added to DOM.
   * Override to add event listeners, fetch data, etc.
   */
  connectedCallback(): void {
    this.render();
  }

  /**
   * Called when component is removed from DOM.
   * Override to clean up event listeners, timers, etc.
   */
  disconnectedCallback(): void {
    // Override in subclass if needed
  }

  /**
   * Called when observed attributes change.
   */
  attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null
  ): void {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  /**
   * Override to define which attributes trigger re-render.
   */
  static get observedAttributes(): string[] {
    return [];
  }

  /**
   * Must be implemented by subclasses.
   * Returns the component's HTML template.
   */
  protected abstract template(): string;

  /**
   * Must be implemented by subclasses.
   * Returns the component's CSS styles.
   */
  protected abstract styles(): string;

  /**
   * Renders the component by updating shadow DOM.
   */
  protected render(): void {
    this.shadow.innerHTML = `
      <style>${this.styles()}</style>
      ${this.template()}
    `;
    this.afterRender();
  }

  /**
   * Called after render completes.
   * Override to attach event listeners to rendered elements.
   */
  protected afterRender(): void {
    // Override in subclass if needed
  }

  /**
   * Helper to query elements within shadow DOM.
   */
  protected $(selector: string): Element | null {
    return this.shadow.querySelector(selector);
  }

  /**
   * Helper to query all elements within shadow DOM.
   */
  protected $$(selector: string): NodeListOf<Element> {
    return this.shadow.querySelectorAll(selector);
  }
}
