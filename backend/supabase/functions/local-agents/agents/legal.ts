/**
 * Legal Agent Module
 *
 * Provides comprehensive legal analysis capabilities for the Pactwise platform.
 * Supports contract clause extraction, risk assessment, compliance checking,
 * document type detection, obligation identification, and approval workflows.
 *
 * @module LegalAgent
 * @version 2.0.0 (Production-Ready Upgrade)
 *
 * ## Capabilities
 * - clause_analysis: Extract and classify legal clauses (limitation of liability, indemnification, termination, confidentiality, warranty, force majeure, governing law, dispute resolution)
 * - risk_assessment: Identify legal risks including unlimited liability, one-sided terms, automatic renewal, broad indemnification, and waiver of rights with severity scoring
 * - compliance_check: Validate regulatory compliance (GDPR, CCPA, HIPAA), data privacy, and industry standards (PCI DSS, SOC 2, ISO 27001)
 * - legal_review: Full document analysis with NDA-specific handling, cross-reference detection, amendment tracking, and jurisdiction identification
 * - contract_approval: Process approval workflows (approve/reject/escalate) with database integration and notification routing
 *
 * ## Analysis Types
 * - contractWithDB: Database-enriched contract analysis with vendor compliance, approval routing, and legal notification
 * - vendorCompliance: Vendor-specific compliance analysis including document verification, certification validation, and score tracking
 * - enterpriseCompliance: Enterprise-wide compliance checks across all contracts and vendors with risk assessment
 * - documentAnalysis: Standalone document analysis without database context, including document type detection
 * - generalLegalAnalysis: Initial legal assessment with enterprise-specific requirement checking
 *
 * ## Architecture
 * - Extends BaseAgent for consistent processing patterns and shared functionality
 * - Integrates with Supabase for contract/vendor data persistence and retrieval
 * - Supports enterprise-scoped analysis with multi-tenant isolation via enterprise_id
 * - Implements comprehensive insight generation for actionable legal recommendations
 * - Uses Zod schemas for input validation (schemas/legal.ts)
 * - Configurable via enterprise settings (config/legal-config.ts)
 *
 * ## Key Features
 * - Clause Extraction: Pattern-based identification of 8 clause types with risk scoring
 * - Risk Assessment: Multi-factor risk calculation with severity levels (low/medium/high/critical)
 * - Obligation Extraction: Identifies contractual obligations with party attribution and deduplication
 * - Protection Identification: Detects 8 categories of protective clauses
 * - Red Flag Detection: Flags perpetual obligations, jury waivers, non-compete clauses, etc.
 * - Document Type Detection: Scoring-based classification (NDA, MSA, SOW, license, employment, lease)
 * - NDA Analysis: Specialized mutual/one-way analysis with concern identification
 * - Cross-Reference Detection: Identifies section dependencies and potential conflicts
 * - Amendment Detection: Tracks modifications, revisions, and supersession language
 * - Compliance Checking: GDPR, CCPA, HIPAA, PCI DSS, SOC 2, ISO 27001 validation
 * - Approval Workflows: Database-integrated approve/reject/escalate processing
 *
 * ## Error Handling
 * - Error classification into categories (validation, database, timeout, external, rate_limiting, malformed_data, unknown)
 * - Retry logic with exponential backoff for transient errors
 * - Graceful degradation returning partial results with appropriate warnings
 * - Structured error responses with actionable insights
 *
 * @example
 * ```typescript
 * const agent = new LegalAgent(supabase, enterpriseId);
 *
 * // Analyze contract document
 * const result = await agent.process(
 *   { content: contractText },
 *   { enterpriseId, sessionId: 'session-1', environment: {}, permissions: [] }
 * );
 *
 * // Analyze with contract database context
 * const dbResult = await agent.process(
 *   { content: contractText },
 *   { enterpriseId, sessionId: 'session-1', environment: {}, permissions: [], contractId: 'uuid', userId: 'uuid' }
 * );
 *
 * // Process contract approval
 * const approvalResult = await agent.process(
 *   { action: 'approve', comments: 'Reviewed and approved' },
 *   { enterpriseId, sessionId: 'session-1', environment: {}, permissions: [], contractId: 'uuid', userId: 'uuid' }
 * );
 *
 * // Run compliance check
 * const complianceResult = await agent.process(
 *   { checkType: 'compliance', content: contractText },
 *   { enterpriseId, sessionId: 'session-1', environment: {}, permissions: [] }
 * );
 * ```
 *
 * @see BaseAgent - Parent class providing core agent functionality
 * @see LegalAnalysisResult - Primary result type for legal analysis
 * @see VendorComplianceAnalysisResult - Result type for vendor compliance
 * @see EnterpriseComplianceAnalysisResult - Result type for enterprise compliance
 */
import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import {
  validateLegalAgentInput,
  validateAgentContext,
  sanitizeContent,
  detectEncodingIssues,
  detectInputConflicts,
} from '../schemas/legal.ts';
import {
  LegalAgentProcessData,
  Clause,
  LegalRisk,
  Obligation,
  Protection,
  MissingClause,
  RedFlag,
  RegulationCheck,
  DataPrivacyCheck,
  IndustryStandardCheck,
  LegalAnalysisResult,
  OverallLegalRisk,
  LegalTerm,
  Jurisdiction,
  DisputeResolution,
  IPClauses,
  NDAAnalysisResult,
  EnterpriseSpecificRequirementCheck,
  ContractApprovalData,
  ApprovalSummary,
  VendorComplianceAnalysisResult,
  DocumentCompliance,
  VendorCertifications,
  EnterpriseComplianceAnalysisResult,
  ContractData,
  Approval,
  VendorDocument,
  EnterpriseConfig,
  DatabaseRisk,
  ComplianceViolation,
  ComplianceIssue,
} from '../../../types/common/legal.ts';

export class LegalAgent extends BaseAgent {
  get agentType() {
    return 'legal';
  }

  get capabilities() {
    return ['clause_analysis', 'risk_assessment', 'compliance_check', 'legal_review', 'contract_approval'];
  }

  // Content validation constants
  private static readonly MIN_CONTENT_LENGTH = 10;
  private static readonly MAX_CONTENT_LENGTH = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_CLAUSES = 500;
  private static readonly MAX_OBLIGATIONS = 1000;
  private static readonly CLAUSE_CONTEXT_WINDOW = 1000; // Increased from 300 for better context

  // Cross-reference pattern for detecting section references
  private static readonly CROSS_REFERENCE_PATTERNS = [
    /(?:pursuant to|as defined in|as set forth in|in accordance with|subject to|refer(?:s|ring)? to|see)\s+(?:section|article|paragraph|clause)\s+(\d+(?:\.\d+)*)/gi,
    /section\s+(\d+(?:\.\d+)*)\s+(?:hereof|above|below)/gi,
    /(?:the foregoing|the preceding|the following)\s+(?:section|article|paragraph)/gi,
  ];

  // Amendment detection patterns
  private static readonly AMENDMENT_PATTERNS = [
    /as\s+(?:amended|modified|revised|supplemented)/gi,
    /amendment\s+(?:no\.|number|#)?\s*(\d+)/gi,
    /(?:first|second|third|\d+(?:st|nd|rd|th))\s+amendment/gi,
    /supersedes?\s+(?:all\s+)?(?:prior|previous)/gi,
    /effective\s+(?:as\s+of\s+)?(?:the\s+)?(?:date\s+of\s+)?(?:this\s+)?amendment/gi,
  ];

  // Error handling constants
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly BASE_RETRY_DELAY_MS = 1000;
  private static readonly MAX_RETRY_DELAY_MS = 10000;

  /**
   * Error category type for classifying errors
   */
  private static readonly ERROR_CATEGORIES = [
    'validation',
    'database',
    'timeout',
    'external',
    'rate_limiting',
    'malformed_data',
    'unknown',
  ] as const;

  /**
   * Classify an error into a category for appropriate handling.
   * Different categories may trigger different retry strategies or user messaging.
   *
   * @param error - The error to classify
   * @returns Error category string
   */
  private classifyError(error: unknown): typeof LegalAgent.ERROR_CATEGORIES[number] {
    const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    // Rate limiting errors (HTTP 429)
    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
      return 'rate_limiting';
    }

    // Validation errors
    if (message.includes('invalid') || message.includes('validation') || message.includes('required')) {
      return 'validation';
    }

    // Database errors
    if (message.includes('database') || message.includes('supabase') || message.includes('postgres') ||
        message.includes('constraint') || message.includes('duplicate key')) {
      return 'database';
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out') || message.includes('deadline')) {
      return 'timeout';
    }

    // Malformed data errors (parsing failures)
    if (message.includes('parse') || message.includes('json') || message.includes('syntax') ||
        message.includes('unexpected token') || message.includes('malformed')) {
      return 'malformed_data';
    }

    // External service errors
    if (message.includes('network') || message.includes('fetch') || message.includes('connection') ||
        message.includes('econnrefused') || message.includes('external')) {
      return 'external';
    }

    return 'unknown';
  }

  /**
   * Execute a function with retry logic and exponential backoff.
   * Retries are triggered for transient errors (database, timeout, external).
   *
   * @param fn - The async function to execute
   * @param operationName - Name for logging purposes
   * @returns Promise with the function result
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    operationName: string,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= LegalAgent.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        const category = this.classifyError(error);

        // Only retry transient errors
        const retryableCategories = ['database', 'timeout', 'external', 'rate_limiting'];
        if (!retryableCategories.includes(category)) {
          throw error;
        }

        if (attempt < LegalAgent.MAX_RETRY_ATTEMPTS) {
          const delay = Math.min(
            LegalAgent.BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1),
            LegalAgent.MAX_RETRY_DELAY_MS,
          );

          console.warn(
            `[LegalAgent] ${operationName} failed (attempt ${attempt}/${LegalAgent.MAX_RETRY_ATTEMPTS}), ` +
            `category: ${category}, retrying in ${delay}ms...`,
          );

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Create a graceful degradation result when primary processing fails.
   * Returns partial results with appropriate warnings.
   *
   * @param partialData - Any partial data that was extracted before failure
   * @param error - The error that caused the failure
   * @param insights - Array of insights to augment
   * @param rulesApplied - Array of rules applied
   * @returns ProcessingResult with partial data and degradation warning
   */
  private createDegradedResult(
    partialData: Partial<LegalAnalysisResult> | null,
    error: unknown,
    insights: Insight[],
    rulesApplied: string[],
  ): ProcessingResult<LegalAnalysisResult> {
    const errorCategory = this.classifyError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    insights.push(this.createInsight(
      'analysis_degraded',
      'medium',
      'Analysis Completed with Limitations',
      `Full analysis could not be completed due to ${errorCategory} error: ${errorMessage}`,
      'Results may be incomplete. Consider retrying later.',
      { errorCategory, errorMessage },
    ));

    const degradedResult: LegalAnalysisResult = {
      clauses: partialData?.clauses || [],
      risks: partialData?.risks || [],
      obligations: partialData?.obligations || [],
      protections: partialData?.protections || {
        limitationOfLiability: false,
        capOnDamages: false,
        rightToTerminate: false,
        disputeResolution: false,
        warrantyDisclaimer: false,
        intellectualPropertyRights: false,
        confidentialityProtection: false,
        dataProtection: false,
      },
      missingClauses: partialData?.missingClauses || [],
      redFlags: partialData?.redFlags || [],
      recommendations: partialData?.recommendations || ['Retry analysis when system is available'],
      degraded: true,
      degradationReason: errorCategory,
    };

    return this.createResult(
      true, // Return success with partial data
      degradedResult,
      insights,
      [...rulesApplied, 'graceful_degradation'],
      0.5, // Lower confidence for degraded results
      { degraded: true, errorCategory },
    );
  }

  async process(data: LegalAgentProcessData, context?: AgentContext): Promise<ProcessingResult<LegalAnalysisResult>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
      // Enhanced input validation using Zod schemas
      rulesApplied.push('zod_input_validation');

      // Validate context if provided
      if (context) {
        const contextValidation = validateAgentContext(context);
        if (!contextValidation.success) {
          return this.createResult(
            false,
            null,
            [this.createInsight(
              'invalid_context',
              'high',
              'Invalid Context',
              `Context validation failed: ${contextValidation.errors?.join('; ')}`,
              'Provide valid context parameters',
            )],
            ['input_validation_failed'],
            0,
            { error: 'Context validation failed', details: contextValidation.errors },
          );
        }
      }

      // Detect and warn about input conflicts
      const inputConflicts = detectInputConflicts(
        data as Parameters<typeof detectInputConflicts>[0],
        context as Parameters<typeof detectInputConflicts>[1],
      );
      for (const warning of inputConflicts) {
        insights.push(this.createInsight(
          'input_conflict',
          'low',
          'Input Conflict Detected',
          warning,
          undefined,
          { type: 'input_conflict' },
        ));
      }

      // Input validation
      const content = data.content || data.text || '';

      // Sanitize content
      const sanitizedContent = sanitizeContent(content);

      // Check for encoding issues
      const encodingCheck = detectEncodingIssues(sanitizedContent);
      if (encodingCheck.hasMojibake) {
        insights.push(this.createInsight(
          'encoding_issues',
          'medium',
          'Potential Encoding Issues Detected',
          `Document may have encoding problems. Examples: ${encodingCheck.examples.join(', ')}`,
          'Consider re-uploading the document with correct encoding',
          { examples: encodingCheck.examples },
        ));
      }

      // Validate content is a string
      if (typeof content !== 'string') {
        return this.createResult(
          false,
          null,
          [this.createInsight(
            'invalid_input',
            'high',
            'Invalid Input Type',
            'Content must be a string',
            'Provide valid text content for analysis',
          )],
          ['input_validation_failed'],
          0,
          { error: 'Content must be a string' },
        );
      }

