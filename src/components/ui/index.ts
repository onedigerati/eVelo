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

// Input Components
export { RangeSlider } from './range-slider';
export { NumberInput } from './number-input';
export { SelectInput, type SelectOption } from './select-input';

// Feedback Components
export { ProgressIndicator } from './progress-indicator';
export { ToastNotification, type ToastType } from './toast-notification';
export { ToastContainer } from './toast-container';

// Settings Components
export { SettingsPanel } from './settings-panel';

// Portfolio Management Components
export { PortfolioManager } from './portfolio-manager';
export { PortfolioList } from './portfolio-list';

// Results Display Components
export { ResultsDashboard } from './results-dashboard';
export { PercentileSpectrum, type PercentileSpectrumProps } from './percentile-spectrum';
