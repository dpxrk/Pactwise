/**
 * SwarmDebugPanel - Real-time swarm optimization visualization
 *
 * Displays live metrics, particle positions, pheromone trails, and consensus
 * voting for swarm intelligence algorithms (PSO, ACO, Honeybee Democracy).
 *
 * @module SwarmDebugPanel
 */

'use client';

import { useState, useEffect } from 'react';
import { useSwarmModeOptional } from '@/contexts/SwarmModeContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle2, Activity, X } from 'lucide-react';

/**
 * PSO Particle state
 */
interface PSOParticle {
  id: string;
  position: number[];
  fitness: number;
  velocity: number[];
}

/**
 * Consensus vote
 */
interface ConsensusVote {
  agent: string;
  vote: string;
  confidence: number;
}

/**
 * Debug state snapshot
 */
interface SwarmDebugState {
  // PSO state
  particles: PSOParticle[];
  globalBest: number[];
  convergenceHistory: number[];
  currentIteration: number;

  // ACO state
  pheromoneField: Record<string, number>;
  bestPath: string[];

  // Consensus state
  consensusVotes: Map<string, ConsensusVote[]>;
  consensusThreshold: number;

  // Metadata
  timestamp: string;
  algorithm: 'pso' | 'aco';
  enterpriseId: string;
}

/**
 * SwarmDebugPanel - Visualizes swarm optimization in real-time
 *
 * Shows PSO particle swarm convergence, ACO pheromone trails, and
 * Honeybee Democracy consensus voting.
 *
 * Only renders when debug mode is enabled via SwarmModeContext.
 *
 * @example
 * ```tsx
 * // In agent page component
 * import { SwarmDebugPanel } from '@/components/agents/SwarmDebugPanel';
 *
 * export default function AgentPage() {
 *   return (
 *     <>
 *       {/* Page content *\/}
 *       <SwarmDebugPanel />
 *     </>
 *   );
 * }
 * ```
 */
