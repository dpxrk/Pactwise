import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import { SecretaryAgent } from './secretary.ts';
import { FinancialAgent } from './financial.ts';
import { LegalAgent } from './legal.ts';
import { AnalyticsAgent } from './analytics.ts';
import { VendorAgent } from './vendor.ts';
import { NotificationsAgent } from './notifications.ts';
import { ManagerAgent } from './manager.ts';
import { getFeatureFlag, getTimeout } from '../config/index.ts';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  DecisionTree,
  type DecisionTreeConfig,
  type ClassificationResult,
} from '../utils/statistics.ts';

// Workflow definition types
interface WorkflowStep {
  id: string;
  name: string;
  type: 'agent' | 'approval' | 'condition' | 'parallel' | 'notification' | 'wait';
  agent?: string;
  action?: string;
  conditions?: WorkflowCondition[];
  branches?: WorkflowBranch[];
  parallelSteps?: string[];
  approvers?: string[];
  waitDuration?: number;
  retryable?: boolean;
  rollbackAction?: string;
  compensationAction?: string;
  criticalStep?: boolean;
  errorHandler?: {
    type: 'retry' | 'skip' | 'fail' | 'compensate';
    maxRetries?: number;
    retryDelay?: number;
    fallbackStep?: string;
  };
  metadata?: Record<string, unknown>;
}

interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: unknown;
}

interface WorkflowBranch {
  condition: WorkflowCondition;
  nextStep: string;
}

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  version: number;
  triggers?: WorkflowTrigger[];
  steps: WorkflowStep[];
  variables?: Record<string, unknown>;
  timeout?: number;
  retryPolicy?: {
    maxRetries: number;
    backoffMultiplier: number;
  };
}

interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'manual' | 'webhook';
  schedule?: string; // cron expression
  event?: string;
  conditions?: WorkflowCondition[];
}

interface WorkflowState {
  workflowId: string;
  executionId: string;
  currentStep: string;
  status: 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled' | 'rolled_back' | 'compensated';
  context: Record<string, unknown>;
  stepResults: Record<string, unknown>;
  stepErrors: Record<string, unknown>;
  checkpoints: WorkflowCheckpoint[];
  compensationLog: CompensationAction[];
  startTime: Date;
  endTime?: Date;
  error?: string;
  retryCount: number;
}

interface WorkflowCheckpoint {
  stepId: string;
  timestamp: Date;
  state: Record<string, unknown>;
  canRollback: boolean;
}

interface CompensationAction {
  stepId: string;
  action: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

// Type guard for workflow data
interface WorkflowData {
  recover?: boolean;
  executionId?: string;
  workflowType?: string;
  workflowId?: string;
  action?: string;
  budgetRequest?: unknown;
  auditType?: string;
  invoiceId?: string;
  [key: string]: unknown;
}

function isWorkflowData(data: unknown): data is WorkflowData {
  return typeof data === 'object' && data !== null;
}

// Decision Tree routing configuration
interface ApprovalRoutingDecision {
  approvalLevel: 'auto' | 'manager' | 'executive' | 'board';
  confidence: number;
  reasoning: string[];
}

interface ApprovalHistoryRecord {
  amount: number;
  riskLevel: number;
  vendorScore: number;
  contractType: string;
  approvalLevel: string;
  approved: boolean;
}

export class WorkflowAgent extends BaseAgent {
  private agents: Map<string, BaseAgent> = new Map();
  private workflowDefinitions: Map<string, WorkflowDefinition> = new Map();

  // Decision Tree for learned approval routing
  private approvalRoutingTree: DecisionTree | null = null;
  private approvalTreeTrained: boolean = false;
  private approvalTreeLastTrainedAt: Date | null = null;
  private readonly DECISION_TREE_CONFIG: DecisionTreeConfig = {
    maxDepth: 6,
    minSamplesSplit: 5,
    minSamplesLeaf: 2,
    criterion: 'gini',
  };

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    super(supabase, enterpriseId);
    this.initializeAgents();
    this.loadWorkflowDefinitions();
    // Initialize decision tree asynchronously
    this.initializeApprovalDecisionTree().catch(console.error);
  }

  get agentType() {
    return 'workflow';
  }

  get capabilities() {
    return [
      'workflow_orchestration',
      'multi_step_execution',
      'conditional_branching',
      'parallel_processing',
      'approval_management',
      'state_tracking',
      'rollback_handling',
      'scheduled_workflows',
      'ml_approval_routing', // Decision Tree learned routing
      'self_improving_rules', // Learns from historical decisions
    ];
  }

  private initializeAgents() {
    this.agents = new Map<string, BaseAgent>([
      ['secretary', new SecretaryAgent(this.supabase, this.enterpriseId) as BaseAgent],
      ['financial', new FinancialAgent(this.supabase, this.enterpriseId) as BaseAgent],
      ['legal', new LegalAgent(this.supabase, this.enterpriseId) as BaseAgent],
      ['analytics', new AnalyticsAgent(this.supabase, this.enterpriseId) as BaseAgent],
      ['vendor', new VendorAgent(this.supabase, this.enterpriseId) as BaseAgent],
      ['notifications', new NotificationsAgent(this.supabase, this.enterpriseId) as BaseAgent],
      ['manager', new ManagerAgent(this.supabase, this.enterpriseId) as BaseAgent],
    ]);
  }

  private loadWorkflowDefinitions() {
    this.workflowDefinitions = new Map();

    // Load predefined workflow templates
    this.workflowDefinitions.set('contract_lifecycle', this.createContractLifecycleWorkflow());
    this.workflowDefinitions.set('vendor_onboarding', this.createVendorOnboardingWorkflow());
    this.workflowDefinitions.set('budget_planning', this.createBudgetPlanningWorkflow());
    this.workflowDefinitions.set('compliance_audit', this.createComplianceAuditWorkflow());
    this.workflowDefinitions.set('invoice_processing', this.createInvoiceProcessingWorkflow());
  }

  // ============================================================================
  // DECISION TREE APPROVAL ROUTING (Machine Learned from Historical Decisions)
  // ============================================================================

