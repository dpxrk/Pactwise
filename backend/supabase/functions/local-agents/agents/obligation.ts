/**
 * Obligation Tracking Agent
 *
 * Provides comprehensive obligation management capabilities:
 * - Obligation extraction from contract text
 * - Deadline monitoring and alerting
 * - Performance tracking (actual vs expected)
 * - Dependency analysis with cascade impact
 * - Risk assessment and remediation planning
 * - Automated escalation workflows
 */

import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';

// ============================================================================
// TYPES
// ============================================================================

export interface ObligationData {
  enterpriseId: string;
  analysisType:
    | 'obligation_extraction'
    | 'deadline_monitoring'
    | 'performance_tracking'
    | 'dependency_analysis'
    | 'risk_assessment'
    | 'escalation_check'
    | 'comprehensive';
  contractId?: string;
  obligationId?: string;
  content?: string;
  timeRange?: {
    start: string;
    end: string;
  };
  userId?: string;
}

export interface ObligationResult {
  extractedObligations?: ExtractedObligation[];
  upcomingDeadlines?: DeadlineAlert[];
  overdueObligations?: OverdueObligation[];
  performanceMetrics?: PerformanceMetric[];
  dependencyGraph?: DependencyNode[];
  cascadeImpact?: CascadeImpact;
  riskAssessments?: RiskAssessment[];
  escalations?: EscalationItem[];
  healthScore?: ObligationHealthScore;
  summary?: ObligationSummary;
}

export interface ExtractedObligation {
  title: string;
  description: string;
  obligationType: string;
  partyResponsible: 'us' | 'them' | 'both';
  frequency: string;
  dueDate?: string;
  sourceText: string;
  sourcePage?: number;
  confidence: number;
  riskIfMissed?: string;
  financialImpact?: number;
  suggestedPriority: 'low' | 'medium' | 'high' | 'critical';
}

export interface DeadlineAlert {
  obligationId: string;
  title: string;
  obligationType: string;
  dueDate: string;
  daysUntilDue: number;
  priority: string;
  contractId: string;
  contractTitle: string;
  vendorName?: string;
  assignees: Array<{ userId: string; email: string; role: string }>;
  reminderStatus: 'upcoming' | 'due_today' | 'overdue';
}

export interface OverdueObligation {
  obligationId: string;
  title: string;
  obligationType: string;
  dueDate: string;
  daysOverdue: number;
  priority: string;
  riskScore: number;
  financialImpact?: number;
  contractId: string;
  contractTitle: string;
  vendorName?: string;
  escalationLevel: number;
  lastEscalation?: string;
}

export interface PerformanceMetric {
  obligationId: string;
  title: string;
  periodStart: string;
  periodEnd: string;
  expectedValue: number;
  actualValue: number;
  variance: number;
  variancePercentage: number;
  trend: 'improving' | 'stable' | 'declining';
  complianceRate: number;
  historicalAverage: number;
}

export interface DependencyNode {
  obligationId: string;
  title: string;
  status: string;
  dependsOn: string[];
  triggers: string[];
  depth: number;
  criticalPath: boolean;
}

export interface CascadeImpact {
  sourceObligationId: string;
  delayDays: number;
  directlyAffected: number;
  indirectlyAffected: number;
  totalFinancialImpact: number;
  affectedObligations: Array<{
    obligationId: string;
    title: string;
    cascadeLevel: number;
    newDueDate: string;
    impact: string;
  }>;
  mitigationOptions: string[];
}

export interface RiskAssessment {
  obligationId: string;
  title: string;
  currentRiskScore: number;
  previousRiskScore?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    weight: number;
    score: number;
    description: string;
  }>;
  mitigationPlan?: string;
  recommendedActions: string[];
  reviewDate?: string;
}

export interface EscalationItem {
  obligationId: string;
  title: string;
  escalationLevel: number;
  escalatedAt: string;
  escalatedTo: string[];
  reason: string;
  originalDueDate: string;
  currentStatus: string;
  actionRequired: string;
}

export interface ObligationHealthScore {
  overall: number;
  components: {
    timeliness: number;
    completionRate: number;
    qualityScore: number;
    dependencyHealth: number;
    riskExposure: number;
  };
  trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

export interface ObligationSummary {
  analysisDate: string;
  totalObligations: number;
  activeObligations: number;
  completedThisPeriod: number;
  overdueCount: number;
  upcomingIn7Days: number;
  upcomingIn30Days: number;
  averageComplianceRate: number;
  criticalRiskCount: number;
  keyInsights: string[];
}

// ============================================================================
// OBLIGATION AGENT
// ============================================================================

export class ObligationAgent extends BaseAgent {
  get agentType() {
    return 'obligation';
  }

  get capabilities() {
    return [
      'obligation_extraction',
      'deadline_monitoring',
      'performance_tracking',
      'dependency_analysis',
      'risk_assessment',
      'escalation_management',
      'cascade_impact_analysis',
    ];
  }

  async process(
    data: ObligationData,
    context?: AgentContext
  ): Promise<ProcessingResult<ObligationResult>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      // Check permissions if userId provided
      if (context?.userId) {
        const hasPermission = await this.checkUserPermission(context.userId, 'user');
        if (!hasPermission) {
          throw new Error('Insufficient permissions for obligation analysis');
        }
      }

      const result: ObligationResult = {};

