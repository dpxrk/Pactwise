/**
 * Test fixtures for Manager Agent comprehensive tests
 *
 * Provides mock data generators, test inputs, and a mock Supabase client
 * for testing the Manager Agent's orchestration capabilities:
 * - Request analysis and routing
 * - Single-agent delegation
 * - Multi-agent orchestration
 * - Workflow execution
 * - Asynchronous task queuing
 */

import { SupabaseClient } from '@supabase/supabase-js';

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

/**
 * Generate a valid UUID for testing
 */
export function generateTestUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate mock orchestration plan
 */
export function generateMockOrchestrationPlan(options?: Partial<MockOrchestrationPlan>): MockOrchestrationPlan {
  const defaultPlan: MockOrchestrationPlan = {
    orchestrationId: `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: 'single_agent',
    requestType: 'general_request',
    complexity: 'low',
    priority: 'medium',
    requiredAgents: [
      {
        type: 'secretary',
        taskType: 'process_request',
        reason: 'Process the request',
        priority: 1,
        capabilities: ['document_processing'],
      },
    ],
    dependencies: [],
    steps: [
      {
        stepId: `step_secretary_${Date.now()}`,
        agentType: 'secretary',
        taskType: 'process_request',
        dependencies: [],
        estimatedDuration: 30,
        canParallelize: true,
      },
    ],
    estimatedDuration: 30,
    metadata: {
      requestedAt: new Date().toISOString(),
      originalData: { content: 'test request' },
    },
  };

  return { ...defaultPlan, ...options };
}

/**
 * Generate mock multi-agent orchestration plan
 */
export function generateMockMultiAgentPlan(): MockOrchestrationPlan {
  const now = Date.now();
  return generateMockOrchestrationPlan({
    type: 'multi_agent',
    requestType: 'contract_review',
    complexity: 'high',
    priority: 'high',
    requiredAgents: [
      { type: 'secretary', taskType: 'document_extraction', reason: 'Extract documents', priority: 1, capabilities: ['document_processing'] },
      { type: 'financial', taskType: 'financial_analysis', reason: 'Analyze financials', priority: 2, capabilities: ['financial_analysis'] },
      { type: 'legal', taskType: 'legal_review', reason: 'Review legal terms', priority: 1, capabilities: ['legal_review'] },
    ],
    dependencies: [
      { agent: 'financial', dependsOn: ['secretary'], reason: 'Requires processed document data' },
      { agent: 'legal', dependsOn: ['secretary'], reason: 'Requires processed document data' },
    ],
    steps: [
      { stepId: `step_secretary_${now}`, agentType: 'secretary', taskType: 'document_extraction', dependencies: [], estimatedDuration: 30, canParallelize: true },
      { stepId: `step_financial_${now}`, agentType: 'financial', taskType: 'financial_analysis', dependencies: [`step_secretary_${now}`], estimatedDuration: 45, canParallelize: false },
      { stepId: `step_legal_${now}`, agentType: 'legal', taskType: 'legal_review', dependencies: [`step_secretary_${now}`], estimatedDuration: 60, canParallelize: false },
    ],
    estimatedDuration: 135,
  });
}

/**
 * Generate mock workflow execution result
 */
export function generateMockWorkflowExecution(options?: Partial<MockWorkflowExecution>): MockWorkflowExecution {
  const defaultExecution: MockWorkflowExecution = {
    orchestrationId: `orch_${Date.now()}_test`,
    workflowName: 'General Processing Workflow',
    status: 'completed',
    steps: [
      {
        stepId: 'step_secretary_process',
        agent: 'secretary',
        task: 'process_request',
        dependencies: [],
        estimatedDuration: 30,
        status: 'completed',
        duration: 25,
      },
      {
        stepId: 'step_analytics_analyze',
        agent: 'analytics',
        task: 'analyze_data',
        dependencies: [],
        estimatedDuration: 50,
        status: 'completed',
        duration: 40,
      },
    ],
    results: {},
    summary: {
      stepsCompleted: 2,
      totalSteps: 2,
      totalDuration: 65,
      success: true,
      keyFindings: ['All workflow steps completed successfully'],
      nextSteps: ['Review generated reports', 'Take action on recommendations'],
    },
  };

  return { ...defaultExecution, ...options };
}

/**
 * Generate mock agent processing result
 */
export function generateMockAgentResult(options?: Partial<MockAgentResult>): MockAgentResult {
  const defaultResult: MockAgentResult = {
    success: true,
    data: { analysisComplete: true, findings: ['Test finding'] },
    insights: [
      {
        type: 'test_insight',
        severity: 'low',
        title: 'Test Insight',
        description: 'A test insight from agent execution',
        isActionable: false,
      },
    ],
    rulesApplied: ['test_rule'],
    confidence: 0.85,
    processingTime: 100,
  };

  return { ...defaultResult, ...options };
}

// =============================================================================
// MOCK SUPABASE CLIENT
// =============================================================================

/**
 * Create a chainable mock Supabase client for testing
 */
export function createMockSupabaseClient(
  overrides?: Partial<MockSupabaseOverrides>,
): MockSupabaseClient {
  const defaultData = {
    agents: [
      { id: generateTestUuid(), type: 'secretary' },
      { id: generateTestUuid(), type: 'financial' },
      { id: generateTestUuid(), type: 'legal' },
      { id: generateTestUuid(), type: 'analytics' },
      { id: generateTestUuid(), type: 'vendor' },
      { id: generateTestUuid(), type: 'notifications' },
      { id: generateTestUuid(), type: 'workflow' },
      { id: generateTestUuid(), type: 'compliance' },
    ],
    agentTasks: [] as MockAgentTask[],
    agentInsights: [] as MockAgentInsight[],
    enterpriseSettings: null as { id: string; value: unknown } | null,
  };

  const data = { ...defaultData, ...overrides };

  const createChainableQuery = (tableData: unknown[] | unknown, isInsert = false) => {
    const state = {
      data: tableData,
      error: null as Error | null,
    };

    const chain: Record<string, (...args: unknown[]) => unknown> = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      gt: () => chain,
      gte: () => chain,
      lt: () => chain,
      lte: () => chain,
      like: () => chain,
      ilike: () => chain,
      is: () => chain,
      in: () => chain,
      contains: () => chain,
      containedBy: () => chain,
      order: () => chain,
      limit: () => chain,
      range: () => chain,
      single: () => Promise.resolve({
        data: Array.isArray(state.data) ? state.data[0] : state.data,
        error: state.error,
      }),
      maybeSingle: () => Promise.resolve({
        data: Array.isArray(state.data) ? state.data[0] : state.data,
        error: state.error,
      }),
      insert: (insertData: unknown) => {
        if (isInsert) {
          // For agent_tasks insert, return a task-like object with an id
          const taskId = generateTestUuid();
          const insertResult = { ...(insertData as Record<string, unknown>), id: taskId };
          return {
            select: () => ({
              single: () => Promise.resolve({ data: insertResult, error: null }),
            }),
            then: (resolve: (value: { data: unknown; error: null }) => void) =>
              Promise.resolve({ data: insertResult, error: null }).then(resolve),
          };
        }
        return Promise.resolve({ data: state.data, error: state.error });
      },
      update: () => chain,
      delete: () => chain,
      then: (resolve: (value: { data: unknown; error: Error | null }) => void) =>
        Promise.resolve({ data: state.data, error: state.error }).then(resolve),
    };

    return chain;
  };

  const mockClient = {
    from: (table: string) => {
      switch (table) {
        case 'agents':
          return createChainableQuery(data.agents);
        case 'agent_tasks':
          return createChainableQuery(data.agentTasks, true);
        case 'agent_insights':
          return createChainableQuery(data.agentInsights, true);
        case 'enterprise_settings':
          return createChainableQuery(data.enterpriseSettings);
        default:
          return createChainableQuery([]);
      }
    },
    rpc: (_fnName: string, _params?: Record<string, unknown>) => {
      return Promise.resolve({ data: null, error: null });
    },
  } as unknown as MockSupabaseClient;

  return mockClient;
}

/**
 * Create a mock Supabase client that simulates errors
 */
export function createErrorMockSupabaseClient(errorMessage: string): MockSupabaseClient {
  const createErrorChain = () => {
    const chain: Record<string, (...args: unknown[]) => unknown> = {
      select: () => chain,
      eq: () => chain,
      neq: () => chain,
      is: () => chain,
      in: () => chain,
      order: () => chain,
      limit: () => chain,
      single: () => Promise.resolve({ data: null, error: new Error(errorMessage) }),
      maybeSingle: () => Promise.resolve({ data: null, error: new Error(errorMessage) }),
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: null, error: new Error(errorMessage) }),
        }),
      }),
      update: () => chain,
      delete: () => chain,
      then: (resolve: (value: { data: null; error: Error }) => void) =>
        Promise.resolve({ data: null, error: new Error(errorMessage) }).then(resolve),
    };
    return chain;
  };

  return {
    from: () => createErrorChain(),
    rpc: () => Promise.resolve({ data: null, error: new Error(errorMessage) }),
  } as unknown as MockSupabaseClient;
}

// =============================================================================
// TYPES
// =============================================================================

export interface MockOrchestrationPlan {
  orchestrationId: string;
  type: string;
  requestType: string;
  complexity: string;
  priority: string;
  requiredAgents: MockAgentReference[];
  dependencies: MockDependencyInfo[];
  steps: MockExecutionStep[];
  estimatedDuration: number;
  workflowType?: string;
  metadata: {
    requestedAt: string;
    context?: unknown;
    originalData: unknown;
  };
}

export interface MockAgentReference {
  type: string;
  taskType?: string;
  reason?: string;
  capabilities?: string[];
  priority: number;
  agent?: string;
  status?: string;
}

export interface MockDependencyInfo {
  agent: string;
  dependsOn: string | string[];
  reason: string;
}

export interface MockExecutionStep {
  stepId: string;
  agent?: string;
  agentType?: string;
  action?: string;
  task?: string;
  taskType?: string;
  dependencies: string[];
  estimatedDuration: number;
  canParallelize?: boolean;
  status?: string;
  duration?: number;
  error?: string;
  critical?: boolean;
}

export interface MockWorkflowExecution {
  orchestrationId: string;
  workflowName: string;
  status: string;
  steps: MockExecutionStep[];
  results: Record<string, MockAgentResult>;
  summary: MockWorkflowSummary | string;
}

export interface MockWorkflowSummary {
  stepsCompleted: number;
  totalSteps: number;
  totalDuration: number;
  success: boolean;
  keyFindings: string[];
  nextSteps: string[];
}

export interface MockAgentResult {
  success: boolean;
  data: unknown;
  insights: MockInsight[];
  rulesApplied: string[];
  confidence: number;
  processingTime: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface MockInsight {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
  data?: unknown;
  isActionable: boolean;
}

export interface MockAgentTask {
  id: string;
  agent_id: string;
  task_type: string;
  priority: number;
  status: string;
  payload: unknown;
}

export interface MockAgentInsight {
  id: string;
  agent_id: string;
  insight_type: string;
  title: string;
  description: string;
  severity: string;
  data: unknown;
}

export interface MockSupabaseOverrides {
  agents?: { id: string; type: string }[];
  agentTasks?: MockAgentTask[];
  agentInsights?: MockAgentInsight[];
  enterpriseSettings?: { id: string; value: unknown } | null;
}

export type MockSupabaseClient = SupabaseClient;

// =============================================================================
// VALID INPUT TEST DATA
// =============================================================================

const testEnterpriseId = generateTestUuid();
const testUserId = generateTestUuid();
const testContractId = generateTestUuid();
const testVendorId = generateTestUuid();

export const VALID_MANAGER_INPUTS = {
  simpleContent: {
    content: 'Review vendor performance metrics for Q4',
  },
  contractReview: {
    content: 'Review contract terms and legal clauses for vendor agreement',
    requestType: 'contract_review' as const,
  },
  vendorEvaluation: {
    content: 'Evaluate vendor supplier capabilities and onboard',
    requestType: 'vendor_evaluation' as const,
  },
  financialAnalysis: {
    content: 'Analyze cost budget and financial impact of new contract',
    requestType: 'financial_analysis' as const,
  },
  complianceCheck: {
    content: 'Check compliance with GDPR regulations and audit policy requirements',
    requestType: 'compliance_check' as const,
  },
  documentProcessing: {
    content: 'Process and extract data from uploaded document file',
    requestType: 'document_processing' as const,
  },
  alertConfiguration: {
    content: 'Configure alert notifications for contract deadlines and escalation reminders',
    requestType: 'alert_configuration' as const,
  },
  performanceReview: {
    content: 'Analyze vendor performance metrics and KPI data for quarterly review',
    requestType: 'performance_review' as const,
  },
  riskAssessment: {
    content: 'Assess risk and threat vulnerabilities in vendor relationships',
    requestType: 'risk_assessment' as const,
  },
  asyncExecution: {
    content: 'Review vendor contract terms',
    executionMode: 'asynchronous' as const,
  },
  withEntityRefs: {
    content: 'Review this contract',
    contractId: testContractId,
    vendorId: testVendorId,
  },
  withRequiredAgents: {
    content: 'Custom task',
    requiredAgents: ['financial' as const, 'legal' as const],
  },
  withWorkflowSteps: {
    content: 'Execute custom workflow',
    workflowSteps: [
      { agent: 'secretary', task: 'extract_data' },
      { agent: 'analytics', task: 'analyze_results' },
    ],
  },
  urgentRequest: {
    content: 'URGENT: Review contract terms immediately - deadline approaching',
    urgent: true,
    priority: 'critical' as const,
  },
  complexMultiAspect: {
    content: 'We need to review the contract agreement with vendor supplier for compliance with GDPR regulations. Analyze the cost budget and financial impact. Check legal clauses and evaluate risk and threat vulnerabilities. Generate a performance report with KPI analysis insights.',
  },
  generalRequest: {
    content: 'Hello, can you help me with something?',
  },
  textField: {
    text: 'Analyze vendor performance data',
  },
  taskField: {
    task: 'Generate quarterly vendor report',
  },
  withAction: {
    action: 'lifecycle',
    data: { contractId: testContractId },
  },
  budgetRequest: {
    content: 'Budget planning for next quarter',
    budgetRequest: true,
  },
  invoiceProcessing: {
    content: 'Process invoice payment',
    invoiceId: 'INV-2025-001',
  },
  auditRequest: {
    content: 'Perform compliance audit',
    auditType: 'annual',
  },
};

export const VALID_MANAGER_CONTEXT = {
  basic: {
    enterpriseId: testEnterpriseId,
    sessionId: 'session-123',
    environment: {},
    permissions: ['read', 'write'],
  },
  withRequestType: {
    enterpriseId: testEnterpriseId,
    sessionId: 'session-123',
    requestType: 'contract_review' as const,
    environment: {},
    permissions: [],
  },
  asyncMode: {
    enterpriseId: testEnterpriseId,
    sessionId: 'session-123',
    executionMode: 'asynchronous' as const,
    environment: {},
    permissions: [],
  },
  withMetadata: {
    enterpriseId: testEnterpriseId,
    sessionId: 'session-123',
    metadata: {
      executionMode: 'synchronous',
      source: 'test',
    },
    environment: {},
    permissions: [],
  },
  withUserId: {
    enterpriseId: testEnterpriseId,
    userId: testUserId,
    sessionId: 'session-123',
    environment: {},
    permissions: ['admin'],
  },
  empty: {},
};

// =============================================================================
// INVALID INPUT TEST DATA
// =============================================================================

export const INVALID_MANAGER_INPUTS = {
  emptyInput: {},
  invalidRequestType: {
    content: 'Test request',
    requestType: 'invalid_type',
  },
  invalidExecutionMode: {
    content: 'Test request',
    executionMode: 'parallel',
  },
  invalidPriority: {
    content: 'Test request',
    priority: 'super_high',
  },
  invalidAgentType: {
    content: 'Test request',
    requiredAgents: ['nonexistent_agent'],
  },
  invalidUuidContractId: {
    content: 'Test request',
    contractId: 'not-a-uuid',
  },
  invalidUuidVendorId: {
    content: 'Test request',
    vendorId: 12345,
  },
  invalidMaxConcurrency: {
    content: 'Test request',
    maxConcurrency: 100, // exceeds max of 10
  },
  invalidTimeoutMs: {
    content: 'Test request',
    timeoutMs: 1000, // below min of 5000
  },
  invalidWorkflowSteps: {
    content: 'Test request',
    workflowSteps: [
      { agent: '', task: '' }, // empty strings
    ],
  },
  nullContent: {
    content: null,
  },
};

export const INVALID_MANAGER_CONTEXT = {
  invalidEnterpriseId: {
    enterpriseId: 'not-a-uuid',
  },
  invalidUserId: {
    userId: 'not-a-uuid',
  },
  invalidRequestType: {
    requestType: 'invalid_type',
  },
  invalidExecutionMode: {
    executionMode: 'batch',
  },
};

// =============================================================================
// ERROR SIMULATION DATA
// =============================================================================

export const ERROR_SCENARIOS = {
  databaseError: {
    error: new Error('Database connection failed: ECONNREFUSED'),
    category: 'database' as const,
    isRetryable: true,
  },
  validationError: {
    error: new Error('Validation failed: Invalid request format'),
    category: 'validation' as const,
    isRetryable: false,
  },
  timeoutError: {
    error: new Error('Request timed out after 60000ms'),
    category: 'timeout' as const,
    isRetryable: true,
  },
  rateLimitError: {
    error: new Error('Rate limit exceeded: Too many requests (429)'),
    category: 'rate_limit' as const,
    isRetryable: true,
  },
  permissionError: {
    error: new Error('Permission denied: Insufficient privileges'),
    category: 'permission' as const,
    isRetryable: false,
  },
  networkError: {
    error: new Error('Network error: Connection reset'),
    category: 'network' as const,
    isRetryable: true,
  },
  internalError: {
    error: new Error('Internal error: Unexpected state'),
    category: 'internal' as const,
    isRetryable: false,
  },
};

// =============================================================================
// EDGE CASE TEST DATA
// =============================================================================

export const EDGE_CASE_DATA = {
  emptyContent: {
    content: '',
    requestType: 'general_request' as const,
  },
  veryLongContent: {
    content: 'A'.repeat(5000) + ' contract vendor compliance financial legal audit risk assessment',
  },
  specialCharacterContent: {
    content: 'Review contract <script>alert("xss")</script> for vendor & compliance',
  },
  unicodeContent: {
    content: 'Review contract for vendor Acme Corp. - prix: 100,000 EUR',
  },
  allAgentsRequired: {
    content: 'Review contract agreement with vendor supplier for compliance regulation audit. Analyze cost budget financial impact. Process document file. Configure alert notification remind. Evaluate performance metric KPI. Assess risk threat vulnerabilities.',
  },
  noAgentsMatch: {
    content: 'Hello world',
  },
  conflictingInputs: {
    content: 'Review vendor performance',
    text: 'Analyze contract compliance',
    requestType: 'financial_analysis' as const,
  },
  maxAgents: {
    requiredAgents: [
      'secretary' as const,
      'financial' as const,
      'legal' as const,
      'analytics' as const,
      'vendor' as const,
      'notifications' as const,
      'workflow' as const,
      'compliance' as const,
    ],
    content: 'Full analysis',
  },
};

// =============================================================================
// REQUEST ANALYSIS TEST DATA
// =============================================================================

export const REQUEST_ANALYSIS_DATA = {
  contractKeywords: [
    'Review the contract terms',
    'Check agreement clauses',
    'Analyze contract terms and conditions',
    'Review the clause liability',
  ],
  vendorKeywords: [
    'Evaluate vendor performance',
    'Assess supplier capabilities',
    'Onboard new vendor',
    'Evaluate vendor relationship',
  ],
  financialKeywords: [
    'Analyze cost implications',
    'Review budget allocation',
    'Check expense reports',
    'Assess financial impact of payment',
  ],
  complianceKeywords: [
    'Check compliance requirements',
    'Review regulation adherence',
    'Perform audit assessment',
    'Verify GDPR policy compliance',
  ],
  documentKeywords: [
    'Process document upload',
    'Extract file data',
    'Process the document content',
  ],
  alertKeywords: [
    'Configure alert settings',
    'Set up notification rules',
    'Schedule reminder for deadline',
    'Set up escalation rules',
  ],
  performanceKeywords: [
    'Review performance metrics',
    'Analyze KPI data',
    'Generate performance analysis report',
  ],
  riskKeywords: [
    'Assess risk exposure',
    'Identify threat vectors',
    'Evaluate vulnerability assessment',
  ],
  urgencyKeywords: [
    'URGENT: Need immediate review',
    'This is critical priority',
    'Emergency: deadline approaching ASAP',
  ],
  financialImpactKeywords: [
    'Total cost is $50,000',
    'Budget impact of dollar amount',
    'Invoice payment of $100,000',
  ],
};
