/**
 * Print utilities for exporting dashboard content to printable format.
 * Extracts actual rendered content from the dashboard DOM and generates
 * a high-fidelity print-ready HTML document matching the dashboard style.
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
 * Key metrics extracted from the banner cards.
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
 * Hero banner data extracted from key-metrics-banner.
 */
export interface HeroBannerData {
  title: string;
  isSuccess: boolean;
  alertTitle: string;
  alertDescription: string;
  logoBase64: string | null;
}

/**
 * Strategy card data extracted from key-metrics-banner.
 */
export interface StrategyCardData {
  bbdSuccessRate: string;
  vsSellSuccess: string;
  sellSuccessRate: string;
  medianUtilization: string;
  yearsAbove70: string;
  footerText: string;
  isGood: boolean;
}

/**
 * Growth card data extracted from key-metrics-banner.
 */
export interface GrowthCardData {
  cagr: string;
  startingValue: string;
  medianTerminal: string;
  vsSellTerminal: string;
  sellTerminal: string;
  p10Outcome: string;
}

/**
 * Safety card data extracted from key-metrics-banner.
 */
export interface SafetyCardData {
  marginCallProbability: string;
  peakUtilization: string;
  safetyBuffer: string;
  mostDangerousYear: string;
  footerText: string;
  isGood: boolean;
}

/**
 * Summary statistics extracted from the stats grid.
 */
export interface SummaryStats {
  median: string;
  successRate: string;
  cagr: string;
  twrr: string;
  mean: string;
  volatility: string;
  stddev: string;
  salaryEquiv: string;
}

/**
 * Percentile spectrum data.
 */
export interface SpectrumData {
  title: string;
  p10: string;
  p50: string;
  p90: string;
}

/**
 * Portfolio asset data for print.
 */
export interface PortfolioAssetData {
  name: string;
  weight: string;
  color: string;
}

/**
 * Portfolio composition data from param-summary.
 */
export interface PortfolioCompositionData {
  assetCount: string;
  assets: PortfolioAssetData[];
  donutChartImage: string | null;
  startingPortfolio: string;
  timeHorizon: string;
  annualWithdrawal: string;
  withdrawalGrowth: string;
  sblocInterestRate: string;
  maxBorrowing: string;
  maintenanceMargin: string;
  simulationsRun: string;
}

/**
 * Strategy analysis data.
 */
export interface StrategyAnalysisData {
  verdict: string;
  verdictDescription: string;
  bbdTerminal: string;
  sellTerminal: string;
  taxSavings: string;
  wealthAdvantage: string;
}

/**
 * Complete extracted dashboard data for printing.
 */
export interface ExtractedDashboardData {
  heroBanner: HeroBannerData;
  strategyCard: StrategyCardData;
  growthCard: GrowthCardData;
  safetyCard: SafetyCardData;
  summaryStats: SummaryStats;
  netWorthSpectrum: SpectrumData | null;
  debtSpectrum: SpectrumData | null;
  strategyAnalysis: StrategyAnalysisData | null;
  portfolioComposition: PortfolioCompositionData | null;
  chartImages: ChartImages;
  paramSummary: ParamSummary;
  timestamp: string;
  hasSblocData: boolean;
}

/**
 * Legacy interface for backward compatibility.
 */
export interface PrintableData {
  keyMetrics: KeyMetrics;
  paramSummary: ParamSummary;
  chartImages: ChartImages;
  timestamp: string;
}

/**
 * Extract text content from a shadow DOM element safely.
 */
function extractText(shadowRoot: ShadowRoot | null, selector: string): string {
  if (!shadowRoot) return '';
  const el = shadowRoot.querySelector(selector);
  return el?.textContent?.trim() || '';
}

/**
 * Check if an element has a specific class.
 */
function hasClass(shadowRoot: ShadowRoot | null, selector: string, className: string): boolean {
  if (!shadowRoot) return false;
  const el = shadowRoot.querySelector(selector);
  return el?.classList.contains(className) || false;
}

/**
 * Extract a single chart image from a shadow DOM element.
 */
export function extractChartImage(
  shadowRoot: ShadowRoot | null,
  selector: string
): string | null {
  if (!shadowRoot) return null;

  const chartElement = shadowRoot.querySelector(selector);
  if (!chartElement) return null;

  // Access the Chart.js instance stored on the custom element
  const chartInstance = (chartElement as any).chart;
  if (!chartInstance) return null;

  try {
    return chartInstance.toBase64Image('image/png', 1.0);
  } catch (error) {
    console.warn(`Failed to extract chart image for ${selector}:`, error);
    return null;
  }
}

/**
 * Extract all chart images from the dashboard shadow root.
 */