      // Execute analysis based on type
      switch (data.analysisType) {
        case 'obligation_extraction':
          if (!data.content) {
            throw new Error('Content required for obligation extraction');
          }
          result.extractedObligations = await this.extractObligations(data.content);
          rulesApplied.push('obligation_extraction');
          break;

        case 'deadline_monitoring':
          result.upcomingDeadlines = await this.monitorDeadlines(
            data.enterpriseId,
            data.userId
          );
          result.overdueObligations = await this.getOverdueObligations(
            data.enterpriseId,
            data.userId
          );
          rulesApplied.push('deadline_monitoring');
          break;

        case 'performance_tracking':
          result.performanceMetrics = await this.trackPerformance(
            data.enterpriseId,
            data.obligationId,
            data.timeRange
          );
          rulesApplied.push('performance_tracking');
          break;

        case 'dependency_analysis':
          result.dependencyGraph = await this.analyzeDependencies(
            data.enterpriseId,
            data.contractId
          );
          if (data.obligationId) {
            result.cascadeImpact = await this.calculateCascadeImpact(
              data.obligationId,
              7 // Default 7 days delay
            );
          }
          rulesApplied.push('dependency_analysis');
          break;

        case 'risk_assessment':
          result.riskAssessments = await this.assessRisks(
            data.enterpriseId,
            data.contractId
          );
          rulesApplied.push('risk_assessment');
          break;

        case 'escalation_check':
          result.escalations = await this.checkEscalations(data.enterpriseId);
          rulesApplied.push('escalation_check');
          break;

        case 'comprehensive':
        default:
          // Run all analyses
          result.upcomingDeadlines = await this.monitorDeadlines(
            data.enterpriseId,
            data.userId
          );
          result.overdueObligations = await this.getOverdueObligations(
            data.enterpriseId,
            data.userId
          );
          result.riskAssessments = await this.assessRisks(
            data.enterpriseId,
            data.contractId
          );
          result.escalations = await this.checkEscalations(data.enterpriseId);
          result.healthScore = await this.calculateHealthScore(data.enterpriseId);
          result.summary = await this.generateSummary(data.enterpriseId);

          rulesApplied.push(
            'deadline_monitoring',
            'risk_assessment',
            'escalation_check',
            'health_score_calculation'
          );
      }

      // Generate insights
      insights.push(...this.generateInsights(result));

      return {
        success: true,
        data: result,
        rulesApplied,
        insights,
        processingTime: 0, // Will be set by wrapper
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Obligation analysis error:', errorMessage);

      return {
        success: false,
        error: errorMessage,
        data: {},
        rulesApplied,
        insights: [],
        processingTime: 0,
      };
    }
  }

  // ============================================================================
  // OBLIGATION EXTRACTION
  // ============================================================================

