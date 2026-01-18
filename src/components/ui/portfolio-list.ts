/**
 * Portfolio list component for displaying saved portfolios.
 *
 * Displays a list of saved portfolios with load/delete actions.
 * Dispatches events for parent components to handle portfolio loading.
 *
 * @element portfolio-list
 * @fires load-portfolio - Dispatched when user clicks load button
 */

import { BaseComponent } from '../base-component';
import { loadAllPortfolios, deletePortfolio } from '../../data/services/portfolio-service';
import type { PortfolioRecord } from '../../data/schemas/portfolio';

export class PortfolioList extends BaseComponent {
  private _portfolios: PortfolioRecord[] = [];

  override async connectedCallback(): Promise<void> {
    super.connectedCallback();
    await this.refresh();
  }

  /**
   * Refresh the portfolio list from IndexedDB.
   */
  async refresh(): Promise<void> {
    this._portfolios = await loadAllPortfolios();
    this.renderList();
  }

  protected template(): string {
    return `
      <div class="portfolio-list" id="list">
        <p class="empty-message">No saved portfolios</p>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .portfolio-list {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-sm, 8px);
      }

      .empty-message {
        color: var(--text-tertiary, #94a3b8);
        font-size: var(--font-size-sm, 0.875rem);
        text-align: center;
        padding: var(--spacing-md, 16px);
        margin: 0;
      }

      .portfolio-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--spacing-md, 16px);
        padding: var(--spacing-sm, 8px) var(--spacing-md, 16px);
        background: var(--surface-secondary, #f8fafc);
        border-radius: var(--radius-md, 6px);
        transition: background 0.2s;
      }

      .portfolio-item:hover {
        background: var(--surface-tertiary, #f1f5f9);
      }

      .portfolio-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
        flex: 1;
      }

      .portfolio-name {
        font-weight: 500;
        color: var(--text-primary, #1e293b);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .portfolio-meta {
        font-size: var(--font-size-xs, 0.75rem);
        color: var(--text-tertiary, #94a3b8);
      }

      .portfolio-actions {
        display: flex;
        gap: var(--spacing-xs, 4px);
        flex-shrink: 0;
      }

      .btn-load,
      .btn-delete {
        padding: var(--spacing-xs, 4px) var(--spacing-sm, 8px);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: var(--radius-sm, 4px);
        font-size: var(--font-size-xs, 0.75rem);
        font-family: inherit;
        cursor: pointer;
        transition: background 0.2s, border-color 0.2s;
        background: var(--surface-primary, #ffffff);
        color: var(--text-primary, #1e293b);
      }

      .btn-load:hover {
        background: var(--color-primary, #0d9488);
        color: var(--text-inverse, #ffffff);
        border-color: var(--color-primary, #0d9488);
      }

      .btn-delete {
        color: var(--color-error, #dc2626);
        border-color: var(--color-error-light, #fecaca);
      }

      .btn-delete:hover {
        background: var(--color-error, #dc2626);
        color: var(--text-inverse, #ffffff);
        border-color: var(--color-error, #dc2626);
      }

      .btn-load:focus-visible,
      .btn-delete:focus-visible {
        outline: 2px solid var(--color-primary, #0d9488);
        outline-offset: 2px;
      }
    `;
  }

  protected override afterRender(): void {
    const list = this.$('#list');
    list?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const id = parseInt(target.dataset.id || '', 10);

      if (target.classList.contains('btn-load') && !isNaN(id)) {
        this.dispatchEvent(new CustomEvent('load-portfolio', {
          detail: { id },
          bubbles: true,
          composed: true
        }));
      }

      if (target.classList.contains('btn-delete') && !isNaN(id)) {
        if (confirm('Delete this portfolio?')) {
          await deletePortfolio(id);
          await this.refresh();
        }
      }
    });
  }

  /**
   * Render the portfolio list from current data.
   */
  private renderList(): void {
    const list = this.$('#list') as HTMLElement;
    if (!list) return;

    if (this._portfolios.length === 0) {
      list.innerHTML = '<p class="empty-message">No saved portfolios</p>';
      return;
    }

    list.innerHTML = this._portfolios.map(p => `
      <div class="portfolio-item" data-id="${p.id}">
        <div class="portfolio-info">
          <span class="portfolio-name">${this.escapeHtml(p.name)}</span>
          <span class="portfolio-meta">${p.assets.length} assets · ${this.formatDate(p.modified)}</span>
        </div>
        <div class="portfolio-actions">
          <button class="btn-load" data-id="${p.id}">Load</button>
          <button class="btn-delete" data-id="${p.id}">Delete</button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Escape HTML to prevent XSS.
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Format ISO date string to friendly display.
   */
  private formatDate(isoString: string): string {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else {
        return date.toLocaleDateString();
      }
    } catch {
      return 'Unknown';
    }
  }
}

// Register the custom element
customElements.define('portfolio-list', PortfolioList);