      // Validate minimum content length for analysis requests (not for actions)
      // Use trimmed length to properly handle whitespace-only content
      const trimmedContent = content.trim();

      // Whitespace-only content should return success with empty results
      if (!data.action && content.length > 0 && trimmedContent.length === 0) {
        return this.createResult(
          true,
          {
            clauses: [],
            risks: [],
            obligations: [],
            protections: this.identifyProtections({ content: '' }),
            missingClauses: [],
            redFlags: [],
            recommendations: [],
          } as LegalAnalysisResult,
          [],
          ['whitespace_only_content'],
          0,
        );
      }

      // Check minimum non-whitespace content length
      if (!data.action && trimmedContent.length > 0 && trimmedContent.length < LegalAgent.MIN_CONTENT_LENGTH) {
        return this.createResult(
          false,
          null,
          [this.createInsight(
            'content_too_short',
            'medium',
            'Content Too Short',
            `Content must be at least ${LegalAgent.MIN_CONTENT_LENGTH} characters for meaningful analysis`,
            'Provide more contract text for analysis',
          )],
          ['input_validation_failed'],
          0,
          { error: 'Content too short for analysis' },
        );
      }

      // Validate maximum content length (prevent DoS)
      if (content.length > LegalAgent.MAX_CONTENT_LENGTH) {
        return this.createResult(
          false,
          null,
          [this.createInsight(
            'content_too_large',
            'high',
            'Content Too Large',
            `Content exceeds maximum allowed size of ${LegalAgent.MAX_CONTENT_LENGTH / (1024 * 1024)}MB`,
            'Split the document into smaller sections for analysis',
          )],
          ['input_validation_failed'],
          0,
          { error: 'Content exceeds maximum size limit' },
        );
      }

      // Validate UUID format for context IDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

      if (context?.contractId && !uuidRegex.test(context.contractId)) {
        return this.createResult(
          false,
          null,
          [this.createInsight(
            'invalid_contract_id',
            'high',
            'Invalid Contract ID Format',
            'Contract ID must be a valid UUID',
            'Provide a valid UUID for contractId',
            { providedId: context.contractId },
          )],
          ['input_validation_failed'],
          0,
          { error: 'Invalid contract ID format' },
        );
      }

      if (context?.vendorId && !uuidRegex.test(context.vendorId)) {
        return this.createResult(
          false,
          null,
          [this.createInsight(
            'invalid_vendor_id',
            'high',
            'Invalid Vendor ID Format',
            'Vendor ID must be a valid UUID',
            'Provide a valid UUID for vendorId',
            { providedId: context.vendorId },
          )],
          ['input_validation_failed'],
          0,
          { error: 'Invalid vendor ID format' },
        );
      }

      // Check permissions if userId provided
      if (context?.userId) {
        const hasPermission = await this.checkUserPermission(context.userId, 'manager');
        if (!hasPermission) {
          throw new Error('Insufficient permissions for legal analysis');
        }
      }

      // Create audit log
      if (context?.contractId || context?.vendorId) {
        await this.createAuditLog(
          'legal_analysis',
          context.contractId ? 'contract' : 'vendor',
          context.contractId || context.vendorId!,
          { agentType: this.agentType },
        );
      }

      // Determine processing type with context
      if (context?.contractId) {
        // Check if this is an approval action
        if (data.action === 'approve' || data.action === 'reject' || data.action === 'escalate') {
          return await this.processContractApproval(context.contractId, data as ContractApprovalData, context, rulesApplied, insights);
        }
        return await this.analyzeContractWithDB(context.contractId, data, context, rulesApplied, insights);
      } else if (context?.vendorId) {
        return await this.analyzeVendorCompliance(context.vendorId, data, context, rulesApplied, insights) as unknown as ProcessingResult<LegalAnalysisResult>;
      } else if (data.checkType === 'compliance' || data.complianceCheck) {
        return await this.performEnterpriseCompliance(data, context, rulesApplied, insights) as ProcessingResult<LegalAnalysisResult>;
      } else if (data.content || data.text) {
        return await this.analyzeDocument(data, context, rulesApplied, insights);
      }

      // Default legal analysis
      return await this.performGeneralLegalAnalysis(data, context, rulesApplied, insights);

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

  private async analyzeContractWithDB(
    contractId: string,
    data: { content?: string; text?: string },
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<LegalAnalysisResult>> {
    rulesApplied.push('contract_legal_analysis_with_db');

    // Get contract data with caching
    const cacheKey = `contract_legal_${contractId}`;
    const contractData: ContractData = await this.getCachedOrFetch(cacheKey, async () => {
      const { data: contract } = await this.supabase
        .from('contracts')
        .select(`
          *,
          vendor:vendors!vendor_id(*),
          approvals:contract_approvals(*),
          documents:contract_documents(*),
          allocations:contract_budget_allocations(*)
        `)
        .eq('id', contractId)
        .eq('enterprise_id', this.enterpriseId)
        .single();
      return contract;
    }, 300); // 5 min cache

    if (!contractData) {
      throw new Error('Contract not found');
    }

    // Get contract content
    const contractDataRecord = contractData as Record<string, unknown>;
    let content = data.content || data.text || (typeof contractDataRecord.extracted_text === 'string' ? contractDataRecord.extracted_text : '') || '';
    if (!content && typeof contractDataRecord.document_id === 'string') {
      const { data: doc } = await this.supabase
        .from('documents')
        .select('extracted_text')
        .eq('id', contractDataRecord.document_id)
        .single();
      content = doc?.extracted_text || '';
    }

    // Use database function for advanced analysis
    const dbAnalysis = await this.callDatabaseFunction('analyze_contract_legal_risks', {
      p_contract_id: contractId,
      p_content: content,
    });

    // Detect document characteristics for analysis metadata
    const isNonEnglish = this.detectNonEnglish(content);
    const documentType = this.detectDocumentType(content);

    // Perform local analysis with content
    const clauses = await this.extractClausesWithDB(content, contractData);
    const obligations = this.extractObligations({ content });
    const crossReferences = this.detectCrossReferences(content);
    const amendments = this.detectAmendments(content);

    const analysis: LegalAnalysisResult = {
      clauses,
      risks: this.assessLegalRisks({ content }),
      obligations,
      protections: this.identifyProtections({ content }),
      missingClauses: this.checkMissingClauses({ content }),
      redFlags: this.identifyRedFlags({ content }),
      approvalStatus: contractData.approvals || [],
      vendorRisk: contractData.vendor?.performance_score ?? null,
      databaseRisks: dbAnalysis?.risks as DatabaseRisk[] || [],
      recommendations: [] as string[],
      documentType,
      crossReferences,
      amendments,
      analysisMetadata: {
        isNonEnglish,
        contentLength: content.length,
        clauseCount: clauses.length,
        obligationCount: obligations.length,
        contextWindowUsed: LegalAgent.CLAUSE_CONTEXT_WINDOW,
      },
    };

    // Add insights for cross-references if potential conflicts exist
    if (crossReferences.length > 5) {
      insights.push(this.createInsight(
        'complex_cross_references',
        'medium',
        'Complex Cross-References Detected',
        `Contract contains ${crossReferences.length} cross-references between sections`,
        'Review section dependencies carefully to ensure consistency',
        { referenceCount: crossReferences.length },
      ));
      rulesApplied.push('cross_reference_analysis');
    }

    // Add insights for amendments
    if (amendments.hasAmendments) {
      insights.push(this.createInsight(
        'amendments_detected',
        amendments.supersessionLanguage ? 'high' : 'medium',
        'Contract Amendments Detected',
        `Contract has been amended ${amendments.amendmentCount} time(s)${amendments.supersessionLanguage ? ' with supersession language' : ''}`,
        'Verify all amendments are properly integrated and no conflicts exist',
        { amendments },
      ));
      rulesApplied.push('amendment_analysis');
    }

    // Add warning for non-English content
    if (isNonEnglish) {
      insights.push(this.createInsight(
        'non_english_content',
        'medium',
        'Non-English Content Detected',
        'Contract appears to contain significant non-English text. Analysis accuracy may be reduced.',
        'Consider having the contract reviewed by a native speaker or translator',
        { isNonEnglish },
      ));
      rulesApplied.push('language_detection');
    }

    // Check if legal review is required based on routing
    if (!analysis.approvalStatus || !analysis.approvalStatus.some((a: Approval) => a.approval_type === 'legal_review' && a.status === 'approved')) {
      const routingCheck = await this.callDatabaseFunction('route_contract_for_approval', {
        p_contract_id: contractId,
      });

      if (routingCheck.required_approvals?.some((a: Approval) => a.approval_type === 'legal_review')) {
        insights.push(this.createInsight(
          'legal_review_required',
          'high',
          'Legal Review Required',
          'This contract requires legal review based on its characteristics',
          'Route to legal team for approval',
          { routingCheck },
        ));
        rulesApplied.push('approval_routing');
      }
    }

    // Analyze vendor compliance if vendor exists
    if (contractData.vendor_id) {
      const vendorCompliance = await this.checkVendorLegalCompliance(contractData.vendor_id);
      if (!vendorCompliance.compliant) {
        insights.push(this.createInsight(
          'vendor_compliance_issues',
          'critical',
          'Vendor Legal Compliance Issues',
          `Vendor has ${vendorCompliance.issues.length} compliance issues`,
          'Resolve vendor compliance before proceeding',
          vendorCompliance,
        ));
      }
    }

    // Analyze identified clauses
    for (const clause of analysis.clauses) {
      if (clause.risk === 'high') {
        insights.push(this.createInsight(
          'high_risk_clause',
          'high',
          `High-Risk Clause: ${clause.type}`,
          clause.description,
          clause.recommendation,
          { clause, contractId },
        ));
        rulesApplied.push(`${clause.type}_analysis`);
      }
    }

    // Check for missing essential clauses
    for (const missing of analysis.missingClauses) {
      insights.push(this.createInsight(
          'missing_clause',
          missing.severity as 'low' | 'medium' | 'high' | 'critical',
          `Missing ${missing.name}`,
          missing.description,
          `Add ${missing.name.toLowerCase()} to protect your interests`,
          { clauseType: missing.type, contractId },
        ));
      rulesApplied.push('completeness_check');
    }

    // Assess overall legal risk
    const overallRisk = this.calculateOverallLegalRisk(analysis);
    if (overallRisk.level === 'high' || overallRisk.level === 'critical') {
      insights.push(this.createInsight(
          'high_legal_risk',
          overallRisk.level as 'low' | 'medium' | 'high' | 'critical',
          'High Overall Legal Risk',
          `This contract presents ${overallRisk.level} legal risk due to ${overallRisk.factors.join(', ')}`,
          'Consult with legal counsel before signing',
          { ...overallRisk, contractId },
        ));

      // Create notification for legal team
      await this.createLegalNotification(contractId, overallRisk);
    }

    // Add recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    // Store insights
    if (insights.length > 0) {
      await this.storeInsights(insights, contractId, 'contract');
    }

    const confidence = this.calculateLegalConfidence(analysis);

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      confidence,
      {
        contractId,
        requiresLegalReview: overallRisk.level === 'high' || overallRisk.level === 'critical',
        approvalRequired: !analysis.approvalStatus || !analysis.approvalStatus.some((a: Approval) =>
          a.approval_type === 'legal_review' && a.status === 'approved',
        ),
      },
    );
  }

