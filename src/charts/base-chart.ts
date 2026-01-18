/**
 * Abstract base class for Chart.js-based Web Components.
 * Handles Shadow DOM integration and chart lifecycle management.
 */
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import { BaseComponent } from '../components/base-component';

// Register all Chart.js components (controllers, elements, scales, plugins)
Chart.register(...registerables);

// Register matrix chart components for heatmaps
Chart.register(MatrixController, MatrixElement);

/**
 * Abstract base class for chart components.
 *
 * Subclasses must implement:
 * - getChartConfig(): Returns Chart.js configuration
 *
 * The base class handles:
 * - Canvas creation in Shadow DOM
 * - Chart instantiation after render
 * - Chart destruction on disconnect
 * - Data updates without full re-render
 */
export abstract class BaseChart extends BaseComponent {
  /** The Chart.js instance, null before first render */
  protected chart: Chart | null = null;

  /**
   * Returns the Chart.js configuration for this chart.
   * Subclasses implement to define chart type, data, and options.
   */
  protected abstract getChartConfig(): ChartConfiguration;

  /**
   * Base template providing canvas container.
   * Subclasses can override to add additional elements.
   */
  protected template(): string {
    return `
      <div class="chart-container">
        <canvas id="chart-canvas"></canvas>
      </div>
    `;
  }

  /**
   * Base styles for chart container.
   * Subclasses can extend by calling super.styles() and appending.
   */
  protected styles(): string {
    return `
      :host {
        display: block;
      }

      .chart-container {
        position: relative;
        width: 100%;
        height: 100%;
      }

      canvas {
        width: 100% !important;
        height: 100% !important;
      }
    `;
  }

  /**
   * Creates the Chart.js instance after DOM is ready.
   * Called automatically by BaseComponent after render().
   */
  protected afterRender(): void {
    const canvas = this.$('#chart-canvas') as HTMLCanvasElement | null;
    if (!canvas) {
      console.error('BaseChart: canvas element not found');
      return;
    }

    // Get 2D context - Chart.js requires this
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('BaseChart: could not get 2D context');
      return;
    }

    // Create the chart with subclass configuration
    const config = this.getChartConfig();
    this.chart = new Chart(ctx, config);
  }

  /**
   * Clean up chart instance when component is removed from DOM.
   * Prevents memory leaks from orphaned Chart.js instances.
   */
  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  /**
   * Update chart data without full re-render.
   * More efficient than calling render() for data-only changes.
   *
   * @param data - New data object matching Chart.js data structure
   * @param animate - Whether to animate the transition (default: true)
   */
  protected updateData(data: Chart['data'], animate: boolean = true): void {
    if (!this.chart) {
      console.warn('BaseChart.updateData: chart not initialized');
      return;
    }

    this.chart.data = data;
    this.chart.update(animate ? 'default' : 'none');
  }

  /**
   * Update chart options without full re-render.
   *
   * @param options - New options object (will be merged)
   */
  protected updateOptions(options: Partial<ChartConfiguration['options']>): void {
    if (!this.chart) {
      console.warn('BaseChart.updateOptions: chart not initialized');
      return;
    }

    Object.assign(this.chart.options, options);
    this.chart.update();
  }

  /**
   * Force chart resize recalculation.
   * Call when container size changes programmatically.
   */
  protected resize(): void {
    if (this.chart) {
      this.chart.resize();
    }
  }
}
