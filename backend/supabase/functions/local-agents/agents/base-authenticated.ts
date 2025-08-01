import { SupabaseClient } from '@supabase/supabase-js';
import { BaseAgent, ProcessingResult, AgentContext } from './base.ts';
import { AgentAuthService, AgentAuthContext } from '../utils/auth.ts';
import { SecureAgentChannel, SecureChannelFactory, AgentProtocol } from '../utils/secure-communication.ts';
import { SpanKind, SpanStatus } from '../utils/tracing.ts';

export interface AgentOperationData {
  type?: string;
  action?: string;
  payload?: unknown;
  [key: string]: unknown;
}

export abstract class AuthenticatedBaseAgent extends BaseAgent {
  protected authService: AgentAuthService;
  protected authContext?: AgentAuthContext;
  protected secureChannel?: SecureAgentChannel;
  private channelFactory: SecureChannelFactory;
  private agentCredentials?: { apiKey: string; keyId: string };

  constructor(supabase: SupabaseClient, enterpriseId: string) {
    super(supabase, enterpriseId);
    this.authService = new AgentAuthService(supabase);
    this.channelFactory = new SecureChannelFactory(supabase);
  }

  /**
   * Initialize agent with authentication
   */
  async initialize(createdBy?: string): Promise<void> {
    // Get agent ID
    await this.ensureAgentId();

    // Generate API key if needed
    if (createdBy && !this.agentCredentials) {
      const credentials = await this.authService.generateApiKey(
        this.agentId!,
        createdBy,
        365, // 1 year
      );
      this.agentCredentials = credentials;
    }

    // Initialize secure channel
    this.secureChannel = this.channelFactory.getChannel(this.agentId!, this.enterpriseId);

    // Set up default permissions
    await this.setupDefaultPermissions(createdBy);
  }

  /**
   * Authenticate with API key
   */
  async authenticate(apiKey: string): Promise<boolean> {
    this.authContext = await this.authService.validateApiKey(apiKey);
    return this.authContext.authenticated;
  }

  /**
   * Process task with authentication
   */
  // @requireAuth - TODO: Fix decorator type issues
  async processTask(taskId: string): Promise<ProcessingResult> {
    // Add authentication context to trace
    if (this.authContext?.agentId) {
      this.tracingManager.addBaggage(
        this.traceContext!,
        'auth.agent_id',
        this.authContext.agentId,
      );
    }

    return super.processTask(taskId);
  }