  private async analyzeVendorCompliance(
    vendorId: string,
    data: { content?: string; text?: string },
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<VendorComplianceAnalysisResult>> {
    rulesApplied.push('vendor_compliance_analysis');

    // Get vendor data with compliance history
    const vendorData = await this.getCachedOrFetch(`vendor_compliance_${vendorId}`, async () => {
      const { data: vendor } = await this.supabase
        .from('vendors')
        .select(`
          *,
          compliance_checks:compliance_checks(*),
          contracts:contracts(count),
          documents:vendor_documents(*)
        `)
        .eq('id', vendorId)
        .eq('enterprise_id', this.enterpriseId)
        .single();
      return vendor;
    }, 300);

    if (!vendorData) {
      throw new Error('Vendor not found');
    }

    // Run compliance checks using database function
    const complianceResults = await this.callDatabaseFunction('run_compliance_checks', {
      p_enterprise_id: this.enterpriseId,
      p_vendor_id: vendorId,
    });

    // Analyze vendor documents for compliance
    const documentCompliance = await this.analyzeVendorDocumentCompliance(vendorData.documents || []);

    const compliance: VendorComplianceAnalysisResult = {
      vendorName: vendorData.name,
      complianceScore: vendorData.compliance_score || 0,
      lastCheckDate: vendorData.compliance_checks?.[0]?.performed_at,
      regulations: this.checkRegulations(data),
      documentCompliance,
      violations: [] as ComplianceViolation[],
      missingDocuments: await this.checkMissingVendorDocuments(vendorId),
      certifications: await this.validateVendorCertifications(vendorData),
      recommendations: [] as string[],
    };

    // Process compliance check results
    if (complianceResults.issues_found > 0) {
      insights.push(this.createInsight(
        'vendor_compliance_issues',
        'critical',
        'Vendor Compliance Issues Found',
        `${complianceResults.issues_found} compliance issues detected`,
        'Review and remediate compliance issues immediately',
        complianceResults,
      ));
    }

    // Check missing documents
    if (compliance.missingDocuments && compliance.missingDocuments.length > 0) {
      insights.push(this.createInsight(
        'missing_vendor_documents',
        'high',
        'Missing Required Documents',
        `Vendor missing ${compliance.missingDocuments.length} required documents`,
        'Request missing documents from vendor',
        { missingDocuments: compliance.missingDocuments },
      ));
      compliance.violations?.push(...compliance.missingDocuments!.map((d: string) => ({
        type: 'missing_document',
        document: d,
        severity: 'high' as 'high',
        description: `Missing required document: ${d}`,
      })));
    }

    // Check certifications
    if (compliance.certifications.expired && compliance.certifications.expired.length > 0) {
      insights.push(this.createInsight(
        'expired_certifications',
        'high',
        'Expired Vendor Certifications',
        `${compliance.certifications.expired.length} certifications have expired`,
        'Vendor must renew certifications',
        compliance.certifications,
      ));
    }

    compliance.recommendations = this.generateVendorComplianceRecommendations(compliance);

    // Update vendor compliance score
    if (compliance.violations && compliance.violations.length > 0) {
      await this.updateVendorComplianceScore(vendorId, compliance);
    }

    return this.createResult(
      true,
      compliance,
      insights,
      rulesApplied,
      0.9,
    );
  }

  private async performEnterpriseCompliance(
    data: { checkType?: string; complianceCheck?: boolean; content?: string; text?: string },
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<EnterpriseComplianceAnalysisResult>> {
    rulesApplied.push('enterprise_compliance_analysis');

    // Run enterprise-wide compliance checks
    const complianceResults = await this.callDatabaseFunction('run_compliance_checks', {
      p_enterprise_id: this.enterpriseId,
      p_check_type: data.checkType || null,
    });

    // Get enterprise risk assessment
    const riskAssessment = await this.callDatabaseFunction('assess_enterprise_risk', {
      p_enterprise_id: this.enterpriseId,
      p_risk_categories: ['compliance', 'contractual', 'vendor'],
    });

    const compliance: EnterpriseComplianceAnalysisResult = {
      checksPerformed: complianceResults.checks_performed || 0,
      issuesFound: complianceResults.issues_found || 0,
      summary: complianceResults.summary || [],
      riskAssessment,
      regulations: this.checkRegulations(data),
      dataPrivacy: this.checkDataPrivacy(data),
      industryStandards: this.checkIndustryStandards(data),
      violations: [] as ComplianceViolation[],
      recommendations: [] as string[],
    };

    // Process risk assessment
    if (riskAssessment.risk_level === 'critical' || riskAssessment.risk_level === 'high') {
      const priorityLevel = riskAssessment.risk_level as 'low' | 'medium' | 'high' | 'critical';
      insights.push(this.createInsight(
        'high_compliance_risk',
        priorityLevel,
        'High Compliance Risk Detected',
        `Enterprise compliance risk level: ${riskAssessment.risk_level}`,
        'Immediate action required to address compliance gaps',
        riskAssessment,
      ));
    }

    // Check regulatory compliance
    if (compliance.regulations) {
      for (const reg of compliance.regulations) {
      if (!reg.compliant) {
        insights.push(this.createInsight(
          'compliance_violation',
          'critical',
          `${reg.regulation} Compliance Issue`,
          reg.issue || 'Compliance issue detected',
          reg.remediation,
          { regulation: reg },
        ));
        compliance.violations?.push(reg as ComplianceViolation);
      }
    }
    }

    // Data privacy checks
    if (compliance.dataPrivacy && compliance.dataPrivacy.issues.length > 0) {
      insights.push(this.createInsight(
        'data_privacy_concern',
        'high',
        'Data Privacy Concerns',
        `Found ${compliance.dataPrivacy.issues.length} data privacy issues`,
        'Review data handling practices and update privacy policies',
        compliance.dataPrivacy,
      ));
      rulesApplied.push('privacy_check');
    }

    compliance.recommendations = this.generateComplianceRecommendations(compliance);

    return this.createResult(
      true,
      compliance,
      insights,
      rulesApplied,
      0.85,
    );
  }

  private async analyzeDocument(
    data: { content?: string; text?: string },
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<LegalAnalysisResult>> {
    rulesApplied.push('document_legal_analysis');

    const content = data.content || data.text || '';

    const analysis = {
      documentType: this.identifyLegalDocumentType(content),
      clauses: this.extractClauses({ content }),
      risks: this.assessLegalRisks({ content }),
      obligations: this.extractObligations({ content }),
      protections: this.identifyProtections({ content }),
      missingClauses: this.checkMissingClauses({ content }),
      redFlags: this.identifyRedFlags({ content }),
      legalTerms: this.extractLegalTerms({ content }),
      jurisdictions: this.identifyJurisdictions({ content }),
      recommendations: [] as string[],
    };

    // Document-specific insights
    if (analysis.documentType === 'nda') {
      const ndaAnalysis = await this.analyzeNDA(content);
      if (ndaAnalysis.concerns.length > 0) {
        insights.push(this.createInsight(
          'nda_concerns',
          'medium',
          'NDA Concerns',
          `Found ${ndaAnalysis.concerns.length} concerns in NDA`,
          'Review NDA terms carefully',
          ndaAnalysis,
        ));
      }
    }

    // Analyze identified clauses
    for (const clause of analysis.clauses) {
      if (clause.risk === 'high') {
        insights.push(this.createInsight(
          'high_risk_clause',
          'high',
          `High-Risk Clause: ${clause.type}`,
          clause.description,
          clause.recommendation,
          { clause },
        ));
        rulesApplied.push(`${clause.type}_analysis`);
      }
    }

    // Check for missing essential clauses
    for (const missing of analysis.missingClauses) {
      insights.push(this.createInsight(
        'missing_clause',
        missing.severity as 'low' | 'medium' | 'high' | 'critical',
        `Missing ${missing.name}`,
        missing.description,
        `Add ${missing.name.toLowerCase()} to protect your interests`,
        { clauseType: missing.type },
      ));
      rulesApplied.push('completeness_check');
    }

    // Assess overall legal risk
    const overallRisk = this.calculateOverallLegalRisk(analysis);
    if (overallRisk.level === 'high' || overallRisk.level === 'critical') {
      insights.push(this.createInsight(
        'high_legal_risk',
        overallRisk.level as 'low' | 'medium' | 'high' | 'critical',
        'High Overall Legal Risk',
        `This document presents ${overallRisk.level} legal risk due to ${overallRisk.factors.join(', ')}`,
        'Consult with legal counsel before signing',
        overallRisk,
      ));
    }

    // Add recommendations
    analysis.recommendations = this.generateRecommendations(analysis);

    const confidence = this.calculateLegalConfidence(analysis);

    return this.createResult(
      true,
      analysis,
      insights,
      rulesApplied,
      confidence,
      {
        requiresLegalReview: overallRisk.level === 'high' || overallRisk.level === 'critical',
        documentType: analysis.documentType,
      },
    );
  }

  private async performGeneralLegalAnalysis(
    data: { content?: string; text?: string },
    _context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<LegalAnalysisResult>> {
    rulesApplied.push('general_legal_analysis');

    // Get enterprise legal settings
    const enterpriseConfig = await this.getEnterpriseConfig();
    const legalSettings = enterpriseConfig.legal || {};

    const analysis: Partial<LegalAnalysisResult> = {
      legalTerms: this.extractLegalTerms(data),
      jurisdictions: this.identifyJurisdictions(data),
      disputeResolution: this.analyzeDisputeResolution(data),
      intellectualProperty: this.checkIPClauses(data),
      enterpriseCompliance: await this.checkEnterpriseSpecificRequirements(data, legalSettings),
      clauses: [],
      risks: [],
      obligations: [],
      protections: {
        limitationOfLiability: false,
        capOnDamages: false,
        rightToTerminate: false,
        disputeResolution: false,
        warrantyDisclaimer: false,
        intellectualPropertyRights: false,
        confidentialityProtection: false,
        dataProtection: false,
      },
      missingClauses: [],
      redFlags: [],
      recommendations: [],
    };

    // Flag any concerning legal terms
    const concerningTerms = analysis.legalTerms?.filter(term => term.concern === 'high') || [];
    if (concerningTerms.length > 0) {
      insights.push(this.createInsight(
        'concerning_legal_terms',
        'medium',
        'Concerning Legal Terms Found',
        `Found ${concerningTerms.length} potentially problematic legal terms`,
        'Review these terms carefully with legal counsel',
        { terms: concerningTerms },
      ));
    }

    // Check jurisdiction preferences
    if (legalSettings?.preferredJurisdiction && analysis.jurisdictions && analysis.jurisdictions.length > 0) {
      const nonPreferred = analysis.jurisdictions.filter(
        j => j.location !== legalSettings.preferredJurisdiction,
      );
      if (nonPreferred.length > 0) {
        insights.push(this.createInsight(
          'non_preferred_jurisdiction',
          'medium',
          'Non-Preferred Jurisdiction',
          `Document specifies jurisdiction outside preferred: ${legalSettings.preferredJurisdiction}`,
          'Consider negotiating for preferred jurisdiction',
          { jurisdictions: nonPreferred },
        ));
      }
    }

    return this.createResult(
      true,
      analysis as LegalAnalysisResult,
      insights,
      rulesApplied,
      0.75,
    );
  }

  /**
   * Normalize text for consistent pattern matching in international contracts.
   * Performs Unicode NFC normalization, converts to lowercase, and replaces
   * smart quotes, em-dashes, ellipses, and non-breaking spaces with ASCII equivalents.
   * @param text - The raw text to normalize
   * @returns Normalized text suitable for regex pattern matching
   */
  private normalizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';

    // Normalize Unicode characters (NFC normalization)
    let normalized = text.normalize('NFC');

    // Convert to lowercase while preserving Unicode characters
    normalized = normalized.toLowerCase();

    // Replace common Unicode variations with ASCII equivalents for pattern matching
    normalized = normalized
      .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // Smart single quotes
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // Smart double quotes
      .replace(/[\u2013\u2014]/g, '-') // En-dash and em-dash
      .replace(/[\u2026]/g, '...') // Ellipsis
      .replace(/[\u00A0]/g, ' '); // Non-breaking space

    return normalized;
  }

  /**
   * Detect if content is primarily non-English for language-specific handling.
   * Uses heuristic based on percentage of non-ASCII characters.
   * @param text - The text to analyze
   * @returns true if more than 30% of characters are non-ASCII (suggesting non-English)
   */
  private detectNonEnglish(text: string): boolean {
    if (!text || text.length < 100) return false;

    // Simple heuristic: check for high percentage of non-ASCII characters
    const nonAsciiCount = (text.match(/[^\x00-\x7F]/g) || []).length;
    const ratio = nonAsciiCount / text.length;

    return ratio > 0.3; // More than 30% non-ASCII suggests non-English
  }

  /**
   * Detect the type of legal document based on content patterns
   * Returns: 'nda', 'msa', 'sow', 'license', 'employment', 'lease', 'service_agreement', 'unknown'
   */
  private detectDocumentType(content: string): string {
    if (!content || content.trim().length === 0) {
      return 'unknown';
    }

    const normalizedContent = this.normalizeText(content);
    const scores: Record<string, number> = {
      nda: 0,
      msa: 0,
      sow: 0,
      license: 0,
      employment: 0,
      lease: 0,
      service_agreement: 0,
    };

    // NDA patterns
    if (/non-?disclosure|confidentiality\s+agreement|nda/i.test(normalizedContent)) {
      scores.nda += 10;
    }
    if (/confidential\s+information|disclosing\s+party|receiving\s+party/i.test(normalizedContent)) {
      scores.nda += 5;
    }
    if (/return\s+of\s+(?:confidential\s+)?(?:information|materials)/i.test(normalizedContent)) {
      scores.nda += 3;
    }

    // MSA patterns
    if (/master\s+(?:service|services)\s+agreement|msa/i.test(normalizedContent)) {
      scores.msa += 10;
    }
    if (/statement\s+of\s+work|sow|work\s+order/i.test(normalizedContent)) {
      scores.msa += 3;
      scores.sow += 5;
    }
    if (/service\s+levels?|sla/i.test(normalizedContent)) {
      scores.msa += 3;
    }

    // SOW patterns
    if (/statement\s+of\s+work/i.test(normalizedContent)) {
      scores.sow += 10;
    }
    if (/deliverables?|milestones?|project\s+(?:scope|timeline|schedule)/i.test(normalizedContent)) {
      scores.sow += 5;
    }
    if (/acceptance\s+criteria|project\s+manager/i.test(normalizedContent)) {
      scores.sow += 3;
    }

    // License agreement patterns
    if (/(?:software|license)\s+(?:license\s+)?agreement|eula|end\s+user/i.test(normalizedContent)) {
      scores.license += 10;
    }
    if (/licensor|licensee|grant(?:s|ing)?\s+(?:a\s+)?(?:non-?exclusive|exclusive)?\s*license/i.test(normalizedContent)) {
      scores.license += 5;
    }
    if (/reverse\s+engineer|decompile|disassemble/i.test(normalizedContent)) {
      scores.license += 3;
    }

    // Employment contract patterns
    if (/employment\s+(?:agreement|contract)|offer\s+(?:letter|of\s+employment)/i.test(normalizedContent)) {
      scores.employment += 10;
    }
    if (/employee|employer|salary|compensation|benefits/i.test(normalizedContent)) {
      scores.employment += 3;
    }
    if (/at-?will|probation(?:ary)?\s+period|termination\s+(?:of\s+)?employment/i.test(normalizedContent)) {
      scores.employment += 5;
    }
    if (/non-?compete|non-?solicitation/i.test(normalizedContent)) {
      scores.employment += 3;
    }

    // Lease patterns
    if (/lease\s+agreement|rental\s+agreement|landlord|tenant/i.test(normalizedContent)) {
      scores.lease += 10;
    }
    if (/premises|rent|security\s+deposit/i.test(normalizedContent)) {
      scores.lease += 5;
    }

    // General service agreement patterns
    if (/service\s+agreement|services\s+agreement/i.test(normalizedContent)) {
      scores.service_agreement += 8;
    }
    if (/scope\s+of\s+(?:services|work)|service\s+provider/i.test(normalizedContent)) {
      scores.service_agreement += 3;
    }

    // Find the highest scoring type
    let maxScore = 0;
    let detectedType = 'unknown';

    for (const [type, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        detectedType = type;
      }
    }

    // Require minimum score to avoid false positives
    return maxScore >= 5 ? detectedType : 'unknown';
  }

  /**
   * Get type-specific analysis recommendations based on document type
   */
  private getTypeSpecificRecommendations(documentType: string, analysis: LegalAnalysisResult): string[] {
    const recommendations: string[] = [];

    switch (documentType) {
      case 'nda':
        if (!analysis.protections.confidentialityProtection) {
          recommendations.push('Add explicit confidentiality protection clause');
        }
        if (analysis.redFlags.some(r => r.flag.includes('Perpetual'))) {
          recommendations.push('Consider limiting NDA duration to 3-5 years instead of perpetual');
        }
        break;

      case 'msa':
        if (!analysis.protections.limitationOfLiability) {
          recommendations.push('Add limitation of liability clause - critical for service agreements');
        }
        if (!analysis.protections.disputeResolution) {
          recommendations.push('Include dispute resolution mechanism (mediation/arbitration)');
        }
        if (analysis.missingClauses.some(m => m.type === 'force_majeure')) {
          recommendations.push('Add force majeure clause for service continuity');
        }
        break;

      case 'sow':
        if (!analysis.obligations.some(o => o.type === 'delivery')) {
          recommendations.push('Clearly define deliverables and acceptance criteria');
        }
        recommendations.push('Ensure SOW references governing MSA terms');
        break;

      case 'license':
        if (!analysis.protections.intellectualPropertyRights) {
          recommendations.push('Clearly define IP ownership and license scope');
        }
        if (!analysis.protections.warrantyDisclaimer) {
          recommendations.push('Include warranty disclaimer for software');
        }
        break;

      case 'employment':
        if (analysis.redFlags.some(r => r.flag.includes('Non-compete'))) {
          recommendations.push('Review non-compete clause for enforceability in applicable jurisdiction');
        }
        recommendations.push('Ensure compliance with local employment laws');
        break;

      default:
        if (!analysis.protections.rightToTerminate) {
          recommendations.push('Add clear termination provisions');
        }
    }

    return recommendations;
  }

  /**
   * Extract legal clauses from document content using pattern matching.
   * Identifies clause types: limitation_of_liability, indemnification, termination,
   * confidentiality, warranty, force_majeure, governing_law, dispute_resolution.
   * @param data - Object containing content or text to analyze
   * @returns Array of extracted clauses with type, text, risk level, and recommendations
   */
  private extractClauses(data: { content?: string; text?: string }): Clause[] {
    const rawText = data.content || data.text || '';

    // Handle empty content
    if (!rawText || rawText.trim().length === 0) {
      return [];
    }

    // Normalize text for consistent pattern matching
    const text = this.normalizeText(rawText);
    const clauses: Clause[] = [];

    // Check for non-English content and add warning if detected
    const isNonEnglish = this.detectNonEnglish(rawText);
    if (isNonEnglish) {
      console.warn('LegalAgent: Detected non-English contract content - pattern matching may be less accurate');
    }

    // Define clause patterns and their risk levels
    const clausePatterns = [
      {
        type: 'limitation_of_liability',
        pattern: /limit(?:ation)?s?\s+of\s+liability|liability\s+limit|maximum\s+liability/i,
        risk: 'high',
        extract: (match: string, context: string) => ({
          type: 'limitation_of_liability',
          text: this.extractClauseText(context, match),
          risk: 'high',
          description: 'Limits vendor liability for damages',
          recommendation: 'Ensure liability limits are reasonable and mutual',
        }),
      },
      {
        type: 'indemnification',
        pattern: /indemnif(?:y|ication)|hold\s+harmless/i,
        risk: 'high',
        extract: (match: string, context: string) => ({
          type: 'indemnification',
          text: this.extractClauseText(context, match),
          risk: this.assessIndemnificationRisk(context),
          description: 'Requires one party to cover losses of another',
          recommendation: 'Ensure indemnification is mutual and reasonable',
        }),
      },
      {
        type: 'termination',
        pattern: /terminat(?:e|ion)|end\s+(?:of\s+)?(?:agreement|contract)/i,
        risk: 'medium',
        extract: (match: string, context: string) => ({
          type: 'termination',
          text: this.extractClauseText(context, match),
          risk: 'medium',
          description: 'Defines how the contract can be ended',
          recommendation: 'Ensure fair termination rights for both parties',
        }),
      },
      {
        type: 'confidentiality',
        pattern: /confidential(?:ity)?|non-?disclosure|proprietary\s+information/i,
        risk: 'medium',
        extract: (match: string, context: string) => ({
          type: 'confidentiality',
          text: this.extractClauseText(context, match),
          risk: 'medium',
          description: 'Restricts sharing of confidential information',
          recommendation: 'Ensure confidentiality obligations are mutual and time-limited',
        }),
      },
      {
        type: 'warranty',
        pattern: /warrant(?:y|ies)|guarantee/i,
        risk: 'medium',
        extract: (match: string, context: string) => ({
          type: 'warranty',
          text: this.extractClauseText(context, match),
          risk: this.assessWarrantyRisk(context),
          description: 'Promises about product/service quality',
          recommendation: 'Verify warranty terms are acceptable',
        }),
      },
      {
        type: 'force_majeure',
        pattern: /force\s+majeure|act\s+of\s+god|unforeseeable\s+circumstances/i,
        risk: 'low',
        extract: (match: string, context: string) => ({
          type: 'force_majeure',
          text: this.extractClauseText(context, match),
          risk: 'low',
          description: 'Excuses performance due to extraordinary events',
          recommendation: 'Ensure force majeure events are clearly defined',
        }),
      },
      {
        type: 'governing_law',
        pattern: /governing\s+law|governed\s+by|laws?\s+of/i,
        risk: 'low',
        extract: (match: string, context: string) => ({
          type: 'governing_law',
          text: this.extractClauseText(context, match),
          risk: 'low',
          description: 'Specifies which laws apply to the contract',
          recommendation: 'Verify governing law is acceptable',
        }),
      },
      {
        type: 'dispute_resolution',
        pattern: /arbitration|mediation|dispute\s+resolution|litigation/i,
        risk: 'medium',
        extract: (match: string, context: string) => ({
          type: 'dispute_resolution',
          text: this.extractClauseText(context, match),
          risk: this.assessDisputeRisk(context),
          description: 'Defines how disputes will be resolved',
          recommendation: 'Consider costs and fairness of dispute mechanism',
        }),
      },
    ];

    // Extract clauses
    for (const clauseDef of clausePatterns) {
      const matches = text.matchAll(new RegExp(clauseDef.pattern.source, 'gi'));

      for (const match of matches) {
        // Stop if we've reached the maximum clause limit
        if (clauses.length >= LegalAgent.MAX_CLAUSES) {
          console.warn(`LegalAgent: Reached maximum clause limit (${LegalAgent.MAX_CLAUSES})`);
          break;
        }

        const startIdx = Math.max(0, match.index! - 100);
        const endIdx = Math.min(text.length, match.index! + match[0].length + 200);
        const context = text.substring(startIdx, endIdx);

        const clause = clauseDef.extract(match[0], context);
        clauses.push(clause as Clause);
      }

      // Stop iterating patterns if we've reached the limit
      if (clauses.length >= LegalAgent.MAX_CLAUSES) {
        break;
      }
    }

    return clauses;
  }

  /**
   * Assess legal risks in document content using predefined risk patterns.
   * Identifies risks: Unlimited Liability, One-sided Terms, Automatic Renewal,
   * No Right to Terminate, Broad Indemnification, Waiver of Rights.
   * @param data - Object containing content or text to analyze
   * @returns Array of identified legal risks with severity and descriptions
   */
  private assessLegalRisks(data: { content?: string; text?: string }): LegalRisk[] {
    const rawText = data.content || data.text || '';

    // Handle empty content
    if (!rawText || rawText.trim().length === 0) {
      return [];
    }

    const risks: LegalRisk[] = [];
    // Normalize text for consistent pattern matching
    const text = this.normalizeText(rawText);

    // Risk patterns
    const riskPatterns = [
      {
        name: 'Unlimited Liability',
        pattern: /unlimited\s+liability|no\s+limit.*liability/i,
        severity: 'critical',
        description: 'Contract may expose you to unlimited financial liability',
      },
      {
        name: 'One-sided Terms',
        pattern: /sole(?:ly)?\s+(?:discretion|option|right)|unilateral/i,
        severity: 'high',
        description: 'Contract contains one-sided terms favoring other party',
      },
      {
        name: 'Automatic Renewal',
        pattern: /auto(?:matic)?(?:ally)?\s+renew/i,
        severity: 'medium',
        description: 'Contract automatically renews without explicit consent',
      },
      {
        name: 'No Right to Terminate',
        pattern: /no\s+right\s+to\s+(?:terminate|cancel)|may\s+not\s+terminate|neither\s+party\s+may\s+terminate|cannot\s+(?:be\s+)?terminat/i,
        severity: 'high',
        description: 'Limited or no ability to terminate the contract',
      },
      {
        name: 'Broad Indemnification',
        pattern: /any\s+and\s+all.*(?:claims|damages|losses)|indemnify.*any.*all/i,
        severity: 'high',
        description: 'Overly broad indemnification obligations',
      },
      {
        name: 'Waiver of Rights',
        pattern: /waive(?:s|r)?\s+(?:any\s+)?right|relinquish.*rights/i,
        severity: 'high',
        description: 'Contract requires waiving important legal rights',
      },
    ];

    for (const riskDef of riskPatterns) {
      if (riskDef.pattern.test(text)) {
        risks.push({
          name: riskDef.name,
          severity: riskDef.severity as 'low' | 'medium' | 'high' | 'critical',
          description: riskDef.description,
          found: true,
        });
      }
    }

    return risks;
  }

  /**
   * Extract contractual obligations from document content.
   * Identifies obligations using patterns like "shall", "must", "will", "agrees to".
   * Classifies by type (payment, delivery, maintenance, confidentiality, compliance).
   * @param data - Object containing content or text to analyze
   * @returns Array of obligations with text, type, and obligated party
   */
  private extractObligations(data: { content?: string; text?: string }): Obligation[] {
    const rawText = data.content || data.text || '';

    // Handle empty content
    if (!rawText || rawText.trim().length === 0) {
      return [];
    }

    // Normalize text for consistent pattern matching
    const text = this.normalizeText(rawText);
    const obligations: Obligation[] = [];

    // Unicode-aware obligation patterns (work with normalized text)
    const patterns = [
      /(?:shall|must|will|agrees?\s+to)\s+(?:not\s+)?([a-z\s\u00C0-\u024F]{10,50})/gi,
      /(?:obligat(?:ed|ion)|requir(?:ed|ement)|responsib(?:le|ility))\s+(?:to|for)\s+([a-z\s\u00C0-\u024F]{10,50})/gi,
      /(?:covenant|undertake|commit)\s+(?:to|that)\s+([a-z\s\u00C0-\u024F]{10,50})/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        // Boundary check: limit number of obligations
        if (obligations.length >= LegalAgent.MAX_OBLIGATIONS) {
          console.warn(`LegalAgent: Reached maximum obligation limit (${LegalAgent.MAX_OBLIGATIONS})`);
          break;
        }

        const obligation = match[1]?.trim();
        if (obligation && obligation.length > 10 && obligation.split(/\s+/).length > 2) {
          obligations.push({
            text: obligation,
            type: this.classifyObligation(match[0]),
            party: this.identifyObligatedParty(match[0], text),
          });
        }
      }

      // Break outer loop if we've reached the limit
      if (obligations.length >= LegalAgent.MAX_OBLIGATIONS) {
        break;
      }
    }

    // Deduplicate similar obligations
    return this.deduplicateObligations(obligations);
  }

  /**
   * Identify protective clauses in the document.
   * Checks for: limitation of liability, cap on damages, right to terminate,
   * dispute resolution, warranty disclaimer, IP rights, confidentiality, data protection.
   * @param data - Object containing content or text to analyze
   * @returns Protection object with boolean flags for each protection type
   */
  private identifyProtections(data: { content?: string; text?: string }): Protection {
    const defaultProtections: Protection = {
      limitationOfLiability: false,
      capOnDamages: false,
      rightToTerminate: false,
      disputeResolution: false,
      warrantyDisclaimer: false,
      intellectualPropertyRights: false,
      confidentialityProtection: false,
      dataProtection: false,
    };

    const rawText = data.content || data.text || '';

    // Handle empty content
    if (!rawText || rawText.trim().length === 0) {
      return defaultProtections;
    }

    // Normalize text for consistent pattern matching
    const text = this.normalizeText(rawText);

    const protections = { ...defaultProtections };

    // Check for protective clauses (Unicode-aware patterns with normalization)
    if (/limit.*liability|liability.*cap|maximum.*liability/i.test(text)) {
      protections.limitationOfLiability = true;
    }
    if (/cap.*damages|damages.*cap|maximum.*damages/i.test(text)) {
      protections.capOnDamages = true;
    }
    if (/right\s+to\s+terminate|may\s+terminate|termination\s+for\s+convenience/i.test(text)) {
      protections.rightToTerminate = true;
    }
    if (/dispute\s+resolution|arbitration|mediation/i.test(text)) {
      protections.disputeResolution = true;
    }
    if (/disclaim.*warrant|as\s+is|without\s+warrant/i.test(text)) {
      protections.warrantyDisclaimer = true;
    }
    if (/intellectual\s+property|ownership.*rights|proprietary\s+rights/i.test(text)) {
      protections.intellectualPropertyRights = true;
    }
    if (/confidential|non-?disclosure|proprietary/i.test(text)) {
      protections.confidentialityProtection = true;
    }
    if (/data\s+(?:protection|security|privacy)|gdpr|ccpa/i.test(text)) {
      protections.dataProtection = true;
    }

    return protections;
  }

  /**
   * Check for missing essential clauses in the document.
   * Looks for: termination, limitation of liability, governing law,
   * dispute resolution, force majeure, confidentiality.
   * @param data - Object containing content or text to analyze
   * @returns Array of missing clauses with name, type, severity, and description
   */
  private checkMissingClauses(data: { content?: string; text?: string }): MissingClause[] {
    const rawText = data.content || data.text || '';

    // Handle empty content - all clauses are "missing" from empty content
    if (!rawText || rawText.trim().length === 0) {
      return [];
    }

    // Normalize text for consistent pattern matching
    const text = this.normalizeText(rawText);
    const missing: MissingClause[] = [];

    const essentialClauses: MissingClause[] = [
      {
        name: 'Termination Clause',
        type: 'termination',
        pattern: /terminat/i,
        severity: 'high',
        description: 'No clear termination provisions found',
      },
      {
        name: 'Limitation of Liability',
        type: 'limitation_of_liability',
        pattern: /limit.*liability/i,
        severity: 'high',
        description: 'No limitation of liability clause to protect against excessive damages',
      },
      {
        name: 'Governing Law',
        type: 'governing_law',
        pattern: /governing\s+law|governed\s+by/i,
        severity: 'medium',
        description: 'No governing law specified',
      },
      {
        name: 'Dispute Resolution',
        type: 'dispute_resolution',
        pattern: /dispute|arbitration|mediation/i,
        severity: 'medium',
        description: 'No dispute resolution mechanism specified',
      },
      {
        name: 'Force Majeure',
        type: 'force_majeure',
        pattern: /force\s+majeure|act\s+of\s+god/i,
        severity: 'low',
        description: 'No force majeure clause for unforeseen circumstances',
      },
      {
        name: 'Confidentiality',
        type: 'confidentiality',
        pattern: /confidential|non-?disclosure/i,
        severity: 'medium',
        description: 'No confidentiality provisions',
      },
    ];

    for (const clause of essentialClauses) {
      if (!clause.pattern.test(text)) {
        missing.push(clause);
      }
    }

    return missing;
  }

  /**
   * Identify red flags in the document that warrant careful review.
   * Detects: perpetual obligations, jury trial waivers, attorney fee provisions,
   * liquidated damages, non-compete clauses, assignment without consent.
   * @param data - Object containing content or text to analyze
   * @returns Array of red flags with flag description and severity
   */
  private identifyRedFlags(data: { content?: string; text?: string }): RedFlag[] {
    const rawText = data.content || data.text || '';

    // Handle empty content
    if (!rawText || rawText.trim().length === 0) {
      return [];
    }

    // Normalize text for consistent pattern matching
    const text = this.normalizeText(rawText);
    const redFlags: RedFlag[] = [];

    // Red flag patterns (Unicode-aware with normalized text)
    const patterns: Array<{
      pattern: RegExp;
      flag: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [
      {
        pattern: /in\s+perpetuity|forever|permanent(?:ly)?|indefinite(?:ly)?/i,
        flag: 'Perpetual obligations',
        severity: 'high',
      },
      {
        pattern: /waive.*jury\s+trial/i,
        flag: 'Waiver of jury trial',
        severity: 'medium',
      },
      {
        pattern: /prevailing\s+party.*attorneys?\s+fees/i,
        flag: 'Loser pays attorney fees',
        severity: 'medium',
      },
      {
        pattern: /liquidated\s+damages/i,
        flag: 'Predetermined damages',
        severity: 'medium',
      },
      {
        pattern: /non-?compete|restraint\s+of\s+trade/i,
        flag: 'Non-compete clause',
        severity: 'high',
      },
      {
        pattern: /assign.*without.*consent|freely\s+assign/i,
        flag: 'Assignment without consent',
        severity: 'medium',
      },
    ];

    for (const { pattern, flag, severity } of patterns) {
      if (pattern.test(text)) {
        redFlags.push({ flag, severity });
      }
    }

    return redFlags;
  }

  // Compliance methods

  /**
   * Check document for regulatory compliance requirements.
   * Validates against major regulations including GDPR, CCPA, and HIPAA.
   *
   * @param data - Object containing content or text to analyze
   * @returns Array of RegulationCheck objects with compliance status and remediation steps
   */
  private checkRegulations(data: { content?: string; text?: string }): RegulationCheck[] {
    const text = (data.content || data.text || '').toLowerCase();
    const regulations: RegulationCheck[] = [];

    // Common regulations to check
    const regulationChecks = [
      {
        regulation: 'GDPR',
        keywords: ['personal data', 'data protection', 'privacy', 'eu', 'european'],
        check: (): Omit<RegulationCheck, 'regulation'> => {
          const hasDataProcessing = /process.*personal\s+data|personal\s+data.*process/i.test(text);
          const hasGDPRMention = /gdpr|general\s+data\s+protection/i.test(text);
          const hasPrivacyRights = /data\s+subject\s+rights|right\s+to\s+(?:access|erasure|portability)/i.test(text);

          return {
            compliant: hasDataProcessing ? hasGDPRMention && hasPrivacyRights : true,
            issue: hasDataProcessing && !hasGDPRMention ? 'Processes personal data but no GDPR compliance mentioned' : null,
            remediation: 'Add GDPR compliance clauses and data processing agreement',
          };
        },
      },
      {
        regulation: 'CCPA',
        keywords: ['california', 'consumer', 'personal information', 'privacy'],
        check: (): Omit<RegulationCheck, 'regulation'> => {
          const hasCaliforniaData = /california|ca\s+residents?/i.test(text);
          const hasCCPAMention = /ccpa|california\s+consumer\s+privacy/i.test(text);

          return {
            compliant: hasCaliforniaData ? hasCCPAMention : true,
            issue: hasCaliforniaData && !hasCCPAMention ? 'May affect California residents but no CCPA compliance' : null,
            remediation: 'Add CCPA compliance provisions',
          };
        },
      },
      {
        regulation: 'HIPAA',
        keywords: ['health', 'medical', 'patient', 'phi', 'protected health information'],
        check: (): Omit<RegulationCheck, 'regulation'> => {
          const hasHealthData = /health|medical|patient|clinical/i.test(text);
          const hasHIPAAMention = /hipaa|health.*privacy/i.test(text);
          const hasBAA = /business\s+associate\s+agreement|baa/i.test(text);

          return {
            compliant: hasHealthData ? hasHIPAAMention && hasBAA : true,
            issue: hasHealthData && !hasHIPAAMention ? 'Handles health data but no HIPAA compliance' : null,
            remediation: 'Require Business Associate Agreement and HIPAA compliance',
          };
        },
      },
    ];

    for (const regCheck of regulationChecks) {
      const result = regCheck.check();
      regulations.push({
        regulation: regCheck.regulation,
        ...result,
      });
    }

    return regulations;
  }

  /**
   * Assess data privacy compliance in legal documents.
   * Checks for overly broad data collection, indefinite retention,
   * unrestricted third-party sharing, and security provisions.
   *
   * @param data - Object containing content or text to analyze
   * @returns Object with compliance status, specific issues, and privacy score (0-1)
   */
  private checkDataPrivacy(data: { content?: string; text?: string }): { compliant: boolean; issues: DataPrivacyCheck[]; score: number } {
    const text = (data.content || data.text || '').toLowerCase();
    const issues: DataPrivacyCheck[] = [];

    // Privacy checks
    const privacyChecks = [
      {
        check: 'Data Collection Scope',
        pattern: /collect.*all.*data|any\s+and\s+all\s+information/i,
        issue: 'Overly broad data collection rights',
      },
      {
        check: 'Data Retention',
        pattern: /retain.*indefinitely|no\s+deletion.*data/i,
        issue: 'Indefinite data retention',
      },
      {
        check: 'Third-party Sharing',
        pattern: /share.*third\s+part|transfer.*data.*any/i,
        issue: 'Unrestricted third-party data sharing',
      },
      {
        check: 'Data Security',
        absent: /encrypt|secure|protect.*data/i,
        issue: 'No data security provisions',
      },
    ];

    for (const check of privacyChecks) {
      if (check.pattern && check.pattern.test(text)) {
        issues.push({
          check: check.check,
          issue: check.issue,
        });
      } else if (check.absent && !check.absent.test(text)) {
        issues.push({
          check: check.check,
          issue: check.issue,
        });
      }
    }

    return {
      compliant: issues.length === 0,
      issues,
      score: Math.max(0, 1 - (issues.length * 0.25)),
    };
  }

  /**
   * Check document for industry-specific compliance standards.
   * Identifies applicable standards (PCI DSS, SOX, SOC 2, ISO 27001, HIPAA, HITECH)
   * based on industry keywords and verifies if they are mentioned in the document.
   *
   * @param data - Object containing content or text to analyze
   * @returns Array of IndustryStandardCheck objects indicating which standards apply and are mentioned
   */
  private checkIndustryStandards(data: { content?: string; text?: string }): IndustryStandardCheck[] {
    const text = (data.content || data.text || '').toLowerCase();
    const standards: IndustryStandardCheck[] = [];

    // Industry standard checks
    const industryChecks = [
      {
        industry: 'Financial Services',
        keywords: ['payment', 'financial', 'banking', 'credit'],
        standards: ['PCI DSS', 'SOX'],
      },
      {
        industry: 'Technology',
        keywords: ['software', 'saas', 'cloud', 'api'],
        standards: ['SOC 2', 'ISO 27001'],
      },
      {
        industry: 'Healthcare',
        keywords: ['health', 'medical', 'patient'],
        standards: ['HIPAA', 'HITECH'],
      },
    ];

    for (const industry of industryChecks) {
      const isRelevant = industry.keywords.some(keyword => text.includes(keyword));

      if (isRelevant) {
        for (const standard of industry.standards) {
          const mentioned = new RegExp(standard.replace(/\s+/g, '\\s*'), 'i').test(text);
          standards.push({
            industry: industry.industry,
            standard,
            mentioned,
            required: isRelevant,
          });
        }
      }
    }

    return standards;
  }

  // Utility methods

  /**
   * Extract the full clause text surrounding a pattern match.
   * Finds the complete sentence containing the match for better context.
   *
   * @param context - The full text to search within
   * @param match - The matched pattern text
   * @returns The sentence containing the match, or trimmed context if not found
   */
  private extractClauseText(context: string, match: string): string {
    // Extract a reasonable amount of text around the match
    const sentences = context.match(/[^.!?]+[.!?]+/g) || [];
    const matchIndex = context.indexOf(match);

    let clauseText = '';
    for (const sentence of sentences) {
      if (context.indexOf(sentence) <= matchIndex &&
          context.indexOf(sentence) + sentence.length >= matchIndex) {
        clauseText = sentence.trim();
        break;
      }
    }

    return clauseText || context.trim();
  }

  /**
   * Assess the risk level of an indemnification clause.
   * Evaluates based on mutuality, scope (any and all), third party involvement,
   * and whether it's tied to breach of agreement.
   *
   * @param context - The clause text to analyze
   * @returns Risk level: 'low', 'medium', or 'high'
   */
  private assessIndemnificationRisk(context: string): string {
    if (/mutual/i.test(context)) {return 'medium';}
    if (/any\s+and\s+all/i.test(context)) {return 'high';}
    if (/third\s+party/i.test(context)) {return 'medium';}
    if (/breach.*agreement/i.test(context)) {return 'low';}

    return 'medium';
  }

  /**
   * Assess the risk level of warranty language.
   * High risk for disclaimers/as-is, medium for limited warranty, low for full warranty.
   *
   * @param context - The warranty clause text to analyze
   * @returns Risk level: 'low', 'medium', or 'high'
   */
  private assessWarrantyRisk(context: string): string {
    if (/disclaim|as\s+is|without\s+warrant/i.test(context)) {return 'high';}
    if (/limited\s+warrant/i.test(context)) {return 'medium';}
    if (/full\s+warrant/i.test(context)) {return 'low';}

    return 'medium';
  }

  /**
   * Assess the risk level of dispute resolution provisions.
   * Binding arbitration and jury waivers are high risk; mediation-first is low risk.
   *
   * @param context - The dispute resolution clause text
   * @returns Risk level: 'low', 'medium', or 'high'
   */
  private assessDisputeRisk(context: string): string {
    if (/binding\s+arbitration/i.test(context)) {return 'high';}
    if (/waive.*jury/i.test(context)) {return 'high';}
    if (/mediation\s+first/i.test(context)) {return 'low';}

    return 'medium';
  }

  /**
   * Classify an obligation by its type based on keyword analysis.
   * Categories: payment, delivery, maintenance, confidentiality, compliance, or general.
   *
   * @param text - The obligation text to classify
   * @returns Obligation type string
   */
  private classifyObligation(text: string): string {
    const lower = text.toLowerCase();

    if (/pay|payment/i.test(lower)) {return 'payment';}
    if (/deliver|provide/i.test(lower)) {return 'delivery';}
    if (/maintain|support/i.test(lower)) {return 'maintenance';}
    if (/confidential|not\s+disclose/i.test(lower)) {return 'confidentiality';}
    if (/comply|regulation/i.test(lower)) {return 'compliance';}

    return 'general';
  }

  /**
   * Identify which party is obligated based on contextual analysis.
   * Uses heuristics to find party references (vendor, customer, both) near the obligation.
   *
   * @param obligation - The obligation text
   * @param fullText - The full document text for context
   * @returns Party identifier: 'vendor', 'customer', 'both', or 'unspecified'
   */
  private identifyObligatedParty(obligation: string, fullText: string): string {
    // Simple heuristic - look for party references near the obligation
    const index = fullText.indexOf(obligation);
    const contextStart = Math.max(0, index - 100);
    const context = fullText.substring(contextStart, index);

    if (/vendor|supplier|contractor/i.test(context)) {return 'vendor';}
    if (/customer|client|buyer/i.test(context)) {return 'customer';}
    if (/both\s+parties|each\s+party|mutual/i.test(context)) {return 'both';}

    return 'unspecified';
  }

  /**
   * Remove duplicate obligations using semantic similarity comparison.
   * Uses Levenshtein distance with 80% threshold to identify duplicates.
   * Limits results to MAX_OBLIGATIONS to prevent excessive processing.
   *
   * @param obligations - Array of obligations to deduplicate
   * @returns Deduplicated array of unique obligations
   */
  private deduplicateObligations(obligations: Obligation[]): Obligation[] {
    if (!obligations || obligations.length === 0) {
      return [];
    }

    const unique: Obligation[] = [];
    const SIMILARITY_THRESHOLD = 0.8; // 80% similarity = duplicate

    for (const obligation of obligations) {
      // Boundary check
      if (unique.length >= LegalAgent.MAX_OBLIGATIONS) {
        break;
      }

      // Check if this obligation is semantically similar to any existing one
      const isDuplicate = unique.some(existing => {
        // Use Levenshtein distance-based similarity instead of substring matching
        const similarity = this.calculateSimilarity(
          obligation.text.toLowerCase(),
          existing.text.toLowerCase()
        );
        return similarity >= SIMILARITY_THRESHOLD;
      });

      if (!isDuplicate) {
        unique.push(obligation);
      }
    }

    return unique;
  }

  /**
   * Detect cross-references between sections in the contract
   * This helps identify dependencies and potential conflicts between clauses
   */
  private detectCrossReferences(content: string): Array<{
    reference: string;
    section: string;
    context: string;
  }> {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const crossReferences: Array<{
      reference: string;
      section: string;
      context: string;
    }> = [];

    const normalizedContent = this.normalizeText(content);

    for (const pattern of LegalAgent.CROSS_REFERENCE_PATTERNS) {
      // Create a new RegExp to avoid lastIndex issues
      const freshPattern = new RegExp(pattern.source, pattern.flags);

      let match;
      while ((match = freshPattern.exec(normalizedContent)) !== null) {
        const startIndex = Math.max(0, match.index - LegalAgent.CLAUSE_CONTEXT_WINDOW / 2);
        const endIndex = Math.min(normalizedContent.length, match.index + match[0].length + LegalAgent.CLAUSE_CONTEXT_WINDOW / 2);

        crossReferences.push({
          reference: match[0],
          section: match[1] || 'unspecified',
          context: normalizedContent.slice(startIndex, endIndex).trim(),
        });

        // Limit to prevent excessive processing
        if (crossReferences.length >= 100) {
          break;
        }
      }

      if (crossReferences.length >= 100) {
        break;
      }
    }

    return crossReferences;
  }

  /**
   * Detect amendment language and extract amendment information
   * This helps identify if the contract has been modified and potential supersession issues
   */
  private detectAmendments(content: string): {
    hasAmendments: boolean;
    amendmentCount: number;
    amendments: Array<{
      type: string;
      text: string;
      context: string;
    }>;
    supersessionLanguage: boolean;
  } {
    const defaultResult = {
      hasAmendments: false,
      amendmentCount: 0,
      amendments: [] as Array<{
        type: string;
        text: string;
        context: string;
      }>,
      supersessionLanguage: false,
    };

    if (!content || content.trim().length === 0) {
      return defaultResult;
    }

    const normalizedContent = this.normalizeText(content);
    const amendments: Array<{
      type: string;
      text: string;
      context: string;
    }> = [];

    let hasSupersession = false;

    for (const pattern of LegalAgent.AMENDMENT_PATTERNS) {
      // Create a new RegExp to avoid lastIndex issues
      const freshPattern = new RegExp(pattern.source, pattern.flags);

      let match;
      while ((match = freshPattern.exec(normalizedContent)) !== null) {
        const startIndex = Math.max(0, match.index - 100);
        const endIndex = Math.min(normalizedContent.length, match.index + match[0].length + 100);

        // Detect supersession language
        if (/supersedes?/i.test(match[0])) {
          hasSupersession = true;
        }

        amendments.push({
          type: this.classifyAmendmentType(match[0]),
          text: match[0],
          context: normalizedContent.slice(startIndex, endIndex).trim(),
        });

        // Limit to prevent excessive processing
        if (amendments.length >= 50) {
          break;
        }
      }

      if (amendments.length >= 50) {
        break;
      }
    }

    return {
      hasAmendments: amendments.length > 0,
      amendmentCount: amendments.length,
      amendments,
      supersessionLanguage: hasSupersession,
    };
  }

  /**
   * Classify the type of amendment based on the matched text
   */
  private classifyAmendmentType(text: string): string {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('supersede')) {
      return 'supersession';
    }
    if (lowerText.includes('amended') || lowerText.includes('modified')) {
      return 'modification';
    }
    if (lowerText.includes('revised')) {
      return 'revision';
    }
    if (lowerText.includes('supplemented')) {
      return 'supplement';
    }
    if (/first|second|third|\d+(?:st|nd|rd|th)/i.test(lowerText)) {
      return 'numbered_amendment';
    }
    return 'general';
  }

  /**
   * Get enhanced clause context with expanded window
   * Uses the increased CLAUSE_CONTEXT_WINDOW for better contextual analysis
   */
  private getEnhancedClauseContext(content: string, clauseIndex: number, clauseLength: number): string {
    if (!content || clauseIndex < 0) {
      return '';
    }

    const halfWindow = Math.floor(LegalAgent.CLAUSE_CONTEXT_WINDOW / 2);
    const startIndex = Math.max(0, clauseIndex - halfWindow);
    const endIndex = Math.min(content.length, clauseIndex + clauseLength + halfWindow);

    return content.slice(startIndex, endIndex).trim();
  }

  /**
   * Calculate the overall legal risk score for a contract analysis.
   * Factors in high-risk clauses, critical/high risks, missing essential clauses,
   * and red flags to produce a composite risk assessment.
   *
   * @param analysis - The complete legal analysis result
   * @returns OverallLegalRisk with level (low/medium/high/critical), score, factors, and mitigations
   */
  private calculateOverallLegalRisk(analysis: LegalAnalysisResult): OverallLegalRisk {
    const factors: string[] = [];
    let riskScore = 0;

    // Factor in high-risk clauses
    const highRiskClauses = analysis.clauses.filter((c: Clause) => c.risk === 'high').length;
    if (highRiskClauses > 0) {
      factors.push(`${highRiskClauses} high-risk clauses`);
      riskScore += highRiskClauses * 2;
    }

    // Factor in identified risks
    const criticalRisks = analysis.risks.filter((r: LegalRisk) => r.severity === 'critical').length;
    const highRisks = analysis.risks.filter((r: LegalRisk) => r.severity === 'high').length;

    if (criticalRisks > 0) {
      factors.push(`${criticalRisks} critical risks`);
      riskScore += criticalRisks * 3;
    }
    if (highRisks > 0) {
      factors.push(`${highRisks} high risks`);
      riskScore += highRisks * 2;
    }

    // Factor in missing clauses
    const missingCritical = analysis.missingClauses.filter((m: MissingClause) => m.severity === 'high').length;
    if (missingCritical > 0) {
      factors.push(`${missingCritical} missing essential clauses`);
      riskScore += missingCritical * 1.5;
    }

    // Factor in red flags
    if (analysis.redFlags.length > 0) {
      factors.push(`${analysis.redFlags.length} red flags`);
      riskScore += analysis.redFlags.length;
    }

    // Determine risk level
    let level: OverallLegalRisk['level'] = 'low';
    if (riskScore >= 10) {level = 'critical';}
    else if (riskScore >= 6) {level = 'high';}
    else if (riskScore >= 3) {level = 'medium';}

    return {
      level,
      score: riskScore,
      factors,
      mitigations: this.suggestMitigations(analysis),
    };
  }

  /**
   * Generate mitigation suggestions based on identified risks.
   * Provides actionable recommendations for high-risk indemnification,
   * unlimited liability, missing termination rights, and dispute resolution gaps.
   *
   * @param analysis - The complete legal analysis result
   * @returns Array of mitigation suggestion strings
   */
  private suggestMitigations(analysis: LegalAnalysisResult): string[] {
    const mitigations: string[] = [];

    if (analysis.clauses.some((c: Clause) => c.type === 'indemnification' && c.risk === 'high')) {
      mitigations.push('Negotiate mutual indemnification or limit scope');
    }

    if (analysis.risks.some((r: LegalRisk) => r.name === 'Unlimited Liability')) {
      mitigations.push('Add liability cap equal to contract value');
    }

    if (!analysis.protections.rightToTerminate) {
      mitigations.push('Add termination for convenience clause');
    }

    if (analysis.missingClauses.some((m: MissingClause) => m.type === 'dispute_resolution')) {
      mitigations.push('Add escalation and mediation before litigation');
    }

    return mitigations;
  }

  /**
   * Generate comprehensive recommendations based on legal analysis.
   * Includes risk-based counsel advice, protection recommendations,
   * mitigation steps for identified risks, and obligation balance suggestions.
   *
   * @param analysis - The complete legal analysis result
   * @returns Array of recommendation strings prioritized by importance
   */
  private generateRecommendations(analysis: LegalAnalysisResult): string[] {
    const recommendations: string[] = [];

    // Based on overall risk
    const risk = this.calculateOverallLegalRisk(analysis);
    if (risk.level === 'critical' || risk.level === 'high') {
      recommendations.push('Obtain legal counsel review before signing');
    }

    // Based on missing protections
    const { protections } = analysis;
    if (!protections.limitationOfLiability) {
      recommendations.push('Negotiate limitation of liability clause');
    }
    if (!protections.rightToTerminate) {
      recommendations.push('Include termination for convenience provision');
    }

    // Based on identified risks - suggest mitigations
    if (analysis.risks) {
      for (const risk of analysis.risks) {
        if (risk.found && risk.name === 'Unlimited Liability') {
          recommendations.push('Negotiate a liability cap to limit exposure');
        }
        if (risk.found && risk.name === 'No Right to Terminate') {
          recommendations.push('Add termination rights for both parties');
        }
        if (risk.found && risk.name === 'Broad Indemnification') {
          recommendations.push('Narrow the scope of indemnification obligations');
        }
        if (risk.found && risk.name === 'Automatic Renewal') {
          recommendations.push('Add notification requirement before automatic renewal');
        }
      }
    }

    // Based on obligations
    const oneWayObligations = analysis.obligations.filter((o: Obligation) =>
      o.party !== 'both' && o.party !== 'vendor',
    ).length;

    if (oneWayObligations > 3) {
      recommendations.push('Balance obligations between parties');
    }

    // Add type-specific recommendations based on document type
    if (analysis.documentType) {
      const typeSpecific = this.getTypeSpecificRecommendations(analysis.documentType, analysis);
      recommendations.push(...typeSpecific);
    }

    return recommendations;
  }

  /**
   * Generate compliance-specific recommendations.
   * Addresses violations, data privacy issues, and missing industry standards.
   *
   * @param compliance - Enterprise or vendor compliance analysis result
   * @returns Array of compliance recommendation strings
   */
  private generateComplianceRecommendations(compliance: EnterpriseComplianceAnalysisResult | VendorComplianceAnalysisResult): string[] {
    const recommendations: string[] = [];

    if (compliance.violations && compliance.violations.length > 0) {
      recommendations.push('Address all compliance violations before proceeding');
    }

    const enterpriseCompliance = compliance as EnterpriseComplianceAnalysisResult;
    if (enterpriseCompliance.dataPrivacy && enterpriseCompliance.dataPrivacy.issues.length > 0) {
      recommendations.push('Implement data protection measures and update privacy policies');
    }

    if (enterpriseCompliance.industryStandards) {
      const missingStandards = enterpriseCompliance.industryStandards.filter((s: IndustryStandardCheck) =>
        s.required && !s.mentioned,
      );

      if (missingStandards.length > 0) {
        recommendations.push(`Ensure compliance with: ${missingStandards.map((s: IndustryStandardCheck) => s.standard).join(', ')}`);
      }
    }

    return recommendations;
  }

  /**
   * Extract significant legal terms and their associated concern levels.
   * Identifies terms that may have legal implications or require attention.
   *
   * @param data - Object containing content or text to analyze
   * @returns Array of LegalTerm objects with term, concern level, and context
   */
  private extractLegalTerms(data: { content?: string; text?: string }): LegalTerm[] {
    const text = (data.content || data.text || '');
    const terms: LegalTerm[] = [];

    const legalTermPatterns: Array<{
      term: string;
      concern: 'low' | 'medium' | 'high';
    }> = [
      { term: 'force majeure', concern: 'low' },
      { term: 'liquidated damages', concern: 'medium' },
      { term: 'consequential damages', concern: 'medium' },
      { term: 'punitive damages', concern: 'high' },
      { term: 'gross negligence', concern: 'medium' },
      { term: 'willful misconduct', concern: 'medium' },
      { term: 'sole discretion', concern: 'high' },
      { term: 'perpetual license', concern: 'high' },
      { term: 'worldwide license', concern: 'medium' },
      { term: 'irrevocable', concern: 'high' },
    ];

    for (const { term, concern } of legalTermPatterns) {
      if (new RegExp(term, 'i').test(text)) {
        terms.push({ term, concern, found: true });
      }
    }

    return terms;
  }

  /**
   * Identify legal jurisdictions mentioned in the document.
   * Detects both state-level and country-level jurisdiction references.
   *
   * @param data - Object containing content or text to analyze
   * @returns Array of Jurisdiction objects with type, location, and context
   */
  private identifyJurisdictions(data: { content?: string; text?: string }): Jurisdiction[] {
    const text = (data.content || data.text || '');
    const jurisdictions: Jurisdiction[] = [];

    // State patterns
    const statePattern = /(?:laws?\s+of|courts?\s+of|jurisdiction\s+of)\s+(?:the\s+)?(?:state\s+of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
    const matches = text.matchAll(statePattern);

    for (const match of matches) {
      jurisdictions.push({
        type: 'state',
        location: match[1],
        context: match[0],
      });
    }

    // Country patterns
    if (/united\s+states|u\.?s\.?a\.?/i.test(text)) {
      jurisdictions.push({ type: 'country', location: 'United States', context: '' });
    }

    return jurisdictions;
  }

  /**
   * Analyze dispute resolution mechanisms in the contract.
   * Identifies arbitration, mediation, litigation provisions, waivers, and fee provisions.
   *
   * @param data - Object containing content or text to analyze
   * @returns DisputeResolution object with flags for each mechanism type
   */
  private analyzeDisputeResolution(data: { content?: string; text?: string }): DisputeResolution {
    const text = (data.content || data.text || '').toLowerCase();

    return {
      hasArbitration: /arbitrat/i.test(text),
      hasMediation: /mediat/i.test(text),
      hasLitigation: /court|litigation|lawsuit/i.test(text),
      bindingArbitration: /binding\s+arbitration/i.test(text),
      classActionWaiver: /class\s+action\s+waiver|no\s+class\s+action/i.test(text),
      juryTrialWaiver: /jury\s+trial\s+waiver|waive.*jury/i.test(text),
      escalation: /escalat/i.test(text),
      attorneysFees: /attorneys?\s+fees|legal\s+fees/i.test(text),
    };
  }

  /**
   * Check for intellectual property related clauses.
   * Identifies IP provisions, ownership clarity, work-for-hire, licenses, and assignments.
   *
   * @param data - Object containing content or text to analyze
   * @returns IPClauses object with flags for each IP provision type
   */
  private checkIPClauses(data: { content?: string; text?: string }): IPClauses {
    const text = (data.content || data.text || '').toLowerCase();

    return {
      hasIPProvisions: /intellectual\s+property|ip\s+rights/i.test(text),
      ownershipClear: /own(?:s|ership)|title\s+to/i.test(text),
      workForHire: /work\s+for\s+hire|work\s+made\s+for\s+hire/i.test(text),
      licenseGrant: /license\s+grant|grant.*license/i.test(text),
      retainRights: /retain.*rights|reserved.*rights/i.test(text),
      assignments: /assign.*rights|assignment\s+of/i.test(text),
    };
  }

  /**
   * Calculate confidence score for the legal analysis.
   * Factors in completeness of clause extraction, obligation identification,
   * risk detection, and protection analysis.
   *
   * @param analysis - The complete legal analysis result
   * @returns Confidence score between 0.6 and 1.0
   */
  private calculateLegalConfidence(analysis: LegalAnalysisResult): number {
    let confidence = 0.6;

    if (analysis.clauses.length > 5) {confidence += 0.1;}
    if (analysis.obligations.length > 0) {confidence += 0.1;}
    if (analysis.risks.length > 0) {confidence += 0.05;}
    if (analysis.protections.limitationOfLiability) {confidence += 0.05;}
    if (analysis.recommendations.length > 0) {confidence += 0.1;}

    return Math.min(1, confidence);
  }

  // New database-integrated methods

  /**
   * Extract clauses with database enhancement.
   * Uses pattern-based extraction and enriches with database insights
   * from previously extracted key terms. Limits results to MAX_CLAUSES.
   *
   * @param content - Document content to analyze
   * @param contractData - Contract data from database with extracted_key_terms
   * @returns Promise resolving to array of Clause objects with database insights
   */
  private async extractClausesWithDB(content: string, contractData: ContractData): Promise<Clause[]> {
    // Use existing extraction logic
    const clauses = this.extractClauses({ content });

    // Limit clause array size to prevent memory issues
    const limitedClauses = clauses.slice(0, LegalAgent.MAX_CLAUSES);
    if (clauses.length > LegalAgent.MAX_CLAUSES) {
      console.warn(`LegalAgent: Truncated clauses from ${clauses.length} to ${LegalAgent.MAX_CLAUSES}`);
    }

    // Enhance with database insights if available
    // Null guard: validate contractData and extracted_key_terms exist and are valid
    if (contractData &&
        contractData.extracted_key_terms &&
        typeof contractData.extracted_key_terms === 'object' &&
        Object.keys(contractData.extracted_key_terms).length > 0) {
      for (const term of Object.keys(contractData.extracted_key_terms)) {
        const existingClause = limitedClauses.find(c => c.type === term);
        const extractedKeyTerm = contractData.extracted_key_terms[term];

        // Null guard: validate the extracted key term has required properties
        if (existingClause && extractedKeyTerm && typeof extractedKeyTerm === 'object') {
          existingClause.databaseInsight = {
            source: 'contract_extraction',
            confidence: typeof extractedKeyTerm.confidence === 'number' ? extractedKeyTerm.confidence : 0,
            metadata: {
              value: extractedKeyTerm.value || '',
              type: extractedKeyTerm.type || 'other',
              ...(extractedKeyTerm.location ? { location: JSON.stringify(extractedKeyTerm.location) } : {}),
            },
          };
        }
      }
    }

    return limitedClauses;
  }

  /**
   * Check vendor's legal compliance status from database.
   * Queries recent compliance checks and returns issues for failed checks.
   *
   * @param vendorId - UUID of the vendor to check
   * @returns Promise with compliance status, issues array, and last check date
   */
  private async checkVendorLegalCompliance(vendorId: string): Promise<{ compliant: boolean; issues: ComplianceIssue[]; lastCheckDate?: string }> {
    const { data: complianceChecks } = await this.supabase
      .from('compliance_checks')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('enterprise_id', this.enterpriseId)
      .order('performed_at', { ascending: false })
      .limit(10);

    const failedChecks = complianceChecks?.filter((c: { passed?: boolean }) => !c.passed) || [];
    const issues: ComplianceIssue[] = failedChecks.map((check: {
      check_type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      performed_at: string;
      issues?: string;
    }) => ({
      type: check.check_type,
      severity: check.severity,
      description: check.issues || 'Compliance check failed',
      affectedArea: 'vendor_compliance',
      detectedDate: check.performed_at,
      status: 'open',
    }));

    return {
      compliant: failedChecks.length === 0,
      issues,
      lastCheckDate: complianceChecks?.[0]?.performed_at,
    };
  }

  /**
   * Create notification for legal team about high-risk contract.
   * Notifies legal team members or falls back to admins if no legal users exist.
   *
   * @param contractId - UUID of the contract requiring review
   * @param risk - The overall legal risk assessment
   */
  private async createLegalNotification(contractId: string, risk: OverallLegalRisk): Promise<void> {
    // Get legal team members
    const { data: legalUsers } = await this.supabase
      .from('users')
      .select('id, email')
      .eq('enterprise_id', this.enterpriseId)
      .eq('department', 'Legal')
      .eq('is_active', true);

    const notificationUsers = legalUsers || [];
    
    if (notificationUsers.length === 0) {
      // Fallback to admins
      const { data: admins } = await this.supabase
        .from('users')
        .select('id, email')
        .eq('enterprise_id', this.enterpriseId)
        .in('role', ['admin', 'owner'])
        .eq('is_active', true);

      if (admins && admins.length > 0) {
        notificationUsers.push(...admins);
      }
    }

    // Create notifications
    for (const user of notificationUsers) {
      await this.supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'legal_review_required',
          title: 'High-Risk Contract Requires Legal Review',
          message: `Contract requires immediate legal review due to ${risk.level} risk level`,
          severity: risk.level,
          data: {
            contract_id: contractId,
            risk_factors: risk.factors,
            risk_score: risk.score,
          },
          action_url: `/contracts/${contractId}/review`,
          enterprise_id: this.enterpriseId,
        });
    }
  }

  /**
   * Analyze vendor document compliance status.
   * Checks for required document types (W9, insurance, business license)
   * and identifies missing or expired documents.
   *
   * @param documents - Array of vendor documents to analyze
   * @returns Promise with completion status, missing types, expired docs, and score
   */
  private async analyzeVendorDocumentCompliance(documents: VendorDocument[]): Promise<DocumentCompliance> {
    const requiredDocTypes = ['w9', 'insurance_certificate', 'business_license'];
    const presentTypes = documents.map(d => d.document_type || d.type || '');
    const missingTypes = requiredDocTypes.filter(type => !presentTypes.includes(type));

    const expiredDocs = documents.filter(doc =>
      doc.expiration_date && new Date(doc.expiration_date) < new Date(),
    );

    return {
      complete: missingTypes.length === 0,
      missingTypes,
      expiredDocuments: expiredDocs.map(d => ({
        type: d.document_type || d.type || '',
        ...(d.expiration_date ? { expiredOn: d.expiration_date } : {}),
      })),
      score: (requiredDocTypes.length - missingTypes.length) / requiredDocTypes.length,
    };
  }

  /**
   * Check for missing required vendor documents.
   * Compares enterprise compliance requirements against vendor's uploaded documents.
   *
   * @param vendorId - UUID of the vendor to check
   * @returns Promise resolving to array of missing document type names
   */
  private async checkMissingVendorDocuments(vendorId: string): Promise<string[]> {
    // Get required documents for this enterprise
    const { data: requirements } = await this.supabase
      .from('compliance_requirements')
      .select('document_type')
      .eq('enterprise_id', this.enterpriseId)
      .eq('applies_to', 'vendor')
      .eq('is_required', true);

    // Get vendor's uploaded documents
    const { data: vendorDocs } = await this.supabase
      .from('vendor_documents')
      .select('document_type')
      .eq('vendor_id', vendorId)
      .eq('status', 'active');

    const requiredTypes = requirements?.map((r: { document_type: string }) => r.document_type) || [];
    const uploadedTypes = vendorDocs?.map((d: { document_type: string }) => d.document_type) || [];

    return requiredTypes.filter((type: string) => !uploadedTypes.includes(type));
  }

  /**
   * Validate vendor certifications from metadata.
   * Categorizes certifications as valid, expired, or expiring soon (within 30 days).
   * Includes null safety for nested metadata structures.
   *
   * @param vendorData - Vendor data object with optional certifications in metadata
   * @returns Promise with total count and categorized certification arrays
   */
  private async validateVendorCertifications(vendorData: { metadata?: { certifications?: { expiration_date?: string }[] } } | null | undefined): Promise<VendorCertifications> {
    // Null guard: validate vendorData and nested properties
    if (!vendorData || typeof vendorData !== 'object') {
      return {
        total: 0,
        valid: [],
        expired: [],
        expiringSoon: [],
      };
    }

    // Null guard: validate metadata exists and is an object
    const metadata = vendorData.metadata;
    if (!metadata || typeof metadata !== 'object') {
      return {
        total: 0,
        valid: [],
        expired: [],
        expiringSoon: [],
      };
    }

    // Null guard: validate certifications is an array
    const certifications = Array.isArray(metadata.certifications) ? metadata.certifications : [];

    const expired: { expiration_date?: string }[] = [];
    const expiringSoon: { expiration_date?: string }[] = [];
    const valid: { expiration_date?: string }[] = [];

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const cert of certifications) {
      // Null guard: validate each certification is an object
      if (!cert || typeof cert !== 'object') {
        continue;
      }

      if (cert.expiration_date && typeof cert.expiration_date === 'string') {
        const expDate = new Date(cert.expiration_date);
        // Validate the date is valid
        if (isNaN(expDate.getTime())) {
          valid.push(cert); // Treat invalid dates as valid (no expiration)
          continue;
        }

        if (expDate < now) {
          expired.push(cert);
        } else if (expDate < thirtyDaysFromNow) {
          expiringSoon.push(cert);
        } else {
          valid.push(cert);
        }
      } else {
        valid.push(cert);
      }
    }

    return {
      total: certifications.length,
      valid,
      expired,
      expiringSoon,
    };
  }