  /**
   * Initialize and train the Decision Tree from historical approval data
   */
  private async initializeApprovalDecisionTree(): Promise<void> {
    try {
      // Check if we should retrain (train once per day or if never trained)
      const shouldTrain = !this.approvalTreeLastTrainedAt ||
        (Date.now() - this.approvalTreeLastTrainedAt.getTime()) > 24 * 60 * 60 * 1000;

      if (!shouldTrain && this.approvalTreeTrained) {
        return;
      }

      // Fetch historical approval decisions
      const { data: approvals, error } = await this.supabase
        .from('workflow_approvals')
        .select(`
          id,
          status,
          context,
          workflow_execution_id,
          required_approvers,
          approved_by,
          created_at
        `)
        .eq('enterprise_id', this.enterpriseId)
        .in('status', ['approved', 'rejected'])
        .order('created_at', { ascending: false })
        .limit(500);

      if (error || !approvals || approvals.length < 20) {
        // Not enough historical data to train
        console.log(`Decision Tree: Insufficient training data (${approvals?.length || 0} records)`);
        return;
      }

      // Fetch related workflow execution data for context
      const executionIds = [...new Set(approvals.map(a => a.workflow_execution_id))];
      const { data: executions } = await this.supabase
        .from('workflow_executions')
        .select('id, step_results, context')
        .in('id', executionIds);

      const executionMap = new Map(executions?.map(e => [e.id, e]) || []);

      // Prepare training data
      const features: number[][] = [];
      const labels: string[] = [];
      const featureNames = ['amount', 'risk_level', 'vendor_score', 'contract_type_code', 'urgency'];

      for (const approval of approvals) {
        const execution = executionMap.get(approval.workflow_execution_id);
        if (!execution) continue;

        // Extract features from context
        const amount = this.extractNumericFeature(execution.step_results, 'amount', execution.context);
        const riskLevel = this.extractRiskLevel(execution.step_results);
        const vendorScore = this.extractVendorScore(execution.step_results, execution.context);
        const contractTypeCode = this.encodeContractType(execution.context?.contractType);
        const urgency = this.extractUrgency(execution.context);

        // Determine actual approval level used
        const approvalLevel = this.determineHistoricalApprovalLevel(approval.required_approvers);

        features.push([amount, riskLevel, vendorScore, contractTypeCode, urgency]);
        labels.push(approvalLevel);
      }

      if (features.length < 20) {
        console.log('Decision Tree: Not enough valid training samples');
        return;
      }

      // Train the decision tree
      this.approvalRoutingTree = new DecisionTree(this.DECISION_TREE_CONFIG);
      this.approvalRoutingTree.fit(features, labels, featureNames);
      this.approvalTreeTrained = true;
      this.approvalTreeLastTrainedAt = new Date();

      // Log learned rules for transparency
      const rules = this.approvalRoutingTree.getRules();
      console.log(`Decision Tree: Trained with ${features.length} samples, ${rules.length} rules learned`);

    } catch (err) {
      console.error('Decision Tree training error:', err);
    }
  }

  /**
   * Use Decision Tree to predict optimal approval routing
   */
  public predictApprovalRouting(
    amount: number,
    riskLevel: number,
    vendorScore: number,
    contractType: string,
    urgency: number = 0.5,
  ): ApprovalRoutingDecision {
    // Default to rule-based routing if tree not trained
    if (!this.approvalRoutingTree || !this.approvalTreeTrained) {
      return this.ruleBasedApprovalRouting(amount, riskLevel, vendorScore);
    }

    try {
      const contractTypeCode = this.encodeContractType(contractType);
      const features = [amount, riskLevel, vendorScore, contractTypeCode, urgency];

      const result: ClassificationResult = this.approvalRoutingTree.predict(features);

      return {
        approvalLevel: result.prediction as ApprovalRoutingDecision['approvalLevel'],
        confidence: result.confidence,
        reasoning: [
          `Predicted by Decision Tree with ${(result.confidence * 100).toFixed(1)}% confidence`,
          ...result.path.map(p => `• ${p}`),
        ],
      };
    } catch (err) {
      console.error('Decision Tree prediction error:', err);
      return this.ruleBasedApprovalRouting(amount, riskLevel, vendorScore);
    }
  }

  /**
   * Fallback rule-based routing when Decision Tree is unavailable
   */
  private ruleBasedApprovalRouting(
    amount: number,
    riskLevel: number,
    vendorScore: number,
  ): ApprovalRoutingDecision {
    const reasoning: string[] = [];

    // Board approval for very high amounts
    if (amount > 1000000) {
      reasoning.push('Amount exceeds $1M threshold');
      return { approvalLevel: 'board', confidence: 0.95, reasoning };
    }

    // Executive approval for high amounts or high risk
    if (amount > 100000 || riskLevel > 0.7) {
      if (amount > 100000) reasoning.push('Amount exceeds $100K threshold');
      if (riskLevel > 0.7) reasoning.push('High risk level detected');
      return { approvalLevel: 'executive', confidence: 0.9, reasoning };
    }

    // Manager approval for medium amounts or medium risk
    if (amount > 10000 || riskLevel > 0.4) {
      if (amount > 10000) reasoning.push('Amount exceeds $10K threshold');
      if (riskLevel > 0.4) reasoning.push('Medium risk level');
      return { approvalLevel: 'manager', confidence: 0.85, reasoning };
    }

    // Auto-approval for low amounts, low risk, and good vendor score
    if (vendorScore > 0.7) {
      reasoning.push('Low amount, low risk, trusted vendor');
      return { approvalLevel: 'auto', confidence: 0.8, reasoning };
    }

    // Default to manager for safety
    reasoning.push('Default routing to manager');
    return { approvalLevel: 'manager', confidence: 0.7, reasoning };
  }

  /**
   * Get human-readable rules from the trained Decision Tree
   */
  public getApprovalRoutingRules(): string[] {
    if (!this.approvalRoutingTree || !this.approvalTreeTrained) {
      return [
        'Decision Tree not yet trained - using rule-based routing:',
        'IF amount > $1M THEN board',
        'IF amount > $100K OR risk > 70% THEN executive',
        'IF amount > $10K OR risk > 40% THEN manager',
        'IF vendor_score > 70% AND risk <= 40% THEN auto',
        'DEFAULT: manager',
      ];
    }
    return this.approvalRoutingTree.getRules();
  }

  // Feature extraction helpers
  private extractNumericFeature(stepResults: Record<string, unknown> | null, field: string, context: Record<string, unknown> | null): number {
    // Check step results first
    if (stepResults) {
      for (const [, result] of Object.entries(stepResults)) {
        if (result && typeof result === 'object' && field in result) {
          const value = (result as Record<string, unknown>)[field];
          if (typeof value === 'number') return value;
        }
      }
    }
    // Check context
    if (context && field in context) {
      const value = context[field];
      if (typeof value === 'number') return value;
    }
    return 0;
  }

  private extractRiskLevel(stepResults: Record<string, unknown> | null): number {
    if (!stepResults) return 0.5;

    for (const [key, result] of Object.entries(stepResults)) {
      if ((key.includes('risk') || key.includes('assessment')) && result && typeof result === 'object') {
        const resultObj = result as Record<string, unknown>;
        if ('riskLevel' in resultObj && typeof resultObj.riskLevel === 'number') {
          return resultObj.riskLevel;
        }
        if ('riskScore' in resultObj && typeof resultObj.riskScore === 'number') {
          return resultObj.riskScore / 100; // Normalize to 0-1
        }
      }
    }
    return 0.5;
  }

  private extractVendorScore(stepResults: Record<string, unknown> | null, context: Record<string, unknown> | null): number {
    if (stepResults) {
      for (const [, result] of Object.entries(stepResults)) {
        if (result && typeof result === 'object') {
          const resultObj = result as Record<string, unknown>;
          if ('vendorScore' in resultObj && typeof resultObj.vendorScore === 'number') {
            return resultObj.vendorScore / 100;
          }
          if ('performanceScore' in resultObj && typeof resultObj.performanceScore === 'number') {
            return resultObj.performanceScore / 100;
          }
        }
      }
    }
    if (context && 'vendorScore' in context && typeof context.vendorScore === 'number') {
      return context.vendorScore / 100;
    }
    return 0.5;
  }

  private extractUrgency(context: Record<string, unknown> | null): number {
    if (!context) return 0.5;
    if ('urgency' in context && typeof context.urgency === 'number') {
      return context.urgency;
    }
    if ('priority' in context) {
      const priority = context.priority;
      if (priority === 'critical') return 1.0;
      if (priority === 'high') return 0.75;
      if (priority === 'medium') return 0.5;
      if (priority === 'low') return 0.25;
    }
    return 0.5;
  }

