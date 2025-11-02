/**
 * Agent Task Types
 * Defines task payloads and configurations for each agent type
 */

import type { AgentType } from './agents.types';

// ============================================================================
// TASK PAYLOAD TYPES (Agent-Specific)
// ============================================================================

/** Base task payload structure */
export interface BaseTaskPayload {
  priority?: 'low' | 'medium' | 'high' | 'critical';
  scheduledFor?: string; // ISO date
  metadata?: Record<string, unknown>;
}

/** Secretary Agent - Document Processing */
export interface SecretaryTaskPayload extends BaseTaskPayload {
  action:
    | 'process_contract_document'    // Analyze contract documents with entity extraction
    | 'process_vendor_document'      // Process vendor-related documents
    | 'process_stored_document'      // Retrieve and analyze stored documents
    | 'process_general_document'     // Generic document classification
    | 'extract_clauses'              // Parse contract clauses
    | 'detect_language'              // Identify document language
    | 'extract_certifications'       // Extract vendor certifications
    | 'update_metadata'              // Store extracted metadata
    | 'ocr_analysis';                // OCR processing
  contractId?: string;
  vendorId?: string;
  documentId?: string;
  documentUrl?: string;
  documentText?: string;
  content?: string;
  useWorkflow?: boolean;
  extractionTargets?: Array<'parties' | 'dates' | 'amounts' | 'clauses' | 'vendor_data' | 'certifications' | 'contacts'>;
}

/** Legal Agent - Contract Analysis */
export interface LegalTaskPayload extends BaseTaskPayload {
  action:
    | 'analyze_contract'              // Full contract legal analysis with DB integration
    | 'analyze_vendor_compliance'     // Vendor legal and compliance review
    | 'enterprise_compliance'         // Enterprise-wide compliance assessment
    | 'analyze_document'              // Generic legal document analysis
    | 'extract_clauses'               // Database-integrated clause extraction
    | 'check_vendor_compliance'       // Vendor compliance status check
    | 'analyze_vendor_document'       // Document-level vendor compliance
    | 'check_missing_documents'       // Validate required vendor documents
    | 'validate_certifications'       // Verify certification status
    | 'analyze_nda'                   // NDA-specific analysis
    | 'check_enterprise_requirements' // Custom legal requirements
    | 'process_approval';             // Approval workflow processing
  contractId?: string;
  vendorId?: string;
  enterpriseId?: string;
  contractContent?: string;
  documentContent?: string;
  complianceFrameworks?: string[];
  riskCategories?: string[];
  approvalAction?: 'approve' | 'reject' | 'escalate';
  reviewerComments?: string;
}

/** Financial Agent - Financial Analysis */
export interface FinancialTaskPayload extends BaseTaskPayload {
  action:
    | 'analyze_contract_financials'   // Contract cost analysis
    | 'analyze_vendor_financials'     // Vendor financial evaluation
    | 'analyze_budget'                // Budget impact assessment
    | 'analyze_spend_metrics'         // Vendor spend metrics
    | 'variance_analysis'             // Budget variance analysis
    | 'payment_term_analysis'         // Payment terms analysis
    | 'calculate_roi'                 // ROI calculation
    | 'identify_savings'              // Cost savings opportunities
    | 'forecast_spending'             // Spending forecasts
    | 'optimize_budget';              // Budget optimization recommendations
  contractId?: string;
  vendorId?: string;
  budgetId?: string;
  analysisDepth?: 'basic' | 'detailed' | 'comprehensive';
  timeframe?: { start: string; end: string };
  includeForecast?: boolean;
}

/** Manager Agent - System Coordination */
export interface ManagerTaskPayload extends BaseTaskPayload {
  action:
    | 'analyze_request'           // Analyze incoming multi-agent request
    | 'create_orchestration'      // Create orchestration plan
    | 'route_to_agents'           // Route to appropriate agents
    | 'decompose_task'            // Break down complex task
    | 'manage_dependencies'       // Handle task dependencies
    | 'track_progress'            // Track multi-agent progress
    | 'coordinate_workflow'       // Coordinate agent workflow
    | 'monitor_health'            // Monitor agent health
    | 'prioritize_queue'          // Prioritize task queue
    | 'handle_failure';           // Handle agent failures
  request?: string;
  workflowId?: string;
  targetAgents?: AgentType[];
  healthCheckType?: 'full' | 'quick';
  dependencyGraph?: Record<string, string[]>;
}

