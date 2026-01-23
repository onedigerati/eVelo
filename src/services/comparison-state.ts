/**
 * Comparison State Manager
 *
 * Singleton service for managing comparison mode state with sessionStorage persistence.
 * Handles Float64Array serialization for simulation results.
 */

import type { SimulationOutput, SimulationConfig } from '../simulation/types';

/**
 * Comparison mode state interface
 */
export interface ComparisonState {
  /** Whether comparison mode is active */
  isComparisonMode: boolean;
  /** Previous simulation result (baseline for comparison) */
  previousResult: SimulationOutput | null;
  /** Previous simulation configuration */
  previousConfig: SimulationConfig | null;
  /** Name of previous preset */
  previousPresetName: string;
  /** Current simulation result */
  currentResult: SimulationOutput | null;
  /** Current simulation configuration */
  currentConfig: SimulationConfig | null;
  /** Name of current preset */
  currentPresetName: string;
}

/**
 * Session storage key for comparison state
 */
const STORAGE_KEY = 'comparisonState';

/**
 * Helper to convert Float64Array to Array for JSON serialization
 */
function prepareForStorage(result: SimulationOutput | null): any {
  if (!result) return null;

  return {
    ...result,
    terminalValues: Array.from(result.terminalValues),
  };
}

/**
 * Helper to convert Array back to Float64Array after deserialization
 */
function restoreFromStorage(data: any): SimulationOutput | null {
  if (!data) return null;

  return {
    ...data,
    terminalValues: new Float64Array(data.terminalValues),
  };
}

/**
 * ComparisonStateManager - manages comparison mode state with persistence
 */
export class ComparisonStateManager {
  private state: ComparisonState = {
    isComparisonMode: false,
    previousResult: null,
    previousConfig: null,
    previousPresetName: '',
    currentResult: null,
    currentConfig: null,
    currentPresetName: '',
  };

  /**
   * Save current state to sessionStorage
   */
  saveToSession(): void {
    try {
      const serializable = {
        ...this.state,
        previousResult: prepareForStorage(this.state.previousResult),
        currentResult: prepareForStorage(this.state.currentResult),
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (error) {
      console.error('Failed to save comparison state to session:', error);
    }
  }

  /**
   * Load state from sessionStorage
   */
  loadFromSession(): void {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed = JSON.parse(stored);
      this.state = {
        ...parsed,
        previousResult: restoreFromStorage(parsed.previousResult),
        currentResult: restoreFromStorage(parsed.currentResult),
      };

      this.dispatchChange();
    } catch (error) {
      console.error('Failed to load comparison state from session:', error);
    }
  }

  /**
   * Enter comparison mode - saves current result as previous and sets new current
   */
  enterComparisonMode(
    current: SimulationOutput,
    currentConfig: SimulationConfig,
    presetName: string
  ): void {
    // Move current to previous
    this.state.previousResult = this.state.currentResult;
    this.state.previousConfig = this.state.currentConfig;
    this.state.previousPresetName = this.state.currentPresetName;

    // Set new current
    this.state.currentResult = current;
    this.state.currentConfig = currentConfig;
    this.state.currentPresetName = presetName;
    this.state.isComparisonMode = true;

    this.saveToSession();
    this.dispatchChange();
  }

  /**
   * Exit comparison mode - clears previous result
   */
  exitComparisonMode(): void {
    this.state.isComparisonMode = false;
    this.state.previousResult = null;
    this.state.previousConfig = null;
    this.state.previousPresetName = '';

    this.saveToSession();
    this.dispatchChange();
  }

  /**
   * Replace results - updates current and clears comparison mode
   */
  replaceResults(
    newResult: SimulationOutput,
    newConfig: SimulationConfig,
    presetName: string
  ): void {
    this.state.currentResult = newResult;
    this.state.currentConfig = newConfig;
    this.state.currentPresetName = presetName;
    this.state.isComparisonMode = false;
    this.state.previousResult = null;
    this.state.previousConfig = null;
    this.state.previousPresetName = '';

    this.saveToSession();
    this.dispatchChange();
  }

  /**
   * Get current result
   */
  getCurrentResult(): SimulationOutput | null {
    return this.state.currentResult;
  }

  /**
   * Get previous result
   */
  getPreviousResult(): SimulationOutput | null {
    return this.state.previousResult;
  }

  /**
   * Get full state (readonly copy)
   */
  getState(): Readonly<ComparisonState> {
    return { ...this.state };
  }

  /**
   * Dispatch state change event for UI updates
   */
  private dispatchChange(): void {
    window.dispatchEvent(
      new CustomEvent('comparison-state-change', {
        detail: this.getState(),
      })
    );
  }
}

/**
 * Singleton instance for application-wide comparison state
 */
export const comparisonState = new ComparisonStateManager();