export function SwarmDebugPanel() {
  const swarmContext = useSwarmModeOptional();
  const [state, setState] = useState<SwarmDebugState | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Only show if debug mode is enabled
  if (!swarmContext?.debugMode) {
    return null;
  }

  const { config, telemetry } = swarmContext;

  return (
    <div
      className={`fixed bottom-0 right-0 bg-black/95 text-white font-mono text-xs border-t-2 border-l-2 border-purple-500 z-50 transition-all duration-300 ${
        isMinimized ? 'w-64 h-12' : 'w-1/3 h-1/2'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-3 border-b border-purple-500/30">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400 animate-pulse" />
          <h3 className="text-sm font-bold text-purple-300">Swarm Debug Panel</h3>
          <Badge variant="outline" className="bg-purple-900/50 text-purple-200 border-purple-500">
            Live
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-purple-400 hover:text-purple-200 transition-colors"
            aria-label={isMinimized ? 'Expand panel' : 'Minimize panel'}
          >
            {isMinimized ? '▲' : '▼'}
          </button>
          <button
            onClick={() => swarmContext.setDebugMode(false)}
            className="text-purple-400 hover:text-red-400 transition-colors"
            aria-label="Close debug panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content (hidden when minimized) */}
      {!isMinimized && (
        <div className="p-4 overflow-auto h-[calc(100%-3rem)] space-y-4">
          {/* Configuration Status */}
          <Card className="bg-purple-950/30 border-purple-500/30 p-3">
            <h4 className="text-xs font-semibold mb-2 text-purple-300">Configuration</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-gray-400">Algorithm:</span>{' '}
                <span className="text-purple-200 font-bold uppercase">{config.algorithm}</span>
              </div>
              <div>
                <span className="text-gray-400">Timeout:</span>{' '}
                <span className="text-purple-200">{config.optimizationTimeout}ms</span>
              </div>
              <div>
                <span className="text-gray-400">Consensus:</span>{' '}
                <span className="text-purple-200">{(config.consensusThreshold * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-gray-400">Pattern Learning:</span>{' '}
                <span className={config.patternLearningEnabled ? 'text-green-400' : 'text-gray-500'}>
                  {config.patternLearningEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>
          </Card>

          {/* Telemetry Metrics */}
          <Card className="bg-purple-950/30 border-purple-500/30 p-3">
            <h4 className="text-xs font-semibold mb-2 text-purple-300">Telemetry</h4>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div>
                <span className="text-gray-400">Total Optimizations:</span>{' '}
                <span className="text-purple-200">{telemetry.totalOptimizations}</span>
              </div>
              <div>
                <span className="text-gray-400">Avg Time:</span>{' '}
                <span className="text-purple-200">{telemetry.averageOptimizationTime.toFixed(1)}ms</span>
              </div>
              <div>
                <span className="text-gray-400">Consensus Rate:</span>{' '}
                <span className="text-green-400">{(telemetry.consensusSuccessRate * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-400">Pattern Reuse:</span>{' '}
                <span className="text-purple-200">{(telemetry.patternReuseRate * 100).toFixed(1)}%</span>
              </div>
            </div>
          </Card>

          {/* PSO Visualization */}
          {config.algorithm === 'pso' && state?.particles && (
            <Card className="bg-purple-950/30 border-purple-500/30 p-3">
              <h4 className="text-xs font-semibold mb-2 text-purple-300">
                PSO Particles ({state.particles.length})
              </h4>
              <div className="space-y-2">
                {/* Convergence Progress */}
                <div>
                  <div className="text-[10px] text-gray-400 mb-1">
                    Iteration: {state.currentIteration} | Best Fitness: {state.convergenceHistory.at(-1)?.toFixed(4) || 'N/A'}
                  </div>
                  <div className="h-2 bg-purple-950 rounded overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500"
                      style={{
                        width: `${Math.min(100, ((state.convergenceHistory.at(-1) || 0) + 1) * 50)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Particle Grid */}
                <div className="grid grid-cols-10 gap-1">
                  {state.particles.map(p => (
                    <div
                      key={p.id}
                      className="w-3 h-3 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: `rgba(168, 85, 247, ${0.3 + p.fitness * 0.7})`,
                        boxShadow: p.fitness > 0.8 ? '0 0 4px rgba(168, 85, 247, 0.8)' : 'none',
                      }}
                      title={`Particle ${p.id}: fitness=${p.fitness.toFixed(3)}`}
                    />
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* ACO Pheromone Trails */}
          {config.algorithm === 'aco' && state?.pheromoneField && (
            <Card className="bg-purple-950/30 border-purple-500/30 p-3">
              <h4 className="text-xs font-semibold mb-2 text-purple-300">Pheromone Trails</h4>
              <div className="space-y-1">
                {Object.entries(state.pheromoneField)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 8)
                  .map(([path, strength]) => (
                    <div key={path} className="flex items-center gap-2">
                      <div className="text-[10px] text-gray-400 w-32 truncate" title={path}>
                        {path}
                      </div>
                      <div className="flex-1 h-1.5 bg-purple-950 rounded overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-500"
                          style={{ width: `${strength * 100}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-purple-200 w-12 text-right">
                        {(strength * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Consensus Voting */}
          {state?.consensusVotes && state.consensusVotes.size > 0 && (
            <Card className="bg-purple-950/30 border-purple-500/30 p-3">
              <h4 className="text-xs font-semibold mb-2 text-purple-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Consensus Voting
              </h4>
              <div className="space-y-2">
                {Array.from(state.consensusVotes.entries()).map(([decision, votes]) => {
                  const agreement = votes.filter(v => v.vote === decision).length / votes.length;
                  const consensusReached = agreement >= state.consensusThreshold;

                  return (
                    <div key={decision} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="text-[10px] font-semibold text-purple-300">{decision}</div>
                        <div className="flex items-center gap-1">
                          <div className="text-[10px] text-gray-400">
                            {(agreement * 100).toFixed(0)}%
                          </div>
                          {consensusReached && (
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        {votes.map((v, i) => (
                          <div key={i} className="flex items-center gap-2 text-[9px]">
                            <div className="w-16 text-gray-500 truncate">{v.agent}</div>
                            <div className="w-12 text-purple-200">{v.vote}</div>
                            <div className="flex-1 h-1 bg-purple-950 rounded overflow-hidden">
                              <div
                                className="h-full bg-purple-600"
                                style={{ width: `${v.confidence * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* No Active Swarm */}
          {!state && (
            <Card className="bg-purple-950/30 border-purple-500/30 p-4 text-center">
              <Zap className="w-8 h-8 text-purple-400/50 mx-auto mb-2" />
              <div className="text-xs text-gray-400">Waiting for swarm activity...</div>
              <div className="text-[10px] text-gray-500 mt-1">
                Submit a task to see optimization in real-time
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