  private encodeContractType(contractType: string | undefined): number {
    const typeMap: Record<string, number> = {
      'master_agreement': 1,
      'nda': 2,
      'service': 3,
      'purchase': 4,
      'lease': 5,
      'employment': 6,
      'partnership': 7,
      'license': 8,
      'other': 0,
    };
    return typeMap[(contractType || '').toLowerCase()] || 0;
  }

  private determineHistoricalApprovalLevel(approvers: string[] | null): string {
    if (!approvers || approvers.length === 0) return 'auto';

    const approverStr = approvers.join(',').toLowerCase();
    if (approverStr.includes('board')) return 'board';
    if (approverStr.includes('ceo') || approverStr.includes('cfo') || approverStr.includes('executive')) return 'executive';
    if (approverStr.includes('manager')) return 'manager';
    return 'auto';
  }

  async process(data: unknown, context?: AgentContext): Promise<ProcessingResult> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];
    const confidence = 0.9;

    try {
      // Validate and type the data
      if (!isWorkflowData(data)) {
        throw new Error('Invalid workflow data format');
      }

      // Check if this is a workflow recovery request
      if (data.recover && data.executionId) {
        return await this.recoverWorkflow(data.executionId, insights, rulesApplied);
      }

      // Determine workflow type
      const workflowType = this.determineWorkflowType(data, context);
      rulesApplied.push(`workflow_type_${workflowType}`);

      // Get workflow definition
      const workflow = this.workflowDefinitions.get(workflowType) ||
                      (data.workflowId ? await this.loadCustomWorkflow(data.workflowId) : null);

      if (!workflow) {
        throw new Error(`Unknown workflow type: ${workflowType}`);
      }

      // Initialize workflow state
      const workflowState = await this.initializeWorkflowState(workflow, data, context);

      // Execute workflow
      const result = await this.executeWorkflow(workflow, workflowState, rulesApplied, insights);

      // Generate workflow insights
      this.generateWorkflowInsights(workflowState, insights);

      return this.createResult(
        result.success,
        result,
        insights,
        rulesApplied,
        confidence,
        { workflowType, executionId: workflowState.executionId },
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return this.createResult(
        false,
        undefined,
        insights,
        rulesApplied,
        0,
        { error: errorMessage },
      );
    }
  }

  private determineWorkflowType(data: WorkflowData, context?: AgentContext): string {
    if (data.workflowType) {return data.workflowType;}

    // Infer workflow type from context
    if (context?.contractId && data.action === 'lifecycle') {return 'contract_lifecycle';}
    if (context?.vendorId && data.action === 'onboard') {return 'vendor_onboarding';}
    if (data.budgetRequest) {return 'budget_planning';}
    if (data.auditType) {return 'compliance_audit';}
    if (data.invoiceId) {return 'invoice_processing';}

    return 'custom';
  }

  private async initializeWorkflowState(
    workflow: WorkflowDefinition,
    data: WorkflowData,
    context?: AgentContext,
  ): Promise<WorkflowState> {
    const executionId = `wf_exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Store workflow execution in database
    await this.supabase.from('workflow_executions').insert({
      id: executionId,
      workflow_id: workflow.id,
      workflow_version: workflow.version,
      status: 'running',
      context: { ...data, ...context },
      enterprise_id: this.enterpriseId,
      created_by: context?.userId,
    });

    const initialState: WorkflowState = {
      workflowId: workflow.id,
      executionId,
      currentStep: workflow.steps[0].id,
      status: 'running',
      context: { ...workflow.variables, ...data, ...context },
      stepResults: {},
      stepErrors: {},
      checkpoints: [],
      compensationLog: [],
      startTime: new Date(),
      retryCount: 0,
    };

    // Create initial checkpoint
    await this.createCheckpoint(initialState, workflow.steps[0].id);

    return initialState;
  }

  private async executeWorkflow(
    workflow: WorkflowDefinition,
    state: WorkflowState,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<{
    success: boolean;
    executionId: string;
    status: string;
    results: Record<string, unknown>;
    duration?: number;
  }> {
    const timeout = workflow.timeout || getTimeout('LONG_RUNNING');
    const startTime = Date.now();

    try {
      while (state.status === 'running' || state.status === 'waiting') {
        // Check timeout
        if (Date.now() - startTime > timeout) {
          throw new Error('Workflow execution timeout');
        }

        // Get current step
        const currentStep = workflow.steps.find(s => s.id === state.currentStep);
        if (!currentStep) {
          throw new Error(`Step not found: ${state.currentStep}`);
        }

        // Execute step
        const stepResult = await this.executeStep(currentStep, state, rulesApplied, insights);
        state.stepResults[currentStep.id] = stepResult;

        // Update workflow state
        await this.updateWorkflowState(state);

        // Determine next step
        const nextStep = await this.determineNextStep(currentStep, state, workflow);

        if (!nextStep) {
          state.status = 'completed';
        } else {
          state.currentStep = nextStep;
        }
      }

      state.endTime = new Date();
      await this.finalizeWorkflow(state);

      return {
        success: true,
        executionId: state.executionId,
        status: state.status,
        results: state.stepResults,
        duration: state.endTime.getTime() - state.startTime.getTime(),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      state.status = 'failed';
      state.error = errorMessage;
      state.endTime = new Date();

      insights.push(this.createInsight(
        'workflow_failed',
        'critical',
        'Workflow Execution Failed',
        `Workflow '${workflow.name}' failed: ${errorMessage}`,
        undefined,
        {
          executionId: state.executionId,
          failedStep: state.currentStep,
          error: errorMessage,
        },
        true,
      ));

      // Attempt rollback if configured
      if (getFeatureFlag('ENABLE_WORKFLOW_AUTOMATION')) {
        const rollbackSuccess = await this.attemptRollback(workflow, state, rulesApplied, insights);

        if (!rollbackSuccess) {
          insights.push(this.createInsight(
            'manual_intervention_required',
            'critical',
            'Manual Intervention Required',
            'Workflow rollback incomplete - manual intervention may be required',
            undefined,
            { executionId: state.executionId },
            true,
          ));
        }
      }

      await this.finalizeWorkflow(state);

      // Store error details for analysis
      await this.supabase.from('workflow_errors').insert({
        workflow_execution_id: state.executionId,
        error_message: errorMessage,
        error_stack: error instanceof Error ? error.stack : undefined,
        failed_step: state.currentStep,
        step_errors: state.stepErrors,
        compensation_log: state.compensationLog,
        enterprise_id: this.enterpriseId,
        created_at: new Date().toISOString(),
      });

      throw error;
    }
  }

  private async executeStep(
    step: WorkflowStep,
    state: WorkflowState,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<unknown> {
    rulesApplied.push(`executing_step_${step.id}`);

    let retryCount = 0;
    const maxRetries = step.errorHandler?.maxRetries || (step.retryable ? 3 : 0);
    const retryDelay = step.errorHandler?.retryDelay || 1000;

    while (retryCount <= maxRetries) {
      try {
        // Create checkpoint before critical steps
        if (step.criticalStep) {
          await this.createCheckpoint(state, step.id);
        }

        let result: unknown;
        switch (step.type) {
          case 'agent':
            result = await this.executeAgentStep(step, state, insights);
            break;

          case 'approval':
            result = await this.executeApprovalStep(step, state, insights);
            break;

          case 'condition':
            result = await this.executeConditionStep(step, state);
            break;

          case 'parallel':
            result = await this.executeParallelStep(step, state, insights);
            break;

          case 'notification':
            result = await this.executeNotificationStep(step, state);
            break;

          case 'wait':
            result = await this.executeWaitStep(step, state);
            break;

          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        // Clear any previous errors for this step
        delete state.stepErrors[step.id];

        return result;

      } catch (error) {
        retryCount++;
        state.stepErrors[step.id] = {
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString(),
          retryCount,
        };

        insights.push(this.createInsight(
          'step_execution_failed',
          'high',
          'Step Execution Failed',
          `Step '${step.name}' failed: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          { stepId: step.id, retryCount, maxRetries },
          true,
        ));

        if (retryCount <= maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, retryDelay * Math.pow(2, retryCount - 1)));
          continue;
        }

        // Handle error based on error handler configuration
        if (step.errorHandler) {
          return await this.handleStepError(step, state, error, insights);
        }

        throw error;
      }
    }
  }

  private async executeAgentStep(
    step: WorkflowStep,
    state: WorkflowState,
    insights: Insight[],
  ): Promise<unknown> {
    if (!step.agent || !step.action) {
      throw new Error('Agent step missing agent or action');
    }

    const agent = this.agents.get(step.agent);
    if (!agent) {
      throw new Error(`Agent not found: ${step.agent}`);
    }

    // Prepare agent data with workflow context
    const agentData = {
      ...state.context,
      action: step.action,
      workflowStep: step.id,
      previousResults: state.stepResults,
    };

    // Execute agent
    const result = await agent.process(agentData, {
      userId: typeof state.context.userId === 'string' ? state.context.userId : undefined,
      enterpriseId: this.enterpriseId,
      sessionId: state.executionId,
      environment: { workflowExecutionId: state.executionId },
      permissions: [],
      metadata: { workflowExecutionId: state.executionId },
    });

    // Merge insights
    insights.push(...result.insights);

    // Store agent result
    await this.storeStepResult(state.executionId, step.id, result);

    return result.data;
  }

  private async executeApprovalStep(
    step: WorkflowStep,
    state: WorkflowState,
    insights: Insight[],
  ): Promise<unknown> {
    // Create approval request
    const approvalRequest = await this.createApprovalRequest(step, state);

    // Send notifications to approvers
    const notifications = new NotificationsAgent(this.supabase, this.enterpriseId);
    await notifications.process({
      type: 'approval_required',
      approvalId: approvalRequest.id,
      workflowName: state.workflowId,
      stepName: step.name,
      approvers: step.approvers,
    }, {
      enterpriseId: this.enterpriseId,
      sessionId: state.executionId,
      environment: {},
      permissions: [],
      metadata: {
        notificationType: 'alert',
        eventType: 'workflow_approval',
      },
    });

    // Update state to waiting
    state.status = 'waiting';

    insights.push(this.createInsight(
      'approval_requested',
      'medium',
      'Approval Required',
      `Workflow is waiting for approval at step: ${step.name}`,
      'Monitor approval status',
      { approvalId: approvalRequest.id, approvers: step.approvers },
    ));

    // Poll for approval (in real implementation, this would be event-driven)
    return this.waitForApproval(approvalRequest.id, step);
  }

  private async executeConditionStep(
    step: WorkflowStep,
    state: WorkflowState,
  ): Promise<unknown> {
    if (!step.branches || step.branches.length === 0) {
      throw new Error('Condition step missing branches');
    }

    // Evaluate conditions
    for (const branch of step.branches) {
      if (this.evaluateCondition(branch.condition, state.context)) {
        return {
          conditionMet: true,
          nextStep: branch.nextStep,
          condition: branch.condition,
        };
      }
    }

    return {
      conditionMet: false,
      defaultNext: true,
    };
  }

  private async executeParallelStep(
    step: WorkflowStep,
    state: WorkflowState,
    insights: Insight[],
  ): Promise<unknown> {
    if (!step.parallelSteps || step.parallelSteps.length === 0) {
      throw new Error('Parallel step missing parallel steps');
    }

    const parallelPromises = step.parallelSteps.map(async (stepId) => {
      const parallelStep = state.context.workflow.steps.find((s: WorkflowStep) => s.id === stepId);
      if (!parallelStep) {
        throw new Error(`Parallel step not found: ${stepId}`);
      }

      return this.executeStep(parallelStep, state, [], insights);
    });

    const results = await Promise.allSettled(parallelPromises);

    // Check for failures
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      throw new Error(`${failures.length} parallel steps failed`);
    }

    return {
      parallelResults: results.map(r => r.status === 'fulfilled' ? r.value : null),
      allSucceeded: failures.length === 0,
    };
  }

  private async executeNotificationStep(
    step: WorkflowStep,
    state: WorkflowState,
  ): Promise<unknown> {
    const notifications = new NotificationsAgent(this.supabase, this.enterpriseId);

    const result = await notifications.process({
      type: step.metadata?.notificationType || 'workflow_update',
      title: step.metadata?.title || `Workflow Update: ${step.name}`,
      message: this.formatNotificationMessage(step, state),
      recipients: step.metadata?.recipients || state.context.stakeholders,
      data: {
        workflowId: state.workflowId,
        executionId: state.executionId,
        step: step.id,
        context: state.context,
      },
    }, {
      enterpriseId: this.enterpriseId,
      sessionId: state.executionId,
      environment: {},
      permissions: [],
      metadata: {
        notificationType: step.metadata?.channel || 'alert',
      },
    });

    return result.data;
  }

  private async executeWaitStep(
    step: WorkflowStep,
    state: WorkflowState,
  ): Promise<unknown> {
    const waitDuration = step.waitDuration || 60000; // Default 1 minute

    // Update state to waiting
    state.status = 'waiting';
    await this.updateWorkflowState(state);

    // In production, this would schedule a job
    await new Promise(resolve => setTimeout(resolve, waitDuration));

    state.status = 'running';

    return {
      waitCompleted: true,
      duration: waitDuration,
    };
  }

  private evaluateCondition(condition: WorkflowCondition, context: unknown): boolean {
    const value = this.getNestedValue(context, condition.field);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return typeof value === 'number' && typeof condition.value === 'number' && value > condition.value;
      case 'less_than':
        return typeof value === 'number' && typeof condition.value === 'number' && value < condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return false;
    }
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private async determineNextStep(
    currentStep: WorkflowStep,
    state: WorkflowState,
    workflow: WorkflowDefinition,
  ): Promise<string | null> {
    const currentIndex = workflow.steps.findIndex(s => s.id === currentStep.id);

    // Handle conditional branching
    if (currentStep.type === 'condition') {
      const result = state.stepResults[currentStep.id];
      if (result?.nextStep) {
        return result.nextStep;
      }
    }

    // Default to next step in sequence
    if (currentIndex < workflow.steps.length - 1) {
      return workflow.steps[currentIndex + 1].id;
    }

    return null; // Workflow complete
  }

  private async updateWorkflowState(state: WorkflowState) {
    await this.supabase
      .from('workflow_executions')
      .update({
        current_step: state.currentStep,
        status: state.status,
        step_results: state.stepResults,
        updated_at: new Date().toISOString(),
      })
      .eq('id', state.executionId);
  }

  private async finalizeWorkflow(state: WorkflowState) {
    await this.supabase
      .from('workflow_executions')
      .update({
        status: state.status,
        step_results: state.stepResults,
        error: state.error,
        completed_at: state.endTime?.toISOString(),
        duration_ms: state.endTime ?
          state.endTime.getTime() - state.startTime.getTime() : null,
      })
      .eq('id', state.executionId);
  }

  private async attemptRollback(
    workflow: WorkflowDefinition,
    state: WorkflowState,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<boolean> {
    rulesApplied.push('rollback_attempt');
    let rollbackSuccess = true;

    insights.push(this.createInsight(
      'rollback_initiated',
      'high',
      'Workflow Rollback Initiated',
      `Starting rollback for workflow execution ${state.executionId}`,
      undefined,
      { executionId: state.executionId, failedStep: state.currentStep },
      true,
    ));

    // Find the latest checkpoint
    const latestCheckpoint = state.checkpoints
      .filter(cp => cp.canRollback)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (latestCheckpoint) {
      // Restore state from checkpoint
      state.context = { ...state.context, ...latestCheckpoint.state };
      rulesApplied.push('checkpoint_restore');
    }

    // Execute rollback/compensation actions in reverse order
    const executedSteps = Object.keys(state.stepResults).reverse();

    for (const stepId of executedSteps) {
      const step = workflow.steps.find(s => s.id === stepId);
      if (!step) {continue;}

      try {
        if (step.compensationAction) {
          // Execute compensation action (preferred)
          await this.executeCompensationAction(step, state, insights);
          state.compensationLog.push({
            stepId,
            action: step.compensationAction,
            timestamp: new Date(),
            success: true,
          });
        } else if (step.rollbackAction) {
          // Execute rollback action (legacy)
          await this.executeRollbackAction(step, state);
          state.compensationLog.push({
            stepId,
            action: step.rollbackAction,
            timestamp: new Date(),
            success: true,
          });
        }
      } catch (error) {
        rollbackSuccess = false;
        state.compensationLog.push({
          stepId,
          action: step.compensationAction || step.rollbackAction || 'unknown',
          timestamp: new Date(),
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });

        insights.push(this.createInsight(
          'rollback_step_failed',
          'critical',
          'Rollback Step Failed',
          `Failed to rollback step '${step.name}': ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          { stepId, error: error instanceof Error ? error.message : String(error) },
          true,
        ));
      }
    }

    state.status = rollbackSuccess ? 'rolled_back' : 'compensated';

    insights.push(this.createInsight(
      rollbackSuccess ? 'rollback_completed' : 'rollback_partial',
      rollbackSuccess ? 'medium' : 'high',
      rollbackSuccess ? 'Rollback Completed' : 'Partial Rollback',
      rollbackSuccess
        ? 'Workflow successfully rolled back'
        : 'Workflow partially rolled back with errors',
      undefined,
      {
        executionId: state.executionId,
        compensationActions: state.compensationLog.length,
        failures: state.compensationLog.filter(log => !log.success).length,
      },
      !rollbackSuccess,
    ));

    return rollbackSuccess;
  }

  private async executeRollbackAction(step: WorkflowStep, state: WorkflowState) {
    if (!step.rollbackAction || !step.agent) {return;}

    const agent = this.agents.get(step.agent);
    if (!agent) {return;}

    await agent.process({
      action: step.rollbackAction,
      originalData: state.stepResults[step.id],
      workflowContext: state.context,
    }, {
      userId: state.context.userId || '',
      enterpriseId: this.enterpriseId,
      sessionId: state.executionId,
      environment: { isRollback: true, workflowExecutionId: state.executionId },
      permissions: [],
      metadata: { isRollback: true, workflowExecutionId: state.executionId },
    });
  }

  private async executeCompensationAction(
    step: WorkflowStep,
    state: WorkflowState,
    insights: Insight[],
  ) {
    if (!step.compensationAction || !step.agent) {return;}

    const agent = this.agents.get(step.agent);
    if (!agent) {
      throw new Error(`Agent not found for compensation: ${step.agent}`);
    }

    const result = await agent.process({
      action: step.compensationAction,
      originalData: state.stepResults[step.id],
      stepErrors: state.stepErrors[step.id],
      workflowContext: state.context,
      compensationContext: {
        reason: state.error,
        failedStep: state.currentStep,
        executionId: state.executionId,
      },
    }, {
      userId: state.context.userId || '',
      enterpriseId: this.enterpriseId,
      sessionId: state.executionId,
      environment: { isCompensation: true, workflowExecutionId: state.executionId },
      permissions: [],
      metadata: { isCompensation: true, workflowExecutionId: state.executionId },
    });

    if (result.insights) {
      insights.push(...result.insights);
    }

    return result;
  }

  private async createCheckpoint(
    state: WorkflowState,
    stepId: string,
  ): Promise<void> {
    const checkpoint: WorkflowCheckpoint = {
      stepId,
      timestamp: new Date(),
      state: {
        stepResults: { ...state.stepResults },
        context: { ...state.context },
        currentStep: state.currentStep,
      },
      canRollback: true,
    };

    state.checkpoints.push(checkpoint);

    // Store checkpoint in database for recovery
    await this.supabase.from('workflow_checkpoints').insert({
      workflow_execution_id: state.executionId,
      step_id: stepId,
      state_snapshot: checkpoint.state,
      created_at: checkpoint.timestamp,
      enterprise_id: this.enterpriseId,
    });

    // Keep only last 10 checkpoints in memory
    if (state.checkpoints.length > 10) {
      state.checkpoints = state.checkpoints.slice(-10);
    }
  }

  private async handleStepError(
    step: WorkflowStep,
    state: WorkflowState,
    error: Error | unknown,
    insights: Insight[],
  ): Promise<unknown> {
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (!step.errorHandler) {
      throw error;
    }

    switch (step.errorHandler.type) {
      case 'skip':
        insights.push(this.createInsight(
          'step_skipped',
          'medium',
          'Step Skipped Due to Error',
          `Step '${step.name}' skipped after error: ${errorMessage}`,
          undefined,
          { stepId: step.id, errorType: 'skip' },
          true,
        ));
        return { skipped: true, reason: errorMessage };

      case 'compensate':
        if (step.compensationAction) {
          insights.push(this.createInsight(
            'step_compensating',
            'high',
            'Executing Compensation Action',
            `Compensating for failed step '${step.name}'`,
            undefined,
            { stepId: step.id },
            true,
          ));
          return this.executeCompensationAction(step, state, insights);
        }
        throw error;

      case 'fail':
        throw error;

      default:
        // Try fallback step if defined
        if (step.errorHandler.fallbackStep) {
          insights.push(this.createInsight(
            'fallback_step',
            'medium',
            'Executing Fallback Step',
            `Falling back to step '${step.errorHandler.fallbackStep}'`,
            undefined,
            { originalStep: step.id, fallbackStep: step.errorHandler.fallbackStep },
            true,
          ));
          state.currentStep = step.errorHandler.fallbackStep;
          return { fallback: true, toStep: step.errorHandler.fallbackStep };
        }
        throw error;
    }
  }

  private async createApprovalRequest(step: WorkflowStep, state: WorkflowState) {
    const { data } = await this.supabase
      .from('workflow_approvals')
      .insert({
        workflow_execution_id: state.executionId,
        step_id: step.id,
        status: 'pending',
        required_approvers: step.approvers,
        context: {
          stepName: step.name,
          workflowId: state.workflowId,
          requestedAt: new Date().toISOString(),
        },
        enterprise_id: this.enterpriseId,
      })
      .select()
      .single();

    return data;
  }

  private async waitForApproval(approvalId: string, _step: WorkflowStep): Promise<unknown> {
    // In production, this would be event-driven
    // For now, simulate waiting with polling
    const maxWaitTime = 300000; // 5 minutes
    const pollInterval = 5000; // 5 seconds
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const { data: approval } = await this.supabase
        .from('workflow_approvals')
        .select('*')
        .eq('id', approvalId)
        .single();

      if (approval.status !== 'pending') {
        return {
          approved: approval.status === 'approved',
          approver: approval.approved_by,
          comments: approval.comments,
          approvedAt: approval.approved_at,
        };
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error('Approval timeout');
  }

  private async storeStepResult(executionId: string, stepId: string, result: unknown) {
    const isSuccess = result && typeof result === 'object' && 'success' in result
      ? (result as { success: boolean }).success
      : true;

    await this.supabase
      .from('workflow_step_results')
      .insert({
        execution_id: executionId,
        step_id: stepId,
        result,
        success: isSuccess,
        created_at: new Date().toISOString(),
      });
  }

  private formatNotificationMessage(step: WorkflowStep, state: WorkflowState): string {
    const templateValue = step.metadata?.messageTemplate;
    const template = typeof templateValue === 'string'
      ? templateValue
      : 'Workflow ${workflowId} has completed step: ${stepName}';

    return template
      .replace('${workflowId}', state.workflowId)
      .replace('${stepName}', step.name)
      .replace('${executionId}', state.executionId);
  }

  private generateWorkflowInsights(state: WorkflowState, insights: Insight[]) {
    // Performance insights
    const duration = state.endTime ?
      state.endTime.getTime() - state.startTime.getTime() : 0;

    if (duration > 300000) { // > 5 minutes
      insights.push(this.createInsight(
        'slow_workflow_execution',
        'medium',
        'Slow Workflow Execution',
        `Workflow took ${Math.round(duration / 60000)} minutes to complete`,
        'Review workflow steps for optimization opportunities',
        { duration, steps: Object.keys(state.stepResults).length },
      ));
    }

    // Failure insights
    const failedSteps = Object.entries(state.stepResults)
      .filter(([_, result]) => !result.success)
      .map(([stepId]) => stepId);

    if (failedSteps.length > 0) {
      insights.push(this.createInsight(
        'workflow_failures',
        'high',
        'Workflow Steps Failed',
        `${failedSteps.length} steps failed during execution`,
        'Review failed steps and retry if necessary',
        { failedSteps },
      ));
    }

    // Completion insights
    if (state.status === 'completed') {
      insights.push(this.createInsight(
        'workflow_completed',
        'low',
        'Workflow Completed Successfully',
        `Workflow ${state.workflowId} completed all steps`,
        undefined,
        {
          duration,
          stepCount: Object.keys(state.stepResults).length,
          executionId: state.executionId,
        },
      ));
    }
  }

  // Workflow Templates
  private createContractLifecycleWorkflow(): WorkflowDefinition {
    return {
      id: 'contract_lifecycle',
      name: 'Contract Lifecycle Management',
      description: 'End-to-end contract processing from draft to execution',
      version: 1,
      steps: [
        {
          id: 'extract_contract_data',
          name: 'Extract Contract Information',
          type: 'agent',
          agent: 'secretary',
          action: 'extract_contract',
          retryable: true,
        },
        {
          id: 'legal_review',
          name: 'Legal Review',
          type: 'agent',
          agent: 'legal',
          action: 'review_contract',
          retryable: true,
        },
        {
          id: 'risk_assessment',
          name: 'Financial Risk Assessment',
          type: 'agent',
          agent: 'financial',
          action: 'assess_contract_risk',
          retryable: true,
        },
        {
          id: 'approval_routing',
          name: 'Route for Approval',
          type: 'condition',
          conditions: [{
            field: 'stepResults.risk_assessment.riskLevel',
            operator: 'greater_than',
            value: 'medium',
          }],
          branches: [{
            condition: {
              field: 'stepResults.risk_assessment.riskLevel',
              operator: 'equals',
              value: 'high',
            },
            nextStep: 'executive_approval',
          }],
        },
        {
          id: 'standard_approval',
          name: 'Standard Approval',
          type: 'approval',
          approvers: ['manager'],
          metadata: {
            escalationTime: 86400000, // 24 hours
          },
        },
        {
          id: 'executive_approval',
          name: 'Executive Approval',
          type: 'approval',
          approvers: ['executive'],
          metadata: {
            escalationTime: 43200000, // 12 hours
          },
        },
        {
          id: 'finalize_contract',
          name: 'Finalize Contract',
          type: 'agent',
          agent: 'secretary',
          action: 'finalize_contract',
        },
        {
          id: 'notify_stakeholders',
          name: 'Notify Stakeholders',
          type: 'notification',
          metadata: {
            notificationType: 'contract_finalized',
            title: 'Contract Approved and Finalized',
            channel: 'alert',
          },
        },
        {
          id: 'setup_monitoring',
          name: 'Setup Contract Monitoring',
          type: 'agent',
          agent: 'analytics',
          action: 'setup_contract_monitoring',
        },
      ],
      timeout: 604800000, // 7 days
      retryPolicy: {
        maxRetries: 3,
        backoffMultiplier: 2,
      },
    };
  }

  private createVendorOnboardingWorkflow(): WorkflowDefinition {
    return {
      id: 'vendor_onboarding',
      name: 'Vendor Onboarding Process',
      description: 'Complete vendor verification and setup',
      version: 1,
      steps: [
        {
          id: 'initial_screening',
          name: 'Initial Vendor Screening',
          type: 'agent',
          agent: 'vendor',
          action: 'screen_vendor',
          retryable: true,
        },
        {
          id: 'financial_verification',
          name: 'Financial Verification',
          type: 'agent',
          agent: 'financial',
          action: 'verify_vendor_financial',
          retryable: true,
        },
        {
          id: 'compliance_check',
          name: 'Compliance Verification',
          type: 'agent',
          agent: 'legal',
          action: 'check_vendor_compliance',
          retryable: true,
        },
        {
          id: 'risk_evaluation',
          name: 'Evaluate Vendor Risk',
          type: 'condition',
          conditions: [{
            field: 'stepResults.compliance_check.complianceScore',
            operator: 'less_than',
            value: 0.7,
          }],
          branches: [{
            condition: {
              field: 'stepResults.compliance_check.complianceScore',
              operator: 'less_than',
              value: 0.5,
            },
            nextStep: 'vendor_rejection',
          }],
        },
        {
          id: 'vendor_approval',
          name: 'Vendor Approval',
          type: 'approval',
          approvers: ['procurement_manager', 'finance_manager'],
        },
        {
          id: 'vendor_rejection',
          name: 'Vendor Rejection',
          type: 'notification',
          metadata: {
            notificationType: 'vendor_rejected',
            title: 'Vendor Application Rejected',
            channel: 'alert',
          },
        },
        {
          id: 'setup_vendor_profile',
          name: 'Setup Vendor Profile',
          type: 'agent',
          agent: 'secretary',
          action: 'create_vendor_profile',
        },
        {
          id: 'configure_integrations',
          name: 'Configure Integrations',
          type: 'parallel',
          parallelSteps: ['setup_payment', 'setup_communication', 'setup_reporting'],
        },
        {
          id: 'setup_payment',
          name: 'Setup Payment Details',
          type: 'agent',
          agent: 'financial',
          action: 'setup_vendor_payment',
        },
        {
          id: 'setup_communication',
          name: 'Setup Communication Channels',
          type: 'agent',
          agent: 'notifications',
          action: 'setup_vendor_channels',
        },
        {
          id: 'setup_reporting',
          name: 'Setup Reporting',
          type: 'agent',
          agent: 'analytics',
          action: 'setup_vendor_reporting',
        },
        {
          id: 'welcome_vendor',
          name: 'Send Welcome Package',
          type: 'notification',
          metadata: {
            notificationType: 'vendor_welcome',
            title: 'Welcome to Our Vendor Network',
            channel: 'email',
          },
        },
      ],
      timeout: 1209600000, // 14 days
    };
  }

  private createBudgetPlanningWorkflow(): WorkflowDefinition {
    return {
      id: 'budget_planning',
      name: 'Budget Planning and Approval',
      description: 'Annual budget planning and allocation process',
      version: 1,
      steps: [
        {
          id: 'collect_requirements',
          name: 'Collect Budget Requirements',
          type: 'agent',
          agent: 'secretary',
          action: 'collect_budget_requirements',
        },
        {
          id: 'analyze_historical',
          name: 'Analyze Historical Spending',
          type: 'agent',
          agent: 'analytics',
          action: 'analyze_budget_history',
        },
        {
          id: 'financial_forecast',
          name: 'Generate Financial Forecast',
          type: 'agent',
          agent: 'financial',
          action: 'forecast_budget',
        },
        {
          id: 'optimize_allocation',
          name: 'Optimize Budget Allocation',
          type: 'agent',
          agent: 'financial',
          action: 'optimize_budget_allocation',
        },
        {
          id: 'department_review',
          name: 'Department Head Review',
          type: 'parallel',
          parallelSteps: ['review_it', 'review_marketing', 'review_operations'],
        },
        {
          id: 'review_it',
          name: 'IT Department Review',
          type: 'approval',
          approvers: ['it_head'],
        },
        {
          id: 'review_marketing',
          name: 'Marketing Department Review',
          type: 'approval',
          approvers: ['marketing_head'],
        },
        {
          id: 'review_operations',
          name: 'Operations Department Review',
          type: 'approval',
          approvers: ['operations_head'],
        },
        {
          id: 'consolidate_feedback',
          name: 'Consolidate Department Feedback',
          type: 'agent',
          agent: 'secretary',
          action: 'consolidate_budget_feedback',
        },
        {
          id: 'final_review',
          name: 'CFO Final Review',
          type: 'approval',
          approvers: ['cfo'],
        },
        {
          id: 'board_approval',
          name: 'Board Approval',
          type: 'condition',
          conditions: [{
            field: 'context.totalBudget',
            operator: 'greater_than',
            value: 10000000,
          }],
          branches: [{
            condition: {
              field: 'context.totalBudget',
              operator: 'greater_than',
              value: 10000000,
            },
            nextStep: 'board_review',
          }],
        },
        {
          id: 'board_review',
          name: 'Board of Directors Review',
          type: 'approval',
          approvers: ['board_members'],
        },
        {
          id: 'finalize_budget',
          name: 'Finalize Budget Allocation',
          type: 'agent',
          agent: 'financial',
          action: 'finalize_budget',
        },
        {
          id: 'notify_departments',
          name: 'Notify All Departments',
          type: 'notification',
          metadata: {
            notificationType: 'budget_approved',
            title: 'Annual Budget Approved',
            channel: 'email',
          },
        },
      ],
      timeout: 2592000000, // 30 days
    };
  }

  private createComplianceAuditWorkflow(): WorkflowDefinition {
    return {
      id: 'compliance_audit',
      name: 'Compliance Audit Process',
      description: 'Comprehensive compliance audit workflow',
      version: 1,
      steps: [
        {
          id: 'schedule_audit',
          name: 'Schedule Compliance Audit',
          type: 'agent',
          agent: 'secretary',
          action: 'schedule_audit',
        },
        {
          id: 'notify_departments',
          name: 'Notify Affected Departments',
          type: 'notification',
          metadata: {
            notificationType: 'audit_scheduled',
            title: 'Compliance Audit Scheduled',
            channel: 'alert',
          },
        },
        {
          id: 'collect_documents',
          name: 'Collect Required Documents',
          type: 'agent',
          agent: 'secretary',
          action: 'collect_audit_documents',
        },
        {
          id: 'wait_collection',
          name: 'Wait for Document Collection',
          type: 'wait',
          waitDuration: 604800000, // 7 days
        },
        {
          id: 'analyze_compliance',
          name: 'Analyze Compliance Status',
          type: 'parallel',
          parallelSteps: ['legal_compliance', 'financial_compliance', 'operational_compliance'],
        },
        {
          id: 'legal_compliance',
          name: 'Legal Compliance Check',
          type: 'agent',
          agent: 'legal',
          action: 'audit_legal_compliance',
        },
        {
          id: 'financial_compliance',
          name: 'Financial Compliance Check',
          type: 'agent',
          agent: 'financial',
          action: 'audit_financial_compliance',
        },
        {
          id: 'operational_compliance',
          name: 'Operational Compliance Check',
          type: 'agent',
          agent: 'analytics',
          action: 'audit_operational_compliance',
        },
        {
          id: 'generate_report',
          name: 'Generate Audit Report',
          type: 'agent',
          agent: 'analytics',
          action: 'generate_audit_report',
        },
        {
          id: 'review_findings',
          name: 'Review Audit Findings',
          type: 'approval',
          approvers: ['compliance_officer', 'cfo'],
        },
        {
          id: 'critical_issues',
          name: 'Check for Critical Issues',
          type: 'condition',
          conditions: [{
            field: 'stepResults.generate_report.criticalIssues',
            operator: 'greater_than',
            value: 0,
          }],
          branches: [{
            condition: {
              field: 'stepResults.generate_report.criticalIssues',
              operator: 'greater_than',
              value: 0,
            },
            nextStep: 'escalate_critical',
          }],
        },
        {
          id: 'escalate_critical',
          name: 'Escalate Critical Issues',
          type: 'notification',
          metadata: {
            notificationType: 'critical_compliance_issues',
            title: 'Critical Compliance Issues Found',
            channel: 'urgent',
            recipients: ['ceo', 'board_audit_committee'],
          },
        },
        {
          id: 'remediation_plan',
          name: 'Create Remediation Plan',
          type: 'agent',
          agent: 'manager',
          action: 'create_remediation_plan',
        },
        {
          id: 'approve_remediation',
          name: 'Approve Remediation Plan',
          type: 'approval',
          approvers: ['compliance_officer', 'cfo', 'ceo'],
        },
        {
          id: 'implement_remediation',
          name: 'Implement Remediation',
          type: 'agent',
          agent: 'workflow',
          action: 'execute_remediation_workflow',
          metadata: {
            subWorkflow: 'remediation_execution',
          },
        },
        {
          id: 'final_report',
          name: 'Generate Final Report',
          type: 'agent',
          agent: 'analytics',
          action: 'generate_final_audit_report',
        },
        {
          id: 'distribute_report',
          name: 'Distribute Audit Report',
          type: 'notification',
          metadata: {
            notificationType: 'audit_complete',
            title: 'Compliance Audit Completed',
            channel: 'email',
            attachReport: true,
          },
        },
      ],
      timeout: 5184000000, // 60 days
    };
  }

  private createInvoiceProcessingWorkflow(): WorkflowDefinition {
    return {
      id: 'invoice_processing',
      name: 'Invoice Processing and Payment',
      description: 'Automated invoice processing workflow',
      version: 1,
      steps: [
        {
          id: 'receive_invoice',
          name: 'Receive and Scan Invoice',
          type: 'agent',
          agent: 'secretary',
          action: 'process_invoice_document',
        },
        {
          id: 'validate_invoice',
          name: 'Validate Invoice Details',
          type: 'agent',
          agent: 'financial',
          action: 'validate_invoice',
        },
        {
          id: 'match_po',
          name: 'Match with Purchase Order',
          type: 'agent',
          agent: 'secretary',
          action: 'match_invoice_po',
        },
        {
          id: 'check_budget',
          name: 'Check Budget Availability',
          type: 'agent',
          agent: 'financial',
          action: 'check_budget_availability',
        },
        {
          id: 'approval_routing',
          name: 'Route for Approval',
          type: 'condition',
          conditions: [{
            field: 'stepResults.receive_invoice.amount',
            operator: 'greater_than',
            value: 5000,
          }],
          branches: [
            {
              condition: {
                field: 'stepResults.receive_invoice.amount',
                operator: 'greater_than',
                value: 50000,
              },
              nextStep: 'executive_approval',
            },
            {
              condition: {
                field: 'stepResults.receive_invoice.amount',
                operator: 'greater_than',
                value: 5000,
              },
              nextStep: 'manager_approval',
            },
          ],
        },
        {
          id: 'auto_approval',
          name: 'Automatic Approval',
          type: 'agent',
          agent: 'financial',
          action: 'auto_approve_invoice',
          metadata: {
            reason: 'Below threshold and validated',
          },
        },
        {
          id: 'manager_approval',
          name: 'Manager Approval',
          type: 'approval',
          approvers: ['department_manager'],
        },
        {
          id: 'executive_approval',
          name: 'Executive Approval',
          type: 'approval',
          approvers: ['cfo', 'ceo'],
        },
        {
          id: 'schedule_payment',
          name: 'Schedule Payment',
          type: 'agent',
          agent: 'financial',
          action: 'schedule_payment',
        },
        {
          id: 'execute_payment',
          name: 'Execute Payment',
          type: 'agent',
          agent: 'financial',
          action: 'execute_payment',
          metadata: {
            requiresConfirmation: true,
          },
        },
        {
          id: 'update_records',
          name: 'Update Financial Records',
          type: 'parallel',
          parallelSteps: ['update_accounting', 'update_vendor_record', 'update_budget'],
        },
        {
          id: 'update_accounting',
          name: 'Update Accounting System',
          type: 'agent',
          agent: 'financial',
          action: 'update_accounting_records',
        },
        {
          id: 'update_vendor_record',
          name: 'Update Vendor Record',
          type: 'agent',
          agent: 'vendor',
          action: 'update_payment_history',
        },
        {
          id: 'update_budget',
          name: 'Update Budget Tracking',
          type: 'agent',
          agent: 'financial',
          action: 'update_budget_utilization',
        },
        {
          id: 'send_confirmation',
          name: 'Send Payment Confirmation',
          type: 'notification',
          metadata: {
            notificationType: 'payment_confirmation',
            title: 'Payment Processed',
            channel: 'email',
            recipients: ['vendor', 'accounts_payable'],
          },
        },
      ],
      timeout: 2592000000, // 30 days
    };
  }

  private async loadCustomWorkflow(workflowId: string): Promise<WorkflowDefinition | null> {
    const { data } = await this.supabase
      .from('workflow_definitions')
      .select('*')
      .eq('id', workflowId)
      .eq('enterprise_id', this.enterpriseId)
      .single();

    return data;
  }

  private async recoverWorkflow(
    executionId: string,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('workflow_recovery');

    try {
      // Load workflow execution state
      const { data: execution } = await this.supabase
        .from('workflow_executions')
        .select('*')
        .eq('id', executionId)
        .eq('enterprise_id', this.enterpriseId)
        .single();

      if (!execution) {
        throw new Error(`Workflow execution not found: ${executionId}`);
      }

      if (execution.status !== 'failed' && execution.status !== 'cancelled') {
        throw new Error(`Cannot recover workflow in status: ${execution.status}`);
      }

      // Load workflow definition
      const workflow = this.getWorkflowDefinition(execution.workflow_id) ||
                      await this.loadCustomWorkflow(execution.workflow_id);

      if (!workflow) {
        throw new Error(`Workflow definition not found: ${execution.workflow_id}`);
      }

      // Load checkpoints
      const { data: checkpoints } = await this.supabase
        .from('workflow_checkpoints')
        .select('*')
        .eq('workflow_execution_id', executionId)
        .order('created_at', { ascending: false });

      // Reconstruct workflow state
      const state: WorkflowState = {
        workflowId: execution.workflow_id,
        executionId,
        currentStep: execution.current_step,
        status: 'running',
        context: execution.context,
        stepResults: execution.step_results || {},
        stepErrors: execution.step_errors || {},
        checkpoints: checkpoints?.map((cp: Record<string, unknown>) => ({
          stepId: cp.step_id as string,
          timestamp: new Date(cp.created_at as string),
          state: cp.state_snapshot as Record<string, unknown>,
          canRollback: true,
        })) || [],
        compensationLog: execution.compensation_log || [],
        startTime: new Date(execution.created_at),
        retryCount: (execution.retry_count || 0) + 1,
      };

      // Find last successful step
      const lastCheckpoint = state.checkpoints[0];
      if (lastCheckpoint) {
        state.currentStep = lastCheckpoint.stepId;
        state.context = { ...state.context, ...lastCheckpoint.state.context };
        state.stepResults = { ...state.stepResults, ...lastCheckpoint.state.stepResults };

        insights.push(this.createInsight(
          'workflow_recovery_from_checkpoint',
          'medium',
          'Workflow Recovery From Checkpoint',
          `Recovering from checkpoint at step '${lastCheckpoint.stepId}'`,
          undefined,
          { checkpointStep: lastCheckpoint.stepId, checkpointTime: lastCheckpoint.timestamp },
          false,
        ));
      }

      // Update execution status
      await this.supabase
        .from('workflow_executions')
        .update({
          status: 'running',
          retry_count: state.retryCount,
          recovered_at: new Date().toISOString(),
        })
        .eq('id', executionId);

      // Resume workflow execution
      const result = await this.executeWorkflow(workflow, state, rulesApplied, insights);

      insights.push(this.createInsight(
        'workflow_recovered',
        'low',
        'Workflow Successfully Recovered',
        `Workflow execution ${executionId} recovered and completed`,
        undefined,
        { executionId, retryCount: state.retryCount },
        false,
      ));

      return this.createResult(
        true,
        result,
        insights,
        rulesApplied,
        0.9,
        { recovered: true, executionId },
      );

    } catch (error) {
      insights.push(this.createInsight(
        'workflow_recovery_failed',
        'critical',
        'Workflow Recovery Failed',
        `Failed to recover workflow: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { executionId, error: error instanceof Error ? error.message : String(error) },
        true,
      ));

      return this.createResult(
        false,
        undefined,
        insights,
        rulesApplied,
        0.0,
        { error: `Recovery failed: ${error instanceof Error ? error.message : String(error)}` },
      );
    }
  }

  private getWorkflowDefinition(type: string): WorkflowDefinition | null {
    return this.workflowDefinitions.get(type) || null;
  }
}