export function extractAllChartImages(shadowRoot: ShadowRoot | null): ChartImages {
  if (!shadowRoot) {
    console.warn('extractAllChartImages: shadowRoot is null');
    return {};
  }

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
 * Extract all dashboard data from the rendered DOM.
 */
export function extractDashboardData(
  dashboardShadowRoot: ShadowRoot,
  config: { initialValue: number; timeHorizon: number; iterations: number; inflationRate: number; sbloc?: { interestRate: number; targetLTV: number; annualWithdrawal: number } }
): ExtractedDashboardData {
  // Get key-metrics-banner shadow root
  const keyMetricsBanner = dashboardShadowRoot.querySelector('#key-metrics-banner');
  const bannerShadow = keyMetricsBanner?.shadowRoot || null;

  // Extract logo as base64 from hero banner
  let logoBase64: string | null = null;
  if (bannerShadow) {
    const logoImg = bannerShadow.querySelector('#hero-logo') as HTMLImageElement;
    if (logoImg && logoImg.src) {
      // If it's already a data URL, use it directly
      if (logoImg.src.startsWith('data:')) {
        logoBase64 = logoImg.src;
      } else {
        // Try to extract from canvas
        try {
          const canvas = document.createElement('canvas');
          canvas.width = logoImg.naturalWidth || 100;
          canvas.height = logoImg.naturalHeight || 100;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(logoImg, 0, 0);
            logoBase64 = canvas.toDataURL('image/png');
          }
        } catch {
          // Cross-origin restriction, use fallback
          logoBase64 = null;
        }
      }
    }
  }

  // Extract hero banner
  const heroBanner: HeroBannerData = {
    title: extractText(bannerShadow, '#hero-title'),
    isSuccess: hasClass(bannerShadow, '#hero-banner', 'success'),
    alertTitle: extractText(bannerShadow, '#alert-title'),
    alertDescription: extractText(bannerShadow, '#alert-description'),
    logoBase64,
  };

  // Extract strategy card
  const strategyCard: StrategyCardData = {
    bbdSuccessRate: extractText(bannerShadow, '#bbd-success'),
    vsSellSuccess: extractText(bannerShadow, '#vs-sell-success'),
    sellSuccessRate: extractText(bannerShadow, '#sell-success-rate'),
    medianUtilization: extractText(bannerShadow, '#median-utilization'),
    yearsAbove70: extractText(bannerShadow, '#years-above-70'),
    footerText: extractText(bannerShadow, '#strategy-footer-text'),
    isGood: hasClass(bannerShadow, '#strategy-accent', 'accent-green'),
  };

  // Extract growth card
  const growthCard: GrowthCardData = {
    cagr: extractText(bannerShadow, '#cagr'),
    startingValue: extractText(bannerShadow, '#starting-value'),
    medianTerminal: extractText(bannerShadow, '#median-terminal'),
    vsSellTerminal: extractText(bannerShadow, '#vs-sell-terminal'),
    sellTerminal: extractText(bannerShadow, '#sell-terminal'),
    p10Outcome: extractText(bannerShadow, '#p10-outcome'),
  };

  // Extract safety card
  const safetyCard: SafetyCardData = {
    marginCallProbability: extractText(bannerShadow, '#margin-call-prob'),
    peakUtilization: extractText(bannerShadow, '#peak-utilization'),
    safetyBuffer: extractText(bannerShadow, '#safety-buffer'),
    mostDangerousYear: extractText(bannerShadow, '#dangerous-year'),
    footerText: extractText(bannerShadow, '#safety-footer-text'),
    isGood: hasClass(bannerShadow, '#safety-accent', 'accent-green'),
  };

  // Extract summary statistics
  const summaryStats: SummaryStats = {
    median: extractText(dashboardShadowRoot, '#stat-median'),
    successRate: extractText(dashboardShadowRoot, '#stat-success'),
    cagr: extractText(dashboardShadowRoot, '#stat-cagr'),
    twrr: extractText(dashboardShadowRoot, '#stat-twrr'),
    mean: extractText(dashboardShadowRoot, '#stat-mean'),
    volatility: extractText(dashboardShadowRoot, '#stat-volatility'),
    stddev: extractText(dashboardShadowRoot, '#stat-stddev'),
    salaryEquiv: extractText(dashboardShadowRoot, '#stat-salary'),
  };

  // Extract net worth spectrum - use correct selectors from percentile-spectrum component
  const netWorthSpectrumEl = dashboardShadowRoot.querySelector('#net-worth-spectrum');
  const netWorthShadow = netWorthSpectrumEl?.shadowRoot || null;
  const netWorthSpectrum: SpectrumData | null = netWorthShadow ? {
    title: 'Terminal Net Worth Distribution',
    p10: extractText(netWorthShadow, '#p10-value'),
    p50: extractText(netWorthShadow, '#p50-value'),
    p90: extractText(netWorthShadow, '#p90-value'),
  } : null;

  // Extract debt spectrum (SBLOC) - use correct selectors
  const debtSpectrumEl = dashboardShadowRoot.querySelector('#debt-spectrum');
  const debtShadow = debtSpectrumEl?.shadowRoot || null;
  const debtSpectrum: SpectrumData | null = debtShadow ? {
    title: 'LOC Balance Distribution',
    p10: extractText(debtShadow, '#p10-value'),
    p50: extractText(debtShadow, '#p50-value'),
    p90: extractText(debtShadow, '#p90-value'),
  } : null;

  // Extract strategy analysis
  const strategyAnalysisEl = dashboardShadowRoot.querySelector('#strategy-analysis');
  const strategyShadow = strategyAnalysisEl?.shadowRoot || null;
  const strategyAnalysis: StrategyAnalysisData | null = strategyShadow ? {
    verdict: extractText(strategyShadow, '.verdict-title'),
    verdictDescription: extractText(strategyShadow, '.verdict-description'),
    bbdTerminal: extractText(strategyShadow, '#bbd-terminal'),
    sellTerminal: extractText(strategyShadow, '#sell-terminal'),
    taxSavings: extractText(strategyShadow, '#tax-savings'),
    wealthAdvantage: extractText(strategyShadow, '#wealth-advantage'),
  } : null;

  // Check if SBLOC sections are visible
  const sblocSection = dashboardShadowRoot.querySelector('.sbloc-section.visible');
  const hasSblocData = sblocSection !== null;

  // Extract chart images
  const chartImages = extractAllChartImages(dashboardShadowRoot);

  // Extract portfolio composition from param-summary
  const paramSummaryEl = dashboardShadowRoot.querySelector('#param-summary');
  const paramSummaryShadow = paramSummaryEl?.shadowRoot || null;
  let portfolioComposition: PortfolioCompositionData | null = null;

  if (paramSummaryShadow) {
    // Extract asset bars
    const assetBars = paramSummaryShadow.querySelectorAll('.asset-bar-row');
    const assets: PortfolioAssetData[] = [];
    assetBars.forEach((bar) => {
      const name = bar.querySelector('.asset-bar-name')?.textContent?.trim() || '';
      const weight = bar.querySelector('.asset-bar-percent')?.textContent?.trim() || '';
      const swatch = bar.querySelector('.asset-bar-swatch') as HTMLElement;
      const color = swatch?.style.backgroundColor || '#0d9488';
      if (name) {
        assets.push({ name, weight, color });
      }
    });

    // Extract donut chart as base64
    let donutChartImage: string | null = null;
    const paramSummaryComponent = paramSummaryEl as any;
    if (paramSummaryComponent?.donutChart) {
      try {
        donutChartImage = paramSummaryComponent.donutChart.toBase64Image('image/png', 1.0);
      } catch {
        donutChartImage = null;
      }
    }

    portfolioComposition = {
      assetCount: extractText(paramSummaryShadow, '#asset-count'),
      assets,
      donutChartImage,
      startingPortfolio: extractText(paramSummaryShadow, '#starting-portfolio'),
      timeHorizon: extractText(paramSummaryShadow, '#time-horizon'),
      annualWithdrawal: extractText(paramSummaryShadow, '#annual-withdrawal'),
      withdrawalGrowth: extractText(paramSummaryShadow, '#withdrawal-growth'),
      sblocInterestRate: extractText(paramSummaryShadow, '#sbloc-interest'),
      maxBorrowing: extractText(paramSummaryShadow, '#max-borrowing'),
      maintenanceMargin: extractText(paramSummaryShadow, '#maintenance-margin'),
      simulationsRun: extractText(paramSummaryShadow, '#simulations-run'),
    };
  }

  return {
    heroBanner,
    strategyCard,
    growthCard,
    safetyCard,
    summaryStats,
    netWorthSpectrum,
    debtSpectrum,
    strategyAnalysis,
    portfolioComposition,
    chartImages,
    paramSummary: {
      timeHorizon: config.timeHorizon,
      iterations: config.iterations,
      inflationRate: config.inflationRate,
      sblocRate: config.sbloc?.interestRate || 0,
      maxLtv: config.sbloc?.targetLTV || 0,
    },
    timestamp: new Date().toLocaleString(),
    hasSblocData,
  };
}

