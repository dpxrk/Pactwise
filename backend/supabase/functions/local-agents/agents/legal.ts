import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
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

  async process(data: LegalAgentProcessData, context?: AgentContext): Promise<ProcessingResult<LegalAnalysisResult>> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];

    try {
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

    // Perform local analysis with content
    const analysis: LegalAnalysisResult = {
      clauses: await this.extractClausesWithDB(content, contractData),
      risks: this.assessLegalRisks({ content }),
      obligations: this.extractObligations({ content }),
      protections: this.identifyProtections({ content }),
      missingClauses: this.checkMissingClauses({ content }),
      redFlags: this.identifyRedFlags({ content }),
      approvalStatus: contractData.approvals || [],
      vendorRisk: contractData.vendor?.performance_score ?? null,
      databaseRisks: dbAnalysis?.risks as DatabaseRisk[] || [],
      recommendations: [] as string[],
    };

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

  // Legal analysis methods
  private extractClauses(data: { content?: string; text?: string }): Clause[] {
    const text = (data.content || data.text || '').toLowerCase();
    const clauses: Clause[] = [];

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
        const startIdx = Math.max(0, match.index! - 100);
        const endIdx = Math.min(text.length, match.index! + match[0].length + 200);
        const context = text.substring(startIdx, endIdx);

        const clause = clauseDef.extract(match[0], context);
        clauses.push(clause as Clause);
      }
    }

    return clauses;
  }

  private assessLegalRisks(data: { content?: string; text?: string }): LegalRisk[] {
    const risks: LegalRisk[] = [];
    const text = (data.content || data.text || '').toLowerCase();

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
        pattern: /no\s+right\s+to\s+(?:terminate|cancel)|may\s+not\s+terminate/i,
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

  private extractObligations(data: { content?: string; text?: string }): Obligation[] {
    const text = (data.content || data.text || '');
    const obligations: Obligation[] = [];

    // Obligation patterns
    const patterns = [
      /(?:shall|must|will|agrees?\s+to)\s+(?:not\s+)?([a-z\s]{10,50})/gi,
      /(?:obligat(?:ed|ion)|requir(?:ed|ement)|responsib(?:le|ility))\s+(?:to|for)\s+([a-z\s]{10,50})/gi,
      /(?:covenant|undertake|commit)\s+(?:to|that)\s+([a-z\s]{10,50})/gi,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);

      for (const match of matches) {
        const obligation = match[1].trim();
        if (obligation.length > 10 && obligation.split(' ').length > 2) {
          obligations.push({
            text: obligation,
            type: this.classifyObligation(match[0]),
            party: this.identifyObligatedParty(match[0], text),
          });
        }
      }
    }

    // Deduplicate similar obligations
    return this.deduplicateObligations(obligations);
  }

  private identifyProtections(data: { content?: string; text?: string }): Protection {
    const text = (data.content || data.text || '').toLowerCase();
    const protections = {
      limitationOfLiability: false,
      capOnDamages: false,
      rightToTerminate: false,
      disputeResolution: false,
      warrantyDisclaimer: false,
      intellectualPropertyRights: false,
      confidentialityProtection: false,
      dataProtection: false,
    };

    // Check for protective clauses
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

  private checkMissingClauses(data: { content?: string; text?: string }): MissingClause[] {
    const text = (data.content || data.text || '').toLowerCase();
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

  private identifyRedFlags(data: { content?: string; text?: string }): RedFlag[] {
    const text = (data.content || data.text || '');
    const redFlags: RedFlag[] = [];

    // Red flag patterns
    const patterns: Array<{
      pattern: RegExp;
      flag: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
    }> = [
      {
        pattern: /in\s+perpetuity|forever|permanent(?:ly)?/i,
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

  private assessIndemnificationRisk(context: string): string {

    if (/mutual/i.test(context)) {return 'medium';}
    if (/any\s+and\s+all/i.test(context)) {return 'high';}
    if (/third\s+party/i.test(context)) {return 'medium';}
    if (/breach.*agreement/i.test(context)) {return 'low';}

    return 'medium';
  }

  private assessWarrantyRisk(context: string): string {

    if (/disclaim|as\s+is|without\s+warrant/i.test(context)) {return 'high';}
    if (/limited\s+warrant/i.test(context)) {return 'medium';}
    if (/full\s+warrant/i.test(context)) {return 'low';}

    return 'medium';
  }

  private assessDisputeRisk(context: string): string {

    if (/binding\s+arbitration/i.test(context)) {return 'high';}
    if (/waive.*jury/i.test(context)) {return 'high';}
    if (/mediation\s+first/i.test(context)) {return 'low';}

    return 'medium';
  }

  private classifyObligation(text: string): string {
    const lower = text.toLowerCase();

    if (/pay|payment/i.test(lower)) {return 'payment';}
    if (/deliver|provide/i.test(lower)) {return 'delivery';}
    if (/maintain|support/i.test(lower)) {return 'maintenance';}
    if (/confidential|not\s+disclose/i.test(lower)) {return 'confidentiality';}
    if (/comply|regulation/i.test(lower)) {return 'compliance';}

    return 'general';
  }

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

  private deduplicateObligations(obligations: Obligation[]): Obligation[] {
    const unique: Obligation[] = [];
    const seen = new Set<string>();

    for (const obligation of obligations) {
      const key = obligation.text.toLowerCase().substring(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(obligation);
      }
    }

    return unique;
  }

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

    // Based on obligations
    const oneWayObligations = analysis.obligations.filter((o: Obligation) =>
      o.party !== 'both' && o.party !== 'vendor',
    ).length;

    if (oneWayObligations > 3) {
      recommendations.push('Balance obligations between parties');
    }

    return recommendations;
  }

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
  private async extractClausesWithDB(content: string, contractData: ContractData): Promise<Clause[]> {
    // Use existing extraction logic
    const clauses = this.extractClauses({ content });

    // Enhance with database insights if available
    if (contractData.extracted_key_terms) {
      for (const term of Object.keys(contractData.extracted_key_terms)) {
        const existingClause = clauses.find(c => c.type === term);
        if (existingClause && contractData.extracted_key_terms[term]) {
          const extractedKeyTerm = contractData.extracted_key_terms[term];
          existingClause.databaseInsight = {
            source: 'contract_extraction',
            confidence: extractedKeyTerm.confidence,
            metadata: {
              value: extractedKeyTerm.value,
              type: extractedKeyTerm.type || 'other',
              ...(extractedKeyTerm.location ? { location: JSON.stringify(extractedKeyTerm.location) } : {}),
            },
          };
        }
      }
    }

    return clauses;
  }

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

  private async validateVendorCertifications(vendorData: { metadata?: { certifications?: { expiration_date?: string }[] } }): Promise<VendorCertifications> {
    const certifications = vendorData.metadata?.certifications || [];
    const expired: { expiration_date?: string }[] = [];
    const expiringSoon: { expiration_date?: string }[] = [];
    const valid: { expiration_date?: string }[] = [];

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const cert of certifications) {
      if (cert.expiration_date) {
        const expDate = new Date(cert.expiration_date);
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

  private identifyLegalDocumentType(content: string): string {
    const docTypePatterns = {
      'contract': /\b(agreement|contract|terms\s+and\s+conditions)\b/i,
      'nda': /\b(non-?disclosure|confidentiality\s+agreement|nda)\b/i,
      'msa': /\b(master\s+service\s+agreement|msa)\b/i,
      'sow': /\b(statement\s+of\s+work|sow|scope\s+of\s+work)\b/i,
      'purchase_order': /\b(purchase\s+order|p\.?o\.?)\b/i,
      'lease': /\b(lease\s+agreement|rental\s+agreement)\b/i,
      'license': /\b(license\s+agreement|licensing)\b/i,
      'employment': /\b(employment\s+agreement|offer\s+letter)\b/i,
      'partnership': /\b(partnership\s+agreement|joint\s+venture)\b/i,
    };

    for (const [type, pattern] of Object.entries(docTypePatterns)) {
      if (pattern.test(content)) {
        return type;
      }
    }

    return 'other';
  }

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

  // New method to process contract approvals using the database function
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
        approvalId: approvalResult.approval_id,
        contractStatus: approvalResult.contract_status,
        decision: approvalResult.decision,
        timestamp: approvalResult.timestamp,
        contractData: {
          id: contractId,
          title: updatedContract.title,
          status: updatedContract.status,
          approvalsSummary: this.summarizeApprovals(updatedContract.approvals),
        },
        nextSteps: this.determineNextSteps(approvalResult.decision, updatedContract),
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
        const pendingApprovals = updatedContract.approvals.filter((a: Approval) => a.status === 'pending');
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
      if (data.conditions && Array.isArray(data.conditions) && data.conditions.length > 0) {
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

  private summarizeApprovals(approvals: Approval[]): ApprovalSummary {
    const summary = {
      total: approvals.length,
      approved: approvals.filter(a => a.status === 'approved').length,
      rejected: approvals.filter(a => a.status === 'rejected').length,
      pending: approvals.filter(a => a.status === 'pending').length,
      escalated: approvals.filter(a => a.status === 'escalated').length,
      byType: {} as Record<string, { status: string; approver: string; date: string }>,
    };

    // Group by approval type
    for (const approval of approvals) {
      const type = approval.approval_type;
      if (!summary.byType[type]) {
        summary.byType[type] = {
          status: approval.status,
          approver: approval.approver_name || 'Unknown',
          date: approval.updated_at,
        };
      }
    }

    return summary;
  }

  private determineNextSteps(decision: string, contract: ContractData): string[] {
    const nextSteps = [];

    if (decision === 'approved') {
      const pendingApprovals = contract.approvals.filter((a: Approval) => a.status === 'pending');
      if (pendingApprovals.length > 0) {
        nextSteps.push(`Await ${pendingApprovals.length} remaining approval(s)`);
        pendingApprovals.forEach((a: Approval) => {
          nextSteps.push(`- ${a.approval_type} approval pending`);
        });
      } else {
        nextSteps.push('All approvals complete - proceed with contract execution');
        nextSteps.push('Update contract status to active');
        nextSteps.push('Notify relevant stakeholders');
      }
    } else if (decision === 'rejected') {
      nextSteps.push('Review rejection comments and address issues');
      nextSteps.push('Update contract terms as needed');
      nextSteps.push('Resubmit for approval once issues are resolved');
    } else if (decision === 'escalated') {
      nextSteps.push('Senior review in progress');
      nextSteps.push('Monitor escalation status');
      nextSteps.push('Prepare additional documentation if requested');
    }

    return nextSteps;
  }
}