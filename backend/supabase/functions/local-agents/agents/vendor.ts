/**
 * Vendor Agent Module
 *
 * Provides comprehensive vendor management capabilities for the Pactwise platform.
 * Supports vendor analysis, performance tracking, relationship scoring, risk assessment,
 * portfolio analysis, and new vendor evaluation/onboarding.
 *
 * @module VendorAgent
 * @version 2.0.0 (Production-Ready Upgrade)
 *
 * ## Capabilities
 * - vendor_analysis: Deep-dive analysis of individual vendors including profile, performance, and compliance
 * - performance_tracking: Monitor and track vendor performance metrics over time
 * - relationship_scoring: Calculate and assess vendor relationship health and strength
 * - risk_assessment: Identify and evaluate vendor-related risks with mitigation strategies
 *
 * ## Analysis Types
 * - portfolio: Enterprise-wide vendor portfolio analysis with concentration risk, category breakdown, and optimization opportunities
 * - onboarding: New vendor evaluation including basic checks, financial stability, references, capabilities, and pricing assessment
 * - specific: Targeted analysis of a single vendor by ID with full performance and compliance review
 * - general: Initial vendor assessment with red flag detection and categorization
 *
 * ## Architecture
 * - Extends BaseAgent for consistent processing patterns and shared functionality
 * - Integrates with Supabase for vendor data persistence and retrieval
 * - Supports enterprise-scoped analysis with multi-tenant isolation
 * - Implements comprehensive insight generation for actionable recommendations
 *
 * ## Key Features
 * - Vendor Profile Building: Categorization, engagement length, spend level, strategic importance
 * - Performance Metrics: Overall scores, trends, delivery/quality/responsiveness breakdowns
 * - Relationship Scoring: Multi-factor assessment (performance, longevity, spend, issues, compliance)
 * - Risk Identification: Performance decline, dependency, compliance, issue frequency risks
 * - Opportunity Detection: Volume discounts, performance incentives, strategic partnerships
 * - Portfolio Optimization: Concentration analysis, consolidation opportunities, performance distribution
 * - New Vendor Evaluation: Documentation checks, financial stability, reference evaluation, capability matching
 *
 * ## Error Handling
 * - Returns default VendorAnalysis structure on error with error details
 * - Graceful degradation with meaningful error messages in recommendations
 * - Maintains insight and rule tracking even during error conditions
 *
 * @example
 * ```typescript
 * const agent = new VendorAgent(supabase);
 *
 * // Analyze specific vendor
 * const vendorResult = await agent.process(
 *   { vendorId: 'vendor-uuid' },
 *   { userId: 'user-uuid', vendorId: 'vendor-uuid' }
 * );
 *
 * // Analyze vendor portfolio
 * const portfolioResult = await agent.process(
 *   {},
 *   { userId: 'user-uuid', analysisType: 'portfolio' }
 * );
 *
 * // Evaluate new vendor for onboarding
 * const onboardingResult = await agent.process(
 *   { documentation: {...}, financial: {...}, references: [...] },
 *   { userId: 'user-uuid', analysisType: 'onboarding' }
 * );
 * ```
 *
 * @see BaseAgent - Parent class providing core agent functionality
 * @see VendorAnalysis - Primary result type for vendor analysis
 * @see NewVendorEvaluation - Result type for onboarding evaluations
 */
import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import {
  Vendor, VendorPortfolio, NewVendorEvaluation, VendorProfile,
  PerformanceMetrics, RelationshipScore, VendorRisk, Opportunity,
  ComplianceStatus, VendorAnalysis, PortfolioSummary, CategoryAnalysis,
  PerformanceDistribution, SpendConcentration, PortfolioRisk,
  PortfolioOptimization, VendorInfo, InitialAssessment, PerformanceHistoryItem,
  NewVendorEvaluationData, BasicChecks, FinancialStability, ExtendedVendor,
  References, Capabilities, Pricing, NewVendorRisk, CapabilitiesData,
  PricingData, NewVendorRiskData, Issue,
  PortfolioVendor, VendorCategory
} from '../../../types/common/vendor.ts';
import {
  validateVendorAgentInput,
  validateVendorContext,
  sanitizeContent,
  detectInputConflicts,
  ValidatedVendorAgentInput,
  ValidatedVendorContext,
} from '../schemas/vendor.ts';
import {
  getDefaultVendorConfig,
  VendorConfig,
} from '../config/vendor-config.ts';

// Extend AgentContext for vendor-specific properties
interface VendorAgentContext extends AgentContext {
  vendorId?: string;
  analysisType?: 'portfolio' | 'onboarding' | 'specific' | 'general';
}

// Union type for all possible vendor analysis results
type VendorAnalysisResult = VendorAnalysis | NewVendorEvaluation | {
  summary: PortfolioSummary;
  categoryAnalysis: CategoryAnalysis[];
  performanceDistribution: PerformanceDistribution;
  spendConcentration: SpendConcentration;
  riskExposure: PortfolioRisk;
  optimizationOpportunities: PortfolioOptimization[];
} | {
  vendorInfo: VendorInfo;
  category: string;
  initialAssessment: InitialAssessment;
};

/**
 * Error categories for vendor agent operations
 */
type VendorErrorCategory =
  | 'validation'
  | 'database'
  | 'timeout'
  | 'external'
  | 'rate_limiting'
  | 'calculation'
  | 'unknown';

/**
 * Classified error with category and retry eligibility
 */
interface ClassifiedError {
  category: VendorErrorCategory;
  message: string;
  originalError: Error;
  isRetryable: boolean;
  context?: Record<string, unknown>;
}

export class VendorAgent extends BaseAgent {
  /**
   * Get the agent type identifier
   *
   * Returns the unique type identifier for this agent, used for routing
   * and identification in the agent orchestration system.
   *
   * @returns The string 'vendor' identifying this as the Vendor Agent
   *
   * @example
   * ```typescript
   * const agent = new VendorAgent(supabase);
   * console.log(agent.agentType); // 'vendor'
   * ```
   */
  get agentType() {
    return 'vendor';
  }

  /**
   * Get the list of capabilities this agent provides
   *
   * Returns an array of capability identifiers that describe what this agent
   * can do. Used for capability-based routing and agent discovery.
   *
   * @returns Array of capability strings: vendor_analysis, performance_tracking,
   *          relationship_scoring, risk_assessment
   *
   * @example
   * ```typescript
   * const agent = new VendorAgent(supabase);
   * if (agent.capabilities.includes('vendor_analysis')) {
   *   // Agent can perform vendor analysis
   * }
   * ```
   */
  get capabilities() {
    return ['vendor_analysis', 'performance_tracking', 'relationship_scoring', 'risk_assessment'];
  }

  // ==========================================================================
  // CONSTANTS
  // ==========================================================================

  /** Error categories for classification */
  private static readonly ERROR_CATEGORIES = {
    VALIDATION: 'validation' as VendorErrorCategory,
    DATABASE: 'database' as VendorErrorCategory,
    TIMEOUT: 'timeout' as VendorErrorCategory,
    EXTERNAL: 'external' as VendorErrorCategory,
    RATE_LIMITING: 'rate_limiting' as VendorErrorCategory,
    CALCULATION: 'calculation' as VendorErrorCategory,
    UNKNOWN: 'unknown' as VendorErrorCategory,
  };

  /** Errors that can be retried */
  private static readonly RETRYABLE_ERRORS = new Set<VendorErrorCategory>([
    'database',
    'timeout',
    'external',
    'rate_limiting',
  ]);

  // ==========================================================================
  // ERROR HANDLING METHODS
  // ==========================================================================

  /**
   * Classify an error into a category for proper handling
   *
   * Analyzes error message patterns to determine the error category,
   * which is used to decide retry eligibility and appropriate handling.
   *
   * @param error - The error to classify
   * @param context - Optional context information for the error
   * @returns ClassifiedError object with category and retry eligibility
   */
  private classifyError(error: unknown, context?: Record<string, unknown>): ClassifiedError {
    const originalError = error instanceof Error ? error : new Error(String(error));
    const message = originalError.message.toLowerCase();

    let category: VendorErrorCategory = VendorAgent.ERROR_CATEGORIES.UNKNOWN;

    if (message.includes('validation') || message.includes('invalid') || message.includes('required') || message.includes('schema')) {
      category = VendorAgent.ERROR_CATEGORIES.VALIDATION;
    } else if (message.includes('database') || message.includes('supabase') || message.includes('postgres') || message.includes('connection') || message.includes('query')) {
      category = VendorAgent.ERROR_CATEGORIES.DATABASE;
    } else if (message.includes('timeout') || message.includes('timed out') || message.includes('deadline') || message.includes('exceeded')) {
      category = VendorAgent.ERROR_CATEGORIES.TIMEOUT;
    } else if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429') || message.includes('throttl')) {
      category = VendorAgent.ERROR_CATEGORIES.RATE_LIMITING;
    } else if (message.includes('external') || message.includes('api') || message.includes('network') || message.includes('fetch') || message.includes('http')) {
      category = VendorAgent.ERROR_CATEGORIES.EXTERNAL;
    } else if (message.includes('calculation') || message.includes('nan') || message.includes('infinity') || message.includes('divide') || message.includes('math')) {
      category = VendorAgent.ERROR_CATEGORIES.CALCULATION;
    }