  /**
   * Generate vendor-specific compliance recommendations.
   * Addresses missing documents, expired certifications, low compliance scores,
   * and overdue compliance checks.
   *
   * @param compliance - Vendor compliance analysis result
   * @returns Array of vendor compliance recommendation strings
   */
  private generateVendorComplianceRecommendations(compliance: VendorComplianceAnalysisResult): string[] {
    const recommendations: string[] = [];

    if (compliance.missingDocuments && compliance.missingDocuments.length > 0) {
      recommendations.push(`Request the following documents from vendor: ${compliance.missingDocuments.join(', ')}`);
    }

    if (compliance.certifications.expired && compliance.certifications.expired.length > 0) {
      recommendations.push('Require vendor to renew expired certifications before contract renewal');
    }

    if (compliance.complianceScore && compliance.complianceScore < 0.7) {
      recommendations.push('Schedule comprehensive vendor compliance audit');
    }

    if (!compliance.lastCheckDate ||
        new Date(compliance.lastCheckDate) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      recommendations.push('Compliance check overdue - schedule immediately');
    }

    return recommendations;
  }

  /**
   * Update vendor's compliance score in database.
   * Calculates score based on violations and updates metadata with check timestamp.
   *
   * @param vendorId - UUID of the vendor to update
   * @param compliance - Vendor compliance analysis result
   */
  private async updateVendorComplianceScore(vendorId: string, compliance: VendorComplianceAnalysisResult): Promise<void> {
    const score = Math.max(0, 1 - ((compliance.violations?.length || 0) * 0.1));

    await this.supabase
      .from('vendors')
      .update({
        compliance_score: score,
        metadata: {
          lastComplianceCheck: new Date().toISOString(),
          complianceIssues: compliance.violations?.length || 0,
        },
      })
      .eq('id', vendorId)
      .eq('enterprise_id', this.enterpriseId);
  }