  private async extractObligations(content: string): Promise<ExtractedObligation[]> {
    const obligations: ExtractedObligation[] = [];
    const contentLower = content.toLowerCase();

    // Obligation patterns
    const obligationPatterns = [
      {
        type: 'delivery',
        pattern: /(?:shall|must|will|agrees?\s+to)\s+(?:deliver|provide|supply)\s+([^.]+)/gi,
        priority: 'high' as const,
      },
      {
        type: 'payment',
        pattern: /(?:shall|must|will)\s+(?:pay|remit|compensate)\s+([^.]+)/gi,
        priority: 'critical' as const,
      },
      {
        type: 'reporting',
        pattern: /(?:shall|must|will)\s+(?:report|submit|provide\s+reports?)\s+([^.]+)/gi,
        priority: 'medium' as const,
      },
      {
        type: 'compliance',
        pattern: /(?:shall|must|will)\s+(?:comply|adhere|conform)\s+(?:with)?\s+([^.]+)/gi,
        priority: 'high' as const,
      },
      {
        type: 'notice',
        pattern: /(?:shall|must|will)\s+(?:notify|inform|advise)\s+([^.]+)/gi,
        priority: 'medium' as const,
      },
      {
        type: 'audit',
        pattern: /(?:shall|must|will)\s+(?:permit|allow|facilitate)\s+(?:audit|inspection|review)\s+([^.]+)/gi,
        priority: 'medium' as const,
      },
      {
        type: 'insurance',
        pattern: /(?:shall|must|will)\s+(?:maintain|obtain|procure)\s+(?:insurance|coverage)\s+([^.]+)/gi,
        priority: 'high' as const,
      },
      {
        type: 'confidentiality',
        pattern: /(?:shall|must|will)\s+(?:maintain|keep|preserve)\s+(?:confidential|secret)\s+([^.]+)/gi,
        priority: 'high' as const,
      },
      {
        type: 'milestone',
        pattern: /(?:milestone|deliverable|phase)\s*(?:\d+|[ivx]+)?\s*[:]\s*([^.]+)/gi,
        priority: 'high' as const,
      },
      {
        type: 'sla',
        pattern: /(?:service\s+level|sla|uptime|availability)\s+(?:of|at\s+least)?\s*([\d.]+%?)/gi,
        priority: 'critical' as const,
      },
    ];

    // Date patterns for extracting due dates
    const datePatterns = [
      /within\s+(\d+)\s+(days?|weeks?|months?)/gi,
      /by\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})?/gi,
      /no\s+later\s+than\s+([^.]+)/gi,
      /due\s+(?:on|by)\s+([^.]+)/gi,
    ];

    // Extract obligations
    for (const { type, pattern, priority } of obligationPatterns) {
      const matches = content.matchAll(pattern);

      for (const match of matches) {
        const fullMatch = match[0];
        const obligationText = match[1] || fullMatch;

        // Determine responsible party
        const partyResponsible = this.determineResponsibleParty(fullMatch, contentLower);

        // Try to extract dates
        let dueDate: string | undefined;
        let frequency = 'one_time';

        for (const datePattern of datePatterns) {
          const dateMatch = obligationText.match(datePattern);
          if (dateMatch) {
            dueDate = this.parseDateFromMatch(dateMatch);
            break;
          }
        }

        // Determine frequency
        if (/monthly|each\s+month|per\s+month/i.test(obligationText)) {
          frequency = 'monthly';
        } else if (/quarterly|each\s+quarter/i.test(obligationText)) {
          frequency = 'quarterly';
        } else if (/annually|each\s+year|per\s+year/i.test(obligationText)) {
          frequency = 'annually';
        } else if (/weekly|each\s+week/i.test(obligationText)) {
          frequency = 'weekly';
        } else if (/daily|each\s+day/i.test(obligationText)) {
          frequency = 'daily';
        }

        // Estimate financial impact
        const financialImpact = this.estimateFinancialImpact(obligationText, type);

        obligations.push({
          title: this.generateObligationTitle(type, obligationText),
          description: obligationText.trim(),
          obligationType: type,
          partyResponsible,
          frequency,
          dueDate,
          sourceText: fullMatch,
          confidence: this.calculateExtractionConfidence(fullMatch, type),
          riskIfMissed: this.assessMissedRisk(type, priority),
          financialImpact,
          suggestedPriority: priority,
        });
      }
    }

    // Deduplicate similar obligations
    return this.deduplicateObligations(obligations);
  }

  private determineResponsibleParty(
    text: string,
    fullContent: string
  ): 'us' | 'them' | 'both' {
    const textLower = text.toLowerCase();

    // Look for party indicators
    if (/vendor|supplier|contractor|service\s+provider/i.test(textLower)) {
      return 'them';
    }
    if (/customer|client|buyer|purchaser/i.test(textLower)) {
      return 'us';
    }
    if (/both\s+parties|each\s+party|mutual/i.test(textLower)) {
      return 'both';
    }

    // Check context in surrounding text
    const contextStart = Math.max(0, fullContent.indexOf(text.toLowerCase()) - 100);
    const context = fullContent.substring(contextStart, contextStart + 200);

    if (/vendor\s+shall|supplier\s+must/i.test(context)) {
      return 'them';
    }
    if (/customer\s+shall|client\s+must/i.test(context)) {
      return 'us';
    }

    return 'us'; // Default to us for conservative tracking
  }

  private parseDateFromMatch(match: RegExpMatchArray): string | undefined {
    try {
      const fullMatch = match[0].toLowerCase();

      // Handle "within X days/weeks/months"
      const withinMatch = fullMatch.match(/within\s+(\d+)\s+(days?|weeks?|months?)/i);
      if (withinMatch) {
        const amount = parseInt(withinMatch[1], 10);
        const unit = withinMatch[2].toLowerCase();
        const date = new Date();

        if (unit.startsWith('day')) {
          date.setDate(date.getDate() + amount);
        } else if (unit.startsWith('week')) {
          date.setDate(date.getDate() + amount * 7);
        } else if (unit.startsWith('month')) {
          date.setMonth(date.getMonth() + amount);
        }

        return date.toISOString().split('T')[0];
      }

      // Handle month name dates
      const monthMatch = fullMatch.match(
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s*(\d{4})?/i
      );
      if (monthMatch) {
        const monthNames = [
          'january', 'february', 'march', 'april', 'may', 'june',
          'july', 'august', 'september', 'october', 'november', 'december'
        ];
        const month = monthNames.indexOf(monthMatch[1].toLowerCase());
        const day = parseInt(monthMatch[2], 10);
        const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : new Date().getFullYear();

        return new Date(year, month, day).toISOString().split('T')[0];
      }

      return undefined;
    } catch {
      return undefined;
    }
  }

  private generateObligationTitle(type: string, text: string): string {
    const titleMap: Record<string, string> = {
      delivery: 'Delivery Obligation',
      payment: 'Payment Obligation',
      reporting: 'Reporting Requirement',
      compliance: 'Compliance Obligation',
      notice: 'Notice Requirement',
      audit: 'Audit Obligation',
      insurance: 'Insurance Requirement',
      confidentiality: 'Confidentiality Obligation',
      milestone: 'Milestone Deliverable',
      sla: 'Service Level Agreement',
    };

    // Try to extract a more specific title from the text
    const words = text.split(/\s+/).slice(0, 5);
    const specificTitle = words.join(' ').substring(0, 50);

    if (specificTitle.length > 10) {
      return `${titleMap[type] || 'Obligation'}: ${specificTitle}...`;
    }

    return titleMap[type] || 'Contractual Obligation';
  }

  private calculateExtractionConfidence(text: string, type: string): number {
    let confidence = 0.6;

    // Increase confidence for clear obligation language
    if (/shall|must/i.test(text)) {
      confidence += 0.2;
    }

    // Increase for specific dates or deadlines
    if (/within\s+\d+|by\s+\w+\s+\d+/i.test(text)) {
      confidence += 0.1;
    }

    // Increase for specific party mention
    if (/vendor|supplier|customer|client/i.test(text)) {
      confidence += 0.1;
    }

    // Type-specific boosts
    if (type === 'payment' && /\$|dollar|amount/i.test(text)) {
      confidence += 0.1;
    }
    if (type === 'sla' && /\d+%/i.test(text)) {
      confidence += 0.1;
    }

    return Math.min(0.95, confidence);
  }

  private assessMissedRisk(type: string, priority: string): string {
    const riskMap: Record<string, string> = {
      payment: 'Late payment penalties, service suspension, or legal action',
      delivery: 'Breach of contract, damages claims, relationship damage',
      compliance: 'Regulatory penalties, legal exposure, contract termination',
      insurance: 'Uninsured liability exposure, contract breach',
      sla: 'Service credits, penalties, or contract termination rights',
      confidentiality: 'Legal liability, reputation damage, injunctive relief',
      reporting: 'Non-compliance penalties, audit findings',
      notice: 'Waiver of rights, missed opportunities',
      audit: 'Non-compliance findings, relationship issues',
      milestone: 'Project delays, payment holdbacks, contract penalties',
    };

    return riskMap[type] || `Risk varies based on ${priority} priority obligation`;
  }

  private estimateFinancialImpact(text: string, type: string): number | undefined {
    // Try to extract dollar amounts
    const dollarMatch = text.match(/\$[\d,]+(?:\.\d{2})?/);
    if (dollarMatch) {
      return parseFloat(dollarMatch[0].replace(/[$,]/g, ''));
    }

    // Try to extract percentage-based amounts
    const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch && type === 'payment') {
      // Return as a marker that it's percentage-based
      return parseFloat(percentMatch[1]) * 1000; // Placeholder
    }

    return undefined;
  }

  private deduplicateObligations(obligations: ExtractedObligation[]): ExtractedObligation[] {
    const unique: ExtractedObligation[] = [];
    const seen = new Set<string>();

    for (const obligation of obligations) {
      // Create a key from normalized title and type
      const key = `${obligation.obligationType}:${obligation.title.toLowerCase().substring(0, 30)}`;

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(obligation);
      }
    }

    return unique;
  }

  // ============================================================================
  // DEADLINE MONITORING
  // ============================================================================

  private async monitorDeadlines(
    enterpriseId: string,
    userId?: string
  ): Promise<DeadlineAlert[]> {
    const supabase = this.getAdminClient();

    // Get upcoming obligations in the next 30 days
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    let query = supabase
      .from('contract_obligations')
      .select(`
        id, title, obligation_type, priority, status,
        due_date, next_due_date,
        contract_id,
        contracts!inner(id, title, vendor_id, vendors(name)),
        obligation_assignments(user_id, role, users(email))
      `)
      .eq('enterprise_id', enterpriseId)
      .in('status', ['active', 'pending', 'in_progress'])
      .or(`due_date.lte.${futureDate.toISOString()},next_due_date.lte.${futureDate.toISOString()}`)
      .order('due_date', { ascending: true, nullsFirst: false });

    if (userId) {
      query = query.contains('obligation_assignments', [{ user_id: userId }]);
    }

    const { data: obligations, error } = await query;

    if (error) {
      console.error('Failed to fetch upcoming deadlines:', error);
      return [];
    }

    const alerts: DeadlineAlert[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const obligation of obligations || []) {
      const dueDate = new Date(obligation.next_due_date || obligation.due_date);
      dueDate.setHours(0, 0, 0, 0);
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

      let reminderStatus: 'upcoming' | 'due_today' | 'overdue' = 'upcoming';
      if (daysUntilDue < 0) {
        reminderStatus = 'overdue';
      } else if (daysUntilDue === 0) {
        reminderStatus = 'due_today';
      }

      const contractData = obligation.contracts as { id: string; title: string; vendor_id?: string; vendors?: { name: string } };
      const assignments = (obligation.obligation_assignments || []) as Array<{
        user_id: string;
        role: string;
        users?: { email: string };
      }>;

      alerts.push({
        obligationId: obligation.id,
        title: obligation.title,
        obligationType: obligation.obligation_type,
        dueDate: dueDate.toISOString().split('T')[0],
        daysUntilDue,
        priority: obligation.priority,
        contractId: obligation.contract_id,
        contractTitle: contractData?.title || 'Unknown Contract',
        vendorName: contractData?.vendors?.name,
        assignees: assignments.map(a => ({
          userId: a.user_id,
          email: a.users?.email || 'unknown',
          role: a.role,
        })),
        reminderStatus,
      });
    }

    return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  }

  private async getOverdueObligations(
    enterpriseId: string,
    userId?: string
  ): Promise<OverdueObligation[]> {
    const supabase = this.getAdminClient();

    // Use the database function
    const { data: overdue, error } = await supabase.rpc('get_overdue_obligations', {
      p_enterprise_id: enterpriseId,
      p_user_id: userId || null,
    });

    if (error) {
      console.error('Failed to fetch overdue obligations:', error);
      return [];
    }

    // Get escalation info for each obligation
    const overdueItems: OverdueObligation[] = [];

    for (const item of overdue || []) {
      // Get latest escalation
      const { data: escalation } = await supabase
        .from('obligation_escalations')
        .select('escalation_level, escalated_at')
        .eq('obligation_id', item.id)
        .order('escalated_at', { ascending: false })
        .limit(1)
        .single();

      overdueItems.push({
        obligationId: item.id,
        title: item.title,
        obligationType: item.obligation_type,
        dueDate: item.due_date,
        daysOverdue: item.days_overdue,
        priority: item.priority,
        riskScore: item.risk_score,
        financialImpact: item.financial_impact,
        contractId: item.contract_id,
        contractTitle: item.contract_name,
        vendorName: item.vendor_name,
        escalationLevel: escalation?.escalation_level || 0,
        lastEscalation: escalation?.escalated_at,
      });
    }

    return overdueItems;
  }

  // ============================================================================
  // PERFORMANCE TRACKING
  // ============================================================================

  private async trackPerformance(
    enterpriseId: string,
    obligationId?: string,
    timeRange?: { start: string; end: string }
  ): Promise<PerformanceMetric[]> {
    const supabase = this.getAdminClient();

    const range = timeRange || {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    };

    let query = supabase
      .from('obligation_performance_tracking')
      .select(`
        *,
        obligation:contract_obligations(title, obligation_type)
      `)
      .eq('enterprise_id', enterpriseId)
      .gte('period_start', range.start)
      .lte('period_end', range.end)
      .order('period_start', { ascending: false });

    if (obligationId) {
      query = query.eq('obligation_id', obligationId);
    }

    const { data: metrics, error } = await query;

    if (error || !metrics) {
      console.error('Failed to fetch performance metrics:', error);
      return [];
    }

    // Group by obligation and calculate trends
    const byObligation: Record<string, typeof metrics> = {};
    for (const m of metrics) {
      if (!byObligation[m.obligation_id]) {
        byObligation[m.obligation_id] = [];
      }
      byObligation[m.obligation_id].push(m);
    }

    const performanceMetrics: PerformanceMetric[] = [];

    for (const [oblId, oblMetrics] of Object.entries(byObligation)) {
      // Calculate trend
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      if (oblMetrics.length >= 2) {
        const recent = oblMetrics.slice(0, 3);
        const avgRecent = recent.reduce((sum, m) => sum + m.compliance_percentage, 0) / recent.length;
        const avgOlder = oblMetrics.slice(3).reduce((sum, m) => sum + m.compliance_percentage, 0) /
          Math.max(1, oblMetrics.length - 3);

        if (avgRecent > avgOlder + 5) {
          trend = 'improving';
        } else if (avgRecent < avgOlder - 5) {
          trend = 'declining';
        }
      }

      // Calculate historical average
      const historicalAverage = oblMetrics.reduce((sum, m) => sum + m.compliance_percentage, 0) /
        oblMetrics.length;

      // Get most recent metric
      const latest = oblMetrics[0];
      const obligationData = latest.obligation as { title: string; obligation_type: string };

      performanceMetrics.push({
        obligationId: oblId,
        title: obligationData?.title || 'Unknown',
        periodStart: latest.period_start,
        periodEnd: latest.period_end,
        expectedValue: latest.expected_value,
        actualValue: latest.actual_value,
        variance: latest.variance,
        variancePercentage: latest.variance_percentage,
        trend,
        complianceRate: latest.compliance_percentage,
        historicalAverage,
      });
    }

    return performanceMetrics;
  }

  // ============================================================================
  // DEPENDENCY ANALYSIS
  // ============================================================================

  private async analyzeDependencies(
    enterpriseId: string,
    contractId?: string
  ): Promise<DependencyNode[]> {
    const supabase = this.getAdminClient();

    let query = supabase
      .from('obligation_dependencies')
      .select(`
        *,
        obligation:contract_obligations!obligation_id(id, title, status, contract_id),
        depends_on:contract_obligations!depends_on_id(id, title, status)
      `)
      .eq('enterprise_id', enterpriseId);

    if (contractId) {
      query = query.eq('obligation.contract_id', contractId);
    }

    const { data: dependencies, error } = await query;

    if (error) {
      console.error('Failed to fetch dependencies:', error);
      return [];
    }

    // Build dependency graph
    const nodes: Map<string, DependencyNode> = new Map();
    const edges: Map<string, string[]> = new Map();
    const reverseEdges: Map<string, string[]> = new Map();

    // Initialize nodes
    for (const dep of dependencies || []) {
      const obligation = dep.obligation as { id: string; title: string; status: string };
      const dependsOn = dep.depends_on as { id: string; title: string; status: string };

      if (obligation && !nodes.has(obligation.id)) {
        nodes.set(obligation.id, {
          obligationId: obligation.id,
          title: obligation.title,
          status: obligation.status,
          dependsOn: [],
          triggers: [],
          depth: 0,
          criticalPath: false,
        });
      }

      if (dependsOn && !nodes.has(dependsOn.id)) {
        nodes.set(dependsOn.id, {
          obligationId: dependsOn.id,
          title: dependsOn.title,
          status: dependsOn.status,
          dependsOn: [],
          triggers: [],
          depth: 0,
          criticalPath: false,
        });
      }

      // Build edges
      if (obligation && dependsOn) {
        if (!edges.has(obligation.id)) {
          edges.set(obligation.id, []);
        }
        edges.get(obligation.id)!.push(dependsOn.id);

        if (!reverseEdges.has(dependsOn.id)) {
          reverseEdges.set(dependsOn.id, []);
        }
        reverseEdges.get(dependsOn.id)!.push(obligation.id);
      }
    }

    // Populate node relationships and calculate depth
    for (const [nodeId, node] of nodes) {
      node.dependsOn = edges.get(nodeId) || [];
      node.triggers = reverseEdges.get(nodeId) || [];

      // Calculate depth (longest path to root)
      node.depth = this.calculateNodeDepth(nodeId, edges, new Set());
    }

    // Mark critical path (nodes with many dependents)
    for (const node of nodes.values()) {
      if (node.triggers.length >= 2 || node.depth >= 2) {
        node.criticalPath = true;
      }
    }

    return Array.from(nodes.values()).sort((a, b) => b.depth - a.depth);
  }

  private calculateNodeDepth(
    nodeId: string,
    edges: Map<string, string[]>,
    visited: Set<string>
  ): number {
    if (visited.has(nodeId)) {
      return 0; // Cycle detection
    }
    visited.add(nodeId);

    const dependencies = edges.get(nodeId) || [];
    if (dependencies.length === 0) {
      return 0;
    }

    let maxDepth = 0;
    for (const depId of dependencies) {
      const depth = this.calculateNodeDepth(depId, edges, new Set(visited));
      maxDepth = Math.max(maxDepth, depth + 1);
    }

    return maxDepth;
  }

  private async calculateCascadeImpact(
    obligationId: string,
    delayDays: number
  ): Promise<CascadeImpact> {
    const supabase = this.getAdminClient();

    // Use the database function
    const { data: impact, error } = await supabase.rpc('calculate_obligation_cascade_impact', {
      p_obligation_id: obligationId,
      p_delay_days: delayDays,
    });

    if (error || !impact) {
      console.error('Failed to calculate cascade impact:', error);
      return {
        sourceObligationId: obligationId,
        delayDays,
        directlyAffected: 0,
        indirectlyAffected: 0,
        totalFinancialImpact: 0,
        affectedObligations: [],
        mitigationOptions: [],
      };
    }

    // Generate mitigation options
    const mitigationOptions: string[] = [];
    if (impact.total_financial_impact > 0) {
      mitigationOptions.push('Negotiate penalty waiver with counterparty');
      mitigationOptions.push('Request deadline extension for dependent obligations');
    }
    if (impact.directly_affected > 2) {
      mitigationOptions.push('Prioritize completion of this obligation');
      mitigationOptions.push('Assign additional resources');
    }
    if (delayDays <= 3) {
      mitigationOptions.push('Expedite with overtime/rush processing');
    }

    return {
      sourceObligationId: obligationId,
      delayDays,
      directlyAffected: impact.directly_affected || 0,
      indirectlyAffected: impact.indirectly_affected || 0,
      totalFinancialImpact: impact.total_financial_impact || 0,
      affectedObligations: impact.affected_obligations || [],
      mitigationOptions,
    };
  }

  // ============================================================================
  // RISK ASSESSMENT
  // ============================================================================

  private async assessRisks(
    enterpriseId: string,
    contractId?: string
  ): Promise<RiskAssessment[]> {
    const supabase = this.getAdminClient();

    let query = supabase
      .from('obligation_risk_assessments')
      .select(`
        *,
        obligation:contract_obligations(id, title, priority, status, risk_score)
      `)
      .eq('enterprise_id', enterpriseId)
      .order('risk_score', { ascending: false });

    if (contractId) {
      query = query.eq('obligation.contract_id', contractId);
    }

    const { data: assessments, error } = await query;

    if (error) {
      console.error('Failed to fetch risk assessments:', error);
      return [];
    }

    const riskAssessments: RiskAssessment[] = [];

    for (const assessment of assessments || []) {
      const obligation = assessment.obligation as {
        id: string;
        title: string;
        priority: string;
        status: string;
        risk_score: number;
      };

      // Determine risk level
      const riskScore = assessment.risk_score || obligation?.risk_score || 50;
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      if (riskScore >= 80) {
        riskLevel = 'critical';
      } else if (riskScore >= 60) {
        riskLevel = 'high';
      } else if (riskScore < 30) {
        riskLevel = 'low';
      }

      // Parse risk factors
      const riskFactors = (assessment.risk_factors || []) as Array<{
        factor: string;
        weight: number;
        score: number;
        description: string;
      }>;

      // Generate recommendations based on risk level
      const recommendedActions = this.generateRiskRecommendations(riskLevel, riskFactors);

      riskAssessments.push({
        obligationId: assessment.obligation_id,
        title: obligation?.title || 'Unknown',
        currentRiskScore: riskScore,
        previousRiskScore: assessment.previous_risk_score,
        riskLevel,
        riskFactors,
        mitigationPlan: assessment.mitigation_plan,
        recommendedActions,
        reviewDate: assessment.next_review_date,
      });
    }

    return riskAssessments;
  }

  private generateRiskRecommendations(
    riskLevel: string,
    factors: Array<{ factor: string; weight: number; score: number; description: string }>
  ): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('Escalate to management immediately');
      recommendations.push('Develop contingency plan');
    }

    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push('Increase monitoring frequency');
      recommendations.push('Assign dedicated owner');
    }

    // Factor-specific recommendations
    for (const factor of factors) {
      if (factor.score > 70) {
        switch (factor.factor) {
          case 'overdue_days':
            recommendations.push('Prioritize immediate completion');
            break;
          case 'dependency_count':
            recommendations.push('Review and potentially break dependency chain');
            break;
          case 'financial_impact':
            recommendations.push('Secure budget for potential penalties');
            break;
          case 'resource_availability':
            recommendations.push('Allocate additional resources');
            break;
        }
      }
    }

    return [...new Set(recommendations)].slice(0, 5);
  }

  // ============================================================================
  // ESCALATION MANAGEMENT
  // ============================================================================

  private async checkEscalations(enterpriseId: string): Promise<EscalationItem[]> {
    const supabase = this.getAdminClient();

    const { data: escalations, error } = await supabase
      .from('obligation_escalations')
      .select(`
        *,
        obligation:contract_obligations(id, title, status, due_date, next_due_date)
      `)
      .eq('enterprise_id', enterpriseId)
      .in('status', ['pending', 'in_progress'])
      .order('escalated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch escalations:', error);
      return [];
    }

    const escalationItems: EscalationItem[] = [];

    for (const esc of escalations || []) {
      const obligation = esc.obligation as {
        id: string;
        title: string;
        status: string;
        due_date: string;
        next_due_date: string;
      };

      escalationItems.push({
        obligationId: esc.obligation_id,
        title: obligation?.title || 'Unknown',
        escalationLevel: esc.escalation_level,
        escalatedAt: esc.escalated_at,
        escalatedTo: esc.escalated_to_user_ids || [],
        reason: esc.escalation_reason,
        originalDueDate: obligation?.due_date || obligation?.next_due_date || '',
        currentStatus: obligation?.status || esc.status,
        actionRequired: this.getRequiredAction(esc.escalation_level),
      });
    }

    return escalationItems;
  }

  private getRequiredAction(escalationLevel: number): string {
    switch (escalationLevel) {
      case 1:
        return 'Immediate action required - deadline missed';
      case 2:
        return 'Management review required - escalated for visibility';
      case 3:
        return 'Executive escalation - requires senior leadership decision';
      default:
        return 'Action required';
    }
  }

  // ============================================================================
  // HEALTH SCORE CALCULATION
  // ============================================================================

  private async calculateHealthScore(enterpriseId: string): Promise<ObligationHealthScore> {
    const supabase = this.getAdminClient();

    // Get stats using database function
    const { data: stats } = await supabase.rpc('get_obligation_stats', {
      p_enterprise_id: enterpriseId,
    });

    // Calculate components
    const totalObligations = (stats?.active || 0) + (stats?.overdue || 0) + (stats?.pending || 0);
    const overdueCount = stats?.overdue || 0;
    const completedCount = stats?.completed || 0;

    // Timeliness: percentage of obligations not overdue
    const timeliness = totalObligations > 0
      ? Math.round(((totalObligations - overdueCount) / totalObligations) * 100)
      : 100;

    // Completion rate: completed / (completed + overdue)
    const completionRate = (completedCount + overdueCount) > 0
      ? Math.round((completedCount / (completedCount + overdueCount)) * 100)
      : 100;

    // Get average compliance from performance tracking
    const { data: perfData } = await supabase
      .from('obligation_performance_tracking')
      .select('compliance_percentage')
      .eq('enterprise_id', enterpriseId)
      .gte('period_start', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

    const qualityScore = perfData && perfData.length > 0
      ? Math.round(perfData.reduce((sum, p) => sum + p.compliance_percentage, 0) / perfData.length)
      : 80; // Default

    // Dependency health: percentage of dependencies satisfied
    const { data: deps } = await supabase
      .from('obligation_dependencies')
      .select('is_satisfied')
      .eq('enterprise_id', enterpriseId);

    const dependencyHealth = deps && deps.length > 0
      ? Math.round((deps.filter(d => d.is_satisfied).length / deps.length) * 100)
      : 100;

    // Risk exposure: inverse of average risk score
    const { data: risks } = await supabase
      .from('contract_obligations')
      .select('risk_score')
      .eq('enterprise_id', enterpriseId)
      .in('status', ['active', 'overdue']);

    const avgRisk = risks && risks.length > 0
      ? risks.reduce((sum, r) => sum + (r.risk_score || 50), 0) / risks.length
      : 50;
    const riskExposure = Math.round(100 - avgRisk);

    // Calculate overall score (weighted average)
    const overall = Math.round(
      timeliness * 0.25 +
      completionRate * 0.25 +
      qualityScore * 0.20 +
      dependencyHealth * 0.15 +
      riskExposure * 0.15
    );

    // Determine trend (would need historical data to calculate properly)
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (overdueCount === 0 && timeliness > 90) {
      trend = 'improving';
    } else if (overdueCount > totalObligations * 0.2) {
      trend = 'declining';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (timeliness < 80) {
      recommendations.push('Focus on reducing overdue obligations');
    }
    if (completionRate < 70) {
      recommendations.push('Review completion workflow for bottlenecks');
    }
    if (qualityScore < 80) {
      recommendations.push('Implement quality checks for obligation fulfillment');
    }
    if (dependencyHealth < 90) {
      recommendations.push('Address blocking dependencies');
    }
    if (riskExposure < 50) {
      recommendations.push('Develop mitigation plans for high-risk obligations');
    }

    return {
      overall,
      components: {
        timeliness,
        completionRate,
        qualityScore,
        dependencyHealth,
        riskExposure,
      },
      trend,
      recommendations,
    };
  }

  // ============================================================================
  // SUMMARY GENERATION
  // ============================================================================

  private async generateSummary(enterpriseId: string): Promise<ObligationSummary> {
    const supabase = this.getAdminClient();

    const { data: stats } = await supabase.rpc('get_obligation_stats', {
      p_enterprise_id: enterpriseId,
    });

    // Get performance data
    const { data: perfData } = await supabase
      .from('obligation_performance_tracking')
      .select('compliance_percentage')
      .eq('enterprise_id', enterpriseId)
      .gte('period_start', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const avgCompliance = perfData && perfData.length > 0
      ? Math.round(perfData.reduce((sum, p) => sum + p.compliance_percentage, 0) / perfData.length)
      : 85;

    // Get critical risk count
    const { count: criticalCount } = await supabase
      .from('contract_obligations')
      .select('id', { count: 'exact', head: true })
      .eq('enterprise_id', enterpriseId)
      .in('status', ['active', 'overdue'])
      .gte('risk_score', 80);

    // Generate key insights
    const keyInsights: string[] = [];

    if (stats?.overdue > 0) {
      keyInsights.push(`${stats.overdue} obligations are currently overdue`);
    }
    if (stats?.due_this_week > 0) {
      keyInsights.push(`${stats.due_this_week} obligations due this week`);
    }
    if (stats?.critical_pending > 0) {
      keyInsights.push(`${stats.critical_pending} critical priority items need attention`);
    }
    if (avgCompliance < 80) {
      keyInsights.push(`Compliance rate below target at ${avgCompliance}%`);
    }
    if (criticalCount && criticalCount > 0) {
      keyInsights.push(`${criticalCount} obligations at critical risk level`);
    }

    if (keyInsights.length === 0) {
      keyInsights.push('All obligations are on track');
    }

    return {
      analysisDate: new Date().toISOString(),
      totalObligations: (stats?.active || 0) + (stats?.overdue || 0) + (stats?.pending || 0) + (stats?.completed || 0),
      activeObligations: stats?.active || 0,
      completedThisPeriod: stats?.completed || 0,
      overdueCount: stats?.overdue || 0,
      upcomingIn7Days: stats?.due_this_week || 0,
      upcomingIn30Days: stats?.due_this_month || 0,
      averageComplianceRate: avgCompliance,
      criticalRiskCount: criticalCount || 0,
      keyInsights,
    };
  }

  // ============================================================================
  // INSIGHT GENERATION
  // ============================================================================

  private generateInsights(result: ObligationResult): Insight[] {
    const insights: Insight[] = [];

    // Overdue obligations insights
    if (result.overdueObligations && result.overdueObligations.length > 0) {
      const criticalOverdue = result.overdueObligations.filter(o => o.priority === 'critical');
      if (criticalOverdue.length > 0) {
        insights.push({
          type: 'critical_overdue',
          severity: 'critical',
          title: `${criticalOverdue.length} Critical Obligations Overdue`,
          description: `Critical obligations: ${criticalOverdue.map(o => o.title).slice(0, 3).join(', ')}`,
          recommendation: 'Immediate action required - escalate to management',
          data: { count: criticalOverdue.length, obligations: criticalOverdue },
          isActionable: true,
        });
      }

      if (result.overdueObligations.length > 5) {
        insights.push({
          type: 'high_overdue_count',
          severity: 'high',
          title: 'Multiple Obligations Overdue',
          description: `${result.overdueObligations.length} obligations are currently past due`,
          recommendation: 'Review resource allocation and prioritize catch-up plan',
          data: { count: result.overdueObligations.length },
          isActionable: true,
        });
      }
    }

    // Upcoming deadline insights
    if (result.upcomingDeadlines && result.upcomingDeadlines.length > 0) {
      const dueTodayCount = result.upcomingDeadlines.filter(d => d.daysUntilDue === 0).length;
      const dueThisWeek = result.upcomingDeadlines.filter(d => d.daysUntilDue > 0 && d.daysUntilDue <= 7).length;

      if (dueTodayCount > 0) {
        insights.push({
          type: 'due_today',
          severity: 'high',
          title: `${dueTodayCount} Obligations Due Today`,
          description: 'These obligations must be completed by end of day',
          recommendation: 'Ensure all assigned users are aware and working on completion',
          data: { count: dueTodayCount },
          isActionable: true,
        });
      }

      if (dueThisWeek > 3) {
        insights.push({
          type: 'busy_week',
          severity: 'medium',
          title: 'Heavy Obligation Week',
          description: `${dueThisWeek} obligations due in the next 7 days`,
          recommendation: 'Consider redistributing workload or requesting extensions',
          data: { count: dueThisWeek },
          isActionable: true,
        });
      }
    }

    // Performance insights
    if (result.performanceMetrics && result.performanceMetrics.length > 0) {
      const declining = result.performanceMetrics.filter(m => m.trend === 'declining');
      const lowCompliance = result.performanceMetrics.filter(m => m.complianceRate < 80);

      if (declining.length > 0) {
        insights.push({
          type: 'declining_performance',
          severity: 'medium',
          title: 'Declining Performance Detected',
          description: `${declining.length} obligations showing declining compliance trends`,
          recommendation: 'Investigate root causes and implement corrective actions',
          data: { obligations: declining },
          isActionable: true,
        });
      }

      if (lowCompliance.length > 0) {
        insights.push({
          type: 'low_compliance',
          severity: 'high',
          title: 'Low Compliance Rates',
          description: `${lowCompliance.length} obligations below 80% compliance`,
          recommendation: 'Review processes and consider additional training or resources',
          data: { obligations: lowCompliance },
          isActionable: true,
        });
      }
    }

    // Risk insights
    if (result.riskAssessments && result.riskAssessments.length > 0) {
      const criticalRisks = result.riskAssessments.filter(r => r.riskLevel === 'critical');
      const highRisks = result.riskAssessments.filter(r => r.riskLevel === 'high');

      if (criticalRisks.length > 0) {
        insights.push({
          type: 'critical_risks',
          severity: 'critical',
          title: `${criticalRisks.length} Critical Risk Obligations`,
          description: 'These obligations pose significant risk to the enterprise',
          recommendation: 'Implement mitigation plans immediately',
          data: { obligations: criticalRisks },
          isActionable: true,
        });
      }

      if (highRisks.length > 3) {
        insights.push({
          type: 'elevated_risk_profile',
          severity: 'high',
          title: 'Elevated Risk Profile',
          description: `${highRisks.length} high-risk obligations require attention`,
          recommendation: 'Schedule risk review meeting',
          data: { count: highRisks.length },
          isActionable: true,
        });
      }
    }

    // Health score insight
    if (result.healthScore) {
      if (result.healthScore.overall < 60) {
        insights.push({
          type: 'poor_health',
          severity: 'critical',
          title: 'Obligation Health Score Critical',
          description: `Overall health score is ${result.healthScore.overall}/100`,
          recommendation: result.healthScore.recommendations[0] || 'Review obligation management processes',
          data: result.healthScore,
          isActionable: true,
        });
      } else if (result.healthScore.overall < 75) {
        insights.push({
          type: 'needs_attention',
          severity: 'medium',
          title: 'Obligation Health Needs Attention',
          description: `Health score of ${result.healthScore.overall}/100 indicates room for improvement`,
          recommendation: result.healthScore.recommendations[0] || 'Focus on improving weakest areas',
          data: result.healthScore,
          isActionable: true,
        });
      }
    }

    // Escalation insights
    if (result.escalations && result.escalations.length > 0) {
      const highLevelEscalations = result.escalations.filter(e => e.escalationLevel >= 2);
      if (highLevelEscalations.length > 0) {
        insights.push({
          type: 'active_escalations',
          severity: 'high',
          title: `${highLevelEscalations.length} Active Escalations`,
          description: 'Management-level escalations require immediate attention',
          recommendation: 'Review escalated items and provide direction',
          data: { escalations: highLevelEscalations },
          isActionable: true,
        });
      }
    }

    return insights;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private getAdminClient() {
    return this.supabase;
  }
}

// Export singleton factory
export function createObligationAgent(
  supabase: SupabaseClient,
  enterpriseId: string,
  userId?: string
): ObligationAgent {
  return new ObligationAgent(supabase, enterpriseId, userId);
}

// Export for edge function usage without direct supabase dependency
export function createObligationAgentLite(): {
  extractObligations: (content: string) => ExtractedObligation[];
} {
  const agent = {
    extractObligations: (content: string): ExtractedObligation[] => {
      // Simplified extraction without database
      const obligations: ExtractedObligation[] = [];
      const patterns = [
        { type: 'delivery', pattern: /(?:shall|must|will)\s+(?:deliver|provide)\s+([^.]+)/gi, priority: 'high' as const },
        { type: 'payment', pattern: /(?:shall|must|will)\s+(?:pay|remit)\s+([^.]+)/gi, priority: 'critical' as const },
        { type: 'reporting', pattern: /(?:shall|must|will)\s+(?:report|submit)\s+([^.]+)/gi, priority: 'medium' as const },
        { type: 'compliance', pattern: /(?:shall|must|will)\s+(?:comply|adhere)\s+([^.]+)/gi, priority: 'high' as const },
      ];

      for (const { type, pattern, priority } of patterns) {
        const matches = content.matchAll(pattern);
        for (const match of matches) {
          obligations.push({
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Obligation`,
            description: match[1]?.trim() || match[0],
            obligationType: type,
            partyResponsible: 'us',
            frequency: 'one_time',
            sourceText: match[0],
            confidence: 0.7,
            suggestedPriority: priority,
          });
        }
      }

      return obligations;
    },
  };

  return agent;
}
