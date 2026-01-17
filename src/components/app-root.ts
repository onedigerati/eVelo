import { BaseComponent } from './base-component';

export class AppRoot extends BaseComponent {
  protected template(): string {
    return `
      <div class="container">
        <h1>eVelo</h1>
        <p>Portfolio Strategy Simulator</p>
        <p class="status">Web Components working!</p>
      </div>
    `;
  }

  protected styles(): string {
    return `
      .container {
        font-family: system-ui, -apple-system, sans-serif;
        max-width: 800px;
        margin: 2rem auto;
        padding: 2rem;
        text-align: center;
      }
      h1 {
        color: #0d9488;
        margin-bottom: 0.5rem;
      }
      .status {
        color: #059669;
        font-weight: 500;
      }
    `;
  }
}

// Register the custom element
customElements.define('app-root', AppRoot);
