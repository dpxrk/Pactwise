import { AuthenticatedBaseAgent } from '../agents/base-authenticated.ts';
import { ProcessingResult, Insight } from '../agents/base.ts';
import { requirePermission } from '../utils/auth.ts';
import { AgentProtocol } from '../utils/secure-communication.ts';

/**
 * Example of Secretary Agent with authentication
 */
export class AuthenticatedSecretaryAgent extends AuthenticatedBaseAgent {
  get agentType(): string {
    return 'secretary';
  }

  get capabilities(): string[] {
    return [
      'document_processing',
      'metadata_extraction',
      'content_summarization',
      'data_structuring',
      'secure_data_sharing',
    ];
  }

  /**
   * Initialize with specific permissions
   */
  async initialize(createdBy?: string): Promise<void> {
    await super.initialize(createdBy);

    // Request permission to access financial agent for cost extraction
    if (this.agentId && createdBy) {
      const financialAgentId = await this.getAgentIdByType('financial');
      await this.authService.establishTrust(
        this.agentId,
        financialAgentId,
        'limited',
        [AgentProtocol.Operations.REQUEST_DATA],
        createdBy,
        365, // 1 year
      );
    }
  }

  /**
   * Process with authentication
   */
  @requirePermission('process_documents')
  async process(data: any, context?: any): Promise<ProcessingResult> {
    const { action, contractId, content } = data;

    switch (action) {
      case 'extract_metadata':
        return this.extractMetadataSecurely(contractId, content);

      case 'share_with_legal':
        return this.shareDataWithLegal(contractId, data);

      default:
        return this.createResult(
          false,
          null,
          [],
          [],
          0,
          { error: 'Unknown action' },
        );
    }
  }

  /**
   * Extract metadata with secure sharing
   */
  private async extractMetadataSecurely(
    contractId: string,
    content: string,
  ): Promise<ProcessingResult> {
    const insights: Insight[] = [];

    // Extract metadata
    const metadata = {
      title: this.extractTitle(content),
      parties: this.extractParties(content),
      dates: this.extractDates(content),
      amounts: this.extractAmounts(content),
    };

    // If amounts found, securely request financial analysis
    if (metadata.amounts.length > 0) {
      try {
        const financialAnalysis = await this.callAgent(
          'financial',
          AgentProtocol.Operations.REQUEST_DATA,
          {
            contractId,
            amounts: metadata.amounts,
            requestType: 'validate_amounts',
          },
        );

        insights.push(
          this.createInsight(
            'financial_validation',
            'low',
            'Financial amounts validated',
            `Amounts validated by financial agent: ${financialAnalysis.data.validated}`,
            'Continue with processing',
          ),
        );
      } catch (error) {
        insights.push(
          this.createInsight(
            'financial_validation_failed',
            'medium',
            'Could not validate amounts',
            'Financial agent unavailable or unauthorized',
            'Manual review recommended',
          ),
        );
      }
    }

    return this.createResult(
      true,
      metadata,
      insights,
      ['metadata_extraction', 'secure_sharing'],
      0.95,
    );
  }

  /**
   * Share data with legal agent securely
   */
  @requirePermission('share_data')
  private async shareDataWithLegal(
    contractId: string,
    data: any,
  ): Promise<ProcessingResult> {
    try {
      // Establish trust if needed
      const legalAgentId = await this.getAgentIdByType('legal');
      const hasTrust = await this.authService.checkAgentTrust(
        legalAgentId,
        this.agentId!,
        AgentProtocol.Operations.SHARE_INSIGHTS,
      );

      if (!hasTrust) {
        await this.authService.establishTrust(
          this.agentId!,
          legalAgentId,
          'limited',
          [AgentProtocol.Operations.SHARE_INSIGHTS],
          this.authContext?.agentId || 'system',
          7, // 7 days for temporary sharing
        );
      }

      // Share insights securely
      const response = await this.callAgent(
        'legal',
        AgentProtocol.Operations.SHARE_INSIGHTS,
        {
          contractId,
          insights: data.insights,
          metadata: data.metadata,
          sharedBy: this.agentId,
          timestamp: new Date().toISOString(),
        },
      );

      return this.createResult(
        true,
        { shared: true, responseId: response.id },
        [
          this.createInsight(
            'data_shared',
            'low',
            'Data shared with legal agent',
            'Contract insights successfully shared for legal review',
            'Await legal analysis',
          ),
        ],
        ['secure_sharing'],
        1.0,
      );
    } catch (error) {
      return this.createResult(
        false,
        null,
        [
          this.createInsight(
            'sharing_failed',
            'high',
            'Failed to share with legal agent',
            error instanceof Error ? error.message : String(error),
            'Check permissions and retry',
          ),
        ],
        [],
        0,
      );
    }
  }

