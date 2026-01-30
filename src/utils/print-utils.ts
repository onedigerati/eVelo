/**
 * Print utilities for exporting dashboard content to printable format.
 * Handles Chart.js image extraction, HTML generation, and print window management.
 */

/**
 * Chart images extracted from the dashboard.
 * Each property contains a base64 data URL or null if chart not found.
 */
export interface ChartImages {
  probabilityCone?: string | null;
  histogram?: string | null;
  sblocBalance?: string | null;
  marginCall?: string | null;
  bbdComparison?: string | null;
  comparisonLine?: string | null;
  cumulativeCosts?: string | null;
  terminalComparison?: string | null;
  sblocUtilization?: string | null;
}

/**
 * Key metrics for the print report summary.
 */
export interface KeyMetrics {
  initialValue: number;
  terminalValue: number;
  /** Success rate as a percentage (0-100), NOT a decimal */
  successRate: number;
  /** CAGR as a decimal (0.10 = 10%) */
  cagr: number;
  /** Annual withdrawal amount in dollars */
  annualWithdrawal: number;
  /** Withdrawal rate as percentage of initial value (0-100) */
  withdrawalRate: number;
}

/**
 * Simulation parameter summary for the print report.
 */
export interface ParamSummary {
  timeHorizon: number;
  iterations: number;
  inflationRate: number;
  sblocRate: number;
  maxLtv: number;
}

/**
 * Complete data structure for generating a printable report.
 */
export interface PrintableData {
  keyMetrics: KeyMetrics;
  paramSummary: ParamSummary;
  chartImages: ChartImages;
  timestamp: string;
}

/**
 * Extract a single chart image from a shadow DOM element.
 * Navigates the shadow DOM to find a chart component and exports it as a base64 image.
 *
 * @param shadowRoot - The shadow root to search within
 * @param selector - CSS selector for the chart element (e.g., '#cone-chart')
 * @returns Base64 data URL of the chart image, or null if not found
 */
export function extractChartImage(
  shadowRoot: ShadowRoot | null,
  selector: string
): string | null {
  if (!shadowRoot) return null;

  const chartElement = shadowRoot.querySelector(selector);
  if (!chartElement) return null;

  // Access the Chart.js instance stored on the custom element
  // Chart components in this codebase store the instance as a protected 'chart' property
  const chartInstance = (chartElement as any).chart;
  if (!chartInstance) return null;

  try {
    // Export as PNG with full quality
    // Chart.js v4+ API: toBase64Image(type, quality)
    return chartInstance.toBase64Image('image/png', 1.0);
  } catch (error) {
    console.warn(`Failed to extract chart image for ${selector}:`, error);
    return null;
  }
}

/**
 * Extract all chart images from the dashboard.
 * Iterates through known chart selectors and exports each as a base64 image.
 *
 * @param shadowRoot - The shadow root of the dashboard element to search within
 * @returns Object containing all extracted chart images
 */
export function extractAllChartImages(shadowRoot: ShadowRoot | null): ChartImages {
  if (!shadowRoot) {
    console.warn('extractAllChartImages: shadowRoot is null');
    return {};
  }

  // Map of chart property names to their DOM selectors
  const chartSelectors: Record<keyof ChartImages, string> = {
    probabilityCone: '#cone-chart',
    histogram: '#histogram-chart',
    sblocBalance: '#sbloc-balance-chart',
    marginCall: '#margin-call-chart',
    bbdComparison: '#bbd-comparison-chart',
    comparisonLine: '#comparison-line-chart',
    cumulativeCosts: '#cumulative-costs-chart',
    terminalComparison: '#terminal-comparison-chart',
    sblocUtilization: '#sbloc-utilization-chart',
  };

  const chartImages: ChartImages = {};

  for (const [key, selector] of Object.entries(chartSelectors)) {
    chartImages[key as keyof ChartImages] = extractChartImage(shadowRoot, selector);
  }

  return chartImages;
}

/**
 * Extract table HTML from a shadow DOM element.
 * Finds a table element and returns its outerHTML for inclusion in print output.
 *
 * @param shadowRoot - The shadow root to search within
 * @param selector - CSS selector for the table element
 * @returns HTML string of the table, or empty string if not found
 */