  /**
   * Identify the type of legal document from its content.
   * First uses scoring-based detection, then falls back to pattern matching.
   * Detects: NDA, MSA, SOW, purchase orders, leases, licenses, employment agreements, etc.
   *
   * @param content - Document content to analyze
   * @returns Document type string (e.g., 'nda', 'msa', 'contract')
   */
  private identifyLegalDocumentType(content: string): string {
    // Use the more accurate scoring-based detectDocumentType method
    const detectedType = this.detectDocumentType(content);

    // Map the detected type to the expected format
    if (detectedType !== 'unknown') {
      return detectedType;
    }

    // Fallback to pattern-based detection (check specific types BEFORE generic)
    const docTypePatterns: [string, RegExp][] = [
      // Most specific patterns first
      ['nda', /\b(non-?disclosure|confidentiality\s+agreement|nda)\b/i],
      ['msa', /\b(master\s+service\s+agreement|msa)\b/i],
      ['sow', /\b(statement\s+of\s+work|sow|scope\s+of\s+work)\b/i],
      ['purchase_order', /\b(purchase\s+order|p\.?o\.?)\b/i],
      ['lease', /\b(lease\s+agreement|rental\s+agreement)\b/i],
      ['license', /\b(license\s+agreement|licensing|software\s+license)\b/i],
      ['employment', /\b(employment\s+(?:agreement|contract)|offer\s+(?:of\s+)?(?:employment|letter))\b/i],
      ['partnership', /\b(partnership\s+agreement|joint\s+venture)\b/i],
      ['service_agreement', /\b(service\s+agreement|services\s+agreement)\b/i],
      // Generic 'contract' should be LAST
      ['contract', /\b(terms\s+and\s+conditions)\b/i],
    ];

    for (const [type, pattern] of docTypePatterns) {
      if (pattern.test(content)) {
        return type;
      }
    }

    return 'contract'; // Default to generic contract if has any agreement language
  }

