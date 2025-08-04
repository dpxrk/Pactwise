import { SupabaseClient } from '@supabase/supabase-js';
import { DonnaAI, AnonymizedData } from './base.ts';
import { getFeatureFlag } from '../config/index.ts';

export interface DonnaQuery {
  type: string;
  context: Record<string, any>;
  enterpriseId?: string;
  userId?: string;
}

export interface DonnaFeedback {
  queryId: string;
  success: boolean;
  metrics?: Record<string, any>;
  userSatisfaction?: number;
}

export class DonnaInterface {
  private donna: DonnaAI;
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.donna = new DonnaAI(supabase);
  }

  // Query Donna for insights
  async query(query: DonnaQuery): Promise<{
    id: string;
    insights: any[];
    recommendations: string[];
    bestPractices: any[];
    confidence: number;
  }> {
    if (!getFeatureFlag('ENABLE_DONNA_AI')) {
      return {
        id: '',
        insights: [],
        recommendations: [],
        bestPractices: [],
        confidence: 0,
      };
    }

    // Generate query ID for tracking
    const queryId = this.generateQueryId();

    // Anonymize query context
    const anonymizedContext = await this.anonymizeContext(
      query.context,
      query.enterpriseId,
      query.userId,
    );

    // Get analysis from Donna
    const analysis = await this.donna.analyze(
      query.type,
      anonymizedContext,
      query.enterpriseId,
    );

    // Log the query for feedback tracking
    await this.logQuery(queryId, query, analysis);

    return {
      id: queryId,
      ...analysis,
    };
  }

  // Submit feedback on Donna's recommendations
  async submitFeedback(feedback: DonnaFeedback): Promise<void> {
    if (!getFeatureFlag('ENABLE_DONNA_AI')) {return;}

    // Get the original query
    const { data: queryLog } = await this.supabase
      .from('donna_query_logs')
      .select('*')
      .eq('id', feedback.queryId)
      .single();

    if (!queryLog) {return;}

    // Update query log with feedback
    await this.supabase
      .from('donna_query_logs')
      .update({
        feedback_received: true,
        feedback_success: feedback.success,
        feedback_metrics: feedback.metrics,
        user_satisfaction: feedback.userSatisfaction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedback.queryId);

    // Learn from the feedback
    const anonymizedData: AnonymizedData = {
      content: queryLog.query_context.description || '',
      context: queryLog.query_context,
      type: queryLog.query_type,
    };

    await this.donna.learn(queryLog.query_type, anonymizedData, {
      success: feedback.success,
      ...(feedback.metrics && { metrics: feedback.metrics }),
    });
  }

  // Submit data for Donna to learn from
  async submitLearningData(
    dataType: string,
    data: any,
    outcome: { success: boolean; metrics?: Record<string, any> },
    enterpriseId: string,
    userId?: string,
  ): Promise<void> {
    if (!getFeatureFlag('ENABLE_DONNA_AI')) {return;}

    // Anonymize the data
    const anonymizedData = await this.anonymizeData(data, enterpriseId, userId);

    // Submit to Donna for learning
    await this.donna.learn(dataType, anonymizedData, outcome);
  }

  // Anonymize context data
  private async anonymizeContext(
    context: Record<string, any>,
    enterpriseId?: string,
    _userId?: string,
  ): Promise<Record<string, any>> {
    const anonymized: Record<string, any> = {};

    // Get enterprise info for categorization
    let enterpriseInfo: any = {};
    if (enterpriseId) {
      const { data: enterprise } = await this.supabase
        .from('enterprises')
        .select('industry, employee_count')
        .eq('id', enterpriseId)
        .single();

      if (enterprise) {
        enterpriseInfo = {
          industry: enterprise.industry,
          companySize: this.categorizeCompanySize(enterprise.employee_count),
        };
      }
    }

    // Process each context field
    for (const [key, value] of Object.entries(context)) {
      if (this.isSensitiveField(key)) {
        // Skip sensitive fields
        continue;
      }

      if (typeof value === 'string') {
        anonymized[key] = await this.anonymizeString(value);
      } else if (typeof value === 'number') {
        anonymized[key] = this.anonymizeNumber(key, value);
      } else if (typeof value === 'object' && value !== null) {
        anonymized[key] = await this.anonymizeObject(value);
      } else {
        anonymized[key] = value;
      }
    }

    // Add enterprise categorization
    return {
      ...anonymized,
      ...enterpriseInfo,
    };
  }

  // Anonymize full data object
  private async anonymizeData(
    data: any,
    enterpriseId: string,
    userId?: string,
  ): Promise<AnonymizedData> {
    // Get enterprise info
    const { data: enterprise } = await this.supabase
      .from('enterprises')
      .select('industry, employee_count, created_at')
      .eq('id', enterpriseId)
      .single();

    // Use the database anonymization function
    const { data: anonymized } = await this.supabase.rpc('anonymize_memory_for_donna', {
      p_memory_content: JSON.stringify(data),
      p_memory_context: {
        enterprise_id: enterpriseId,
        user_id: userId,
        timestamp: new Date().toISOString(),
      },
      p_memory_type: 'learning_data',
    });

    const result = anonymized || {};

    return {
      content: result.content || '',
      context: result.context || {},
      type: result.type || 'unknown',
      industry: enterprise?.industry,
      companySize: this.categorizeCompanySize(enterprise?.employee_count),
      useCase: this.identifyUseCase(data),
    };
  }

  // Sensitive field detection
  private isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password', 'token', 'key', 'secret', 'ssn', 'tax_id',
      'bank_account', 'credit_card', 'email', 'phone',
      'address', 'name', 'company_name', 'vendor_name',
      'user_id', 'enterprise_id', 'api_key',
    ];

    return sensitiveFields.some(field =>
      fieldName.toLowerCase().includes(field),
    );
  }

  // Anonymize string values
  private async anonymizeString(value: string): Promise<string> {
    // Remove emails
    value = value.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]');

    // Remove phone numbers
    value = value.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');

    // Remove SSNs
    value = value.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');

    // Remove URLs
    value = value.replace(/https?:\/\/[^\s]+/g, '[URL]');

    // Remove IP addresses
    value = value.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP]');

    // Remove specific names (this would be more sophisticated in production)
    value = value.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]');

    return value;
  }

  // Anonymize numeric values
  private anonymizeNumber(key: string, value: number): any {
    // For monetary values, return ranges
    if (key.includes('amount') || key.includes('value') || key.includes('price')) {
      if (value < 1000) {return 'small';}
      if (value < 10000) {return 'medium';}
      if (value < 100000) {return 'large';}
      if (value < 1000000) {return 'very_large';}
      return 'enterprise';
    }

    // For counts, return ranges
    if (key.includes('count') || key.includes('number')) {
      if (value < 10) {return 'few';}
      if (value < 50) {return 'some';}
      if (value < 200) {return 'many';}
      return 'very_many';
    }

    // For percentages, round to nearest 10
    if (key.includes('percent') || key.includes('rate')) {
      return Math.round(value / 10) * 10;
    }

    // Default: return order of magnitude
    return Math.pow(10, Math.floor(Math.log10(value)));
  }

  // Anonymize objects recursively
  private async anonymizeObject(obj: any): Promise<any> {
    if (Array.isArray(obj)) {
      return Promise.all(obj.map(item => this.anonymizeData(item, '', '')));
    }

    const anonymized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (this.isSensitiveField(key)) {continue;}

      if (typeof value === 'string') {
        anonymized[key] = await this.anonymizeString(value);
      } else if (typeof value === 'number') {
        anonymized[key] = this.anonymizeNumber(key, value);
      } else if (typeof value === 'object' && value !== null) {
        anonymized[key] = await this.anonymizeObject(value);
      } else {
        anonymized[key] = value;
      }
    }

    return anonymized;
  }

  // Categorize company size
  private categorizeCompanySize(employeeCount?: number): string {
    if (!employeeCount) {return 'unknown';}

    if (employeeCount < 10) {return 'micro';}
    if (employeeCount < 50) {return 'small';}
    if (employeeCount < 250) {return 'medium';}
    if (employeeCount < 1000) {return 'large';}
    return 'enterprise';
  }

  // Identify use case from data
  private identifyUseCase(data: any): string {
    const dataStr = JSON.stringify(data).toLowerCase();

    if (dataStr.includes('contract')) {return 'contract_management';}
    if (dataStr.includes('vendor')) {return 'vendor_management';}
    if (dataStr.includes('budget')) {return 'financial_management';}
    if (dataStr.includes('compliance')) {return 'compliance_tracking';}
    if (dataStr.includes('invoice')) {return 'invoice_processing';}
    if (dataStr.includes('approval')) {return 'approval_workflow';}

    return 'general';
  }

  // Generate unique query ID
  private generateQueryId(): string {
    return `donna_query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Log query for tracking
  private async logQuery(
    queryId: string,
    query: DonnaQuery,
    analysis: any,
  ): Promise<void> {
    try {
      await this.supabase
        .from('donna_query_logs')
        .insert({
          id: queryId,
          query_type: query.type,
          query_context: query.context,
          enterprise_id: query.enterpriseId,
          insights_count: analysis.insights.length,
          recommendations_count: analysis.recommendations.length,
          confidence: analysis.confidence,
          created_at: new Date().toISOString(),
        });
    } catch (error) {
      console.error('Error logging Donna query:', error);
    }
  }

  // Get Donna's performance metrics
  async getPerformanceMetrics(enterpriseId?: string): Promise<{
    totalQueries: number;
    successRate: number;
    avgConfidence: number;
    avgUserSatisfaction: number;
    topQueryTypes: Array<{ type: string; count: number }>;
  }> {
    let query = this.supabase
      .from('donna_query_logs')
      .select('*');

    if (enterpriseId) {
      query = query.eq('enterprise_id', enterpriseId);
    }

    const { data: queries } = await query;

    if (!queries || queries.length === 0) {
      return {
        totalQueries: 0,
        successRate: 0,
        avgConfidence: 0,
        avgUserSatisfaction: 0,
        topQueryTypes: [],
      };
    }

    const metrics = {
      totalQueries: queries.length,
      successCount: 0,
      totalConfidence: 0,
      totalSatisfaction: 0,
      satisfactionCount: 0,
      queryTypes: new Map<string, number>(),
    };

    for (const query of queries) {
      // Count successes
      if (query.feedback_received && query.feedback_success) {
        metrics.successCount++;
      }

      // Sum confidence
      metrics.totalConfidence += query.confidence || 0;

      // Sum satisfaction
      if (query.user_satisfaction !== null && query.user_satisfaction !== undefined) {
        metrics.totalSatisfaction += query.user_satisfaction;
        metrics.satisfactionCount++;
      }

      // Count query types
      const type = query.query_type;
      metrics.queryTypes.set(type, (metrics.queryTypes.get(type) || 0) + 1);
    }

    const feedbackCount = queries.filter(q => q.feedback_received).length;

    return {
      totalQueries: metrics.totalQueries,
      successRate: feedbackCount > 0 ? metrics.successCount / feedbackCount : 0,
      avgConfidence: metrics.totalQueries > 0 ? metrics.totalConfidence / metrics.totalQueries : 0,
      avgUserSatisfaction: metrics.satisfactionCount > 0 ?
        metrics.totalSatisfaction / metrics.satisfactionCount : 0,
      topQueryTypes: Array.from(metrics.queryTypes.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
    };
  }
}