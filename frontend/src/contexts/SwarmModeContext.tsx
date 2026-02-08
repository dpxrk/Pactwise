/**
 * SwarmModeContext - Global state management for swarm orchestration
 *
 * Provides centralized configuration for swarm intelligence features across
 * the entire application, eliminating prop drilling and enabling consistent
 * swarm behavior.
 *
 * @module SwarmModeContext
 */

'use client';

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import type { SwarmConfig, PartialSwarmConfig } from '@/types/agents.types';

/**
 * Telemetry data for swarm operations
 */
export interface SwarmTelemetry {
  totalOptimizations: number;
  averageOptimizationTime: number;
  consensusSuccessRate: number;
  patternReuseRate: number;
  lastOptimization?: {
    timestamp: string;
    algorithm: 'pso' | 'aco';
    duration: number;
    agentsSelected: number;
  };
}

/**
 * Context value shape
 */
interface SwarmContextType {
  // Configuration state
  enabled: boolean;
  config: SwarmConfig;
  debugMode: boolean;
  telemetry: SwarmTelemetry;

  // Actions
  setEnabled: (enabled: boolean) => void;
  updateConfig: (config: PartialSwarmConfig) => void;
  setDebugMode: (debug: boolean) => void;
  updateTelemetry: (data: Partial<SwarmTelemetry>) => void;
}

/**
 * Default swarm configuration matching backend defaults
 */
const DEFAULT_SWARM_CONFIG: SwarmConfig = {
  agentSelectionEnabled: true,
  workflowOptimizationEnabled: true,
  consensusEnabled: true,
  patternLearningEnabled: true,
  algorithm: 'pso',
  optimizationTimeout: 100,
  consensusThreshold: 0.66,
};

/**
 * Default telemetry state
 */
const DEFAULT_TELEMETRY: SwarmTelemetry = {
  totalOptimizations: 0,
  averageOptimizationTime: 0,
  consensusSuccessRate: 0,
  patternReuseRate: 0,
};

const SwarmModeContext = createContext<SwarmContextType | null>(null);

/**
 * SwarmModeProvider - Global swarm configuration provider
 *
 * Manages application-wide swarm orchestration settings, debug mode,
 * and telemetry data.
 *
 * @example
 * ```tsx
 * // In root layout
 * <SwarmModeProvider defaultConfig={{ algorithm: 'pso' }}>
 *   <App />
 * </SwarmModeProvider>
 *
 * // In any component
 * const { enabled, config, setDebugMode } = useSwarmMode();
 * ```
 */
export function SwarmModeProvider({
  children,
  defaultConfig,
}: {
  children: ReactNode;
  defaultConfig?: PartialSwarmConfig;
}) {
  const [enabled, setEnabled] = useState(true);
  const [config, setConfig] = useState<SwarmConfig>({
    ...DEFAULT_SWARM_CONFIG,
    ...defaultConfig,
  });
  const [debugMode, setDebugMode] = useState(
    typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SWARM_DEBUG === 'true'
  );
  const [telemetry, setTelemetry] = useState<SwarmTelemetry>(DEFAULT_TELEMETRY);

  /**
   * Update swarm configuration with partial override
   */
  const updateConfig = useCallback((partial: PartialSwarmConfig) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  /**
   * Update telemetry data
   */
  const updateTelemetry = useCallback((data: Partial<SwarmTelemetry>) => {
    setTelemetry(prev => ({ ...prev, ...data }));
  }, []);

  /**
   * Memoized context value
   */
  const value = useMemo(() => ({
    enabled,
    config,
    debugMode,
    telemetry,
    setEnabled,
    updateConfig,
    setDebugMode,
    updateTelemetry,
  }), [enabled, config, debugMode, telemetry, updateConfig, updateTelemetry]);

  return (
    <SwarmModeContext.Provider value={value}>
      {children}
    </SwarmModeContext.Provider>
  );
}

/**
 * Hook to access swarm mode context
 *
 * Must be used within a SwarmModeProvider.
 *
 * @throws Error if used outside SwarmModeProvider
 *
 * @example
 * ```tsx
 * const { enabled, config, debugMode, setDebugMode } = useSwarmMode();
 *
 * // Enable debug panel
 * setDebugMode(true);
 *
 * // Update configuration
 * updateConfig({ algorithm: 'aco', consensusThreshold: 0.75 });
 * ```
 */
export function useSwarmMode() {
  const context = useContext(SwarmModeContext);
  if (!context) {
    throw new Error('useSwarmMode must be used within SwarmModeProvider');
  }
  return context;
}

/**
 * Optional hook for components that may not have SwarmModeProvider
 *
 * Returns null if provider is not available, allowing graceful degradation.
 *
 * @example
 * ```tsx
 * const swarm = useSwarmModeOptional();
 * if (swarm?.debugMode) {
 *   // Show debug info
 * }
 * ```
 */
export function useSwarmModeOptional() {
  return useContext(SwarmModeContext);
}