  /**
   * Analyze Non-Disclosure Agreement specific concerns.
   * Checks for overly broad definitions, perpetual obligations, and one-way structures.
   *
   * @param content - NDA document content
   * @returns NDAAnalysisResult with mutuality status, concerns, and provisions
   */
  private async analyzeNDA(content: string): Promise<NDAAnalysisResult> {
    const concerns: NDAAnalysisResult['concerns'] = [];

    // Check for overly broad definitions
    if (/any\s+and\s+all\s+information/i.test(content)) {
      concerns.push({
        type: 'broad_definition',
        severity: 'high',
        description: 'Overly broad definition of confidential information',
      });
    }

    // Check for perpetual obligations
    if (/perpetual|indefinite|surviv/i.test(content)) {
      concerns.push({
        type: 'perpetual_obligation',
        severity: 'high',
        description: 'NDA obligations may survive indefinitely',
      });
    }

    // Check for one-way obligations
    const mutual = /mutual/i.test(content);
    const oneWay = /disclosing\s+party|receiving\s+party/i.test(content) && !mutual;

    if (oneWay) {
      concerns.push({
        type: 'one_way_nda',
        severity: 'medium',
        description: 'NDA appears to be one-way only',
      });
    }

    return {
      isMutual: mutual,
      concerns,
      hasResidualKnowledge: /residual\s+knowledge/i.test(content),
      hasReturnProvision: /return.*destroy.*information/i.test(content),
    };
  }