  /**
   * Secure agent-to-agent communication
   */
  protected async callAgent(
    agentType: string,
    operation: string,
    data: AgentOperationData,
    context?: AgentContext,
  ): Promise<unknown> {
    if (!this.secureChannel) {
      throw new Error('Secure channel not initialized');
    }

    const childContext = this.traceContext
      ? this.tracingManager.createChildContext(this.traceContext)
      : this.tracingManager.createTraceContext();

    const span = this.tracingManager.startSpan(
      `secure_call.${agentType}.${operation}`,
      childContext,
      this.agentType,
      SpanKind.CLIENT,
    );

    try {
      // Get target agent ID
      const targetAgentId = await this.getAgentIdByType(agentType);

      // Check if we have trust relationship
      const hasTrust = await this.authService.checkAgentTrust(
        targetAgentId,
        this.agentId!,
        operation,
      );

      if (!hasTrust) {
        // Establish trust if needed (in production, this would require approval)
        await this.establishAgentTrust(targetAgentId, operation);
      }

      // Create protocol message
      const message = AgentProtocol.createMessage(operation, data, {
        context,
        traceId: childContext.traceId,
        spanId: childContext.spanId,
      });

      // Send secure message
      const response = await this.secureChannel.sendMessage(
        targetAgentId,
        operation,
        message,
        {
          encryptPayload: this.shouldEncrypt(operation),
          requireSignature: true,
          timeoutMs: 30000,
        },
      );

      this.tracingManager.endSpan(span.spanId, SpanStatus.OK);
      return response;

    } catch (error) {
      this.tracingManager.addLog(
        span.spanId,
        'error',
        `Secure agent call failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      this.tracingManager.endSpan(span.spanId, SpanStatus.ERROR);
      throw error;
    }
  }

  /**
   * Handle incoming secure messages from other agents
   */
  async handleSecureMessage(
    message: unknown,
    token: string,
  ): Promise<ProcessingResult> {
    if (!this.secureChannel) {
      throw new Error('Secure channel not initialized');
    }

    // Validate message
    const { authenticated, payload, context } = await this.secureChannel.receiveMessage(
      message,
      token,
    );

    if (!authenticated) {
      throw new Error('Message authentication failed');
    }

    // Set auth context for this request
    if (context) {
      this.authContext = context;
    }

    // Validate protocol message
    if (!AgentProtocol.validateMessage(payload)) {
      throw new Error('Invalid protocol message');
    }

    // Process based on operation
    const result = await this.handleAgentOperation(
      payload.operation,
      payload.data,
      payload.metadata,
    );

    return result;
  }

  /**
   * Handle specific agent operations
   */
  protected async handleAgentOperation(
    operation: string,
    data: AgentOperationData,
    _metadata: unknown,
  ): Promise<ProcessingResult> {
    switch (operation) {
      case AgentProtocol.Operations.REQUEST_DATA:
        return this.handleDataRequest(data);

      case AgentProtocol.Operations.SHARE_INSIGHTS:
        return this.handleInsightSharing(data);

      case AgentProtocol.Operations.DELEGATE_TASK:
        return this.handleTaskDelegation(data);

      case AgentProtocol.Operations.HEALTH_CHECK:
        return this.handleHealthCheck();

      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }
  }

  /**
   * Grant permission to another agent
   */
  // @requirePermission('manage_permissions') - TODO: Fix decorator type issues
  async grantPermissionToAgent(
    targetAgentId: string,
    permission: string,
    options: {
      resourceType?: string;
      resourceId?: string;
      allowedActions?: string[];
      validForDays?: number;
    } = {},
  ): Promise<void> {
    await this.authService.grantPermission(
      targetAgentId,
      permission,
      this.agentId!,
      options,
    );
  }

  /**
   * Revoke agent credentials
   */
  // @requirePermission('manage_credentials') - TODO: Fix decorator type issues
  async revokeAgentCredentials(
    targetAgentId: string,
    reason: string,
  ): Promise<void> {
    await this.authService.revokeCredentials(
      targetAgentId,
      'api_key',
      this.agentId!,
      reason,
    );
  }

  // Protected helper methods

  protected async ensureAgentId(): Promise<void> {
    if (!this.agentId) {
      const cacheKey = `agent_id_${this.agentType}_${this.enterpriseId}`;
      this.agentId = await this.getCachedOrFetch(cacheKey, async () => {
        const { data: agent } = await this.supabase
          .from('agents')
          .select('id')
          .eq('type', this.agentType)
          .eq('enterprise_id', this.enterpriseId)
          .eq('is_active', true)
          .single();

        return agent?.id;
      }, 3600);
    }
  }

  protected async getAgentIdByType(agentType: string): Promise<string> {
    const { data: agent } = await this.supabase
      .from('agents')
      .select('id')
      .eq('type', agentType)
      .eq('enterprise_id', this.enterpriseId)
      .eq('is_active', true)
      .single();

    if (!agent) {
      throw new Error(`Agent of type ${agentType} not found`);
    }

    return agent.id;
  }

  protected async establishAgentTrust(
    targetAgentId: string,
    operation: string,
  ): Promise<void> {
    // In production, this would require approval workflow
    await this.secureChannel!.establishBidirectionalTrust(
      targetAgentId,
      'limited',
      [operation],
      this.agentId!,
      30, // 30 days
    );
  }

  protected shouldEncrypt(operation: string): boolean {
    // Encrypt sensitive operations
    const sensitiveOperations = [
      AgentProtocol.Operations.SHARE_INSIGHTS,
      AgentProtocol.Operations.DELEGATE_TASK,
      'share_credentials',
      'share_secrets',
    ];

    return sensitiveOperations.includes(operation);
  }

  protected async setupDefaultPermissions(grantedBy?: string): Promise<void> {
    if (!grantedBy) {return;}

    // Default permissions for all agents
    const defaultPermissions = [
      {
        permission: 'read_own_tasks',
        resourceType: 'agent_tasks',
      },
      {
        permission: 'create_insights',
        resourceType: 'agent_insights',
      },
      {
        permission: 'read_contracts',
        resourceType: 'contracts',
        allowedActions: ['read'],
      },
    ];

    // Additional permissions based on agent type
    const typeSpecificPermissions = this.getTypeSpecificPermissions();

    const allPermissions = [...defaultPermissions, ...typeSpecificPermissions];

    for (const perm of allPermissions) {
      const options: Record<string, unknown> = {};
      if (perm.resourceType !== undefined) {
        options.resourceType = perm.resourceType;
      }
      if (perm.allowedActions !== undefined) {
        options.allowedActions = perm.allowedActions;
      }
      
      await this.authService.grantPermission(
        this.agentId!,
        perm.permission,
        grantedBy,
        options,
      );
    }
  }

  protected getTypeSpecificPermissions(): Array<{
    permission: string;
    resourceType?: string;
    allowedActions?: string[];
  }> {
    // Override in subclasses to add agent-specific permissions
    return [];
  }

  // Abstract methods for subclasses to implement
  protected abstract handleDataRequest(data: AgentOperationData): Promise<ProcessingResult>;
  protected abstract handleInsightSharing(data: AgentOperationData): Promise<ProcessingResult>;
  protected abstract handleTaskDelegation(data: AgentOperationData): Promise<ProcessingResult>;

  protected async handleHealthCheck(): Promise<ProcessingResult> {
    return this.createResult(
      true,
      {
        agentType: this.agentType,
        status: 'healthy',
        version: '1.0.0',
        uptime: Date.now() - this.startTime,
      },
      [],
      [],
      1.0,
    );
  }
}