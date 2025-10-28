// Dynamic imports for agent constants to reduce bundle size
// These are loaded on-demand when needed

import type { AgentType, InsightType, TaskPriority, AgentStatus, LogLevel, TaskStatus } from '@/types/agents.types';

// Cached constants to avoid multiple fetches
let agentLabelsCache: { agentTypes: Record<AgentType, string>; insightTypes: Record<InsightType, string> } | null = null;
let agentColorsCache: {
  priority: Record<TaskPriority, string>;
  status: Record<AgentStatus, string>;
  logLevel: Record<LogLevel, string>;
  taskStatus: Record<TaskStatus, string>;
} | null = null;

/**
 * Dynamically load agent type and insight type labels
 * @returns Promise with label mappings
 */
export async function getAgentLabels() {
  if (agentLabelsCache) {
    return agentLabelsCache;
  }

  const response = await fetch('/data/agent-labels.json');
  agentLabelsCache = await response.json();
  return agentLabelsCache!;
}

/**
 * Dynamically load agent color mappings
 * @returns Promise with color mappings
 */
export async function getAgentColors() {
  if (agentColorsCache) {
    return agentColorsCache;
  }

  const response = await fetch('/data/agent-colors.json');
  agentColorsCache = await response.json();
  return agentColorsCache!;
}

/**
 * Get label for specific agent type
 * @param type Agent type
 * @returns Promise with label string
 */
export async function getAgentTypeLabel(type: AgentType): Promise<string> {
  const labels = await getAgentLabels();
  return labels.agentTypes[type];
}

/**
 * Get label for specific insight type
 * @param type Insight type
 * @returns Promise with label string
 */
export async function getInsightTypeLabel(type: InsightType): Promise<string> {
  const labels = await getAgentLabels();
  return labels.insightTypes[type];
}

/**
 * Get color class for priority level
 * @param priority Priority level
 * @returns Promise with Tailwind CSS classes
 */
export async function getPriorityColor(priority: TaskPriority): Promise<string> {
  const colors = await getAgentColors();
  return colors.priority[priority];
}

/**
 * Get color class for agent status
 * @param status Agent status
 * @returns Promise with Tailwind CSS classes
 */
export async function getStatusColor(status: AgentStatus): Promise<string> {
  const colors = await getAgentColors();
  return colors.status[status];
}

/**
 * Get color class for log level
 * @param level Log level
 * @returns Promise with Tailwind CSS classes
 */
export async function getLogLevelColor(level: LogLevel): Promise<string> {
  const colors = await getAgentColors();
  return colors.logLevel[level];
}

/**
 * Get color class for task status
 * @param status Task status
 * @returns Promise with Tailwind CSS classes
 */
export async function getTaskStatusColor(status: TaskStatus): Promise<string> {
  const colors = await getAgentColors();
  return colors.taskStatus[status];
}

// Re-export static constants that are small and frequently used
// These remain in the bundle for immediate access
export { agentSystemStatusOptions, agentStatusOptions, agentTypeOptions, insightTypeOptions, taskStatusOptions, taskPriorityOptions, logLevelOptions } from '@/types/agents.types';
