/**
 * Synchronous agent constants for backward compatibility
 *
 * ⚠️ DEPRECATED: These constants increase bundle size.
 * Use async imports from @/lib/agent-constants instead for better performance.
 *
 * This file will be removed in a future version. Migrate to:
 * ```ts
 * import { getAgentTypeLabel, getPriorityColor } from '@/lib/agent-constants';
 * const label = await getAgentTypeLabel(type);
 * ```
 */

import type { AgentType, InsightType, TaskPriority, AgentStatus, LogLevel, TaskStatus } from '@/types/agents.types';

/** @deprecated Use getAgentLabels() from @/lib/agent-constants */
export const AGENT_TYPE_LABELS: Record<AgentType, string> = {
  manager: "System Manager",
  secretary: "Administrative Assistant",
  financial: "Financial Analyst",
  notifications: "Notification Manager",
  legal: "Legal Compliance",
  analytics: "Data Analytics",
  workflow: "Workflow Orchestrator",
  compliance: "Compliance Monitor",
  integration: "Integration Handler",
  vendor: "Vendor Manager",
  continual_secretary: "Continual Secretary",
  theory_of_mind_manager: "Theory of Mind Manager",
  data_quality: "Data Quality",
  risk_assessment: "Risk Assessment",
  meta_oversight: "Meta Oversight",
  long_term_strategic_planner: "Long Term Strategic Planner",
} as any;

/** @deprecated Use getAgentLabels() from @/lib/agent-constants */
export const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  contract_analysis: "Contract Analysis",
  financial_risk: "Financial Risk",
  expiration_warning: "Expiration Warning",
  legal_review: "Legal Review",
  compliance_alert: "Compliance Alert",
  performance_metric: "Performance Metric",
  cost_optimization: "Cost Optimization",
  vendor_risk: "Vendor Risk",
  renewal_opportunity: "Renewal Opportunity",
  negotiation_insight: "Negotiation Insight",
  audit_finding: "Audit Finding",
  anomaly_detection: "Anomaly Detection",
  trend_analysis: "Trend Analysis",
  recommendation: "Recommendation",
  alert: "Alert",
  report: "Report",
};

/** @deprecated Use getAgentColors() from @/lib/agent-constants */
export const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

/** @deprecated Use getAgentColors() from @/lib/agent-constants */
export const STATUS_COLORS: Record<AgentStatus, string> = {
  inactive: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  busy: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  disabled: "bg-neutral-200 text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300",
};

/** @deprecated Use getAgentColors() from @/lib/agent-constants */
export const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  debug: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  info: "bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200",
  warn: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  error: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  critical: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
};

/** @deprecated Use getAgentColors() from @/lib/agent-constants */
export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  cancelled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  timeout: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};