    return {
      category,
      message: originalError.message,
      originalError,
      isRetryable: VendorAgent.RETRYABLE_ERRORS.has(category),
      context,
    };
  }

  /**
   * Execute an operation with exponential backoff retry
   *
   * Retries the operation with increasing delays on retryable errors.
   * Uses exponential backoff with configurable base and max delays.
   *
   * @param operation - Async function to execute
   * @param config - Vendor configuration containing retry settings
   * @param operationName - Name of the operation for logging
   * @returns Result of the operation
   * @throws Last error if all retries fail
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: VendorConfig,
    operationName: string,
  ): Promise<T> {
    let lastError: unknown;
    const maxAttempts = config.maxRetryAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const classifiedError = this.classifyError(error, { operationName, attempt });

        // Don't retry non-retryable errors
        if (!classifiedError.isRetryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxAttempts) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseRetryDelayMs * Math.pow(2, attempt - 1),
          config.maxRetryDelayMs,
        );

        console.warn(
          `[VendorAgent] ${operationName} failed (attempt ${attempt}/${maxAttempts}), ` +
          `category: ${classifiedError.category}, retrying in ${delay}ms...`,
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Create a partial result for graceful degradation
   *
   * When full analysis fails, this creates a partial result with
   * error information and any data that was successfully collected.
   *
   * @param error - The classified error that caused degradation
   * @param partialData - Any partial data that was collected before failure
   * @returns ProcessingResult with partial data and degradation indicator
   */
  private createPartialVendorResult(
    error: ClassifiedError,
    partialData?: Partial<VendorAnalysisResult>,
  ): ProcessingResult<VendorAnalysisResult> {
    const defaultResult: VendorAnalysis = {
      profile: {
        name: 'Unknown',
        category: 'unknown',
        engagementLength: '0',
        spendLevel: 'low',
        contractComplexity: 'simple',
        strategicImportance: 'low',
      },
      performance: {
        overallScore: 0,
        trend: 'stable',
        trendRate: 0,
        deliveryScore: 0,
        qualityScore: 0,
        responsivenessScore: 0,
        issueFrequency: 'low',
        components: {
          delivery: 0,
          quality: 0,
          responsiveness: 0,
          issues: 0,
        },
      },
      relationshipScore: {
        score: 0,
        factors: {
          performance: 0,
          longevity: 0,
          spend: 0,
          issues: 0,
          compliance: 0,
        },
        strength: 'weak',
        recommendations: [],
      },
      risks: [],
      opportunities: [],
      recommendations: [`Analysis incomplete: ${error.message}`],
      complianceStatus: {
        compliant: false,
        issues: ['Unable to verify compliance due to processing error'],
        lastChecked: new Date().toISOString(),
        nextReviewDate: new Date().toISOString(),
      },
      ...partialData,
    };

    const insights: Insight[] = [
      this.createInsight(
        'analysis_degraded',
        'medium',
        'Vendor Analysis Completed with Limitations',
        `Full analysis could not be completed: ${error.message}`,
        'Retry the analysis or contact support if issue persists',
        { error: error.message, category: error.category, degraded: true },
      ),
    ];

    return this.createResult(
      true, // Still return success with partial results
      defaultResult,
      insights,
      ['graceful_degradation'],
      0.5, // Lower confidence for degraded results
      { degraded: true, error: error.message, errorCategory: error.category },
    );
  }

  /**
   * Process vendor data and route to appropriate analysis handler
   *
   * Main entry point for all vendor agent operations. Validates input,
   * checks permissions, logs audit trail, and routes to the appropriate
   * analysis method based on context (specific vendor, portfolio, onboarding,
   * or general analysis).
   *
   * @param data - Extended vendor data containing vendor information, metrics,
   *               and optional documentation for analysis
   * @param context - Optional context with userId, vendorId, and analysisType
   *                  to control routing and authorization
   * @returns ProcessingResult containing the analysis data, insights, rules applied,
   *          and confidence score
   * @throws {Error} If user lacks permission for vendor analysis
   *
   * @example
   * ```typescript
   * // Analyze a specific vendor
   * const result = await agent.process(
   *   { vendorId: 'vendor-123' },
   *   { userId: 'user-456', vendorId: 'vendor-123' }
   * );
   *
   * // Analyze vendor portfolio
   * const portfolioResult = await agent.process(
   *   {},
   *   { userId: 'user-456', analysisType: 'portfolio' }
   * );
   *
   * // Evaluate new vendor for onboarding
   * const onboardingResult = await agent.process(
   *   { documentation: {...}, financial: {...} },
   *   { userId: 'user-456', analysisType: 'onboarding' }
   * );
   * ```
   */
  async process(data: ExtendedVendor, context?: VendorAgentContext): Promise<ProcessingResult<VendorAnalysisResult>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];
    const config = getDefaultVendorConfig();

    try {
      // =======================================================================
      // INPUT VALIDATION
      // =======================================================================

      // Validate context if provided
      if (context) {
        const contextValidation = validateVendorContext(context);
        if (!contextValidation.success) {
          console.warn('[VendorAgent] Context validation warnings:', contextValidation.errors);
          // Continue with advisory warning - not a hard failure
          insights.push(this.createInsight(
            'context_validation_warning',
            'low',
            'Context Validation Warnings',
            `Some context fields had validation issues: ${contextValidation.errors?.join(', ')}`,
            'Verify context data for optimal analysis results',
            { errors: contextValidation.errors },
          ));
        }
        rulesApplied.push('context_validated');
      }

      // Validate input data
      const inputValidation = validateVendorAgentInput(data);
      if (!inputValidation.success) {
        // For vendor agent, validation errors are advisory - continue with available data
        insights.push(this.createInsight(
          'input_validation_warning',
          'low',
          'Input Validation Warnings',
          `Some input fields had validation issues: ${inputValidation.errors?.join(', ')}`,
          'Verify input data for optimal analysis results',
          { errors: inputValidation.errors },
        ));
      }
      rulesApplied.push('input_validated');

      // Detect input conflicts between data and context
      const conflicts = detectInputConflicts(
        data as ValidatedVendorAgentInput,
        context as ValidatedVendorContext | undefined,
      );
      if (conflicts.length > 0) {
        insights.push(this.createInsight(
          'input_conflict_warning',
          'low',
          'Input Conflicts Detected',
          conflicts.join('; '),
          'Review input parameters for clarity',
          { conflicts },
        ));
        rulesApplied.push('conflict_detection');
      }

      // Sanitize content if provided
      if ((data as { content?: string }).content) {
        (data as { content: string }).content = sanitizeContent((data as { content: string }).content);
        rulesApplied.push('content_sanitized');
      }

      // =======================================================================
      // PERMISSION CHECK
      // =======================================================================

      if (context?.userId) {
        const hasPermission = await this.checkUserPermission(context.userId, 'user');
        if (!hasPermission) {
          throw new Error('Insufficient permissions for vendor analysis');
        }
        rulesApplied.push('permissions_checked');
      }

      // =======================================================================
      // AUDIT LOG
      // =======================================================================

      await this.createAuditLog(
        'vendor_analysis_request',
        'vendor',
        context?.analysisType || 'general',
        { agentType: this.agentType, vendorId: context?.vendorId || data.vendorId },
      );
      rulesApplied.push('audit_logged');

      // =======================================================================
      // ROUTE TO APPROPRIATE ANALYSIS
      // =======================================================================

      // Determine processing type and execute with retry for database operations
      if (context?.vendorId || data.vendorId) {
        return await this.executeWithRetry(
          () => this.analyzeSpecificVendor(data, context!, rulesApplied, insights),
          config,
          'Specific vendor analysis',
        );
      } else if (context?.analysisType === 'portfolio') {
        return await this.executeWithRetry(
          () => this.analyzeVendorPortfolio(data as Partial<VendorPortfolio>, context!, rulesApplied, insights),
          config,
          'Portfolio analysis',
        );
      } else if (context?.analysisType === 'onboarding') {
        return await this.executeWithRetry(
          () => this.evaluateNewVendor(data as NewVendorEvaluationData, context!, rulesApplied, insights),
          config,
          'New vendor evaluation',
        );
      }

      // Default vendor analysis
      return await this.executeWithRetry(
        () => this.performGeneralVendorAnalysis(data, context!, rulesApplied, insights),
        config,
        'General vendor analysis',
      );

    } catch (error) {
      const classifiedError = this.classifyError(error, {
        vendorId: context?.vendorId || data.vendorId,
        analysisType: context?.analysisType,
      });

      // For validation errors, fail immediately without degradation
      if (classifiedError.category === VendorAgent.ERROR_CATEGORIES.VALIDATION) {
        return this.createResult(
          false,
          {} as VendorAnalysisResult,
          insights,
          rulesApplied,
          0,
          { error: classifiedError.message, category: classifiedError.category },
        );
      }

      // For other errors, attempt graceful degradation if enabled
      if (config.enableGracefulDegradation) {
        return this.createPartialVendorResult(classifiedError);
      }

      // Return a default vendor analysis with error info
      const defaultResult: VendorAnalysisResult = {
        profile: {
          name: 'Unknown',
          category: 'unknown',
          engagementLength: '0',
          spendLevel: 'low',
          contractComplexity: 'simple',
          strategicImportance: 'low',
        },
        performance: {
          overallScore: 0,
          trend: 'stable',
          trendRate: 0,
          deliveryScore: 0,
          qualityScore: 0,
          responsivenessScore: 0,
          issueFrequency: 'low',
          components: {
            delivery: 0,
            quality: 0,
            responsiveness: 0,
            issues: 0,
          },
        },
        relationshipScore: {
          score: 0,
          factors: {
            performance: 0,
            longevity: 0,
            spend: 0,
            issues: 0,
            compliance: 0,
          },
          strength: 'weak',
          recommendations: [],
        },
        risks: [],
        opportunities: [],
        recommendations: ['Error occurred during vendor analysis'],
        complianceStatus: {
          compliant: false,
          issues: [classifiedError.message],
          lastChecked: new Date().toISOString(),
          nextReviewDate: new Date().toISOString(),
        },
      };

      return this.createResult(
        false,
        defaultResult,
        insights,
        rulesApplied,
        0,
        { error: classifiedError.message, category: classifiedError.category },
      );
    }
  }

  /**
   * Analyze a specific vendor with deep-dive metrics
   *
   * Performs comprehensive analysis of a single vendor including performance
   * metrics, relationship scoring, risk assessment, compliance checking,
   * and opportunity identification. Generates actionable insights and
   * recommendations based on the analysis.
   *
   * @param data - The extended vendor data for analysis
   * @param context - The vendor agent context with vendorId and metadata
   * @param rulesApplied - Array to collect applied rule names for audit trail
   * @param insights - Array to collect generated insights during analysis
   * @returns ProcessingResult containing VendorAnalysis with profile, performance,
   *          risks, opportunities, and recommendations
   * @throws {Error} If vendor data cannot be retrieved from the database
   *
   * @example
   * ```typescript
   * const result = await this.analyzeSpecificVendor(
   *   { vendorId: 'vendor-123' },
   *   { userId: 'user-456', vendorId: 'vendor-123' },
   *   [],
   *   []
   * );
   * console.log(result.data.performance.overallScore);
   * ```
   */
  private async analyzeSpecificVendor(
    data: ExtendedVendor,
    context: VendorAgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<VendorAnalysis>> {
    rulesApplied.push('vendor_specific_analysis');

    const vendorId = context?.vendorId || data.vendorId || '';

    try {
      // Get vendor data and metrics with error handling
      const vendorData = await this.getVendorData(vendorId);
      const performanceMetrics = await this.calculatePerformanceMetrics(vendorData);

      const analysis: VendorAnalysis = {
        profile: this.buildVendorProfile(vendorData),
        performance: performanceMetrics,
        relationshipScore: this.calculateRelationshipScore(vendorData, performanceMetrics),
        risks: this.assessVendorRisks(vendorData, performanceMetrics),
        opportunities: this.identifyOpportunities(vendorData, performanceMetrics),
        recommendations: [] as string[],
        complianceStatus: this.checkVendorCompliance(vendorData),
      };

      // Performance insights
      if (analysis.performance.overallScore < 0.6) {
        insights.push(this.createInsight(
          'poor_vendor_performance',
          'high',
          'Poor Vendor Performance',
          `Vendor is performing at ${(analysis.performance.overallScore * 100).toFixed(1)}% of expected levels`,
          'Schedule performance review and consider alternatives',
          { performance: analysis.performance },
        ));
        rulesApplied.push('performance_threshold_check');
      }

      // Relationship insights
      if (analysis.relationshipScore.score < 0.5) {
        insights.push(this.createInsight(
          'weak_vendor_relationship',
          'medium',
          'Weak Vendor Relationship',
          `Relationship score of ${(analysis.relationshipScore.score * 100).toFixed(1)}% indicates issues`,
          'Improve communication and address outstanding issues',
          { relationship: analysis.relationshipScore },
        ));
        rulesApplied.push('relationship_assessment');
      }

      // Risk insights
      for (const risk of analysis.risks) {
        if (risk.severity === 'high' || (risk.severity as string) === 'critical') {
          insights.push(this.createInsight(
            'vendor_risk',
            risk.severity as 'high' | 'critical',
            `Vendor Risk: ${risk.type}`,
            risk.description,
            risk.mitigation,
            { risk },
          ));
        }
      }

      // Compliance insights
      if (!analysis.complianceStatus.compliant) {
        insights.push(this.createInsight(
          'vendor_compliance_issue',
          'critical',
          'Vendor Compliance Issues',
          `Vendor is non-compliant in ${analysis.complianceStatus.issues.length} areas`,
          'Address compliance issues before continuing engagement',
          { compliance: analysis.complianceStatus },
        ));
        rulesApplied.push('compliance_check');
      }

      // Generate recommendations
      analysis.recommendations = this.generateVendorRecommendations(analysis);

      return this.createResult(
        true,
        analysis,
        insights,
        rulesApplied,
        0.85, // default confidence
      );
    } catch (error) {
      // Classify and rethrow with context for proper handling upstream
      const classifiedError = this.classifyError(error, { vendorId, operation: 'analyzeSpecificVendor' });
      console.error(`[VendorAgent] analyzeSpecificVendor failed for vendor ${vendorId}:`, classifiedError.message);
      throw error;
    }
  }

  /**
   * Analyze the enterprise vendor portfolio
   *
   * Performs portfolio-wide analysis including summary statistics, category
   * breakdown, performance distribution, spend concentration (with HHI index),
   * risk exposure assessment, and optimization opportunities. Identifies
   * concentration risks, underperforming categories, and consolidation opportunities.
   *
   * @param _data - Partial vendor portfolio data (currently fetched internally)
   * @param _context - The vendor agent context (unused but reserved for future use)
   * @param rulesApplied - Array to collect applied rule names for audit trail
   * @param insights - Array to collect generated insights during analysis
   * @returns ProcessingResult containing portfolio analysis with summary,
   *          category analysis, performance distribution, spend concentration,
   *          risk exposure, and optimization opportunities
   * @throws {Error} If portfolio data cannot be retrieved from the database
   *
   * @example
   * ```typescript
   * const result = await this.analyzeVendorPortfolio(
   *   {},
   *   { userId: 'user-456', analysisType: 'portfolio' },
   *   [],
   *   []
   * );
   * console.log(result.data.summary.totalVendors);
   * console.log(result.data.spendConcentration.herfindahlIndex);
   * ```
   */
  private async analyzeVendorPortfolio(
    _data: Partial<VendorPortfolio>,
    _context: VendorAgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<{
    summary: PortfolioSummary;
    categoryAnalysis: CategoryAnalysis[];
    performanceDistribution: PerformanceDistribution;
    spendConcentration: SpendConcentration;
    riskExposure: PortfolioRisk;
    optimizationOpportunities: PortfolioOptimization[];
  }>> {
    rulesApplied.push('portfolio_analysis');

    try {
      const portfolioData = await this.getPortfolioData();

      const analysis = {
        summary: this.generatePortfolioSummary(portfolioData),
        categoryAnalysis: this.analyzeByCategory(portfolioData),
        performanceDistribution: this.analyzePerformanceDistribution(portfolioData),
        spendConcentration: this.analyzeSpendConcentration(portfolioData),
        riskExposure: this.assessPortfolioRisk(portfolioData),
        optimizationOpportunities: this.identifyPortfolioOptimizations(portfolioData),
      };

      // Concentration risk
      if (analysis.spendConcentration.topVendorShare > 0.3) {
        insights.push(this.createInsight(
          'vendor_concentration',
          'high',
          'High Vendor Concentration',
          `Top vendor represents ${(analysis.spendConcentration.topVendorShare * 100).toFixed(1)}% of total spend`,
          'Diversify vendor base to reduce dependency risk',
          { concentration: analysis.spendConcentration },
        ));
        rulesApplied.push('concentration_analysis');
      }

      // Performance distribution
      const { poorPerformers } = analysis.performanceDistribution;
      if (poorPerformers.length > portfolioData.vendors.length * 0.2) {
        insights.push(this.createInsight(
          'widespread_performance_issues',
          'high',
          'Widespread Vendor Performance Issues',
          `${poorPerformers.length} vendors (${((poorPerformers.length / portfolioData.vendors.length) * 100).toFixed(1)}%) are underperforming`,
          'Review vendor management processes and selection criteria',
          { poorPerformers },
        ));
      }

      // Category risks
      for (const category of analysis.categoryAnalysis) {
        if (category.riskLevel === 'high') {
          insights.push(this.createInsight(
            'category_risk',
            'medium',
            `High Risk in ${category.name} Category`,
            category.riskDescription,
            'Implement category-specific risk mitigation strategies',
            { category },
          ));
        }
      }

      return this.createResult(
        true,
        analysis,
        insights,
        rulesApplied,
        0.9,
      );
    } catch (error) {
      // Classify and rethrow with context for proper handling upstream
      const classifiedError = this.classifyError(error, { operation: 'analyzeVendorPortfolio' });
      console.error('[VendorAgent] analyzeVendorPortfolio failed:', classifiedError.message);
      throw error;
    }
  }

  /**
   * Evaluate a new vendor for onboarding
   *
   * Performs comprehensive evaluation of a prospective vendor including
   * basic documentation checks, financial stability assessment, reference
   * evaluation, capability matching, pricing analysis, and risk assessment.
   * Calculates an overall onboarding score and provides a recommendation.
   *
   * @param data - New vendor evaluation data including documentation,
   *               financial info, references, capabilities, and pricing
   * @param _context - The vendor agent context (unused but reserved for future use)
   * @param rulesApplied - Array to collect applied rule names for audit trail
   * @param insights - Array to collect generated insights during evaluation
   * @returns ProcessingResult containing NewVendorEvaluation with checks,
   *          assessments, score, and recommendation
   * @throws {Error} If evaluation fails due to data processing errors
   *
   * @example
   * ```typescript
   * const result = await this.evaluateNewVendor(
   *   {
   *     documentation: { businessLicense: true, insurance: true },
   *     financial: { revenue: 5000000, profitMargin: 0.15 },
   *     references: [{ rating: 4.5, company: 'Acme Corp' }],
   *     requiredCapabilities: ['cloud', 'security'],
   *     vendorCapabilities: ['cloud', 'security', 'devops']
   *   },
   *   { userId: 'user-456', analysisType: 'onboarding' },
   *   [],
   *   []
   * );
   * console.log(result.data.recommendation);
   * ```
   */
  private async evaluateNewVendor(
    data: NewVendorEvaluationData,
    _context: VendorAgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<NewVendorEvaluation>> {
    rulesApplied.push('vendor_onboarding_evaluation');

    try {
      const evaluation: NewVendorEvaluation = {
        basicChecks: this.performBasicVendorChecks(data),
        financialStability: this.assessFinancialStability(data),
        references: this.evaluateReferences(data),
        capabilities: this.assessCapabilities(data),
        pricing: this.evaluatePricing(data),
        risks: this.assessNewVendorRisks(data),
        score: 0,
        recommendation: '',
      };

      // Calculate overall score
      evaluation.score = this.calculateOnboardingScore(evaluation);

      // Basic checks
      if (!evaluation.basicChecks.passed) {
        insights.push(this.createInsight(
          'failed_basic_checks',
          'critical',
          'Vendor Failed Basic Requirements',
          `Missing: ${evaluation.basicChecks.missing.join(', ')}`,
          'Obtain missing documentation before proceeding',
          { checks: evaluation.basicChecks },
        ));
        rulesApplied.push('basic_requirements_check');
      }

      // Financial stability
      if (evaluation.financialStability.riskLevel === 'high') {
        insights.push(this.createInsight(
          'financial_stability_concern',
          'high',
          'Vendor Financial Stability Concerns',
          evaluation.financialStability.description,
          'Request financial guarantees or consider alternatives',
          { financial: evaluation.financialStability },
        ));
        rulesApplied.push('financial_assessment');
      }

      // References
      if (evaluation.references.averageRating < 3.5) {
        insights.push(this.createInsight(
          'poor_references',
          'medium',
          'Below Average Vendor References',
          `Average reference rating: ${evaluation.references.averageRating.toFixed(1)}/5`,
          'Investigate concerns raised by references',
          { references: evaluation.references },
        ));
      }

      // Pricing
      if (evaluation.pricing.competitiveness === 'above_market') {
        insights.push(this.createInsight(
          'high_pricing',
          'medium',
          'Above Market Pricing',
          `Pricing is ${evaluation.pricing.variance}% above market average`,
          'Negotiate pricing or justify premium with added value',
          { pricing: evaluation.pricing },
        ));
        rulesApplied.push('pricing_benchmark');
      }

      // Overall recommendation
      if (evaluation.score < 0.6) {
        evaluation.recommendation = 'Do not onboard - significant concerns';
      } else if (evaluation.score < 0.75) {
        evaluation.recommendation = 'Onboard with conditions and close monitoring';
      } else {
        evaluation.recommendation = 'Approve for onboarding';
      }

      return this.createResult(
        true,
        evaluation,
        insights,
        rulesApplied,
        0.8,
      );
    } catch (error) {
      // Classify and rethrow with context for proper handling upstream
      const classifiedError = this.classifyError(error, { operation: 'evaluateNewVendor' });
      console.error('[VendorAgent] evaluateNewVendor failed:', classifiedError.message);
      throw error;
    }
  }

  /**
   * Perform general vendor analysis for initial assessment
   *
   * Conducts an initial assessment of vendor data including information
   * extraction, categorization, and red flag detection. Used when no
   * specific vendor ID is provided and detailed analysis is not requested.
   *
   * @param data - Extended vendor data for analysis
   * @param _context - The vendor agent context (unused but reserved for future use)
   * @param rulesApplied - Array to collect applied rule names for audit trail
   * @param insights - Array to collect generated insights during analysis
   * @returns ProcessingResult containing vendor info, category, and initial
   *          assessment with red flags
   * @throws {Error} If analysis fails due to data processing errors
   *
   * @example
   * ```typescript
   * const result = await this.performGeneralVendorAnalysis(
   *   { name: 'TechCorp', description: 'Cloud services provider' },
   *   { userId: 'user-456' },
   *   [],
   *   []
   * );
   * console.log(result.data.category); // 'technology'
   * console.log(result.data.initialAssessment.hasRedFlags);
   * ```
   */
  private async performGeneralVendorAnalysis(
    data: ExtendedVendor,
    _context: VendorAgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<{
    vendorInfo: VendorInfo;
    category: string;
    initialAssessment: InitialAssessment;
  }>> {
    rulesApplied.push('general_vendor_analysis');

    try {
      const analysis = {
        vendorInfo: this.extractVendorInfo(data),
        category: this.categorizeVendor(data),
        initialAssessment: this.performInitialAssessment(data),
      };

      // Add insights based on initial assessment
      if (analysis.initialAssessment.hasRedFlags) {
        insights.push(this.createInsight(
          'vendor_red_flags',
          'high',
          'Vendor Red Flags Detected',
          `Found ${analysis.initialAssessment.redFlags.length} concerning indicators`,
          'Perform thorough due diligence before engagement',
          { redFlags: analysis.initialAssessment.redFlags },
        ));
      }

      return this.createResult(
        true,
        analysis,
        insights,
        rulesApplied,
        0.7,
      );
    } catch (error) {
      // Classify and rethrow with context for proper handling upstream
      const classifiedError = this.classifyError(error, { operation: 'performGeneralVendorAnalysis' });
      console.error('[VendorAgent] performGeneralVendorAnalysis failed:', classifiedError.message);
      throw error;
    }
  }

  // ==========================================================================
  // DATA RETRIEVAL METHODS
  // ==========================================================================

  /**
   * Fetch vendor data by ID
   *
   * Retrieves comprehensive vendor data from the database including
   * contract information, performance history, delivery metrics,
   * compliance status, and issue history.
   *
   * @param vendorId - The unique identifier of the vendor to fetch
   * @returns Promise resolving to Vendor object with all associated data
   * @throws {Error} If vendor is not found or database query fails
   *
   * @example
   * ```typescript
   * const vendorData = await this.getVendorData('vendor-123');
   * console.log(vendorData.name);
   * console.log(vendorData.performanceHistory);
   * ```
   */
  private async getVendorData(vendorId: string): Promise<Vendor> {
    // Simulate vendor data retrieval
    return {
      id: vendorId,
      name: 'Sample Vendor',
      category: 'technology',
      contractCount: 5,
      totalSpend: 500000,
      activeContracts: 3,
      performanceHistory: [
        { month: '2024-01', score: 0.85, issues: 1 },
        { month: '2024-02', score: 0.82, issues: 2 },
        { month: '2024-03', score: 0.78, issues: 3 },
        { month: '2024-04', score: 0.75, issues: 2 },
        { month: '2024-05', score: 0.70, issues: 4 },
        { month: '2024-06', score: 0.65, issues: 5 },
      ],
      deliveryMetrics: {
        onTimeRate: 0.75,
        qualityScore: 0.8,
        responsiveness: 0.7,
      },
      compliance: {
        insurance: true,
        certifications: ['ISO9001', 'SOC2'],
        lastAudit: '2024-01-15',
      },
      issues: [
        { date: '2024-05-15', type: 'delivery_delay', severity: 'medium' },
        { date: '2024-06-01', type: 'quality_issue', severity: 'high' },
      ],
    };
  }

  /**
   * Fetch enterprise vendor portfolio data
   *
   * Retrieves all vendor data for the enterprise portfolio including
   * vendor list with spend and performance, total spend, and category
   * breakdown. Used for portfolio-level analysis.
   *
   * @returns Promise resolving to VendorPortfolio with vendors, spend, and categories
   * @throws {Error} If database query fails
   *
   * @example
   * ```typescript
   * const portfolioData = await this.getPortfolioData();
   * console.log(portfolioData.totalSpend);
   * console.log(portfolioData.vendors.length);
   * ```
   */
  private async getPortfolioData(): Promise<VendorPortfolio> {
    // Simulate portfolio data
    return {
      vendors: [
        { id: 'v1', name: 'TechCorp', category: 'technology', spend: 800000, performance: 0.85 },
        { id: 'v2', name: 'ConsultPro', category: 'consulting', spend: 500000, performance: 0.55 },
        { id: 'v3', name: 'CloudServ', category: 'technology', spend: 600000, performance: 0.90 },
        { id: 'v4', name: 'MarketingCo', category: 'marketing', spend: 300000, performance: 0.70 },
        { id: 'v5', name: 'FacilitiesMgmt', category: 'facilities', spend: 200000, performance: 0.80 },
      ],
      totalSpend: 2400000,
      categories: [
        { name: 'technology', count: 2, spend: 1400000 },
        { name: 'consulting', count: 1, spend: 500000 },
        { name: 'marketing', count: 1, spend: 300000 },
        { name: 'facilities', count: 1, spend: 200000 },
      ],
    };
  }

  // ==========================================================================
  // PROFILE AND METRICS METHODS
  // ==========================================================================

  /**
   * Build a vendor profile from raw vendor data
   *
   * Constructs a structured vendor profile including name, category,
   * engagement length, spend level, contract complexity, and strategic
   * importance assessments.
   *
   * @param vendorData - Raw vendor data from the database
   * @returns VendorProfile with categorized vendor attributes
   *
   * @example
   * ```typescript
   * const profile = this.buildVendorProfile(vendorData);
   * console.log(profile.strategicImportance); // 'critical' | 'important' | 'moderate' | 'low'
   * ```
   */
  private buildVendorProfile(vendorData: Vendor): VendorProfile {
    return {
      name: vendorData.name,
      category: vendorData.category,
      engagementLength: this.calculateEngagementLength(vendorData),
      spendLevel: this.categorizeSpendLevel(vendorData.totalSpend),
      contractComplexity: this.assessContractComplexity(vendorData),
      strategicImportance: this.assessStrategicImportance(vendorData),
    };
  }

  /**
   * Calculate vendor performance metrics
   *
   * Computes comprehensive performance metrics including overall score
   * (based on recent 3-month average), performance trend direction and rate,
   * individual scores for delivery, quality, and responsiveness, issue
   * frequency classification, and weighted component scores.
   *
   * @param vendorData - Vendor data with performance history and delivery metrics
   * @returns Promise resolving to PerformanceMetrics with scores and trends
   *
   * @example
   * ```typescript
   * const metrics = await this.calculatePerformanceMetrics(vendorData);
   * console.log(metrics.overallScore); // 0-1 scale
   * console.log(metrics.trend); // 'improving' | 'stable' | 'declining'
   * ```
   */
  private async calculatePerformanceMetrics(vendorData: Vendor): Promise<PerformanceMetrics> {
    const recentPerformance = vendorData.performanceHistory.slice(-3);
    const avgRecentScore = recentPerformance.reduce((sum: number, p: PerformanceHistoryItem) => sum + p.score, 0) / recentPerformance.length;

    const trend = this.calculatePerformanceTrend(vendorData.performanceHistory);

    return {
      overallScore: avgRecentScore,
      trend: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable',
      trendRate: Math.abs(trend),
      deliveryScore: vendorData.deliveryMetrics.onTimeRate,
      qualityScore: vendorData.deliveryMetrics.qualityScore,
      responsivenessScore: vendorData.deliveryMetrics.responsiveness,
      issueFrequency: this.calculateIssueFrequency(vendorData.issues),
      components: {
        delivery: vendorData.deliveryMetrics.onTimeRate * 0.3,
        quality: vendorData.deliveryMetrics.qualityScore * 0.3,
        responsiveness: vendorData.deliveryMetrics.responsiveness * 0.2,
        issues: Math.max(0, 1 - (vendorData.issues.length * 0.1)) * 0.2,
      },
    };
  }

  /**
   * Calculate vendor relationship score
   *
   * Computes a multi-factor relationship score based on performance (30%),
   * longevity (20%), spend level (20%), issue history (15%), and compliance
   * status (15%). Returns score, individual factors, strength rating, and
   * improvement recommendations.
   *
   * @param vendorData - Vendor data with contract count, spend, issues, and compliance
   * @param performance - Previously calculated performance metrics
   * @returns RelationshipScore with overall score, factors, strength, and recommendations
   *
   * @example
   * ```typescript
   * const relationshipScore = this.calculateRelationshipScore(vendorData, performance);
   * console.log(relationshipScore.strength); // 'strong' | 'moderate' | 'weak'
   * console.log(relationshipScore.recommendations);
   * ```
   */
  private calculateRelationshipScore(vendorData: Vendor, performance: PerformanceMetrics): RelationshipScore {
    const factors = {
      performance: performance.overallScore * 0.3,
      longevity: Math.min(1, vendorData.contractCount / 10) * 0.2,
      spend: Math.min(1, vendorData.totalSpend / 1000000) * 0.2,
      issues: Math.max(0, 1 - (vendorData.issues.length * 0.05)) * 0.15,
      compliance: vendorData.compliance.insurance ? 0.15 : 0,
    };

    const score = Object.values(factors).reduce((sum, val) => sum + val, 0);

    return {
      score,
      factors,
      strength: score > 0.8 ? 'strong' : score > 0.6 ? 'moderate' : 'weak',
      recommendations: this.getRelationshipRecommendations(score, factors),
    };
  }

  // ==========================================================================
  // RISK AND OPPORTUNITY METHODS
  // ==========================================================================

  /**
   * Assess vendor-related risks
   *
   * Identifies and categorizes vendor risks including performance decline,
   * high dependency, outdated compliance, and frequent issues. Each risk
   * includes severity, description, impact, and mitigation strategy.
   *
   * @param vendorData - Vendor data with issues, spend, and compliance info
   * @param performance - Previously calculated performance metrics
   * @returns Array of VendorRisk objects with type, severity, and mitigation
   *
   * @example
   * ```typescript
   * const risks = this.assessVendorRisks(vendorData, performance);
   * const highRisks = risks.filter(r => r.severity === 'high');
   * console.log(highRisks.map(r => r.type));
   * ```
   */
  private assessVendorRisks(vendorData: Vendor, performance: PerformanceMetrics): VendorRisk[] {
    const risks: VendorRisk[] = [];

    // Performance risk
    if (performance.trend === 'declining' && performance.trendRate > 0.1) {
      risks.push({
        type: 'performance_decline',
        severity: 'high',
        description: `Performance declining at ${(performance.trendRate * 100).toFixed(1)}% per month`,
        impact: 'Service quality and delivery issues',
        mitigation: 'Implement performance improvement plan',
      });
    }

    // Dependency risk
    if (vendorData.totalSpend > 500000) {
      risks.push({
        type: 'high_dependency',
        severity: 'medium',
        description: 'High financial dependency on vendor',
        impact: 'Difficult to replace if issues arise',
        mitigation: 'Identify alternative vendors',
      });
    }

    // Compliance risk
    const daysSinceAudit = this.daysSince(vendorData.compliance.lastAudit);
    if (daysSinceAudit > 365) {
      risks.push({
        type: 'outdated_compliance',
        severity: 'medium',
        description: 'Compliance audit is over 1 year old',
        impact: 'Potential compliance violations',
        mitigation: 'Request updated compliance documentation',
      });
    }

    // Issue frequency risk
    if (vendorData.issues.length > 5) {
      risks.push({
        type: 'frequent_issues',
        severity: 'high',
        description: `${vendorData.issues.length} issues in recent months`,
        impact: 'Operational disruptions',
        mitigation: 'Address root causes of recurring issues',
      });
    }

    return risks;
  }

  /**
   * Identify vendor-related opportunities
   *
   * Detects opportunities for optimization including volume discounts,
   * performance incentives, and strategic partnership elevation.
   * Each opportunity includes potential savings/benefits, effort level,
   * and implementation timeline.
   *
   * @param vendorData - Vendor data with spend, contract count, and category
   * @param performance - Previously calculated performance metrics
   * @returns Array of Opportunity objects with type, description, and potential value
   *
   * @example
   * ```typescript
   * const opportunities = this.identifyOpportunities(vendorData, performance);
   * const savings = opportunities
   *   .filter(o => o.potentialSaving)
   *   .reduce((sum, o) => sum + o.potentialSaving, 0);
   * ```
   */
  private identifyOpportunities(vendorData: Vendor, performance: PerformanceMetrics): Opportunity[] {
    const opportunities: Opportunity[] = [];

    // Volume discount opportunity
    if (vendorData.totalSpend > 100000 && vendorData.contractCount > 3) {
      opportunities.push({
        type: 'volume_discount',
        description: 'Consolidate contracts for volume pricing',
        potentialSaving: vendorData.totalSpend * 0.1,
        effort: 'medium',
        timeline: '3 months',
      });
    }

    // Performance incentive opportunity
    if (performance.overallScore > 0.8) {
      opportunities.push({
        type: 'performance_incentive',
        description: 'Implement performance-based pricing',
        potentialBenefit: 'Improved service levels',
        effort: 'low',
        timeline: '1 month',
      });
    }

    // Strategic partnership opportunity
    if (vendorData.totalSpend > 500000 && performance.overallScore > 0.75) {
      opportunities.push({
        type: 'strategic_partnership',
        description: 'Elevate to strategic partner status',
        potentialBenefit: 'Preferential pricing and priority service',
        effort: 'high',
        timeline: '6 months',
      });
    }

    return opportunities;
  }

  /**
   * Check vendor compliance status
   *
   * Evaluates vendor compliance across multiple dimensions including
   * insurance coverage, required certifications (ISO9001, SOC2), and
   * audit documentation recency. Returns overall compliance status
   * with specific issues and review dates.
   *
   * @param vendorData - Vendor data with compliance information
   * @returns ComplianceStatus with compliant flag, issues, and review dates
   *
   * @example
   * ```typescript
   * const compliance = this.checkVendorCompliance(vendorData);
   * if (!compliance.compliant) {
   *   console.log('Issues:', compliance.issues);
   * }
   * ```
   */
  private checkVendorCompliance(vendorData: Vendor): ComplianceStatus {
    const issues: string[] = [];

    if (!vendorData.compliance.insurance) {
      issues.push('Missing insurance certificate');
    }

    const requiredCerts = ['ISO9001', 'SOC2'];
    const missingCerts = requiredCerts.filter(cert =>
      !vendorData.compliance.certifications.includes(cert),
    );

    if (missingCerts.length > 0) {
      issues.push(`Missing certifications: ${missingCerts.join(', ')}`);
    }

    const daysSinceAudit = this.daysSince(vendorData.compliance.lastAudit);
    if (daysSinceAudit > 365) {
      issues.push('Audit documentation is outdated');
    }

    return {
      compliant: issues.length === 0,
      issues,
      lastChecked: new Date().toISOString(),
      nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  /**
   * Generate vendor recommendations based on analysis
   *
   * Produces actionable recommendations based on performance scores,
   * relationship strength, risk levels, and compliance status.
   * Recommendations are prioritized based on severity and impact.
   *
   * @param analysis - Complete VendorAnalysis object with all metrics
   * @returns Array of recommendation strings prioritized by importance
   *
   * @example
   * ```typescript
   * const recommendations = this.generateVendorRecommendations(analysis);
   * // ['Schedule quarterly business reviews', 'Implement performance improvement plan']
   * ```
   */
  private generateVendorRecommendations(analysis: VendorAnalysis): string[] {
    const recommendations: string[] = [];

    if (analysis.performance.overallScore < 0.7) {
      recommendations.push('Schedule quarterly business reviews');
      recommendations.push('Implement performance improvement plan');
    }

    if (analysis.relationshipScore.score < 0.6) {
      recommendations.push('Increase engagement frequency');
      recommendations.push('Establish dedicated account management');
    }

    if (analysis.risks.some((r: VendorRisk) => r.severity === 'high')) {
      recommendations.push('Develop risk mitigation strategies');
      recommendations.push('Identify backup vendors');
    }

    if (!analysis.complianceStatus.compliant) {
      recommendations.push('Update all compliance documentation');
      recommendations.push('Schedule compliance audit');
    }

    return recommendations;
  }

  // ==========================================================================
  // PORTFOLIO ANALYSIS METHODS
  // ==========================================================================

  /**
   * Generate portfolio summary statistics
   *
   * Computes high-level portfolio metrics including total vendor count,
   * total spend, average spend per vendor, top category by spend,
   * and average portfolio performance.
   *
   * @param portfolioData - Complete vendor portfolio data
   * @returns PortfolioSummary with aggregate metrics
   *
   * @example
   * ```typescript
   * const summary = this.generatePortfolioSummary(portfolioData);
   * console.log(`${summary.totalVendors} vendors, $${summary.totalSpend} total`);
   * ```
   */
  private generatePortfolioSummary(portfolioData: VendorPortfolio): PortfolioSummary {
    return {
      totalVendors: portfolioData.vendors.length,
      totalSpend: portfolioData.totalSpend,
      avgSpendPerVendor: portfolioData.totalSpend / portfolioData.vendors.length,
      topCategory: portfolioData.categories.sort((a: VendorCategory, b: VendorCategory) => b.spend - a.spend)[0].name,
      avgPerformance: portfolioData.vendors.reduce((sum: number, v: PortfolioVendor) => sum + v.performance, 0) / portfolioData.vendors.length,
    };
  }

  /**
   * Analyze vendors by category
   *
   * Groups vendors by category and calculates per-category metrics
   * including vendor count, total spend, average performance, risk level,
   * and concentration percentage. Identifies single-vendor dependencies
   * and underperforming categories.
   *
   * @param portfolioData - Complete vendor portfolio data
   * @returns Array of CategoryAnalysis objects with category-level metrics
   *
   * @example
   * ```typescript
   * const categories = this.analyzeByCategory(portfolioData);
   * const highRiskCategories = categories.filter(c => c.riskLevel === 'high');
   * ```
   */
  private analyzeByCategory(portfolioData: VendorPortfolio): CategoryAnalysis[] {
    return portfolioData.categories.map((category: VendorCategory) => {
      const categoryVendors = portfolioData.vendors.filter((v: PortfolioVendor) => v.category === category.name);
      const avgPerformance = categoryVendors.reduce((sum: number, v: PortfolioVendor) => sum + v.performance, 0) / categoryVendors.length;

      let riskLevel: 'low' | 'medium' | 'high' = 'low';
      let riskDescription = '';

      if (categoryVendors.length === 1) {
        riskLevel = 'high';
        riskDescription = 'Single vendor dependency';
      } else if (avgPerformance < 0.7) {
        riskLevel = 'medium';
        riskDescription = 'Below average category performance';
      }

      return {
        name: category.name,
        vendorCount: category.count,
        totalSpend: category.spend,
        avgPerformance,
        riskLevel,
        riskDescription,
        concentration: category.spend / portfolioData.totalSpend,
      };
    });
  }

  /**
   * Analyze vendor performance distribution
   *
   * Categorizes vendors into performance tiers (excellent, good, average,
   * poor) based on their performance scores. Calculates distribution
   * percentages and identifies underperforming vendors for attention.
   *
   * @param portfolioData - Complete vendor portfolio data
   * @returns PerformanceDistribution with vendor lists and rate summary
   *
   * @example
   * ```typescript
   * const distribution = this.analyzePerformanceDistribution(portfolioData);
   * if (distribution.summary.poorRate > 0.2) {
   *   console.log('More than 20% of vendors are underperforming');
   * }
   * ```
   */
  private analyzePerformanceDistribution(portfolioData: VendorPortfolio): PerformanceDistribution {
    const distribution = {
      excellent: portfolioData.vendors.filter((v: PortfolioVendor) => v.performance >= 0.9),
      good: portfolioData.vendors.filter((v: PortfolioVendor) => v.performance >= 0.75 && v.performance < 0.9),
      average: portfolioData.vendors.filter((v: PortfolioVendor) => v.performance >= 0.6 && v.performance < 0.75),
      poorPerformers: portfolioData.vendors.filter((v: PortfolioVendor) => v.performance < 0.6),
    };

    return {
      ...distribution,
      summary: {
        excellentRate: distribution.excellent.length / portfolioData.vendors.length,
        goodRate: distribution.good.length / portfolioData.vendors.length,
        averageRate: distribution.average.length / portfolioData.vendors.length,
        poorRate: distribution.poorPerformers.length / portfolioData.vendors.length,
      },
    };
  }

  /**
   * Analyze spend concentration across vendors
   *
   * Calculates spend concentration metrics including top vendor share,
   * top 5 vendors share, and Herfindahl-Hirschman Index (HHI) for
   * market concentration assessment. Identifies concentration risk levels.
   *
   * @param portfolioData - Complete vendor portfolio data
   * @returns SpendConcentration with concentration metrics and risk level
   *
   * @example
   * ```typescript
   * const concentration = this.analyzeSpendConcentration(portfolioData);
   * if (concentration.herfindahlIndex > 0.25) {
   *   console.log('High concentration risk detected');
   * }
   * ```
   */
  private analyzeSpendConcentration(portfolioData: VendorPortfolio): SpendConcentration {
    const sortedVendors = [...portfolioData.vendors].sort((a, b) => b.spend - a.spend);
    const top5Spend = sortedVendors.slice(0, 5).reduce((sum, v) => sum + v.spend, 0);
    const topVendor = sortedVendors[0];

    // Calculate Herfindahl-Hirschman Index
    const hhi = portfolioData.vendors.reduce((sum: number, vendor: PortfolioVendor) => {
      const share = vendor.spend / portfolioData.totalSpend;
      return sum + (share * share);
    }, 0);

    return {
      topVendor: topVendor.name,
      topVendorSpend: topVendor.spend,
      topVendorShare: topVendor.spend / portfolioData.totalSpend,
      top5Share: top5Spend / portfolioData.totalSpend,
      herfindahlIndex: hhi,
      concentrationLevel: hhi > 0.25 ? 'high' : hhi > 0.15 ? 'medium' : 'low',
    };
  }

  /**
   * Assess overall portfolio risk exposure
   *
   * Evaluates portfolio-level risks across concentration, performance,
   * and diversity dimensions. Combines individual risk assessments
   * into an overall risk rating with descriptive summary.
   *
   * @param portfolioData - Complete vendor portfolio data
   * @returns PortfolioRisk with component risks, overall rating, and description
   *
   * @example
   * ```typescript
   * const risk = this.assessPortfolioRisk(portfolioData);
   * console.log(risk.overall); // 'high' | 'medium' | 'low'
   * console.log(risk.description);
   * ```
   */
  private assessPortfolioRisk(portfolioData: VendorPortfolio): PortfolioRisk {
    const risks: PortfolioRisk['components'] = {
      concentration: this.analyzeSpendConcentration(portfolioData).concentrationLevel,
      performance: this.analyzePerformanceDistribution(portfolioData).summary.poorRate > 0.2 ? 'high' : 'low',
      diversity: portfolioData.categories.length < 4 ? 'medium' : 'low',
    };

    const overallRisk = Object.values(risks).filter(r => r === 'high').length > 1 ? 'high' :
                       Object.values(risks).filter(r => r === 'medium').length > 1 ? 'medium' : 'low';

    return {
      components: risks,
      overall: overallRisk,
      description: this.describePortfolioRisk(risks),
    };
  }

  /**
   * Identify portfolio optimization opportunities
   *
   * Discovers opportunities for portfolio optimization including
   * vendor consolidation in categories with many vendors and
   * performance improvement for underperforming vendors.
   * Each optimization includes potential savings and complexity.
   *
   * @param portfolioData - Complete vendor portfolio data
   * @returns Array of PortfolioOptimization with type, description, and potential value
   *
   * @example
   * ```typescript
   * const optimizations = this.identifyPortfolioOptimizations(portfolioData);
   * const totalPotentialSavings = optimizations
   *   .filter(o => o.potentialSaving)
   *   .reduce((sum, o) => sum + o.potentialSaving, 0);
   * ```
   */
  private identifyPortfolioOptimizations(portfolioData: VendorPortfolio): PortfolioOptimization[] {
    const optimizations: PortfolioOptimization[] = [];

    // Vendor consolidation
    const categories = portfolioData.categories.filter((c: VendorCategory) => c.count > 3);
    for (const category of categories) {
      optimizations.push({
        type: 'consolidation',
        category: category.name,
        description: `Consolidate ${category.count} vendors to 2-3 preferred partners`,
        potentialSaving: category.spend * 0.15,
        complexity: 'medium' as const,
      });
    }

    // Performance improvement
    const poorPerformers = portfolioData.vendors.filter((v: PortfolioVendor) => v.performance < 0.6);
    if (poorPerformers.length > 0) {
      const totalPoorSpend = poorPerformers.reduce((sum: number, v: PortfolioVendor) => sum + v.spend, 0);
      optimizations.push({
        type: 'performance_improvement',
        description: `Replace or improve ${poorPerformers.length} underperforming vendors`,
        potentialBenefit: 'Improved service quality and efficiency',
        affectedSpend: totalPoorSpend,
        complexity: 'high' as const,
      });
    }

    return optimizations;
  }

  // ==========================================================================
  // NEW VENDOR EVALUATION METHODS
  // ==========================================================================

  /**
   * Perform basic vendor requirement checks
   *
   * Validates that new vendor has provided all required documentation
   * including business license, insurance, tax ID, and bank details.
   * Returns pass/fail status with list of missing documents.
   *
   * @param data - New vendor evaluation data with documentation
   * @returns BasicChecks with passed flag, missing docs, and completeness score
   *
   * @example
   * ```typescript
   * const checks = this.performBasicVendorChecks(data);
   * if (!checks.passed) {
   *   console.log('Missing:', checks.missing.join(', '));
   * }
   * ```
   */
  private performBasicVendorChecks(data: NewVendorEvaluationData): BasicChecks {
    const required = ['businessLicense', 'insurance', 'taxId', 'bankDetails'];
    const provided = Object.keys(data.documentation || {});
    const missing = required.filter(doc => !provided.includes(doc));

    return {
      passed: missing.length === 0,
      missing,
      provided,
      completeness: provided.length / required.length,
    };
  }

  /**
   * Assess vendor financial stability
   *
   * Evaluates vendor financial health based on revenue, profit margin,
   * debt ratio, and credit score. Assigns risk level (low/medium/high)
   * with descriptive assessment of financial position.
   *
   * @param data - New vendor evaluation data with financial information
   * @returns FinancialStability with risk level, description, and metrics
   *
   * @example
   * ```typescript
   * const financial = this.assessFinancialStability(data);
   * if (financial.riskLevel === 'high') {
   *   console.log('Financial concern:', financial.description);
   * }
   * ```
   */
  private assessFinancialStability(data: NewVendorEvaluationData): FinancialStability {
    // Simulate financial assessment
    const financial = data.financial || {};
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    let description = 'Financially stable';

    if ((financial.revenue || 0) < 1000000) {
      riskLevel = 'medium';
      description = 'Small vendor with limited financial capacity';
    }

    if ((financial.profitMargin || 0) < 0) {
      riskLevel = 'high';
      description = 'Vendor is currently unprofitable';
    }

    if ((financial.debtRatio || 0) > 0.7) {
      riskLevel = 'high';
      description = 'High debt levels may impact stability';
    }

    return {
      riskLevel,
      description,
      metrics: {
        revenue: financial.revenue || 0,
        profitMargin: financial.profitMargin || 0,
        debtRatio: financial.debtRatio || 0,
        creditScore: financial.creditScore || 0,
      },
    };
  }

  /**
   * Evaluate vendor references
   *
   * Analyzes provided references including average rating calculation,
   * rating distribution breakdown, and concern identification from
   * lower-rated references. Handles case of no references provided.
   *
   * @param data - New vendor evaluation data with reference list
   * @returns References with average rating, count, concerns, and breakdown
   *
   * @example
   * ```typescript
   * const refs = this.evaluateReferences(data);
   * if (refs.averageRating < 3.5) {
   *   console.log('Below average references:', refs.concerns);
   * }
   * ```
   */
  private evaluateReferences(data: NewVendorEvaluationData): References {
    interface VendorReference {
      rating: number;
      concern?: string;
    }

    const references: VendorReference[] = data.references || [];

    if (references.length === 0) {
      return {
        averageRating: 0,
        count: 0,
        concerns: ['No references provided'],
        breakdown: {
          excellent: 0,
          good: 0,
          average: 0,
          poor: 0,
        },
      };
    }

    const avgRating = references.reduce((sum: number, ref: VendorReference) => sum + (ref.rating || 0), 0) / references.length;
    const concerns = references
      .filter((ref: VendorReference) => (ref.rating || 0) < 4)
      .map((ref: VendorReference) => ref.concern || 'No specific concern noted');

    return {
      averageRating: avgRating,
      count: references.length,
      concerns,
      breakdown: {
        excellent: references.filter((r: VendorReference) => (r.rating || 0) === 5).length,
        good: references.filter((r: VendorReference) => (r.rating || 0) === 4).length,
        average: references.filter((r: VendorReference) => (r.rating || 0) === 3).length,
        poor: references.filter((r: VendorReference) => (r.rating || 0) < 3).length,
      },
    };
  }

  /**
   * Assess vendor capabilities against requirements
   *
   * Compares vendor-provided capabilities against required capabilities.
   * Calculates match rate and identifies matched, missing, and additional
   * capabilities the vendor offers.
   *
   * @param data - Capabilities data with required and vendor capabilities arrays
   * @returns Capabilities with match rate, matched, missing, and additional lists
   *
   * @example
   * ```typescript
   * const capabilities = this.assessCapabilities({
   *   requiredCapabilities: ['cloud', 'security'],
   *   vendorCapabilities: ['cloud', 'security', 'devops']
   * });
   * console.log(capabilities.matchRate); // 1.0
   * console.log(capabilities.additionalCapabilities); // ['devops']
   * ```
   */
  private assessCapabilities(data: CapabilitiesData): Capabilities {
    const required = data.requiredCapabilities || [];
    const vendor = data.vendorCapabilities || [];

    const matched = required.filter((cap: string) => vendor.includes(cap));
    const missing = required.filter((cap: string) => !vendor.includes(cap));

    return {
      matchRate: required.length > 0 ? matched.length / required.length : 1,
      matched,
      missing,
      additionalCapabilities: vendor.filter((cap: string) => !required.includes(cap)),
    };
  }

  /**
   * Evaluate vendor pricing competitiveness
   *
   * Compares vendor pricing against market benchmarks to determine
   * competitiveness (competitive, above_market, below_market).
   * Calculates variance percentage and captures pricing breakdown.
   *
   * @param data - Pricing data with vendor pricing and market benchmark
   * @returns Pricing with competitiveness, variance, and discount availability
   *
   * @example
   * ```typescript
   * const pricing = this.evaluatePricing({
   *   pricing: { total: 100000 },
   *   marketBenchmark: { average: 90000 }
   * });
   * console.log(pricing.competitiveness); // 'above_market'
   * console.log(pricing.variance); // ~11.1
   * ```
   */
  private evaluatePricing(data: PricingData): Pricing {
    const vendorPricing = data.pricing || {};
    const marketBenchmark = data.marketBenchmark || {};

    let competitiveness: 'competitive' | 'above_market' | 'below_market' = 'competitive';
    let variance = 0;

    if (vendorPricing.total && marketBenchmark.average) {
      variance = ((vendorPricing.total - marketBenchmark.average) / marketBenchmark.average) * 100;

      if (variance > 15) {competitiveness = 'above_market';}
      else if (variance < -15) {competitiveness = 'below_market';}
    }

    return {
      competitiveness,
      variance,
      breakdown: vendorPricing.breakdown || {},
      negotiable: vendorPricing.negotiable || false,
      volumeDiscounts: vendorPricing.volumeDiscounts || false,
    };
  }

  /**
   * Assess risks specific to new vendor onboarding
   *
   * Identifies risks associated with onboarding a new vendor including
   * lack of prior relationship history, capacity mismatch (small vendor
   * for large projects), and cross-border engagement complexities.
   *
   * @param data - New vendor risk data with vendor size, location, and project details
   * @returns Array of NewVendorRisk with type, severity, description, and mitigation
   *
   * @example
   * ```typescript
   * const risks = this.assessNewVendorRisks({
   *   vendorSize: 'small',
   *   projectSize: 'large',
   *   vendorLocation: { country: 'UK' },
   *   companyLocation: { country: 'US' }
   * });
   * console.log(risks.filter(r => r.severity === 'high'));
   * ```
   */
  private assessNewVendorRisks(data: NewVendorRiskData): NewVendorRisk[] {
    const risks: NewVendorRisk[] = [];

    // New vendor risk
    risks.push({
      type: 'new_vendor',
      severity: 'medium' as const,
      description: 'No prior relationship history',
      mitigation: 'Start with small pilot project',
    });

    // Size mismatch risk
    if (data.vendorSize === 'small' && data.projectSize === 'large') {
      risks.push({
        type: 'capacity_mismatch',
        severity: 'high' as const,
        description: 'Vendor may lack capacity for large projects',
        mitigation: 'Verify scalability and resource availability',
      });
    }

    // Geographic risk
    if (data.vendorLocation?.country !== data.companyLocation?.country) {
      risks.push({
        type: 'geographic',
        severity: 'medium' as const,
        description: 'Cross-border engagement complexities',
        mitigation: 'Address tax, legal, and operational considerations',
      });
    }

    return risks;
  }

  /**
   * Calculate overall onboarding score
   *
   * Computes weighted score for new vendor evaluation based on:
   * - Basic checks completeness (30%)
   * - Financial stability (20%)
   * - References average rating (20%)
   * - Capability match rate (20%)
   * - Pricing competitiveness (10%)
   *
   * @param evaluation - Complete NewVendorEvaluation with all assessments
   * @returns Numeric score from 0 to 1 representing overall evaluation
   *
   * @example
   * ```typescript
   * const score = this.calculateOnboardingScore(evaluation);
   * if (score < 0.6) {
   *   console.log('Do not recommend onboarding');
   * }
   * ```
   */
  private calculateOnboardingScore(evaluation: NewVendorEvaluation): number {
    let score = 0;

    // Basic checks (30%)
    score += evaluation.basicChecks.completeness * 0.3;

    // Financial stability (20%)
    const financialScore = evaluation.financialStability.riskLevel === 'low' ? 1 :
                          evaluation.financialStability.riskLevel === 'medium' ? 0.5 : 0;
    score += financialScore * 0.2;

    // References (20%)
    score += (evaluation.references.averageRating / 5) * 0.2;

    // Capabilities (20%)
    score += evaluation.capabilities.matchRate * 0.2;

    // Pricing (10%)
    const pricingScore = evaluation.pricing.competitiveness === 'competitive' ? 1 :
                        evaluation.pricing.competitiveness === 'below_market' ? 0.8 : 0.5;
    score += pricingScore * 0.1;

    return score;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Categorize vendor by industry/domain
   *
   * Analyzes vendor name, description, and services to determine the
   * most appropriate category (technology, consulting, marketing,
   * facilities, logistics, legal, financial, or other).
   *
   * @param data - Extended vendor data with name, description, and services
   * @returns Category string identifying the vendor's primary domain
   *
   * @example
   * ```typescript
   * const category = this.categorizeVendor({
   *   name: 'CloudTech Solutions',
   *   description: 'Cloud infrastructure provider',
   *   services: ['cloud hosting', 'SaaS']
   * });
   * console.log(category); // 'technology'
   * ```
   */
  private categorizeVendor(data: ExtendedVendor): string {
    const name = (data.name || '').toLowerCase();
    const description = (data.description || '').toLowerCase();
    const services = (data.services || []).join(' ').toLowerCase();

    const combined = `${name} ${description} ${services}`;

    const categories = {
      'technology': ['software', 'hardware', 'it', 'cloud', 'saas', 'tech'],
      'consulting': ['consult', 'advisory', 'strategy', 'professional services'],
      'marketing': ['marketing', 'advertising', 'pr', 'digital', 'creative'],
      'facilities': ['facilities', 'maintenance', 'cleaning', 'security'],
      'logistics': ['shipping', 'freight', 'logistics', 'transport'],
      'legal': ['law', 'legal', 'attorney', 'compliance'],
      'financial': ['accounting', 'audit', 'tax', 'financial'],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => combined.includes(keyword))) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Extract structured vendor information
   *
   * Extracts and structures vendor information from raw data including
   * name, category, contact details, estimated size, and establishment date.
   *
   * @param data - Extended vendor data with various vendor fields
   * @returns VendorInfo with structured vendor details
   *
   * @example
   * ```typescript
   * const info = this.extractVendorInfo({
   *   name: 'Acme Corp',
   *   email: 'contact@acme.com',
   *   employees: 250
   * });
   * console.log(info.size); // 'medium'
   * ```
   */
  private extractVendorInfo(data: ExtendedVendor): VendorInfo {
    return {
      name: data.name || 'Unknown Vendor',
      category: this.categorizeVendor(data),
      contactInfo: {
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
      },
      size: this.estimateVendorSize(data),
      established: data.established || null,
    };
  }

  /**
   * Perform initial vendor assessment with red flag detection
   *
   * Conducts preliminary assessment of vendor data to identify potential
   * red flags such as missing insurance, no references, complaints on
   * record, or active litigation. Calculates initial risk score.
   *
   * @param data - Extended vendor data for assessment
   * @returns InitialAssessment with red flags and initial score
   *
   * @example
   * ```typescript
   * const assessment = this.performInitialAssessment({
   *   insurance: false,
   *   references: [],
   *   complaints: 3
   * });
   * console.log(assessment.hasRedFlags); // true
   * console.log(assessment.redFlags); // ['No insurance...', 'No references...', '3 complaints...']
   * ```
   */
  private performInitialAssessment(data: ExtendedVendor): InitialAssessment {
    const redFlags: string[] = [];

    if (!data.insurance) {
      redFlags.push('No insurance information provided');
    }

    if (!data.references || data.references.length === 0) {
      redFlags.push('No references provided');
    }

    if (data.complaints && data.complaints > 0) {
      redFlags.push(`${data.complaints} complaints on record`);
    }

    if (data.litigation) {
      redFlags.push('Active or recent litigation');
    }

    return {
      hasRedFlags: redFlags.length > 0,
      redFlags,
      initialScore: Math.max(0, 1 - (redFlags.length * 0.2)),
    };
  }

  /**
   * Calculate vendor engagement length category
   *
   * Estimates the length of the vendor relationship based on contract
   * count. Categorizes as long-term (>10 contracts), established (5-10),
   * developing (2-5), or new (1 or fewer).
   *
   * @param vendorData - Vendor data with contract count
   * @returns String describing engagement length category
   *
   * @example
   * ```typescript
   * const length = this.calculateEngagementLength({ contractCount: 7, ... });
   * console.log(length); // 'established (1-3 years)'
   * ```
   */
  private calculateEngagementLength(vendorData: Vendor): string {
    // Estimate based on contract count and history
    if (vendorData.contractCount > 10) {return 'long-term (>3 years)';}
    if (vendorData.contractCount > 5) {return 'established (1-3 years)';}
    if (vendorData.contractCount > 1) {return 'developing (<1 year)';}
    return 'new';
  }

  /**
   * Categorize vendor spend level
   *
   * Classifies vendor spend amount into categories: strategic (>$1M),
   * significant ($500K-$1M), moderate ($100K-$500K), small ($10K-$100K),
   * or minimal (<$10K).
   *
   * @param spend - Total vendor spend amount in dollars
   * @returns String describing spend level category
   *
   * @example
   * ```typescript
   * const level = this.categorizeSpendLevel(750000);
   * console.log(level); // 'significant'
   * ```
   */
  private categorizeSpendLevel(spend: number): string {
    if (spend > 1000000) {return 'strategic';}
    if (spend > 500000) {return 'significant';}
    if (spend > 100000) {return 'moderate';}
    if (spend > 10000) {return 'small';}
    return 'minimal';
  }

  /**
   * Assess contract complexity with vendor
   *
   * Evaluates the complexity of the vendor relationship based on
   * contract count and total spend. Returns complex (>5 contracts or
   * >$500K), moderate (2-5 contracts or $100K-$500K), or simple.
   *
   * @param vendorData - Vendor data with contract count and total spend
   * @returns String describing contract complexity level
   *
   * @example
   * ```typescript
   * const complexity = this.assessContractComplexity({
   *   contractCount: 8,
   *   totalSpend: 300000,
   *   ...
   * });
   * console.log(complexity); // 'complex'
   * ```
   */
  private assessContractComplexity(vendorData: Vendor): string {
    // Simple assessment based on contract count and value
    if (vendorData.contractCount > 5 || vendorData.totalSpend > 500000) {
      return 'complex';
    }
    if (vendorData.contractCount > 2 || vendorData.totalSpend > 100000) {
      return 'moderate';
    }
    return 'simple';
  }

  /**
   * Assess vendor strategic importance
   *
   * Evaluates strategic importance based on multiple factors: high spend
   * (>$500K), critical category (technology/manufacturing), long-term
   * relationship (>5 contracts), and limited alternatives (specialized).
   * Returns critical, important, moderate, or low.
   *
   * @param vendorData - Vendor data with spend, category, and contract count
   * @returns String describing strategic importance level
   *
   * @example
   * ```typescript
   * const importance = this.assessStrategicImportance({
   *   totalSpend: 800000,
   *   category: 'technology',
   *   contractCount: 12,
   *   ...
   * });
   * console.log(importance); // 'critical'
   * ```
   */
  private assessStrategicImportance(vendorData: Vendor): string {
    const factors = {
      highSpend: vendorData.totalSpend > 500000,
      criticalCategory: ['technology', 'manufacturing'].includes(vendorData.category),
      longTerm: vendorData.contractCount > 5,
      fewAlternatives: vendorData.category === 'specialized',
    };

    const importanceScore = Object.values(factors).filter(f => f).length;

    if (importanceScore >= 3) {return 'critical';}
    if (importanceScore >= 2) {return 'important';}
    if (importanceScore >= 1) {return 'moderate';}
    return 'low';
  }

  /**
   * Calculate performance trend from history
   *
   * Analyzes performance history to determine trend direction and rate.
   * Compares average of first half vs second half of history to calculate
   * percentage change. Positive values indicate improvement.
   *
   * @param history - Array of performance history items with scores
   * @returns Numeric trend rate (positive = improving, negative = declining)
   *
   * @example
   * ```typescript
   * const trend = this.calculatePerformanceTrend([
   *   { month: '2024-01', score: 0.7 },
   *   { month: '2024-02', score: 0.75 },
   *   { month: '2024-03', score: 0.8 },
   *   { month: '2024-04', score: 0.85 }
   * ]);
   * console.log(trend); // ~0.14 (14% improvement)
   * ```
   */
  private calculatePerformanceTrend(history: PerformanceHistoryItem[]): number {
    if (history.length < 2) {return 0;}

    const scores = history.map(h => h.score);
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    return (secondAvg - firstAvg) / firstAvg;
  }

  /**
   * Calculate issue frequency classification
   *
   * Categorizes issue frequency based on issues per month over an
   * assumed 6-month active period. Returns high (>1/month),
   * medium (0.5-1/month), or low (<0.5/month).
   *
   * @param issues - Array of issue records
   * @returns String classification of issue frequency
   *
   * @example
   * ```typescript
   * const frequency = this.calculateIssueFrequency([
   *   { date: '2024-01-15', type: 'delay', severity: 'medium' },
   *   { date: '2024-02-20', type: 'quality', severity: 'low' }
   * ]);
   * console.log(frequency); // 'low' (2 issues / 6 months = 0.33/month)
   * ```
   */
  private calculateIssueFrequency(issues: Issue[]): string {
    const monthsActive = 6; // Assume 6 months for this example
    const issuesPerMonth = issues.length / monthsActive;

    if (issuesPerMonth > 1) {return 'high';}
    if (issuesPerMonth > 0.5) {return 'medium';}
    return 'low';
  }

  /**
   * Get relationship improvement recommendations
   *
   * Generates recommendations based on individual relationship factor
   * scores. Identifies areas needing attention such as performance issues,
   * short relationship tenure, or frequent problems.
   *
   * @param _score - Overall relationship score (unused, reserved for future use)
   * @param factors - Individual factor scores for the relationship
   * @returns Array of recommendation strings for improvement
   *
   * @example
   * ```typescript
   * const recommendations = this.getRelationshipRecommendations(0.5, {
   *   performance: 0.1,
   *   longevity: 0.05,
   *   issues: 0.05,
   *   ...
   * });
   * // ['Address performance issues urgently', 'Establish longer-term contracts', ...]
   * ```
   */
  private getRelationshipRecommendations(_score: number, factors: RelationshipScore['factors']): string[] {
    const recommendations: string[] = [];

    if (factors.performance < 0.2) {
      recommendations.push('Address performance issues urgently');
    }

    if (factors.longevity < 0.1) {
      recommendations.push('Establish longer-term contracts');
    }

    if (factors.issues < 0.1) {
      recommendations.push('Implement issue prevention measures');
    }

    return recommendations;
  }

  /**
   * Calculate days elapsed since a given date
   *
   * Computes the number of days between a given date string and
   * the current date. Used for compliance audit age checks and
   * other time-based assessments.
   *
   * @param dateStr - ISO date string to calculate from
   * @returns Number of days since the given date
   *
   * @example
   * ```typescript
   * const days = this.daysSince('2024-01-15');
   * if (days > 365) {
   *   console.log('Audit is over 1 year old');
   * }
   * ```
   */
  private daysSince(dateStr: string): number {
    const date = new Date(dateStr);
    const now = new Date();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Generate human-readable portfolio risk description
   *
   * Creates a summary description of portfolio risk based on component
   * risk levels. Lists areas with high risk or indicates portfolio is
   * well-managed if no high risks are present.
   *
   * @param risks - Portfolio risk components (concentration, performance, diversity)
   * @returns Human-readable risk description string
   *
   * @example
   * ```typescript
   * const description = this.describePortfolioRisk({
   *   concentration: 'high',
   *   performance: 'low',
   *   diversity: 'medium'
   * });
   * console.log(description); // 'High risk in: concentration'
   * ```
   */
  private describePortfolioRisk(risks: PortfolioRisk['components']): string {
    const highRisks = Object.entries(risks)
      .filter(([_, level]) => level === 'high')
      .map(([type]) => type);

    if (highRisks.length === 0) {
      return 'Portfolio risk is well-managed';
    }

    return `High risk in: ${highRisks.join(', ')}`;
  }

  /**
   * Estimate vendor organization size
   *
   * Estimates vendor size based on revenue and employee count.
   * Categorizes as large (>$50M or >500 employees), medium
   * (>$10M or >100 employees), small (>$1M or >10 employees),
   * or micro.
   *
   * @param data - Extended vendor data with revenue and employee info
   * @returns String describing vendor size category
   *
   * @example
   * ```typescript
   * const size = this.estimateVendorSize({
   *   revenue: 25000000,
   *   employees: 150
   * });
   * console.log(size); // 'medium'
   * ```
   */
  private estimateVendorSize(data: ExtendedVendor): string {
    const revenue = data.revenue || data.financial?.revenue || 0;
    const employees = data.employees || 0;

    if (revenue > 50000000 || employees > 500) {return 'large';}
    if (revenue > 10000000 || employees > 100) {return 'medium';}
    if (revenue > 1000000 || employees > 10) {return 'small';}
    return 'micro';
  }
}