export function extractTableHtml(
  shadowRoot: ShadowRoot | null,
  selector: string
): string {
  if (!shadowRoot) return '';

  const tableElement = shadowRoot.querySelector(selector);
  if (!tableElement) return '';

  // Clone the table to avoid modifying the original
  const clone = tableElement.cloneNode(true) as HTMLElement;

  return clone.outerHTML;
}

/**
 * Generate a complete HTML document for printing.
 * Creates a standalone HTML page with inline CSS that renders charts as images
 * and is optimized for print output (always light theme, proper page breaks).
 *
 * @param data - Printable data including metrics, params, and chart images
 * @returns Complete HTML document string
 */
export function generatePrintHtml(data: PrintableData): string {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  /**
   * Format a decimal as percentage (0.10 -> "10.0%")
   */
  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  /**
   * Format a value that's already a percentage (80.34 -> "80.3%")
   */
  const formatPercentValue = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Build chart sections - only include charts that were successfully extracted
  const chartSections: string[] = [];

  if (data.chartImages.probabilityCone) {
    chartSections.push(`
      <section class="section">
        <h2>Portfolio Projection</h2>
        <img class="chart-image" src="${data.chartImages.probabilityCone}" alt="Probability cone chart showing portfolio value projections over time">
      </section>
    `);
  }

  if (data.chartImages.histogram) {
    chartSections.push(`
      <section class="section">
        <h2>Terminal Value Distribution</h2>
        <img class="chart-image" src="${data.chartImages.histogram}" alt="Histogram showing distribution of terminal portfolio values">
      </section>
    `);
  }

  if (data.chartImages.sblocBalance) {
    chartSections.push(`
      <section class="section">
        <h2>SBLOC Balance Projection</h2>
        <img class="chart-image" src="${data.chartImages.sblocBalance}" alt="Line chart showing SBLOC balance over time">
      </section>
    `);
  }

  if (data.chartImages.marginCall) {
    chartSections.push(`
      <section class="section">
        <h2>Margin Call Risk</h2>
        <img class="chart-image" src="${data.chartImages.marginCall}" alt="Chart showing margin call risk probability over time">
      </section>
    `);
  }

  if (data.chartImages.bbdComparison) {
    chartSections.push(`
      <section class="section">
        <h2>BBD vs Sell Strategy Comparison</h2>
        <img class="chart-image" src="${data.chartImages.bbdComparison}" alt="Bar chart comparing BBD and Sell strategies">
      </section>
    `);
  }

  if (data.chartImages.comparisonLine) {
    chartSections.push(`
      <section class="section">
        <h2>Strategy Comparison Over Time</h2>
        <img class="chart-image" src="${data.chartImages.comparisonLine}" alt="Line chart comparing strategies over time">
      </section>
    `);
  }

  if (data.chartImages.cumulativeCosts) {
    chartSections.push(`
      <section class="section">
        <h2>Cumulative Costs</h2>
        <img class="chart-image" src="${data.chartImages.cumulativeCosts}" alt="Chart showing cumulative costs over time">
      </section>
    `);
  }

  if (data.chartImages.terminalComparison) {
    chartSections.push(`
      <section class="section">
        <h2>Terminal Value Comparison</h2>
        <img class="chart-image" src="${data.chartImages.terminalComparison}" alt="Chart comparing terminal values across strategies">
      </section>
    `);
  }

  if (data.chartImages.sblocUtilization) {
    chartSections.push(`
      <section class="section">
        <h2>SBLOC Utilization</h2>
        <img class="chart-image" src="${data.chartImages.sblocUtilization}" alt="Chart showing SBLOC utilization over time">
      </section>
    `);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eVelo Simulation Report</title>
  <style>
    /* Reset and base */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      padding: 0.5in;
    }

    /* Header */
    .report-header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #0d9488;
    }
    .report-header h1 {
      font-size: 24pt;
      color: #0d9488;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .report-header .timestamp {
      font-size: 10pt;
      color: #64748b;
    }

    /* Sections */
    .section {
      margin-bottom: 24px;
      break-inside: avoid;
    }
    .section h2 {
      font-size: 14pt;
      color: #0d9488;
      margin-bottom: 12px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      font-weight: 600;
    }

    /* Metrics grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
    }
    .metric-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 16px;
    }
    .metric-label {
      font-size: 9pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 4px;
    }
    .metric-value {
      font-size: 16pt;
      font-weight: 700;
      color: #1e293b;
    }
    .metric-value.success { color: #059669; }
    .metric-value.warning { color: #d97706; }
    .metric-value.danger { color: #dc2626; }

    /* Parameters table */
    .params-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    .params-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .params-table td:first-child {
      font-weight: 500;
      color: #64748b;
      width: 50%;
    }
    .params-table td:last-child {
      font-weight: 600;
      color: #1e293b;
    }

    /* Chart images */
    .chart-image {
      max-width: 100%;
      height: auto;
      margin: 8px 0;
      border-radius: 4px;
    }

    /* Print action buttons (hidden when actually printing) */
    .print-actions {
      position: fixed;
      top: 16px;
      right: 16px;
      display: flex;
      gap: 8px;
      z-index: 1000;
    }
    .print-btn {
      background: #0d9488;
      color: white;
      border: none;
      padding: 12px 24px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }
    .print-btn:hover {
      background: #0f766e;
    }
    .print-btn.secondary {
      background: #64748b;
    }
    .print-btn.secondary:hover {
      background: #475569;
    }

    @media print {
      .print-actions { display: none; }
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }

    @page {
      size: letter portrait;
      margin: 0.75in;
    }
  </style>