  /**
   * Check document against enterprise-specific legal requirements.
   * Validates required clauses and prohibited terms based on enterprise settings.
   *
   * @param data - Object containing content or text to analyze
   * @param legalSettings - Enterprise legal configuration with required/prohibited patterns
   * @returns Requirement check result with compliance status
   */
  private async checkEnterpriseSpecificRequirements(data: { content?: string; text?: string }, legalSettings: EnterpriseConfig['legal']): Promise<EnterpriseSpecificRequirementCheck> {
    const requirements: EnterpriseSpecificRequirementCheck['requirements'] = [];
    const content = data.content || data.text || '';

    // Check for required clauses based on enterprise settings
    if (legalSettings?.requiredClauses) {
      for (const clause of legalSettings.requiredClauses) {
        const found = new RegExp(clause.pattern, 'i').test(content);
        requirements.push({
          clause: clause.name,
          required: true,
          found,
          severity: (clause.severity || 'medium') as 'low' | 'medium' | 'high' | 'critical',
        });
      }
    }

    // Check for prohibited terms
    if (legalSettings?.prohibitedTerms) {
      for (const term of legalSettings.prohibitedTerms) {
        const found = new RegExp(term.pattern, 'i').test(content);
        if (found) {
          requirements.push({
            term: term.name,
            prohibited: true,
            found,
            severity: 'high',
          });
        }
      }
    }

    return {
      requirements,
      compliant: requirements.filter(r => (r.required && !r.found) || (r.prohibited && r.found)).length === 0,
    };
  }