/** Workflow Agent - Process Automation */
export interface WorkflowTaskPayload extends BaseTaskPayload {
  action:
    | 'execute_workflow'          // Execute complete workflow
    | 'execute_step'              // Execute single step
    | 'execute_agent_step'        // Execute agent-specific step
    | 'evaluate_condition'        // Evaluate conditional branching
    | 'execute_parallel'          // Execute parallel steps
    | 'manage_approval'           // Handle approval steps
    | 'track_state'               // Track workflow state
    | 'attempt_rollback'          // Rollback on failure
    | 'handle_compensation'       // Handle compensation actions
    | 'handle_failure';           // Handle step failures
  workflowId: string;
  stepId?: string;
  workflowSteps?: Array<{
    stepId: string;
    agentType: AgentType;
    action: string;
    inputs?: Record<string, unknown>;
    condition?: string;
  }>;
  parallelExecution?: boolean;
  rollbackStrategy?: 'automatic' | 'manual';
}

/** Vendor Agent - Vendor Management */
export interface VendorTaskPayload extends BaseTaskPayload {
  action:
    | 'analyze_vendor'            // Analyze specific vendor
    | 'evaluate_new_vendor'       // Evaluate new vendor
    | 'assess_performance'        // Assess vendor performance
    | 'track_performance'         // Track performance metrics
    | 'monitor_sla'               // Monitor SLA compliance
    | 'assess_health'             // Assess vendor health
    | 'generate_scorecard'        // Generate vendor scorecard
    | 'analyze_portfolio'         // Analyze vendor portfolio
    | 'assess_risk'               // Assess vendor risk
    | 'score_relationship';       // Score vendor relationship
  vendorId?: string;
  metricTypes?: string[];
  reportingPeriod?: { start: string; end: string };
  benchmarkAgainst?: string[];
}

/** Analytics Agent - Data Analysis */
export interface AnalyticsTaskPayload extends BaseTaskPayload {
  action:
    | 'analyze_contract_metrics'  // Contract portfolio analysis
    | 'analyze_vendor_performance' // Vendor performance analytics
    | 'analyze_spending'          // Spend pattern analysis
    | 'analyze_contract_lifecycle' // Contract lifecycle analysis
    | 'forecast_budget'           // Budget forecasting
    | 'identify_trends'           // Trend identification
    | 'generate_predictions'      // Predictive analytics
    | 'create_dashboard'          // Dashboard creation
    | 'generate_executive_summary' // Executive summary
    | 'benchmark_analysis';       // Benchmark analysis
  dataType: 'contracts' | 'vendors' | 'spending' | 'performance' | 'compliance' | 'risk';
  timeRange?: { start: string; end: string };
  aggregationLevel?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  includeForecasts?: boolean;
}

/** Compliance Agent - Compliance Monitoring */
export interface ComplianceTaskPayload extends BaseTaskPayload {
  action:
    | 'full_compliance_audit'     // Perform full compliance audit
    | 'check_vendor_compliance'   // Check vendor compliance
    | 'check_data_compliance'     // Check data compliance
    | 'check_contract_compliance' // Check contract compliance
    | 'check_privacy_compliance'  // Check privacy compliance
    | 'check_security_compliance' // Check security compliance
    | 'monitor_compliance'        // Monitor ongoing compliance
    | 'track_certifications'      // Track certification status
    | 'generate_compliance_report' // Generate compliance report
    | 'audit_gdpr'                // GDPR-specific audit
    | 'audit_hipaa'               // HIPAA-specific audit
    | 'audit_soc2';               // SOC2-specific audit
  framework?: 'GDPR' | 'HIPAA' | 'SOC2' | 'ISO27001' | 'PCI-DSS' | 'CCPA';
  entityType?: 'contract' | 'vendor' | 'enterprise' | 'data';
  entityId?: string;
  auditDepth?: 'quick' | 'standard' | 'comprehensive';
}

/** Risk Assessment Agent */
export interface RiskAssessmentTaskPayload extends BaseTaskPayload {
  action:
    | 'assess_contract_risk'      // Assess contract risks
    | 'assess_vendor_risk'        // Assess vendor risks
    | 'assess_financial_risk'     // Assess financial risks
    | 'assess_compliance_risk'    // Assess compliance risks
    | 'analyze_vulnerability'     // Analyze vulnerabilities
    | 'recommend_mitigation'      // Recommend risk mitigation
    | 'monitor_risk_indicators'   // Monitor risk indicators
    | 'generate_risk_report';     // Generate risk report
  targetType: 'vendor' | 'contract' | 'financial' | 'compliance' | 'system';
  targetId?: string;
  riskCategories?: string[];
  severityThreshold?: 'low' | 'medium' | 'high' | 'critical';
}

