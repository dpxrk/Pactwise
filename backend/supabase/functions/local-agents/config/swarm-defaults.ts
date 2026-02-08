/**
 * Swarm Orchestration Default Configuration
 *
 * This file defines the default swarm intelligence settings for the ManagerAgent.
 * Swarm mode is ENABLED BY DEFAULT for manager agents, but can be disabled by
 * setting swarmMode: false in the request context metadata.
 */

import { z } from 'zod';

export interface SwarmConfig {
  agentSelectionEnabled: boolean;
  workflowOptimizationEnabled: boolean;
  consensusEnabled: boolean;
  patternLearningEnabled: boolean;
  algorithm: 'pso' | 'aco';
  optimizationTimeout: number;
  consensusThreshold: number;
}

/**
 * Zod schema for runtime validation of swarm configuration
 */
const SwarmConfigSchema = z.object({
  agentSelectionEnabled: z.boolean(),
  workflowOptimizationEnabled: z.boolean(),
  consensusEnabled: z.boolean(),
  patternLearningEnabled: z.boolean(),
  algorithm: z.enum(['pso', 'aco']),
  optimizationTimeout: z.number().min(10).max(500),
  consensusThreshold: z.number().min(0.5).max(1.0),
});

/**
 * Default swarm configuration applied when swarmMode is enabled
 */
export const DEFAULT_SWARM_CONFIG: SwarmConfig = {
  // Enable PSO (Particle Swarm Optimization) for agent selection
  agentSelectionEnabled: true,

  // Enable ACO (Ant Colony Optimization) for workflow ordering
  workflowOptimizationEnabled: true,

  // Enable Honeybee Democracy for consensus building
  consensusEnabled: true,

  // Enable pattern learning and pheromone deposition
  patternLearningEnabled: true,

  // Primary optimization algorithm
  algorithm: 'pso',

  // Maximum overhead for optimization algorithms (milliseconds)
  optimizationTimeout: 100,

  // Consensus threshold (0.66 = 66% majority required)
  consensusThreshold: 0.66,
};

/**
 * Agent types that have swarm mode enabled by default
 */
export const SWARM_ENABLED_AGENTS = ['manager'];

/**
 * Determines if swarm mode should be enabled for a given agent type and context
 *
 * @param agentType - The type of agent being processed
 * @param contextMetadata - The metadata from the request context
 * @returns True if swarm mode should be enabled
 */
export function shouldEnableSwarm(
  agentType: string,
  contextMetadata?: Record<string, unknown>
): boolean {
  // Check if explicitly disabled in context
  if (contextMetadata?.swarmMode === false) {
    return false;
  }

  // Check if explicitly enabled in context
  if (contextMetadata?.swarmMode === true) {
    return true;
  }

  // Default: enabled for manager agent, disabled for others
  return SWARM_ENABLED_AGENTS.includes(agentType);
}

/**
 * Builds the swarm configuration by merging defaults with user overrides
 *
 * Validates the merged configuration using Zod schema to prevent invalid values
 * such as incorrect algorithm selections or out-of-range parameters.
 *
 * @param contextMetadata - The metadata from the request context
 * @returns The complete swarm configuration or undefined if validation fails
 */
export function buildSwarmConfig(
  contextMetadata?: Record<string, unknown>
): SwarmConfig | undefined {
  const userSwarmConfig = contextMetadata?.swarmConfig as Partial<SwarmConfig> | undefined;

  // Merge defaults with user overrides
  const merged = {
    ...DEFAULT_SWARM_CONFIG,
    ...userSwarmConfig,
  };

  // Validate merged configuration
  try {
    return SwarmConfigSchema.parse(merged);
  } catch (error) {
    console.error('Invalid swarm config, falling back to defaults:', error);
    // Fall back to safe defaults on validation failure
    return DEFAULT_SWARM_CONFIG;
  }
}

/**
 * Environment variable overrides (if needed)
 *
 * You can disable swarm mode globally by setting:
 * SWARM_ORCHESTRATION_ENABLED=false
 *
 * Or adjust the rollout percentage:
 * SWARM_ROLLOUT_PERCENTAGE=50  # 50% of requests use swarm
 */
export function getSwarmEnvironmentConfig(): {
  enabled: boolean;
  rolloutPercentage: number;
} {
  const enabled = Deno.env.get('SWARM_ORCHESTRATION_ENABLED') !== 'false';
  const rolloutPercentage = parseInt(
    Deno.env.get('SWARM_ROLLOUT_PERCENTAGE') || '100'
  );

  return { enabled, rolloutPercentage };
}

/**
 * Checks if swarm should be enabled based on environment config and rollout percentage
 *
 * @returns True if swarm should be enabled for this request
 */
export function shouldEnableSwarmByEnvironment(): boolean {
  const { enabled, rolloutPercentage } = getSwarmEnvironmentConfig();

  if (!enabled) {
    return false;
  }

  if (rolloutPercentage >= 100) {
    return true;
  }

  // Random rollout based on percentage
  return Math.random() * 100 < rolloutPercentage;
}