  /**
   * Process contract approval using database function.
   * Handles approve, reject, and escalate actions with proper validation
   * and generates appropriate insights based on the action taken.
   *
   * @param contractId - UUID of the contract being processed
   * @param data - Approval data including action, comments, and conditions
   * @param context - Agent context with user ID
   * @param rulesApplied - Array to track applied rules
   * @param insights - Array to collect generated insights
   * @returns ProcessingResult with LegalAnalysisResult
   */
  private async processContractApproval(
    contractId: string,
    data: ContractApprovalData,
    context: AgentContext | undefined,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<ProcessingResult<LegalAnalysisResult>> {
    rulesApplied.push('contract_approval_processing');

    try {
      // Validate required fields
      if (!data.action || !['approve', 'reject', 'escalate'].includes(data.action)) {
        throw new Error('Invalid approval action. Must be: approve, reject, or escalate');
      }

      if (!context?.userId) {
        throw new Error('User ID required for approval actions');
      }

      // Process the approval using the database function
      const approvalResult = await this.callDatabaseFunction('process_contract_approval', {
        p_contract_id: contractId,
        p_approval_type: data.approvalType || 'legal_review',
        p_approver_id: context.userId,
        p_decision: data.action === 'approve' ? 'approved' :
                    data.action === 'reject' ? 'rejected' : 'escalated',
        p_comments: data.comments || null,
        p_conditions: data.conditions || '[]',
      });

      // Get updated contract data
      const { data: updatedContract } = await this.supabase
        .from('contracts')
        .select(`
          *,
          approvals:contract_approvals(*)
        `)
        .eq('id', contractId)
        .single();

      // Null guard: validate approvalResult has required properties
      if (!approvalResult || typeof approvalResult !== 'object') {
        throw new Error('Invalid approval result from database');
      }

      // Null guard: validate updatedContract exists
      if (!updatedContract || typeof updatedContract !== 'object') {
        throw new Error('Failed to retrieve updated contract');
      }

      // Safely extract approvals with null guard
      const safeApprovals = Array.isArray(updatedContract.approvals) ? updatedContract.approvals : [];

      const analysis: LegalAnalysisResult = {
        clauses: [],
        risks: [],
        obligations: [],
        protections: {
          limitationOfLiability: false,
          capOnDamages: false,
          rightToTerminate: false,
          disputeResolution: false,
          warrantyDisclaimer: false,
          intellectualPropertyRights: false,
          confidentialityProtection: false,
          dataProtection: false,
        },
        missingClauses: [],
        redFlags: [],
        recommendations: [],
        approvalId: approvalResult.approval_id || null,
        contractStatus: approvalResult.contract_status || 'unknown',
        decision: approvalResult.decision || data.action,
        timestamp: approvalResult.timestamp || new Date().toISOString(),
        contractData: {
          id: contractId,
          title: updatedContract.title || 'Untitled Contract',
          status: updatedContract.status || 'unknown',
          approvalsSummary: this.summarizeApprovals(safeApprovals),
        },
        nextSteps: this.determineNextSteps(approvalResult.decision || data.action, { ...updatedContract, approvals: safeApprovals }),
      };

      // Generate insights based on approval action
      if (data.action === 'approve') {
        insights.push(this.createInsight(
          'contract_approved',
          'low',
          'Contract Approved',
          'Legal review completed and contract approved',
          undefined,
          { approvalId: analysis.approvalId },
          false,
        ));

        // Check if all approvals are complete
        // Null guard: validate approvals array exists before filtering
        const approvalsList = Array.isArray(updatedContract?.approvals) ? updatedContract.approvals : [];
        const pendingApprovals = approvalsList.filter((a: Approval) => a && a.status === 'pending');
        if (pendingApprovals.length === 0) {
          insights.push(this.createInsight(
            'all_approvals_complete',
            'medium',
            'All Approvals Complete',
            'Contract has received all required approvals and can proceed',
            'Proceed with contract execution',
            { contractId },
          ));
        }
      } else if (data.action === 'reject') {
        insights.push(this.createInsight(
          'contract_rejected',
          'high',
          'Contract Rejected',
          `Legal review identified issues: ${data.comments || 'See comments for details'}`,
          'Address identified issues and resubmit for approval',
          { approvalId: analysis.approvalId, reason: data.comments },
        ));
      } else if (data.action === 'escalate') {
        insights.push(this.createInsight(
          'approval_escalated',
          'medium',
          'Approval Escalated',
          'Contract requires additional review from senior legal counsel',
          'Await escalated review decision',
          { approvalId: analysis.approvalId, escalationReason: data.comments },
        ));
      }

      // Add conditions as insights if any
      // Null guard: validate conditions is a non-empty array before processing
      if (data.conditions && Array.isArray(data.conditions) && data.conditions.length > 0 && data.conditions.every(c => typeof c === 'string')) {
        insights.push(this.createInsight(
          'approval_conditions',
          'medium',
          'Approval Has Conditions',
          `${data.conditions.length} condition(s) must be met`,
          'Ensure all conditions are satisfied before proceeding',
          { conditions: data.conditions },
        ));
      }

      return this.createResult(
        true,
        analysis,
        insights,
        rulesApplied,
        0.95,
        {
          contractId,
          approvalProcessed: true,
          action: data.action,
        },
      );

    } catch (error) {
      console.error('Contract approval processing failed:', error);

      insights.push(this.createInsight(
        'approval_failed',
        'high',
        'Approval Processing Failed',
        `Failed to process approval: ${error instanceof Error ? error.message : String(error)}`,
        'Retry approval action or contact support',
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

  /**
   * Summarize contract approval status.
   * Counts approvals by status and groups by approval type.
   *
   * @param approvals - Array of approval records (may be null/undefined)
   * @returns ApprovalSummary with totals and type-based breakdown
   */
  private summarizeApprovals(approvals: Approval[] | null | undefined): ApprovalSummary {
    // Null guard: ensure approvals is a valid array
    const safeApprovals = Array.isArray(approvals) ? approvals.filter(a => a && typeof a === 'object') : [];

    const summary = {
      total: safeApprovals.length,
      approved: safeApprovals.filter(a => a.status === 'approved').length,
      rejected: safeApprovals.filter(a => a.status === 'rejected').length,
      pending: safeApprovals.filter(a => a.status === 'pending').length,
      escalated: safeApprovals.filter(a => a.status === 'escalated').length,
      byType: {} as Record<string, { status: string; approver: string; date: string }>,
    };

    // Group by approval type
    for (const approval of safeApprovals) {
      const type = approval.approval_type;
      if (type && !summary.byType[type]) {
        summary.byType[type] = {
          status: approval.status || 'unknown',
          approver: approval.approver_name || 'Unknown',
          date: approval.updated_at || new Date().toISOString(),
        };
      }
    }

    return summary;
  }

  /**
   * Determine next steps based on approval decision.
   * Provides actionable guidance for approved, rejected, and escalated decisions.
   *
   * @param decision - The approval decision ('approved', 'rejected', 'escalated')
   * @param contract - Contract data with approvals (may be null/undefined)
   * @returns Array of next step recommendations
   */
  private determineNextSteps(decision: string | null | undefined, contract: ContractData | null | undefined): string[] {
    const nextSteps: string[] = [];

    // Null guard: validate decision
    const safeDecision = decision || 'unknown';

    // Null guard: validate contract and approvals
    const safeApprovals = Array.isArray(contract?.approvals) ? contract.approvals.filter(a => a && typeof a === 'object') : [];

    if (safeDecision === 'approved') {
      const pendingApprovals = safeApprovals.filter((a: Approval) => a.status === 'pending');
      if (pendingApprovals.length > 0) {
        nextSteps.push(`Await ${pendingApprovals.length} remaining approval(s)`);
        pendingApprovals.forEach((a: Approval) => {
          nextSteps.push(`- ${a.approval_type || 'unknown'} approval pending`);
        });
      } else {
        nextSteps.push('All approvals complete - proceed with contract execution');
        nextSteps.push('Update contract status to active');
        nextSteps.push('Notify relevant stakeholders');
      }
    } else if (safeDecision === 'rejected') {
      nextSteps.push('Review rejection comments and address issues');
      nextSteps.push('Update contract terms as needed');
      nextSteps.push('Resubmit for approval once issues are resolved');
    } else if (safeDecision === 'escalated') {
      nextSteps.push('Senior review in progress');
      nextSteps.push('Monitor escalation status');
      nextSteps.push('Prepare additional documentation if requested');
    } else {
      nextSteps.push('Review approval status');
      nextSteps.push('Contact administrator if status is unclear');
    }

    return nextSteps;
  }
}