/** Notifications Agent */
export interface NotificationsTaskPayload extends BaseTaskPayload {
  action:
    | 'create_alert'              // Create alert
    | 'schedule_reminder'         // Schedule reminder
    | 'route_notification'        // Route notification
    | 'send_expiry_alert'         // Contract expiration alert
    | 'send_compliance_reminder'  // Compliance reminder
    | 'send_budget_alert'         // Budget alert
    | 'send_performance_notification' // Vendor performance notification
    | 'send_approval_notification' // Approval notification
    | 'escalate'                  // Escalate notification
    | 'batch_notify';             // Batch notifications
  recipientIds?: string[];
  channels: Array<'email' | 'slack' | 'webhook' | 'in_app' | 'sms'>;
  message?: string;
  templateId?: string;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  scheduleFor?: string; // ISO date
}

/** Data Quality Agent */
export interface DataQualityTaskPayload extends BaseTaskPayload {
  action:
    | 'validate_records'          // Validate data records
    | 'assess_quality'            // Assess data quality
    | 'detect_anomalies'          // Detect anomalies
    | 'standardize_format'        // Standardize data format
    | 'clean_duplicates'          // Clean duplicate records
    | 'enrich_data'               // Enrich data
    | 'check_completeness'        // Check data completeness
    | 'identify_issues'           // Identify data issues
    | 'generate_quality_report';  // Generate quality report
  dataType: 'vendor' | 'contract' | 'user' | 'financial' | 'compliance';
  dataIds?: string[];
  validationRules?: string[];
  autoFix?: boolean;
}

/** Integration Agent */
export interface IntegrationTaskPayload extends BaseTaskPayload {
  action:
    | 'process_webhook'           // Process webhook event
    | 'call_api'                  // Make API call
    | 'sync_data'                 // Synchronize data
    | 'transform_event'           // Transform event data
    | 'batch_process'             // Batch processing
    | 'sync_erp'                  // Sync with ERP
    | 'import_sap'                // Import from SAP
    | 'export_accounting'         // Export to accounting
    | 'connect_vendor_api';       // Connect vendor API
  systemType?: 'erp' | 'sap' | 'accounting' | 'vendor_api' | 'webhook' | 'custom_api';
  syncDirection?: 'import' | 'export' | 'bidirectional';
  dataTypes?: string[];
  webhookPayload?: Record<string, unknown>;
  apiEndpoint?: string;
}

/** Continual Learning Secretary */
export interface ContinualSecretaryTaskPayload extends Omit<SecretaryTaskPayload, 'action'> {
  action:
    | 'learn_pattern'              // Extract patterns from document sets
    | 'learn_preferences'           // Learn user preferences
    | 'optimize_extraction'         // Optimize extraction rules
    | 'improve_categorization'      // Improve categorization accuracy
    | 'adapt_processing'            // Adapt processing strategy
    | SecretaryTaskPayload['action']; // Include all base actions
  learningEnabled: boolean;
  feedbackExamples?: Array<{
    input: string;
    expectedOutput: string;
    userCorrection?: string;
  }>;
  adaptiveMode?: boolean;
}

/** Metacognitive Secretary */
export interface MetacognitiveSecretaryTaskPayload extends Omit<SecretaryTaskPayload, 'action'> {
  action:
    | 'monitor_confidence'          // Self-monitor confidence levels
    | 'adjust_strategy'             // Adjust processing strategy
    | 'track_cognitive_load'        // Track cognitive load
    | 'learn_from_history'          // Learn from processing history
    | 'calibrate_confidence'        // Calibrate confidence scores
    | SecretaryTaskPayload['action']; // Include all base actions
  requireConfidenceScores: boolean;
  requireReasoningTraces: boolean;
  confidenceThreshold?: number;
  strategyOptions?: string[];
}

/** Causal Financial Agent */
export interface CausalFinancialTaskPayload extends Omit<FinancialTaskPayload, 'action'> {
  action:
    | 'identify_root_causes'        // Identify root causes of outcomes
    | 'predict_interventions'       // Predict intervention impacts
    | 'generate_counterfactuals'    // Generate counterfactual scenarios
    | 'recommend_optimizations'     // Recommend financial optimizations
    | 'analyze_causality'           // Analyze causal relationships
    | 'model_interventions'         // Model intervention scenarios
    | FinancialTaskPayload['action']; // Include all base actions
  causalModel?: 'linear' | 'bayesian' | 'structural' | 'graphical';
  interventionScenarios?: Array<{
    variable: string;
    change: number;
    expectedImpact?: number;
  }>;
  counterfactualQueries?: string[];
}