/**
 * Generate high-fidelity print HTML matching the dashboard style.
 */
export function generatePrintHtmlFromDashboard(data: ExtractedDashboardData): string {
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  // Build chart sections
  const chartSections: string[] = [];

  if (data.chartImages.probabilityCone) {
    chartSections.push(`
      <section class="chart-section">
        <h3>Portfolio Projection</h3>
        <div class="chart-wrapper">
          <img class="chart-image" src="${data.chartImages.probabilityCone}" alt="Portfolio value projection over time">
        </div>
      </section>
    `);
  }

  if (data.chartImages.histogram) {
    chartSections.push(`
      <section class="chart-section">
        <h3>Terminal Value Distribution</h3>
        <div class="chart-wrapper">
          <img class="chart-image" src="${data.chartImages.histogram}" alt="Distribution of terminal portfolio values">
        </div>
      </section>
    `);
  }

  // SBLOC charts (only if data exists)
  if (data.hasSblocData) {
    if (data.chartImages.marginCall) {
      chartSections.push(`
        <section class="chart-section">
          <h3>Margin Call Risk by Year</h3>
          <div class="chart-wrapper">
            <img class="chart-image" src="${data.chartImages.marginCall}" alt="Margin call probability by year">
          </div>
        </section>
      `);
    }

    if (data.chartImages.sblocBalance) {
      chartSections.push(`
        <section class="chart-section">
          <h3>SBLOC Balance Over Time</h3>
          <div class="chart-wrapper">
            <img class="chart-image" src="${data.chartImages.sblocBalance}" alt="SBLOC balance trajectory">
          </div>
        </section>
      `);
    }

    if (data.chartImages.bbdComparison) {
      chartSections.push(`
        <section class="chart-section">
          <h3>BBD vs Sell Strategy Comparison</h3>
          <div class="chart-wrapper">
            <img class="chart-image" src="${data.chartImages.bbdComparison}" alt="BBD vs Sell strategy comparison">
          </div>
        </section>
      `);
    }

    if (data.chartImages.comparisonLine) {
      chartSections.push(`
        <section class="chart-section half-width">
          <h3>Net Worth Over Time (Median)</h3>
          <div class="chart-wrapper">
            <img class="chart-image" src="${data.chartImages.comparisonLine}" alt="Net worth comparison over time">
          </div>
        </section>
      `);
    }

    if (data.chartImages.cumulativeCosts) {
      chartSections.push(`
        <section class="chart-section half-width">
          <h3>Cumulative Costs: Taxes vs Interest</h3>
          <div class="chart-wrapper">
            <img class="chart-image" src="${data.chartImages.cumulativeCosts}" alt="Cumulative costs comparison">
          </div>
        </section>
      `);
    }

    if (data.chartImages.terminalComparison) {
      chartSections.push(`
        <section class="chart-section">
          <h3>Terminal Value Distribution (All Percentiles)</h3>
          <div class="chart-wrapper short">
            <img class="chart-image" src="${data.chartImages.terminalComparison}" alt="Terminal value comparison across percentiles">
          </div>
        </section>
      `);
    }

    if (data.chartImages.sblocUtilization) {
      chartSections.push(`
        <section class="chart-section">
          <h3>SBLOC Utilization Over Time</h3>
          <div class="chart-wrapper">
            <img class="chart-image" src="${data.chartImages.sblocUtilization}" alt="SBLOC utilization over time">
          </div>
        </section>
      `);
    }
  }

  // Strategy analysis section
  const strategyAnalysisSection = data.strategyAnalysis ? `
    <section class="strategy-section">
      <h3>Strategy Analysis</h3>
      <div class="verdict-banner ${data.strategyAnalysis.verdict.toLowerCase().includes('bbd') ? 'verdict-bbd' : 'verdict-sell'}">
        <div class="verdict-title">${data.strategyAnalysis.verdict}</div>
        <div class="verdict-description">${data.strategyAnalysis.verdictDescription}</div>
      </div>
      <div class="strategy-metrics">
        <div class="strategy-metric">
          <span class="metric-label">BBD Terminal Value</span>
          <span class="metric-value">${data.strategyAnalysis.bbdTerminal}</span>
        </div>
        <div class="strategy-metric">
          <span class="metric-label">Sell Terminal Value</span>
          <span class="metric-value">${data.strategyAnalysis.sellTerminal}</span>
        </div>
        <div class="strategy-metric">
          <span class="metric-label">Tax Savings</span>
          <span class="metric-value positive">${data.strategyAnalysis.taxSavings}</span>
        </div>
        <div class="strategy-metric">
          <span class="metric-label">Wealth Advantage</span>
          <span class="metric-value ${data.strategyAnalysis.wealthAdvantage.startsWith('+') ? 'positive' : 'negative'}">${data.strategyAnalysis.wealthAdvantage}</span>
        </div>
      </div>
    </section>
  ` : '';

  // Net worth spectrum section
  const netWorthSpectrumSection = data.netWorthSpectrum ? `
    <section class="spectrum-section">
      <h3>${data.netWorthSpectrum.title}</h3>
      <div class="spectrum-bar">
        <div class="spectrum-gradient"></div>
        <div class="spectrum-labels">
          <div class="spectrum-item pessimistic">
            <span class="label">P10 (Pessimistic)</span>
            <span class="value">${data.netWorthSpectrum.p10}</span>
          </div>
          <div class="spectrum-item median">
            <span class="label">P50 (Median)</span>
            <span class="value">${data.netWorthSpectrum.p50}</span>
          </div>
          <div class="spectrum-item optimistic">
            <span class="label">P90 (Optimistic)</span>
            <span class="value">${data.netWorthSpectrum.p90}</span>
          </div>
        </div>
      </div>
    </section>
  ` : '';

  // Debt spectrum section (SBLOC only)
  const debtSpectrumSection = data.hasSblocData && data.debtSpectrum ? `
    <section class="spectrum-section">
      <h3>${data.debtSpectrum.title}</h3>
      <div class="spectrum-bar debt">
        <div class="spectrum-gradient debt"></div>
        <div class="spectrum-labels">
          <div class="spectrum-item pessimistic">
            <span class="label">P10 (Best Case)</span>
            <span class="value">${data.debtSpectrum.p10}</span>
          </div>
          <div class="spectrum-item median">
            <span class="label">P50 (Median)</span>
            <span class="value">${data.debtSpectrum.p50}</span>
          </div>
          <div class="spectrum-item optimistic">
            <span class="label">P90 (Worst Case)</span>
            <span class="value">${data.debtSpectrum.p90}</span>
          </div>
        </div>
      </div>
    </section>
  ` : '';

  // Portfolio composition section
  const portfolioCompositionSection = data.portfolioComposition ? (() => {
    const pc = data.portfolioComposition;
    const maxWeight = pc.assets.length > 0
      ? Math.max(...pc.assets.map(a => parseFloat(a.weight) || 0))
      : 100;

    const assetBarsHtml = pc.assets.map(asset => {
      const weight = parseFloat(asset.weight) || 0;
      const relativeWidth = (weight / maxWeight) * 100;
      return `
        <div class="asset-bar" style="--bar-width: ${relativeWidth}%; --bar-color: ${asset.color};">
          <div class="asset-swatch" style="background-color: ${asset.color}"></div>
          <span class="asset-name">${asset.name}</span>
          <span class="asset-weight">${asset.weight}</span>
        </div>
      `;
    }).join('');

    return `
    <div class="portfolio-section">
      <div class="portfolio-header">
        <div class="portfolio-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a10 10 0 0 1 10 10"></path>
          </svg>
        </div>
        <div>
          <div class="portfolio-title">Portfolio Composition</div>
          <div class="portfolio-subtitle">${pc.assetCount}</div>
        </div>
      </div>
      <div class="portfolio-content">
        ${pc.donutChartImage ? `
          <div class="portfolio-donut">
            <img src="${pc.donutChartImage}" alt="Portfolio allocation donut chart" />
          </div>
        ` : ''}
        <div class="asset-bars">
          ${assetBarsHtml}
        </div>
      </div>
      <div class="portfolio-params">
        <div class="portfolio-param">
          <span class="label">STARTING PORTFOLIO</span>
          <span class="value">${pc.startingPortfolio}</span>
        </div>
        <div class="portfolio-param">
          <span class="label">TIME HORIZON</span>
          <span class="value">${pc.timeHorizon}</span>
        </div>
        <div class="portfolio-param">
          <span class="label">ANNUAL WITHDRAWAL</span>
          <span class="value">${pc.annualWithdrawal}</span>
        </div>
        <div class="portfolio-param">
          <span class="label">WITHDRAWAL GROWTH</span>
          <span class="value">${pc.withdrawalGrowth}</span>
        </div>
        <div class="portfolio-param">
          <span class="label">SBLOC INTEREST RATE</span>
          <span class="value">${pc.sblocInterestRate}</span>
        </div>
        <div class="portfolio-param">
          <span class="label">MAX BORROWING</span>
          <span class="value">${pc.maxBorrowing}</span>
        </div>
        <div class="portfolio-param">
          <span class="label">MAINTENANCE MARGIN</span>
          <span class="value">${pc.maintenanceMargin}</span>
        </div>
        <div class="portfolio-param">
          <span class="label">SIMULATIONS RUN</span>
          <span class="value">${pc.simulationsRun}</span>
        </div>
      </div>
    </div>
    `;
  })() : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eVelo Simulation Report</title>
  <style>
    /* Reset */
    * { box-sizing: border-box; margin: 0; padding: 0; }

    /* Base */
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10pt;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      padding: 0.5in;
    }

    /* Print buttons */
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
    }
    .print-btn:hover { background: #0f766e; }
    .print-btn.secondary { background: #64748b; }
    .print-btn.secondary:hover { background: #475569; }

    @media print {
      .print-actions { display: none; }
      body { padding: 0; }
      section { page-break-inside: avoid; }
    }

    @page {
      size: letter portrait;
      margin: 0.5in;
    }

    /* Header */
    .report-header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 3px solid #0d9488;
    }
    .report-header h1 {
      font-size: 22pt;
      color: #0d9488;
      margin-bottom: 4px;
      font-weight: 700;
    }
    .report-header .timestamp {
      font-size: 9pt;
      color: #64748b;
    }

    /* Hero Banner */
    .hero-banner {
      position: relative;
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      color: white;
      padding: 20px 24px;
      border-radius: 12px;
      text-align: center;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .hero-banner.warning {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    .hero-watermark {
      position: absolute;
      right: -30px;
      top: 50%;
      transform: translateY(-50%);
      width: 120px;
      height: 120px;
      opacity: 0.15;
      pointer-events: none;
    }
    .hero-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      margin-bottom: 8px;
    }
    .hero-icon img {
      width: 32px;
      height: 32px;
    }
    .hero-icon .emoji {
      font-size: 28px;
    }
    .hero-banner .hero-title {
      font-size: 18pt;
      font-weight: 700;
    }
    .hero-banner .hero-subtitle {
      font-size: 10pt;
      opacity: 0.9;
      margin-top: 4px;
    }

    /* Alert Card */
    .alert-card {
      display: flex;
      gap: 12px;
      padding: 12px 16px;
      background: #f0fdfa;
      border: 1px solid #99f6e4;
      border-left: 4px solid #0d9488;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    .alert-card.warning {
      background: #fffbeb;
      border-color: #fde68a;
      border-left-color: #f59e0b;
    }
    .alert-icon { font-size: 20px; }
    .alert-title { font-weight: 600; font-size: 11pt; }
    .alert-description { font-size: 9pt; color: #475569; }

    /* Metric Cards Grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }

    .metric-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    .card-accent {
      height: 4px;
      background: #0d9488;
    }
    .card-accent.accent-blue { background: #3b82f6; }
    .card-accent.accent-red { background: #ef4444; }
    .card-accent.accent-green { background: #10b981; }
    .card-accent.accent-amber { background: #f59e0b; }
    .card-body { padding: 12px; }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 8px;
    }
    .card-title .title-text {
      font-size: 10pt;
      font-weight: 600;
      color: #1e293b;
    }
    .card-title .subtitle {
      display: block;
      font-size: 7pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .hero-metric {
      display: flex;
      align-items: baseline;
      gap: 2px;
      margin-bottom: 2px;
    }
    .hero-value {
      font-size: 26pt;
      font-weight: 700;
      color: #0d9488;
    }
    .hero-value.value-blue { color: #3b82f6; }
    .hero-value.value-red { color: #ef4444; }
    .hero-unit {
      font-size: 14pt;
      font-weight: 600;
      color: #0d9488;
    }
    .hero-unit.unit-blue { color: #3b82f6; }
    .hero-label {
      font-size: 7pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 10px;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
    }
    .metric-item {
      background: #f8fafc;
      padding: 6px 8px;
      border-radius: 4px;
    }
    .metric-item .metric-value {
      font-size: 10pt;
      font-weight: 600;
      color: #1e293b;
      display: block;
    }
    .metric-item .metric-label {
      font-size: 7pt;
      color: #64748b;
    }
    .metric-item.highlight-positive .metric-value { color: #10b981; }
    .metric-item.highlight-negative .metric-value { color: #ef4444; }
    .card-footer {
      margin-top: 10px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #64748b;
    }

    /* Section Styling */
    section {
      margin-bottom: 16px;
    }
    section h3 {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }

    /* Stats Grid */
    .stats-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .stat-item {
      background: #f8fafc;
      border-radius: 6px;
      padding: 10px;
      text-align: center;
    }
    .stat-label {
      display: block;
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 2px;
    }
    .stat-value {
      display: block;
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
    }

    /* Parameters Table */
    .params-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #0d9488;
      border-radius: 8px;
      padding: 12px 16px;
      margin-bottom: 16px;
    }
    .params-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
    }
    .param-item .param-label {
      font-size: 8pt;
      color: #64748b;
      display: block;
    }
    .param-item .param-value {
      font-size: 11pt;
      font-weight: 600;
      color: #1e293b;
    }

    /* Portfolio Composition Section */
    .portfolio-section {
      background: #ffffff;
      border: 1px solid #99f6e4;
      border-radius: 10px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    .portfolio-header {
      background: #f0fdfa;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .portfolio-icon {
      width: 32px;
      height: 32px;
      background: #0d9488;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .portfolio-title {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
    }
    .portfolio-subtitle {
      font-size: 9pt;
      color: #64748b;
    }
    .portfolio-content {
      background: #f0fdfa;
      padding: 16px;
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }
    .portfolio-donut {
      width: 100px;
      height: 100px;
      flex-shrink: 0;
    }
    .portfolio-donut img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .asset-bars {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .asset-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      padding: 6px 12px;
      border-radius: 4px;
      position: relative;
      overflow: hidden;
    }
    .asset-bar::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: var(--bar-width, 0%);
      background: var(--bar-color, #0d9488);
      opacity: 0.2;
      border-radius: 4px;
    }
    .asset-swatch {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      flex-shrink: 0;
      z-index: 1;
    }
    .asset-name {
      flex: 1;
      font-size: 9pt;
      font-weight: 500;
      color: #1e293b;
      z-index: 1;
    }
    .asset-weight {
      font-size: 9pt;
      font-weight: 600;
      color: #0d9488;
      z-index: 1;
    }
    .portfolio-params {
      background: white;
      padding: 16px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 24px;
    }
    .portfolio-param {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-left: 8px;
      border-left: 3px solid #0d9488;
    }
    .portfolio-param .label {
      font-size: 7pt;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .portfolio-param .value {
      font-size: 11pt;
      font-weight: 600;
      color: #0d9488;
    }

    /* Spectrum Sections */
    .spectrum-section {
      margin-bottom: 16px;
    }
    .spectrum-bar {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
    }
    .spectrum-gradient {
      height: 12px;
      border-radius: 6px;
      background: linear-gradient(90deg, #ef4444 0%, #f59e0b 25%, #10b981 50%, #3b82f6 75%, #8b5cf6 100%);
      margin-bottom: 12px;
    }
    .spectrum-gradient.debt {
      background: linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%);
    }
    .spectrum-labels {
      display: flex;
      justify-content: space-between;
    }
    .spectrum-item {
      text-align: center;
    }
    .spectrum-item .label {
      display: block;
      font-size: 8pt;
      color: #64748b;
    }
    .spectrum-item .value {
      display: block;
      font-size: 12pt;
      font-weight: 600;
    }
    .spectrum-item.pessimistic .value { color: #ef4444; }
    .spectrum-item.median .value { color: #3b82f6; }
    .spectrum-item.optimistic .value { color: #10b981; }

    /* Strategy Section */
    .strategy-section {
      margin-bottom: 16px;
    }
    .verdict-banner {
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .verdict-banner.verdict-bbd {
      background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
      border: 1px solid #10b981;
    }
    .verdict-banner.verdict-sell {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 1px solid #f59e0b;
    }
    .verdict-title {
      font-size: 14pt;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .verdict-description {
      font-size: 9pt;
      color: #475569;
    }
    .strategy-metrics {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
    }
    .strategy-metric {
      background: #f8fafc;
      padding: 10px;
      border-radius: 6px;
      text-align: center;
    }
    .strategy-metric .metric-label {
      display: block;
      font-size: 8pt;
      color: #64748b;
      margin-bottom: 2px;
    }
    .strategy-metric .metric-value {
      font-size: 12pt;
      font-weight: 600;
      color: #1e293b;
    }
    .strategy-metric .metric-value.positive { color: #10b981; }
    .strategy-metric .metric-value.negative { color: #ef4444; }

    /* Chart Sections */
    .chart-section {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .chart-section.half-width {
      display: inline-block;
      width: calc(50% - 8px);
      vertical-align: top;
    }
    .chart-section.half-width:nth-of-type(odd) {
      margin-right: 12px;
    }
    .chart-wrapper {
      width: 100%;
    }
    .chart-wrapper.short {
      max-height: 250px;
    }
    .chart-image {
      width: 100%;
      height: auto;
      max-height: 350px;
      object-fit: contain;
    }

    /* Footer */
    .report-footer {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 8pt;
      color: #94a3b8;
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

  <!-- Hero Banner -->
  <div class="hero-banner ${data.heroBanner.isSuccess ? '' : 'warning'}">
    ${data.heroBanner.logoBase64 ? `<img src="${data.heroBanner.logoBase64}" alt="" class="hero-watermark" />` : ''}
    <div class="hero-icon">
      ${data.heroBanner.isSuccess && data.heroBanner.logoBase64
        ? `<img src="${data.heroBanner.logoBase64}" alt="eVelo" />`
        : `<span class="emoji">💪</span>`}
    </div>
    <div class="hero-title">${data.heroBanner.title || 'Simulation Complete'}</div>
    <div class="hero-subtitle">Buy-Borrow-Die Strategy Analysis</div>
  </div>

  <!-- Alert Card -->
  ${data.heroBanner.alertTitle ? `
  <div class="alert-card ${data.heroBanner.isSuccess ? '' : 'warning'}">
    <div class="alert-icon">${data.heroBanner.isSuccess ? '✓' : '⚠'}</div>
    <div class="alert-content">
      <div class="alert-title">${data.heroBanner.alertTitle}</div>
      <div class="alert-description">${data.heroBanner.alertDescription}</div>
    </div>
  </div>
  ` : ''}

  <!-- Metric Cards -->
  <div class="cards-grid">
    <!-- Strategy Success Card -->
    <div class="metric-card">
      <div class="card-accent ${data.strategyCard.isGood ? 'accent-green' : 'accent-amber'}"></div>
      <div class="card-body">
        <div class="card-header">
          <div class="card-title">
            <span class="title-text">Strategy Success</span>
            <span class="subtitle">BBD SUCCESS RATE</span>
          </div>
        </div>
        <div class="hero-metric">
          <span class="hero-value">${data.strategyCard.bbdSuccessRate}</span>
          <span class="hero-unit">%</span>
        </div>
        <div class="hero-label">PROBABILITY OF SUCCESS</div>
        <div class="metrics-grid">
          <div class="metric-item highlight-negative">
            <span class="metric-value">${data.strategyCard.vsSellSuccess}</span>
            <span class="metric-label">vs Sell Assets</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${data.strategyCard.sellSuccessRate}</span>
            <span class="metric-label">Sell Success Rate</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${data.strategyCard.medianUtilization}</span>
            <span class="metric-label">Median Utilization</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${data.strategyCard.yearsAbove70}</span>
            <span class="metric-label">Years Above 70%</span>
          </div>
        </div>
        <div class="card-footer">${data.strategyCard.footerText || 'Target: 80%'}</div>
      </div>
    </div>

    <!-- Portfolio Growth Card -->
    <div class="metric-card">
      <div class="card-accent accent-blue"></div>
      <div class="card-body">
        <div class="card-header">
          <div class="card-title">
            <span class="title-text">Portfolio Growth</span>
            <span class="subtitle">IMPLIED CAGR (MEDIAN)</span>
          </div>
        </div>
        <div class="hero-metric">
          <span class="hero-value value-blue">${data.growthCard.cagr}</span>
          <span class="hero-unit unit-blue">%</span>
        </div>
        <div class="hero-label">COMPOUND ANNUAL GROWTH RATE</div>
        <div class="metrics-grid">
          <div class="metric-item">
            <span class="metric-value">${data.growthCard.startingValue}</span>
            <span class="metric-label">Starting Value</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${data.growthCard.medianTerminal}</span>
            <span class="metric-label">Median Terminal</span>
          </div>
          <div class="metric-item highlight-positive">
            <span class="metric-value">${data.growthCard.vsSellTerminal}</span>
            <span class="metric-label">vs Sell Assets</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${data.growthCard.sellTerminal}</span>
            <span class="metric-label">Sell Terminal</span>
          </div>
        </div>
        <div class="card-footer">P10 outcome: ${data.growthCard.p10Outcome}</div>
      </div>
    </div>

    <!-- Leverage Safety Card -->
    <div class="metric-card">
      <div class="card-accent ${data.safetyCard.isGood ? 'accent-green' : 'accent-red'}"></div>
      <div class="card-body">
        <div class="card-header">
          <div class="card-title">
            <span class="title-text">Leverage Safety</span>
            <span class="subtitle">MARGIN CALL RISK</span>
          </div>
        </div>
        <div class="hero-metric">
          <span class="hero-value ${data.safetyCard.isGood ? '' : 'value-red'}">${data.safetyCard.marginCallProbability}</span>
          <span class="hero-unit ${data.safetyCard.isGood ? '' : 'unit-red'}">%</span>
        </div>
        <div class="hero-label">MARGIN CALL PROBABILITY</div>
        <div class="metrics-grid">
          <div class="metric-item">
            <span class="metric-value">${data.safetyCard.peakUtilization}</span>
            <span class="metric-label">Peak Utilization (P90)</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${data.safetyCard.safetyBuffer}</span>
            <span class="metric-label">Safety Buffer (P10)</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">${data.safetyCard.mostDangerousYear}</span>
            <span class="metric-label">Most Dangerous Year</span>
          </div>
          <div class="metric-item">
            <span class="metric-value">70%</span>
            <span class="metric-label">Margin Call Threshold</span>
          </div>
        </div>
        <div class="card-footer">${data.safetyCard.footerText || 'Target: <20%'}</div>
      </div>
    </div>
  </div>

  <!-- Portfolio Composition (replaces old Parameters Summary) -->
  ${portfolioCompositionSection}

  <!-- Summary Statistics -->
  <section class="stats-section">
    <h3>Summary Statistics</h3>
    <div class="stats-grid">
      <div class="stat-item">
        <span class="stat-label">Median Value</span>
        <span class="stat-value">${data.summaryStats.median}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Success Rate</span>
        <span class="stat-value">${data.summaryStats.successRate}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Median CAGR</span>
        <span class="stat-value">${data.summaryStats.cagr}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">TWRR (Median)</span>
        <span class="stat-value">${data.summaryStats.twrr}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Mean Value</span>
        <span class="stat-value">${data.summaryStats.mean}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Volatility</span>
        <span class="stat-value">${data.summaryStats.volatility}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Std Deviation</span>
        <span class="stat-value">${data.summaryStats.stddev}</span>
      </div>
      <div class="stat-item">
        <span class="stat-label">Salary Equiv.</span>
        <span class="stat-value">${data.summaryStats.salaryEquiv}</span>
      </div>
    </div>
  </section>

  ${netWorthSpectrumSection}

  ${debtSpectrumSection}

  ${strategyAnalysisSection}

  ${chartSections.join('\n')}

  <footer class="report-footer">
    <p>Generated by eVelo Portfolio Strategy Simulator</p>
    <p>This report is for informational purposes only and does not constitute financial advice.</p>
  </footer>
</body>
</html>`;
}

/**
 * Legacy function for backward compatibility.
 * Generates a simpler print HTML from basic metrics.
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

  const formatPercent = (value: number): string => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const formatPercentValue = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Build chart sections
  const chartSections: string[] = [];

  if (data.chartImages.probabilityCone) {
    chartSections.push(`
      <section class="section">
        <h2>Portfolio Projection</h2>
        <img class="chart-image" src="${data.chartImages.probabilityCone}" alt="Probability cone chart">
      </section>
    `);
  }

  if (data.chartImages.histogram) {
    chartSections.push(`
      <section class="section">
        <h2>Terminal Value Distribution</h2>
        <img class="chart-image" src="${data.chartImages.histogram}" alt="Histogram chart">
      </section>
    `);
  }

  // Add all other charts
  const otherCharts = [
    { key: 'sblocBalance', title: 'SBLOC Balance Projection' },
    { key: 'marginCall', title: 'Margin Call Risk' },
    { key: 'bbdComparison', title: 'BBD vs Sell Strategy Comparison' },
    { key: 'comparisonLine', title: 'Strategy Comparison Over Time' },
    { key: 'cumulativeCosts', title: 'Cumulative Costs' },
    { key: 'terminalComparison', title: 'Terminal Value Comparison' },
    { key: 'sblocUtilization', title: 'SBLOC Utilization' },
  ];

  for (const { key, title } of otherCharts) {
    const img = data.chartImages[key as keyof ChartImages];
    if (img) {
      chartSections.push(`
        <section class="section">
          <h2>${title}</h2>
          <img class="chart-image" src="${img}" alt="${title}">
        </section>
      `);
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eVelo Simulation Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      padding: 0.5in;
    }
    .report-header {
      text-align: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid #0d9488;
    }
    .report-header h1 { font-size: 24pt; color: #0d9488; margin-bottom: 4px; font-weight: 700; }
    .report-header .timestamp { font-size: 10pt; color: #64748b; }
    .section { margin-bottom: 24px; break-inside: avoid; }
    .section h2 { font-size: 14pt; color: #0d9488; margin-bottom: 12px; padding-bottom: 4px; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
    .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; }
    .metric-label { font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .metric-value { font-size: 16pt; font-weight: 700; color: #1e293b; }
    .metric-value.success { color: #059669; }
    .params-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
    .params-table td { padding: 8px 12px; border-bottom: 1px solid #e2e8f0; }
    .params-table td:first-child { font-weight: 500; color: #64748b; width: 50%; }
    .params-table td:last-child { font-weight: 600; color: #1e293b; }
    .chart-image { max-width: 100%; height: auto; margin: 8px 0; border-radius: 4px; }
    .print-actions { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; z-index: 1000; }
    .print-btn { background: #0d9488; color: white; border: none; padding: 12px 24px; font-size: 14px; font-weight: 600; border-radius: 8px; cursor: pointer; }
    .print-btn:hover { background: #0f766e; }
    .print-btn.secondary { background: #64748b; }
    .print-btn.secondary:hover { background: #475569; }
    @media print { .print-actions { display: none; } body { padding: 0; } .section { page-break-inside: avoid; } }
    @page { size: letter portrait; margin: 0.75in; }
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
        <div class="metric-value ${data.keyMetrics.successRate >= 90 ? 'success' : ''}">${formatPercentValue(data.keyMetrics.successRate)}</div>
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
      <tr><td>Time Horizon</td><td>${data.paramSummary.timeHorizon} years</td></tr>
      <tr><td>Simulation Iterations</td><td>${data.paramSummary.iterations.toLocaleString()}</td></tr>
      <tr><td>Expected Inflation Rate</td><td>${formatPercent(data.paramSummary.inflationRate)}</td></tr>
      <tr><td>SBLOC Interest Rate</td><td>${formatPercent(data.paramSummary.sblocRate)}</td></tr>
      <tr><td>Maximum LTV</td><td>${formatPercent(data.paramSummary.maxLtv)}</td></tr>
    </table>
  </section>
  ${chartSections.join('\n')}
</body>
</html>`;
}

/**
 * Open a new browser window with print-ready content.
 */
export function openPrintWindow(htmlContent: string): Window | null {
  const printWindow = window.open('', '_blank', 'width=900,height=700');

  if (!printWindow) {
    alert('Unable to open print window. Please allow popups for this site.');
    return null;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  return printWindow;
}