  /**
   * Get agent-specific permissions
   */
  protected getTypeSpecificPermissions() {
    return [
      {
        permission: 'process_documents',
        resourceType: 'contracts',
        allowedActions: ['read', 'extract'],
      },
      {
        permission: 'share_data',
        resourceType: 'agent_insights',
        allowedActions: ['create', 'share'],
      },
      {
        permission: 'call_financial_agent',
        resourceType: 'agents',
        allowedActions: ['request_data'],
      },
      {
        permission: 'call_legal_agent',
        resourceType: 'agents',
        allowedActions: ['share_insights'],
      },
    ];
  }

  // Handler methods for inter-agent communication
  protected async handleDataRequest(data: any): Promise<ProcessingResult> {
    // Verify the requester has permission
    const hasPermission = await this.authService.checkPermission(
      this.authContext!.agentId!,
      'request_secretary_data',
      'contracts',
      data.contractId,
    );

    if (!hasPermission) {
      throw new Error('Permission denied for data request');
    }

    // Return requested data
    const contractData = await this.getContractData(data.contractId);

    return this.createResult(
      true,
      contractData,
      [],
      ['data_request_fulfilled'],
      1.0,
    );
  }

  protected async handleInsightSharing(data: any): Promise<ProcessingResult> {
    // Store shared insights
    const insights = data.insights.map((insight: any) => ({
      ...insight,
      source_agent: this.authContext!.agentId,
      shared_at: new Date().toISOString(),
    }));

    await this.storeInsights(
      insights,
      data.contractId,
      'contract',
    );

    return this.createResult(
      true,
      { received: insights.length },
      [],
      ['insights_received'],
      1.0,
    );
  }

  protected async handleTaskDelegation(data: any): Promise<ProcessingResult> {
    // Create delegated task
    const { data: task } = await this.supabase
      .from('agent_tasks')
      .insert({
        agent_id: this.agentId,
        task_type: data.taskType,
        priority: data.priority || 5,
        status: 'pending',
        payload: data.payload,
        metadata: {
          delegatedBy: this.authContext!.agentId,
          delegatedAt: new Date().toISOString(),
        },
        enterprise_id: this.enterpriseId,
      })
      .select()
      .single();

    return this.createResult(
      true,
      { taskId: task.id, status: 'accepted' },
      [],
      ['task_delegated'],
      1.0,
    );
  }

  // Helper methods (simplified for example)
  private extractTitle(content: string): string {
    const match = content.match(/^#\s+(.+)$/m);
    return match ? match[1] : 'Untitled Document';
  }

  private extractParties(content: string): string[] {
    const partyPattern = /(?:between|party|parties):\s*([^,\n]+)/gi;
    const matches = [...content.matchAll(partyPattern)];
    return matches.map(m => m[1].trim());
  }

  private extractDates(content: string): Record<string, string> {
    const datePattern = /(\w+\s+date):\s*(\d{4}-\d{2}-\d{2})/gi;
    const dates: Record<string, string> = {};
    const matches = [...content.matchAll(datePattern)];
    matches.forEach(m => {
      dates[m[1].toLowerCase().replace(/\s+/g, '_')] = m[2];
    });
    return dates;
  }

  private extractAmounts(content: string): Array<{ amount: number; currency: string }> {
    const amountPattern = /\$?([\d,]+(?:\.\d{2})?)\s*(USD|EUR|GBP)?/g;
    const amounts: Array<{ amount: number; currency: string }> = [];
    const matches = [...content.matchAll(amountPattern)];
    matches.forEach(m => {
      const amount = parseFloat(m[1].replace(/,/g, ''));
      if (!isNaN(amount) && amount > 0) {
        amounts.push({
          amount,
          currency: m[2] || 'USD',
        });
      }
    });
    return amounts;
  }

  private async getContractData(contractId: string): Promise<any> {
    const { data } = await this.supabase
      .from('contracts')
      .select('id, name, type, status, metadata')
      .eq('id', contractId)
      .eq('enterprise_id', this.enterpriseId)
      .single();

    return data;
  }
}