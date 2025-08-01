import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import { SecretaryAgent } from './secretary.ts';
import { FinancialAgent } from './financial.ts';
import { LegalAgent } from './legal.ts';
import { AnalyticsAgent } from './analytics.ts';
import { VendorAgent } from './vendor.ts';
import { NotificationsAgent } from './notifications.ts';
import { WorkflowAgent } from './workflow.ts';
import { ComplianceAgent } from './compliance.ts';

export class ManagerAgent extends BaseAgent {
  get agentType() {
    return 'manager';
  }

  get capabilities() {
    return ['task_routing', 'orchestration', 'priority_management', 'workflow_coordination'];
  }

  async process(data: any, context?: AgentContext): Promise<ProcessingResult<any>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];
    const confidence = 0.85;

    try {
      // Analyze the request and create orchestration plan
      const orchestrationPlan = await this.analyzeRequest(data, context);

      // Execute orchestration based on plan type and mode
      const executionMode = context?.metadata?.executionMode || 'synchronous';

      if (executionMode === 'asynchronous') {
        // Queue tasks for asynchronous execution
        return await this.executeAsynchronously(orchestrationPlan, rulesApplied, insights, context);
      }
        // Execute synchronously
        if (orchestrationPlan.type === 'single_agent') {
          return await this.executeSingleAgent(orchestrationPlan, rulesApplied, insights);
        } else if (orchestrationPlan.type === 'multi_agent') {
          return await this.executeMultiAgent(orchestrationPlan, rulesApplied, insights);
        } else if (orchestrationPlan.type === 'workflow') {
          return await this.executeWorkflow(orchestrationPlan, rulesApplied, insights);
        }


      // Default response
      return this.createResult(
        true,
        orchestrationPlan,
        insights,
        rulesApplied,
        confidence,
      );

    } catch (error) {
      return this.createResult(
        false,
        null,
        insights,
        rulesApplied,
        0,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  async analyzeRequest(request: any, context?: AgentContext): Promise<any> {
    const requestAnalysis = this.analyzeRequestContent(request, context);
    const requiredAgents = this.determineRequiredAgents(requestAnalysis);
    const dependencies = this.identifyDependencies(requiredAgents);
    const priority = this.calculatePriority(requestAnalysis);

    const orchestrationPlan = {
      orchestrationId: this.generateOrchestrationId(),
      type: requiredAgents.length > 1 ? 'multi_agent' : 'single_agent',
      requestType: requestAnalysis.type,
      complexity: requestAnalysis.complexity,
      priority,
      requiredAgents,
      dependencies,
      steps: this.createExecutionSteps(requiredAgents, dependencies),
      estimatedDuration: this.estimateDuration(requiredAgents, requestAnalysis.complexity),
      metadata: {
        requestedAt: new Date().toISOString(),
        context,
        originalData: request,
      },
    };

    return orchestrationPlan;
  }

  private async executeSingleAgent(
    plan: any,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('single_agent_execution');

    const agent = plan.requiredAgents[0];
    const startTime = Date.now();

    try {
      // Execute agent directly
      const agentResult = await this.executeAgent(agent.type, plan.metadata.originalData, plan.metadata.context);

      const executionResult = {
        orchestrationId: plan.orchestrationId,
        agent: agent.type,
        status: agentResult.success ? 'completed' : 'failed',
        duration: Date.now() - startTime,
        result: {
          agentType: agent.type,
          taskType: agent.taskType,
          confidence: agentResult.confidence || 0.85,
          data: agentResult.data,
          insights: agentResult.insights,
        },
      };

      // Merge agent insights into manager insights
      insights.push(...agentResult.insights);

      // Add insights based on execution
      if (plan.priority === 'critical') {
        insights.push(this.createInsight(
          'critical_task_completed',
          'low',
          'Critical Task Processed',
          `${agent.type} agent completed critical ${agent.taskType}`,
          undefined,
          { execution: executionResult },
          false,
        ));
      }

      return this.createResult(
        true,
        executionResult,
        insights,
        rulesApplied,
        0.9,
      );
    } catch (error) {
      insights.push(this.createInsight(
        'agent_execution_failed',
        'high',
        'Agent Execution Failed',
        `${agent.type} agent failed: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { error: error instanceof Error ? error.message : String(error) },
        true,
      ));

      return this.createResult(
        false,
        null,
        insights,
        rulesApplied,
        0.2,
        { error: `Agent execution failed: ${error instanceof Error ? error.message : String(error)}` },
      );
    }
  }

  private async executeMultiAgent(
    plan: any,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('multi_agent_orchestration');

    const executionResults = {
      orchestrationId: plan.orchestrationId,
      type: 'multi_agent',
      agents: [] as any[],
      status: 'in_progress',
      completedSteps: 0,
      totalSteps: plan.steps.length,
      results: {} as Record<string, any>,
    };

    // Execute steps based on dependencies
    const parallelSteps = plan.steps.filter((s: any) => s.dependencies.length === 0);
    const sequentialSteps = plan.steps.filter((s: any) => s.dependencies.length > 0);

    // Execute parallel steps concurrently
    if (parallelSteps.length > 0) {
      const parallelPromises = parallelSteps.map(async (step: any) => {
        try {
          const agentData = this.prepareAgentData(step, plan.metadata.originalData, executionResults.results);
          const result = await this.executeAgent(step.agentType, agentData, plan.metadata.context);

          return {
            stepId: step.stepId,
            agentType: step.agentType,
            success: result.success,
            result,
          };
        } catch (error) {
          console.error(`Error executing ${step.agentType}:`, error);
          return {
            stepId: step.stepId,
            agentType: step.agentType,
            success: false,
            result: { success: false, error: error instanceof Error ? error.message : String(error) },
          };
        }
      });

      const parallelResults = await Promise.all(parallelPromises);

      for (const stepResult of parallelResults) {
        executionResults.results[stepResult.stepId] = stepResult.result;
        executionResults.agents.push({
          agent: stepResult.agentType,
          status: stepResult.success ? 'completed' : 'failed',
          result: stepResult.result,
        });
        executionResults.completedSteps++;

        // Merge insights from parallel agents
        if (stepResult.result.insights) {
          insights.push(...stepResult.result.insights);
        }
      }
    }

    // Execute sequential steps
    for (const step of sequentialSteps) {
      // Check if dependencies are met
      const dependenciesMet = step.dependencies.every((dep: string) =>
        executionResults.results[dep]?.success,
      );

      if (dependenciesMet) {
        try {
          const agentData = this.prepareAgentData(step, plan.metadata.originalData, executionResults.results);
          const result = await this.executeAgent(step.agentType, agentData, plan.metadata.context);

          executionResults.results[step.stepId] = result;
          executionResults.agents.push({
            agent: step.agentType,
            status: result.success ? 'completed' : 'failed',
            result,
          });
          executionResults.completedSteps++;

          // Merge insights
          if (result.insights) {
            insights.push(...result.insights);
          }
        } catch (error) {
          console.error(`Error executing ${step.agentType}:`, error);
          executionResults.results[step.stepId] = { success: false, error: error instanceof Error ? error.message : String(error) };
          executionResults.agents.push({
            agent: step.agentType,
            status: 'failed',
            result: { success: false, error: error instanceof Error ? error.message : String(error) },
          });
        }
      } else {
        // Skip step if dependencies failed
        executionResults.results[step.stepId] = {
          success: false,
          error: 'Dependencies not met',
          skipped: true,
        };
      }
    }

    executionResults.status = 'completed';

    // Generate orchestration insights
    if (plan.requiredAgents.length > 3) {
      insights.push(this.createInsight(
        'complex_orchestration',
        'medium',
        'Complex Multi-Agent Task',
        `Coordinated ${plan.requiredAgents.length} agents for ${plan.requestType}`,
        'Consider creating a dedicated workflow for this pattern',
        { agentCount: plan.requiredAgents.length },
      ));
      rulesApplied.push('complexity_detection');
    }

    return this.createResult(
      true,
      executionResults,
      insights,
      rulesApplied,
      0.85,
    );
  }

  private async executeWorkflow(
    plan: any,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult> {
    rulesApplied.push('workflow_execution');

    // Check if this is a complex workflow that should be delegated to WorkflowAgent
    const complexWorkflowTypes = [
      'contract_lifecycle',
      'vendor_onboarding',
      'budget_planning',
      'compliance_audit',
      'invoice_processing',
    ];

    if (complexWorkflowTypes.includes(plan.workflowType) || plan.requiredAgents.length > 5) {
      // Delegate to WorkflowAgent for complex workflows
      const workflowAgent = new WorkflowAgent(this.supabase, this.enterpriseId);
      const result = await workflowAgent.process(
        {
          workflowType: plan.workflowType || this.inferWorkflowType(plan),
          ...plan.metadata.originalData,
        },
        plan.metadata.context,
      );

      // Merge insights
      insights.push(...result.insights);

      return result;
    }

    // For simpler workflows, continue with Manager's implementation
    const workflow = this.selectWorkflow(plan.requestType);
    const workflowExecution = {
      orchestrationId: plan.orchestrationId,
      workflowName: workflow.name,
      status: 'in_progress',
      steps: [] as any[],
      results: {} as Record<string, any>,
      summary: '',
    };

    // Execute workflow steps sequentially
    for (const step of workflow.steps) {
      try {
        const agentData = this.prepareWorkflowStepData(step, plan.metadata.originalData, workflowExecution.results);
        const result = await this.executeAgent(step.agent, agentData, plan.metadata.context);

        const stepResult = {
          ...step,
          status: result.success ? 'completed' : 'failed',
          result,
          duration: result.processingTime,
        };

        workflowExecution.steps.push(stepResult);
        workflowExecution.results[`${step.agent}_${step.task}`] = result;

        // Merge insights
        if (result.insights) {
          insights.push(...result.insights);
        }

        // Stop workflow if step fails and it's critical
        if (!result.success && this.isWorkflowStepCritical(step)) {
          workflowExecution.status = 'failed';
          break;
        }
      } catch (error) {
        console.error(`Workflow step ${step.agent}:${step.task} failed:`, error);
        workflowExecution.steps.push({
          ...step,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
        });

        if (this.isWorkflowStepCritical(step)) {
          workflowExecution.status = 'failed';
          break;
        }
      }
    }

    if (workflowExecution.status !== 'failed') {
      workflowExecution.status = 'completed';
    }

    workflowExecution.summary = this.generateWorkflowSummary(workflow, workflowExecution);

    return this.createResult(
      true,
      workflowExecution,
      insights,
      rulesApplied,
      0.9,
    );
  }

  // Request analysis methods
  private analyzeRequestContent(request: any, context?: any): any {
    const content = typeof request === 'string' ? request : JSON.stringify(request).toLowerCase();

    // Identify request type
    const requestType = this.identifyRequestType(content, context);

    // Assess complexity
    const complexity = this.assessComplexity(content, requestType);

    // Extract entities
    const entities = this.extractEntities(content);

    return {
      type: requestType,
      complexity,
      entities,
      hasUrgency: this.detectUrgency(content),
      hasFinancialImpact: this.detectFinancialImpact(content),
      hasLegalImplications: this.detectLegalImplications(content),
      hasComplianceRequirements: this.detectComplianceRequirements(content),
      requiresAnalysis: this.detectAnalysisNeeds(content),
    };
  }

  private identifyRequestType(content: string, context?: any): string {
    // Check context first
    if (context?.requestType) {return context.requestType;}

    // Pattern-based identification
    const patterns = {
      'contract_review': /contract|agreement|terms|clause/i,
      'vendor_evaluation': /vendor|supplier|onboard|evaluate/i,
      'financial_analysis': /cost|budget|expense|financial|payment/i,
      'compliance_check': /compliance|regulation|audit|policy/i,
      'document_processing': /document|file|extract|process/i,
      'alert_configuration': /alert|notification|remind|escalat/i,
      'performance_review': /performance|metric|kpi|analyz/i,
      'risk_assessment': /risk|threat|vulnerabilit|assess/i,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(content)) {return type;}
    }

    return 'general_request';
  }

  private assessComplexity(content: string, requestType: string): string {
    let complexityScore = 0;

    // Length-based complexity
    if (content.length > 1000) {complexityScore += 2;}
    else if (content.length > 500) {complexityScore += 1;}

    // Multi-aspect requests
    const aspects = ['financial', 'legal', 'compliance', 'vendor', 'contract'];
    const mentionedAspects = aspects.filter(aspect => content.includes(aspect));
    complexityScore += mentionedAspects.length;

    // Specific request types have inherent complexity
    const complexTypes = ['contract_review', 'compliance_check', 'risk_assessment'];
    if (complexTypes.includes(requestType)) {complexityScore += 2;}

    // Determine complexity level
    if (complexityScore >= 5) {return 'high';}
    if (complexityScore >= 3) {return 'medium';}
    return 'low';
  }

  private extractEntities(content: string): any {
    return {
      contracts: this.extractPattern(content, /contract[s]?\s+(?:#)?([A-Z0-9-]+)/gi),
      vendors: this.extractPattern(content, /vendor\s+([A-Za-z0-9\s&]+?)(?:\s|,|\.)/gi),
      amounts: this.extractPattern(content, /\$\s*([0-9,]+(?:\.[0-9]{2})?)/g),
      dates: this.extractPattern(content, /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/g),
      emails: this.extractPattern(content, /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g),
    };
  }

  private detectUrgency(content: string): boolean {
    const urgencyPatterns = /urgent|asap|immediate|critical|emergency|priority|deadline/i;
    return urgencyPatterns.test(content);
  }

  private detectFinancialImpact(content: string): boolean {
    const financialPatterns = /\$|dollar|cost|budget|expense|payment|invoice|financial/i;
    return financialPatterns.test(content);
  }

  private detectLegalImplications(content: string): boolean {
    const legalPatterns = /legal|contract|agreement|clause|liability|compliance|regulation/i;
    return legalPatterns.test(content);
  }

  private detectComplianceRequirements(content: string): boolean {
    const compliancePatterns = /compliance|regulation|audit|gdpr|hipaa|sox|policy/i;
    return compliancePatterns.test(content);
  }

  private detectAnalysisNeeds(content: string): boolean {
    const analysisPatterns = /analyze|analysis|review|evaluate|assess|report|insight/i;
    return analysisPatterns.test(content);
  }

  // Agent determination methods
  private determineRequiredAgents(analysis: any): any[] {
    const agents: any[] = [];

    // Always start with secretary for document processing
    if (analysis.type === 'document_processing' || analysis.entities.contracts.length > 0) {
      agents.push({
        type: 'secretary',
        taskType: 'document_extraction',
        reason: 'Extract and process document content',
        priority: 1,
      });
    }

    // Financial agent for financial aspects
    if (analysis.hasFinancialImpact || analysis.type === 'financial_analysis') {
      agents.push({
        type: 'financial',
        taskType: 'financial_analysis',
        reason: 'Analyze financial implications',
        priority: analysis.hasUrgency ? 1 : 2,
      });
    }

    // Legal agent for contracts and compliance
    if (analysis.hasLegalImplications || analysis.type === 'contract_review') {
      agents.push({
        type: 'legal',
        taskType: 'legal_review',
        reason: 'Review legal terms and risks',
        priority: 1,
      });
    }

    // Compliance agent for regulatory and compliance checks
    if (analysis.hasComplianceRequirements || analysis.type === 'compliance_check' || analysis.type === 'risk_assessment') {
      agents.push({
        type: 'compliance',
        taskType: 'compliance_review',
        reason: 'Check regulatory compliance and policies',
        priority: 1,
      });
    }

    // Vendor agent for vendor-related requests
    if (analysis.type === 'vendor_evaluation' || analysis.entities.vendors.length > 0) {
      agents.push({
        type: 'vendor',
        taskType: 'vendor_analysis',
        reason: 'Evaluate vendor relationships',
        priority: 2,
      });
    }

    // Analytics agent for insights and analysis
    if (analysis.requiresAnalysis || analysis.type === 'performance_review') {
      agents.push({
        type: 'analytics',
        taskType: 'generate_insights',
        reason: 'Provide data-driven insights',
        priority: 3,
      });
    }

    // Notifications agent for alerts
    if (analysis.type === 'alert_configuration' || analysis.hasUrgency) {
      agents.push({
        type: 'notifications',
        taskType: 'configure_alerts',
        reason: 'Set up notifications and alerts',
        priority: analysis.hasUrgency ? 1 : 3,
      });
    }

    // Sort by priority
    return agents.sort((a, b) => a.priority - b.priority);
  }

  private identifyDependencies(agents: any[]): any[] {
    const dependencies: any[] = [];

    // Secretary agent typically needs to run first for document processing
    const secretaryAgent = agents.find(a => a.type === 'secretary');
    if (secretaryAgent) {
      const dependentAgents = ['financial', 'legal', 'vendor'];
      for (const agent of agents) {
        if (dependentAgents.includes(agent.type)) {
          dependencies.push({
            agent: agent.type,
            dependsOn: 'secretary',
            reason: 'Requires processed document data',
          });
        }
      }
    }

    // Analytics typically depends on other agents' outputs
    const analyticsAgent = agents.find(a => a.type === 'analytics');
    if (analyticsAgent && agents.length > 1) {
      const dataProviders = agents
        .filter(a => ['financial', 'vendor', 'legal'].includes(a.type))
        .map(a => a.type);

      if (dataProviders.length > 0) {
        dependencies.push({
          agent: 'analytics',
          dependsOn: dataProviders,
          reason: 'Requires data from other agents',
        });
      }
    }

    // Notifications may depend on analysis results
    const notificationsAgent = agents.find(a => a.type === 'notifications');
    if (notificationsAgent && agents.some(a => a.type === 'analytics')) {
      dependencies.push({
        agent: 'notifications',
        dependsOn: 'analytics',
        reason: 'Configure alerts based on insights',
      });
    }

    return dependencies;
  }

  private calculatePriority(analysis: any): string {
    let priorityScore = 0;

    if (analysis.hasUrgency) {priorityScore += 3;}
    if (analysis.hasFinancialImpact) {priorityScore += 2;}
    if (analysis.hasLegalImplications) {priorityScore += 2;}
    if (analysis.hasComplianceRequirements) {priorityScore += 2;}
    if (analysis.complexity === 'high') {priorityScore += 1;}

    if (priorityScore >= 6) {return 'critical';}
    if (priorityScore >= 4) {return 'high';}
    if (priorityScore >= 2) {return 'medium';}
    return 'low';
  }

  private createExecutionSteps(agents: any[], dependencies: any[]): any[] {
    const steps: any[] = [];

    // Create step for each agent
    for (const agent of agents) {
      const agentDeps = dependencies
        .filter(d => d.agent === agent.type)
        .flatMap(d => Array.isArray(d.dependsOn) ? d.dependsOn : [d.dependsOn]);

      steps.push({
        stepId: `step_${agent.type}_${Date.now()}`,
        agentType: agent.type,
        taskType: agent.taskType,
        dependencies: agentDeps.map(dep => `step_${dep}_${Date.now()}`),
        estimatedDuration: this.getAgentDuration(agent.type, agent.taskType),
        canParallelize: agentDeps.length === 0,
      });
    }

    return steps;
  }

  private estimateDuration(agents: any[], complexity: string): number {
    const baseDuration = agents.length * 30; // 30 seconds per agent

    const complexityMultiplier = {
      'low': 1,
      'medium': 1.5,
      'high': 2,
    };

    return Math.round(baseDuration * (complexityMultiplier[complexity as keyof typeof complexityMultiplier] || 1));
  }

  // Workflow methods
  private selectWorkflow(requestType: string): any {
    const workflows = {
      'contract_review': {
        name: 'Contract Review Workflow',
        steps: [
          { agent: 'secretary', task: 'extract_contract_data' },
          { agent: 'financial', task: 'analyze_financial_terms' },
          { agent: 'legal', task: 'review_legal_clauses' },
          { agent: 'analytics', task: 'generate_risk_report' },
          { agent: 'notifications', task: 'notify_stakeholders' },
        ],
      },
      'vendor_evaluation': {
        name: 'Vendor Evaluation Workflow',
        steps: [
          { agent: 'vendor', task: 'assess_vendor_profile' },
          { agent: 'financial', task: 'evaluate_pricing' },
          { agent: 'legal', task: 'check_compliance' },
          { agent: 'analytics', task: 'compare_alternatives' },
        ],
      },
      'compliance_check': {
        name: 'Compliance Check Workflow',
        steps: [
          { agent: 'secretary', task: 'gather_documents' },
          { agent: 'compliance', task: 'perform_compliance_audit' },
          { agent: 'legal', task: 'check_regulations' },
          { agent: 'analytics', task: 'generate_compliance_report' },
          { agent: 'notifications', task: 'alert_violations' },
        ],
      },
    };

    return workflows[requestType as keyof typeof workflows] || {
      name: 'General Processing Workflow',
      steps: [
        { agent: 'secretary', task: 'process_request' },
        { agent: 'analytics', task: 'analyze_data' },
      ],
    };
  }

  private generateWorkflowSummary(workflow: any, execution?: any): any {
    const completedSteps = execution?.steps?.filter((s: any) => s.status === 'completed').length || 0;
    const failedSteps = execution?.steps?.filter((s: any) => s.status === 'failed').length || 0;
    const totalDuration = execution?.steps?.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) || 0;

    const keyFindings = [];
    if (completedSteps === workflow.steps.length) {
      keyFindings.push('All workflow steps completed successfully');
    } else if (failedSteps > 0) {
      keyFindings.push(`${failedSteps} step(s) failed during execution`);
    }

    // Extract key findings from results
    if (execution?.results) {
      Object.values(execution.results).forEach((result: any) => {
        if (result.insights && result.insights.length > 0) {
          const criticalInsights = result.insights.filter((i: any) => i.severity === 'critical' || i.severity === 'high');
          criticalInsights.forEach((i: any) => keyFindings.push(i.title));
        }
      });
    }

    return {
      stepsCompleted: completedSteps,
      totalSteps: workflow.steps.length,
      totalDuration,
      success: completedSteps === workflow.steps.length,
      keyFindings: keyFindings.length > 0 ? keyFindings : ['Workflow processed'],
      nextSteps: this.determineNextSteps(workflow, execution),
    };
  }

  // New method to execute agents
  private async executeAgent(agentType: string, data: any, context?: AgentContext): Promise<ProcessingResult> {
    const AgentClass = this.getAgentClass(agentType);
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    const agent = new AgentClass(this.supabase, this.enterpriseId);
    return await agent.process(data, context);
  }

  // New method to get agent class
  private getAgentClass(agentType: string): any {
    const agentMap: Record<string, any> = {
      'secretary': SecretaryAgent,
      'financial': FinancialAgent,
      'legal': LegalAgent,
      'analytics': AnalyticsAgent,
      'vendor': VendorAgent,
      'notifications': NotificationsAgent,
      'workflow': WorkflowAgent,
      'compliance': ComplianceAgent,
    };

    return agentMap[agentType];
  }

  // Infer workflow type from plan
  private inferWorkflowType(plan: any): string {
    const { requiredAgents, requestType, metadata } = plan;

    // Check for specific patterns
    if (metadata?.originalData?.action === 'lifecycle' ||
        (requiredAgents.some((a: any) => a.type === 'legal') &&
         requiredAgents.some((a: any) => a.type === 'financial') &&
         requestType.includes('contract'))) {
      return 'contract_lifecycle';
    }

    if (metadata?.originalData?.action === 'onboard' ||
        (requiredAgents.some((a: any) => a.type === 'vendor') &&
         requestType.includes('onboard'))) {
      return 'vendor_onboarding';
    }

    if (metadata?.originalData?.budgetRequest ||
        requestType.includes('budget')) {
      return 'budget_planning';
    }

    if (metadata?.originalData?.auditType ||
        requestType.includes('compliance') ||
        requestType.includes('audit')) {
      return 'compliance_audit';
    }

    if (metadata?.originalData?.invoiceId ||
        requestType.includes('invoice')) {
      return 'invoice_processing';
    }

    // Default to custom workflow
    return 'custom';
  }

  // New method to queue agent task
  private async queueAgentTask(agentType: string, data: any, context?: AgentContext, priority: number = 5): Promise<string> {
    // Get agent ID
    const { data: agent } = await this.supabase
      .from('agents')
      .select('id')
      .eq('type', agentType)
      .eq('enterprise_id', this.enterpriseId)
      .eq('is_active', true)
      .single();

    if (!agent) {
      throw new Error(`Agent not found: ${agentType}`);
    }

    // Create task
    const { data: task, error } = await this.supabase
      .from('agent_tasks')
      .insert({
        agent_id: agent.id,
        task_type: context?.taskId ? 'orchestrated_task' : 'manager_request',
        priority,
        status: 'pending',
        payload: {
          data,
          context: {
            ...context,
            orchestratedBy: 'manager',
            parentTaskId: context?.taskId,
          },
        },
        contract_id: context?.contractId,
        vendor_id: context?.vendorId,
        enterprise_id: this.enterpriseId,
        scheduled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {throw error;}

    return task.id;
  }

  // New method to prepare agent data based on dependencies
  private prepareAgentData(step: any, originalData: any, previousResults: Record<string, any>): any {
    // Start with original data
    let agentData = { ...originalData };

    // Enrich with results from dependencies if any
    if (step.dependencies && step.dependencies.length > 0) {
      const dependencyData: Record<string, any> = {};

      step.dependencies.forEach((depId: string) => {
        if (previousResults[depId]) {
          const depResult = previousResults[depId];
          // Extract relevant data from dependency results
          if (depResult.data) {
            dependencyData[depId] = depResult.data;
          }
        }
      });

      agentData = {
        ...agentData,
        dependencyResults: dependencyData,
        enrichedData: this.mergeDataFromDependencies(originalData, dependencyData),
      };
    }

    return agentData;
  }

  // New method to prepare workflow step data
  private prepareWorkflowStepData(step: any, originalData: any, previousResults: Record<string, any>): any {
    const stepKey = `${step.agent}_${step.task}`;

    // Build context from previous workflow results
    const workflowContext: Record<string, any> = {};
    Object.entries(previousResults).forEach(([key, result]: [string, any]) => {
      if (result.data) {
        workflowContext[key] = result.data;
      }
    });

    return {
      ...originalData,
      task: step.task,
      workflowStep: stepKey,
      workflowContext,
    };
  }

  // New method to check if workflow step is critical
  private isWorkflowStepCritical(step: any): boolean {
    const criticalTasks = [
      'extract_contract_data',
      'check_regulations',
      'assess_vendor_profile',
    ];

    return criticalTasks.includes(step.task) || step.critical === true;
  }

  // New method to merge data from dependencies
  private mergeDataFromDependencies(originalData: any, dependencyData: Record<string, any>): any {
    const merged = { ...originalData };

    // Extract and merge relevant fields from dependencies
    Object.values(dependencyData).forEach((depData: any) => {
      if (depData.extractedData) {
        merged.extractedData = { ...merged.extractedData, ...depData.extractedData };
      }
      if (depData.analysis) {
        merged.previousAnalysis = { ...merged.previousAnalysis, ...depData.analysis };
      }
      if (depData.entities) {
        merged.entities = { ...merged.entities, ...depData.entities };
      }
    });

    return merged;
  }

  // New method to determine next steps
  private determineNextSteps(workflow: any, execution: any): string[] {
    const nextSteps = [];

    if (execution?.status === 'failed') {
      nextSteps.push('Review and address failures');
      nextSteps.push('Retry failed steps if applicable');
    } else {
      // Add workflow-specific next steps
      switch (workflow.name) {
        case 'Contract Review Workflow':
          nextSteps.push('Review contract insights and recommendations');
          nextSteps.push('Approve or request modifications');
          nextSteps.push('Set up monitoring for key dates');
          break;
        case 'Vendor Evaluation Workflow':
          nextSteps.push('Review vendor assessment results');
          nextSteps.push('Make vendor selection decision');
          nextSteps.push('Initiate onboarding if approved');
          break;
        case 'Compliance Check Workflow':
          nextSteps.push('Address any compliance violations');
          nextSteps.push('Update policies if needed');
          nextSteps.push('Schedule follow-up audit');
          break;
        default:
          nextSteps.push('Review generated reports');
          nextSteps.push('Take action on recommendations');
          nextSteps.push('Schedule follow-up if needed');
      }
    }

    return nextSteps;
  }

  // New method for asynchronous orchestration
  private async executeAsynchronously(
    plan: any,
    rulesApplied: string[],
    insights: Insight[],
    context?: AgentContext,
  ): Promise<ProcessingResult> {
    rulesApplied.push('asynchronous_orchestration');

    const queuedTasks: any[] = [];

    try {
      // Queue all required agents
      for (const agent of plan.requiredAgents) {
        const taskId = await this.queueAgentTask(
          agent.type,
          plan.metadata.originalData,
          {
            enterpriseId: context?.enterpriseId || this.enterpriseId,
            sessionId: context?.sessionId || crypto.randomUUID(),
            environment: context?.environment || {},
            permissions: context?.permissions || [],
            ...context,
            metadata: {
              ...context?.metadata,
              orchestrationId: plan.orchestrationId,
              orchestrationType: plan.type,
              orchestrationPriority: plan.priority,
            },
          },
          agent.priority || 5,
        );

        queuedTasks.push({
          taskId,
          agentType: agent.type,
          taskType: agent.taskType,
          priority: agent.priority,
        });
      }

      // Create orchestration tracking record
      const orchestrationRecord = {
        orchestrationId: plan.orchestrationId,
        type: plan.type,
        status: 'queued',
        queuedTasks,
        plan,
        queuedAt: new Date().toISOString(),
      };

      // Store orchestration record for tracking
      await this.storeOrchestrationRecord(orchestrationRecord);

      insights.push(this.createInsight(
        'orchestration_queued',
        'low',
        'Tasks Queued for Processing',
        `Queued ${queuedTasks.length} agent tasks for asynchronous processing`,
        'Monitor task progress in the dashboard',
        orchestrationRecord,
        false,
      ));

      return this.createResult(
        true,
        orchestrationRecord,
        insights,
        rulesApplied,
        1.0,
        {
          executionMode: 'asynchronous',
          message: 'Tasks queued successfully',
        },
      );

    } catch (error) {
      insights.push(this.createInsight(
        'orchestration_queue_failed',
        'high',
        'Failed to Queue Tasks',
        `Error queuing agent tasks: ${error instanceof Error ? error.message : String(error)}`,
        'Retry the operation or execute synchronously',
        { error: error instanceof Error ? error.message : String(error) },
      ));

      return this.createResult(
        false,
        null,
        insights,
        rulesApplied,
        0,
        { error: error instanceof Error ? error.message : String(error) },
      );
    }
  }

  // Store orchestration record for tracking
  private async storeOrchestrationRecord(record: any): Promise<void> {
    // Store in a dedicated orchestration tracking table or as metadata
    await this.supabase
      .from('agent_insights')
      .insert({
        agent_id: this.agentId,
        insight_type: 'orchestration_record',
        title: 'Orchestration Tracking',
        description: `Orchestration ${record.orchestrationId} with ${record.queuedTasks.length} tasks`,
        severity: 'info',
        data: record,
        is_actionable: false,
        enterprise_id: this.enterpriseId,
      });
  }


  // Utility methods
  private generateOrchestrationId(): string {
    return `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractPattern(content: string, pattern: RegExp): string[] {
    const matches = content.match(pattern) || [];
    return [...new Set(matches)];
  }

  private getAgentDuration(agentType: string, _taskType: string): number {
    const durations = {
      secretary: 30,
      financial: 45,
      legal: 60,
      vendor: 40,
      analytics: 50,
      notifications: 20,
    };

    return durations[agentType as keyof typeof durations] || 30;
  }
}