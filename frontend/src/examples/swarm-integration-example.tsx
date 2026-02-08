/**
 * Swarm Orchestration Integration Example
 *
 * This example demonstrates how to enable swarm intelligence
 * for agent orchestration in the Pactwise frontend.
 *
 * Key Features:
 * - Toggle swarm mode on/off
 * - Configure swarm optimization parameters
 * - View swarm optimization results
 * - Display consensus decisions
 * - Monitor learned patterns
 */

'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

interface SwarmConfig {
  agentSelectionEnabled: boolean;
  workflowOptimizationEnabled: boolean;
  consensusEnabled: boolean;
  patternLearningEnabled: boolean;
  algorithm: 'pso' | 'aco';
  optimizationTimeout: number;
  consensusThreshold: number;
}

interface SwarmResult {
  orchestrationId: string;
  swarmOptimized: boolean;
  consensusReached: boolean;
  consensusScore?: number;
  minorityOpinions?: Array<{
    agent: string;
    confidence: number;
  }>;
  processingTime: number;
}

export default function SwarmOrchestrationExample() {
  const [swarmEnabled, setSwarmEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SwarmResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [swarmConfig, setSwarmConfig] = useState<SwarmConfig>({
    agentSelectionEnabled: true,
    workflowOptimizationEnabled: true,
    consensusEnabled: true,
    patternLearningEnabled: true,
    algorithm: 'pso',
    optimizationTimeout: 100,
    consensusThreshold: 0.66,
  });

  const processWithSwarm = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const supabase = createClient();

      // Get auth session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      // Call local-agents endpoint with swarm configuration
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/local-agents/process`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            agentType: 'manager',
            data: {
              content:
                'URGENT: Analyze vendor contract DEF-456 for legal, financial, and compliance risks',
            },
            context: {
              metadata: {
                swarmMode: swarmEnabled,
                swarmConfig: swarmEnabled ? swarmConfig : undefined,
                executionMode: 'synchronous',
              },
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Request failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Request failed');
      }

      // Extract swarm-specific results
      const swarmResult: SwarmResult = {
        orchestrationId: data.data.orchestrationId,
        swarmOptimized: data.data.swarmOptimized || false,
        consensusReached: data.data.aggregatedData?.consensusReached || false,
        consensusScore: data.data.aggregatedData?.consensusScore,
        minorityOpinions:
          data.insights?.find((i: any) => i.type === 'consensus_reached')?.data
            ?.consensusMetadata?.minorityOpinions || [],
        processingTime: data.processingTime || 0,
      };

      setResult(swarmResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-mono font-bold text-gray-900">
          Swarm Orchestration Example
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          Enable swarm intelligence for multi-agent orchestration (PSO, ACO,
          Honeybee Democracy)
        </p>
      </div>

      {/* Swarm Toggle */}
      <div className="bg-white border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-mono font-semibold text-gray-900">
              Swarm Mode
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              {swarmEnabled
                ? 'PSO, ACO, and consensus algorithms enabled'
                : 'Traditional agent orchestration'}
            </p>
          </div>
          <button
            onClick={() => setSwarmEnabled(!swarmEnabled)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-none border-2
              ${swarmEnabled ? 'bg-purple-600 border-purple-600' : 'bg-gray-200 border-gray-300'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 bg-white transition-transform
                ${swarmEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Swarm Configuration */}
      {swarmEnabled && (
        <div className="bg-white border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-mono font-semibold text-gray-900">
            Swarm Configuration
          </h2>

          {/* Algorithm Selection */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-gray-700">
              Algorithm
            </label>
            <select
              value={swarmConfig.algorithm}
              onChange={(e) =>
                setSwarmConfig({
                  ...swarmConfig,
                  algorithm: e.target.value as 'pso' | 'aco',
                })
              }
              className="w-full border border-gray-300 px-3 py-2 text-sm font-mono"
            >
              <option value="pso">PSO (Particle Swarm Optimization)</option>
              <option value="aco">ACO (Ant Colony Optimization)</option>
            </select>
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center space-x-2 text-xs">
              <input
                type="checkbox"
                checked={swarmConfig.agentSelectionEnabled}
                onChange={(e) =>
                  setSwarmConfig({
                    ...swarmConfig,
                    agentSelectionEnabled: e.target.checked,
                  })
                }
                className="border-gray-300"
              />
              <span>Agent Selection (PSO)</span>
            </label>

            <label className="flex items-center space-x-2 text-xs">
              <input
                type="checkbox"
                checked={swarmConfig.workflowOptimizationEnabled}
                onChange={(e) =>
                  setSwarmConfig({
                    ...swarmConfig,
                    workflowOptimizationEnabled: e.target.checked,
                  })
                }
                className="border-gray-300"
              />
              <span>Workflow Optimization (ACO)</span>
            </label>

            <label className="flex items-center space-x-2 text-xs">
              <input
                type="checkbox"
                checked={swarmConfig.consensusEnabled}
                onChange={(e) =>
                  setSwarmConfig({
                    ...swarmConfig,
                    consensusEnabled: e.target.checked,
                  })
                }
                className="border-gray-300"
              />
              <span>Consensus (Honeybee)</span>
            </label>

            <label className="flex items-center space-x-2 text-xs">
              <input
                type="checkbox"
                checked={swarmConfig.patternLearningEnabled}
                onChange={(e) =>
                  setSwarmConfig({
                    ...swarmConfig,
                    patternLearningEnabled: e.target.checked,
                  })
                }
                className="border-gray-300"
              />
              <span>Pattern Learning</span>
            </label>
          </div>

          {/* Advanced Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-700">
                Timeout (ms)
              </label>
              <input
                type="number"
                value={swarmConfig.optimizationTimeout}
                onChange={(e) =>
                  setSwarmConfig({
                    ...swarmConfig,
                    optimizationTimeout: parseInt(e.target.value),
                  })
                }
                min={50}
                max={500}
                className="w-full border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-700">
                Consensus Threshold
              </label>
              <input
                type="number"
                value={swarmConfig.consensusThreshold}
                onChange={(e) =>
                  setSwarmConfig({
                    ...swarmConfig,
                    consensusThreshold: parseFloat(e.target.value),
                  })
                }
                min={0.5}
                max={1.0}
                step={0.05}
                className="w-full border border-gray-300 px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Execute Button */}
      <button
        onClick={processWithSwarm}
        disabled={loading}
        className="w-full bg-purple-600 text-white px-4 py-3 font-mono text-sm hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {loading
          ? 'Processing...'
          : swarmEnabled
            ? 'Process with Swarm Intelligence'
            : 'Process with Traditional Orchestration'}
      </button>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 p-4">
          <h3 className="text-sm font-mono font-semibold text-red-900">
            Error
          </h3>
          <p className="text-xs text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div className="bg-white border border-gray-200 p-4 space-y-4">
          <h2 className="text-sm font-mono font-semibold text-gray-900">
            Execution Results
          </h2>

          {/* Swarm Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-600">Orchestration ID</div>
              <div className="text-sm font-mono text-gray-900">
                {result.orchestrationId}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-600">Processing Time</div>
              <div className="text-sm font-mono text-gray-900">
                {result.processingTime}ms
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-600">Swarm Optimized</div>
              <div className="text-sm font-mono text-gray-900">
                {result.swarmOptimized ? (
                  <span className="text-green-600">✓ Yes</span>
                ) : (
                  <span className="text-gray-400">✗ No</span>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-600">Consensus Reached</div>
              <div className="text-sm font-mono text-gray-900">
                {result.consensusReached ? (
                  <span className="text-green-600">
                    ✓ {((result.consensusScore || 0) * 100).toFixed(0)}%
                  </span>
                ) : (
                  <span className="text-gray-400">✗ No conflicts</span>
                )}
              </div>
            </div>
          </div>

          {/* Minority Opinions */}
          {result.minorityOpinions && result.minorityOpinions.length > 0 && (
            <div>
              <div className="text-xs text-gray-600 mb-2">
                Minority Opinions
              </div>
              <div className="space-y-2">
                {result.minorityOpinions.map((opinion, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-yellow-50 border border-yellow-200 px-3 py-2"
                  >
                    <span className="text-xs font-mono text-gray-900">
                      {opinion.agent}
                    </span>
                    <span className="text-xs font-mono text-gray-600">
                      {(opinion.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Information Panel */}
      <div className="bg-blue-50 border border-blue-200 p-4">
        <h3 className="text-sm font-mono font-semibold text-blue-900">
          How Swarm Intelligence Works
        </h3>
        <ul className="mt-2 space-y-1 text-xs text-blue-800">
          <li>
            <strong>PSO (Particle Swarm)</strong>: Optimizes agent selection
            based on historical performance
          </li>
          <li>
            <strong>ACO (Ant Colony)</strong>: Follows pheromone trails to
            optimize workflow order
          </li>
          <li>
            <strong>Honeybee Democracy</strong>: Resolves conflicts through
            weighted voting (66% threshold)
          </li>
          <li>
            <strong>Pattern Learning</strong>: Deposits pheromones on
            successful paths for future optimization
          </li>
        </ul>
        <p className="mt-3 text-xs text-blue-700">
          ✅ <strong>NO LLM REQUIRED</strong> - All algorithms are 100%
          mathematical/statistical
        </p>
      </div>
    </div>
  );
}