</head>
<body>
  <div class="print-actions">
    <button class="print-btn" onclick="window.print()">Print Report</button>
    <button class="print-btn secondary" onclick="window.close()">Close</button>
  </div>

  <header class="report-header">
    <h1>eVelo Simulation Report</h1>
    <p class="timestamp">Generated: ${data.timestamp}</p>
  </header>

  <section class="section">
    <h2>Key Metrics</h2>
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-label">Initial Portfolio</div>
        <div class="metric-value">${formatCurrency(data.keyMetrics.initialValue)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Median Terminal Value</div>
        <div class="metric-value">${formatCurrency(data.keyMetrics.terminalValue)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Success Rate</div>
        <div class="metric-value ${data.keyMetrics.successRate >= 90 ? 'success' : data.keyMetrics.successRate >= 70 ? 'warning' : 'danger'}">${formatPercentValue(data.keyMetrics.successRate)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">CAGR</div>
        <div class="metric-value">${formatPercent(data.keyMetrics.cagr)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Annual Withdrawal</div>
        <div class="metric-value">${formatCurrency(data.keyMetrics.annualWithdrawal)}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Withdrawal Rate</div>
        <div class="metric-value">${formatPercentValue(data.keyMetrics.withdrawalRate)}</div>
      </div>
    </div>
  </section>

  <section class="section">
    <h2>Simulation Parameters</h2>
    <table class="params-table">
      <tr>
        <td>Time Horizon</td>
        <td>${data.paramSummary.timeHorizon} years</td>
      </tr>
      <tr>
        <td>Simulation Iterations</td>
        <td>${data.paramSummary.iterations.toLocaleString()}</td>
      </tr>
      <tr>
        <td>Expected Inflation Rate</td>
        <td>${formatPercent(data.paramSummary.inflationRate)}</td>
      </tr>
      <tr>
        <td>SBLOC Interest Rate</td>
        <td>${formatPercent(data.paramSummary.sblocRate)}</td>
      </tr>
      <tr>
        <td>Maximum LTV</td>
        <td>${formatPercent(data.paramSummary.maxLtv)}</td>
      </tr>
    </table>
  </section>

  ${chartSections.join('\n')}
</body>
</html>`;
}

/**
 * Open a new browser window with print-ready content.
 * Handles popup blocker detection and provides user feedback.
 *
 * @param htmlContent - Complete HTML document to display in the print window
 * @returns The opened window reference, or null if blocked
 */
export function openPrintWindow(htmlContent: string): Window | null {
  // Open a new window with specific dimensions for print preview
  const printWindow = window.open('', '_blank', 'width=900,height=700');

  if (!printWindow) {
    // Popup was blocked
    alert(
      'Unable to open print window. Please allow popups for this site to use the print feature.'
    );
    return null;
  }

  // Write the content to the new window
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Focus the window to bring it to front
  printWindow.focus();

  return printWindow;
}