/** Quantum Financial Agent */
export interface QuantumFinancialTaskPayload extends Omit<FinancialTaskPayload, 'action'> {
  action:
    | 'optimize_portfolio'          // Portfolio optimization with quantum
    | 'handle_constraints'          // Complex constraint handling
    | 'forecast_volatility'         // Volatility forecasting
    | 'price_derivatives'           // Derivative pricing
    | 'quantum_simulation'          // Quantum simulation
    | 'find_optimal_allocation'     // Find optimal resource allocation
    | FinancialTaskPayload['action']; // Include all base actions
  optimizationObjectives?: string[];
  constraints?: Record<string, number>;
  algorithmType?: 'pso' | 'quantum_annealing' | 'genetic' | 'qaoa';
  quantumResources?: number;
}

/** Theory of Mind Manager */
export interface TheoryOfMindTaskPayload extends Omit<ManagerTaskPayload, 'action'> {
  action:
    | 'model_mental_states'         // Model agent/user mental states
    | 'recognize_intentions'        // Recognize intentions
    | 'detect_conflicts'            // Detect and resolve conflicts
    | 'build_trust'                 // Build trust relationships
    | 'predict_needs'               // Predict user needs
    | 'understand_perspectives'     // Understand stakeholder perspectives
    | 'suggest_proactive'           // Suggest proactive actions
    | ManagerTaskPayload['action']; // Include all base actions
  userId?: string;
  stakeholders?: string[];
  contextType?: 'workflow' | 'decision' | 'approval' | 'conflict' | 'negotiation';
  trustLevel?: number;
}

// ============================================================================
// UNION TYPE FOR ALL TASK PAYLOADS
// ============================================================================

export type AgentTaskPayload =
  | SecretaryTaskPayload
  | LegalTaskPayload
  | FinancialTaskPayload
  | ManagerTaskPayload
  | WorkflowTaskPayload
  | VendorTaskPayload
  | AnalyticsTaskPayload
  | ComplianceTaskPayload
  | RiskAssessmentTaskPayload
  | NotificationsTaskPayload
  | DataQualityTaskPayload
  | IntegrationTaskPayload
  | ContinualSecretaryTaskPayload
  | MetacognitiveSecretaryTaskPayload
  | CausalFinancialTaskPayload
  | QuantumFinancialTaskPayload
  | TheoryOfMindTaskPayload;

// ============================================================================
// TASK SUBMISSION TYPES
// ============================================================================

export interface TaskSubmission {
  agentType: AgentType;
  title: string;
  description?: string;
  payload: AgentTaskPayload;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledFor?: string;
  contractId?: string;
  vendorId?: string;
}

// ============================================================================
// TASK RESULT TYPES
// ============================================================================

export interface TaskResultMetadata {
  executionTime: number;
  resourcesUsed?: {
    cpu?: number;
    memory?: number;
    apiCalls?: number;
  };
  confidenceScore?: number;
  dataProcessed?: number;
}

export interface SecretaryTaskResult {
  extractedData: {
    title?: string;
    parties?: string[];
    dates?: Record<string, string>;
    amounts?: Record<string, number>;
    clauses?: Array<{
      type: string;
      content: string;
      confidence: number;
    }>;
    vendorData?: Record<string, unknown>;
  };
  qualityScore?: number;
  warnings?: string[];
}

export interface LegalTaskResult {
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  risks: Array<{
    category: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    recommendation?: string;
  }>;
  clauses: Array<{
    type: string;
    content: string;
    riskLevel: string;
  }>;
  complianceStatus?: Record<string, boolean>;
}

export interface FinancialTaskResult {
  totalValue?: number;
  riskScore?: number;
  budgetImpact?: {
    amount: number;
    percentage: number;
    category: string;
  };
  roi?: {
    value: number;
    paybackPeriod: number;
    irr?: number;
  };
  savings?: Array<{
    category: string;
    amount: number;
    confidence: number;
  }>;
  cashFlowProjection?: Array<{
    period: string;
    amount: number;
  }>;
}

// Add more result types as needed...

export type AgentTaskResult =
  | SecretaryTaskResult
  | LegalTaskResult
  | FinancialTaskResult
  | Record<string, unknown>; // Generic fallback
