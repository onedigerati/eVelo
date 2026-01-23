/**
 * UI Components barrel export.
 * Import this module to register all UI components.
 */

// Layout Components
export { SidebarPanel } from './sidebar-panel';
export { ParamSection } from './param-section';
export { MainLayout } from './main-layout';
export { HelpSection } from './help-section';

// Portfolio Configuration Components
export { AssetSelector } from './asset-selector';
export { WeightEditor } from './weight-editor';
export { PortfolioComposition } from './portfolio-composition';

// Input Components
export { RangeSlider } from './range-slider';
export { NumberInput } from './number-input';
export { SelectInput, type SelectOption } from './select-input';
export { CheckboxInput } from './checkbox-input';

// Feedback Components
export { ProgressIndicator } from './progress-indicator';
export { ToastNotification, type ToastType } from './toast-notification';
export { ToastContainer } from './toast-container';

// Settings Components
export { SettingsPanel } from './settings-panel';

// Modal Components
export { ModalDialog, type ModalOptions } from './modal-dialog';

// Portfolio Management Components
export { PortfolioManager } from './portfolio-manager';
export { PortfolioList } from './portfolio-list';

// Results Display Components
export { ResultsDashboard } from './results-dashboard';
export { PercentileSpectrum, type PercentileSpectrumProps } from './percentile-spectrum';
export { KeyMetricsBanner, type KeyMetricsData } from './key-metrics-banner';
export { ParamSummary, type ParamSummaryData } from './param-summary';
export { SalaryEquivalentSection, type SalaryEquivalentProps } from './salary-equivalent-section';
export {
  StrategyAnalysis,
  type StrategyAnalysisProps,
  type BBDMetrics,
  type SellMetrics,
  type StrategyVerdict,
  type WealthDifferential,
  type StrategyInsights,
} from './strategy-analysis';
export {
  YearlyAnalysisTable,
  type YearlyAnalysisTableProps,
  type YearlyPercentileData,
  type WithdrawalData,
  calculateWithdrawals,
} from './yearly-analysis-table';
export { PerformanceTable } from './performance-table';
export { ReturnProbabilityTable } from './return-probability-table';
export {
  RecommendationsSection,
  type RecommendationsSectionProps,
} from './recommendations-section';

// Comparison Mode Components
export { DeltaIndicator } from './delta-indicator';
export { ComparisonDashboard } from './comparison-dashboard';
