/**
 * Portfolio Visualization Card Web Component
 *
 * A compact card displaying portfolio composition with:
 * - Left: Donut chart (120x120px) with center text showing "N ASSETS"
 * - Right: Horizontal asset bars sorted by weight descending
 *
 * @element portfolio-viz-card
 */
import { BaseComponent } from '../base-component';
import { Chart, DoughnutController, ArcElement, Tooltip } from 'chart.js/auto';

/**
 * Data for portfolio visualization card
 */
export interface PortfolioVizCardData {
  assets: Array<{
    symbol: string;
    name: string;
    weight: number;
    color: string;
  }>;
}

export class PortfolioVizCard extends BaseComponent {
  private _data: PortfolioVizCardData | null = null;
  private donutChart: Chart | null = null;

  /**
   * Set portfolio data and update visualization
   */
  set data(value: PortfolioVizCardData | null) {
    this._data = value;
    this.updateVisualization();
  }

  /**
   * Get portfolio data
   */
  get data(): PortfolioVizCardData | null {
    return this._data;
  }

  protected template(): string {
    return `
      <div class="portfolio-viz-card">
        <div class="card-header">
          <svg class="header-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
          <div class="header-text">
            <span class="header-title">Portfolio Composition</span>
            <span class="header-subtitle" id="asset-count">0 Assets</span>
          </div>
        </div>
        <div class="portfolio-content">
          <div class="donut-container">
            <canvas id="viz-donut"></canvas>
            <div class="donut-center" id="donut-center">0 ASSETS</div>
          </div>
          <div class="asset-bars-list" id="asset-bars">
            <!-- Horizontal bars populated dynamically -->
          </div>
        </div>
      </div>
    `;
  }

  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .portfolio-viz-card {
        background: #f0fdfa;
        border: 1px solid #99f6e4;
        border-radius: var(--radius-lg, 12px);
        padding: var(--spacing-md, 16px);
      }

      .card-header {
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        margin-bottom: var(--spacing-md, 16px);
        padding-bottom: var(--spacing-sm, 8px);
        border-bottom: 1px solid #99f6e4;
      }

      .header-icon {
        color: var(--color-primary, #0d9488);
      }

      .header-text {
        flex: 1;
      }

      .header-title {
        display: block;
        font-weight: 600;
        font-size: var(--font-size-md, 1rem);
        color: #1e293b; /* Force dark text on light accent background */
      }

      .header-subtitle {
        display: block;
        font-size: var(--font-size-sm, 0.875rem);
        color: #64748b; /* Force gray text on light accent background */
      }

      .portfolio-content {
        display: flex;
        gap: var(--spacing-lg, 24px);
        align-items: flex-start;
      }

      .donut-container {
        position: relative;
        width: 120px;
        height: 120px;
        flex-shrink: 0;
      }

      #viz-donut {
        width: 100%;
        height: 100%;
      }

      .donut-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        text-align: center;
        font-size: var(--font-size-xs, 0.75rem);
        font-weight: 700;
        color: #64748b; /* Force gray text on light accent background */
        pointer-events: none;
      }

      .asset-bars-list {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs, 4px);
        min-width: 0;
      }

      .asset-bar-row {
        position: relative;
        display: flex;
        align-items: center;
        gap: var(--spacing-sm, 8px);
        height: 28px;
        padding: 0 var(--spacing-sm, 8px);
        border-radius: var(--radius-sm, 4px);
        background: white;
        overflow: hidden;
      }

      .asset-bar-row::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: var(--bar-width, 0%);
        background: var(--bar-color, #0d9488);
        opacity: 0.15;
        border-radius: var(--radius-sm, 4px);
        z-index: 0;
      }

      .asset-bar-swatch {
        width: 12px;
        height: 12px;
        border-radius: var(--radius-xs, 2px);
        flex-shrink: 0;
        z-index: 1;
      }

      .asset-bar-name {
        flex: 1;
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 500;
        color: #1e293b; /* Force dark text on light accent background */
        z-index: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .asset-bar-percent {
        font-size: var(--font-size-sm, 0.875rem);
        font-weight: 600;
        color: #1e293b; /* Force dark text on light accent background */
        z-index: 1;
        flex-shrink: 0;
      }

      /* Responsive: stack on narrow widths */
      @media (max-width: 400px) {
        .portfolio-content {
          flex-direction: column;
          align-items: center;
        }

        .asset-bars-list {
          width: 100%;
        }
      }
    `;
  }

  override connectedCallback(): void {
    super.connectedCallback();
  }

  override disconnectedCallback(): void {
    if (this.donutChart) {
      this.donutChart.destroy();
      this.donutChart = null;
    }
    super.disconnectedCallback();
  }

  protected override afterRender(): void {
    // Register Chart.js components
    Chart.register(DoughnutController, ArcElement, Tooltip);
    this.initializeDonutChart();
    this.updateVisualization();
  }

  private initializeDonutChart(): void {
    const canvas = this.$('#viz-donut') as HTMLCanvasElement;
    if (!canvas) return;

    this.donutChart = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: [],
        datasets: [{
          data: [],
          backgroundColor: [],
          borderColor: '#ffffff',
          borderWidth: 2,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '70%',
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value = context.raw as number;
                return `${context.label}: ${value.toFixed(1)}%`;
              },
            },
          },
        },
      },
    });
  }

  private updateVisualization(): void {
    if (!this._data) return;

    const assets = this._data.assets;
    const count = assets.length;

    // Update asset count text
    const countEl = this.$('#asset-count');
    if (countEl) {
      countEl.textContent = `${count} Asset${count !== 1 ? 's' : ''}`;
    }

    // Update donut center text
    const centerEl = this.$('#donut-center');
    if (centerEl) {
      centerEl.textContent = `${count} ASSET${count !== 1 ? 'S' : ''}`;
    }

    // Update donut chart
    if (this.donutChart) {
      const labels = assets.map(a => a.name);
      const values = assets.map(a => a.weight);
      const colors = assets.map(a => a.color);

      this.donutChart.data.labels = labels;
      this.donutChart.data.datasets[0].data = values;
      this.donutChart.data.datasets[0].backgroundColor = colors;
      this.donutChart.update();
    }

    // Render horizontal bars - sorted by weight descending
    const sortedAssets = [...assets].sort((a, b) => b.weight - a.weight);
    const barsEl = this.$('#asset-bars');
    if (barsEl) {
      barsEl.innerHTML = sortedAssets.map(asset => `
        <div class="asset-bar-row" style="--bar-width: ${asset.weight}%; --bar-color: ${asset.color};">
          <div class="asset-bar-swatch" style="background-color: ${asset.color}"></div>
          <span class="asset-bar-name">${asset.name}</span>
          <span class="asset-bar-percent">${asset.weight.toFixed(1)}%</span>
        </div>
      `).join('');
    }
  }
}

// Register the custom element
customElements.define('portfolio-viz-card', PortfolioVizCard);
