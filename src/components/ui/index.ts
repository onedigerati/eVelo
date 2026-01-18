/**
 * UI Components barrel export.
 * Import this module to register all UI components.
 */

// Input Components
export { RangeSlider } from './range-slider';
export { NumberInput } from './number-input';
export { SelectInput, type SelectOption } from './select-input';

// Feedback Components
export { ProgressIndicator } from './progress-indicator';
export { ToastNotification, type ToastType } from './toast-notification';
export { ToastContainer } from './toast-container';

// Register all UI components
import { RangeSlider } from './range-slider';
import { NumberInput } from './number-input';
import { SelectInput } from './select-input';

customElements.define('range-slider', RangeSlider);
customElements.define('number-input', NumberInput);
customElements.define('select-input', SelectInput);
