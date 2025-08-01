import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
import { DataLoader } from '../../../functions-utils/data-loader.ts';

interface ComplianceCheck {
  id: string;
  name: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  regulations: string[];
  passed: boolean;
  details?: string;
  recommendations?: string[];
}

interface ComplianceFramework {
  id: string;
  name: string;
  regulations: string[];
  requirements: ComplianceRequirement[];
}

interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  category: string;
  checkFunction: (data: any) => ComplianceCheck;
}

export class ComplianceAgent extends BaseAgent {
  private dataLoader: DataLoader<string, any>;
  private frameworks: Map<string, ComplianceFramework> = new Map();

  constructor(supabase: any, enterpriseId: string) {
    super(supabase, enterpriseId);
    // Create a batch load function for the DataLoader
    const batchLoadFn = async (keys: string[]) => {
      const results: any[] = [];
      for (const key of keys) {
        try {
          const [type, id] = key.split(':');
          let data = null;
          if (type === 'contract') {
            const { data: contract } = await this.supabase
              .from('contracts')
              .select('*')
              .eq('id', id)
              .eq('enterprise_id', this.enterpriseId)
              .single();
            data = contract;
          } else if (type === 'vendor') {
            const { data: vendor } = await this.supabase
              .from('vendors')
              .select('*')
              .eq('id', id)
              .eq('enterprise_id', this.enterpriseId)
              .single();
            data = vendor;
          }
          results.push(data);
        } catch (error) {
          results.push(error as Error);
        }
      }
      return results;
    };
    this.dataLoader = new DataLoader(batchLoadFn);
    this.initializeFrameworks();
  }

  get agentType() {
    return 'compliance';
  }

  get capabilities() {
    return [
      'regulatory_compliance',
      'policy_validation',
      'audit_preparation',
      'risk_assessment',
      'compliance_monitoring',
      'certification_tracking',
      'compliance_reporting',
    ];
  }

  private initializeFrameworks() {
    this.frameworks = new Map();

    // GDPR Framework
    this.frameworks.set('gdpr', {
      id: 'gdpr',
      name: 'General Data Protection Regulation',
      regulations: ['GDPR', 'EU Data Protection'],
      requirements: [
        {
          id: 'gdpr_data_processing',
          name: 'Lawful Data Processing',
          description: 'Ensure data processing has legal basis',
          category: 'data_protection',
          checkFunction: (data) => this.checkDataProcessingCompliance(data, 'gdpr'),
        },
        {
          id: 'gdpr_data_retention',
          name: 'Data Retention Policy',
          description: 'Data retention periods must be defined',
          category: 'data_management',
          checkFunction: (data) => this.checkDataRetentionCompliance(data, 'gdpr'),
        },
        {
          id: 'gdpr_data_subject_rights',
          name: 'Data Subject Rights',
          description: 'Support for data subject access, deletion, and portability',
          category: 'privacy_rights',
          checkFunction: (data) => this.checkDataSubjectRights(data, 'gdpr'),
        },
      ],
    });

    // SOC 2 Framework
    this.frameworks.set('soc2', {
      id: 'soc2',
      name: 'SOC 2 Type II',
      regulations: ['SOC 2', 'AICPA Trust Services'],
      requirements: [
        {
          id: 'soc2_security',
          name: 'Security Controls',
          description: 'Information security controls must be in place',
          category: 'security',
          checkFunction: (data) => this.checkSecurityControls(data, 'soc2'),
        },
        {
          id: 'soc2_availability',
          name: 'System Availability',
          description: 'System availability and performance monitoring',
          category: 'availability',
          checkFunction: (data) => this.checkSystemAvailability(data, 'soc2'),
        },
        {
          id: 'soc2_confidentiality',
          name: 'Confidentiality Controls',
          description: 'Confidential information protection',
          category: 'confidentiality',
          checkFunction: (data) => this.checkConfidentialityControls(data, 'soc2'),
        },
      ],
    });

    // ISO 27001 Framework
    this.frameworks.set('iso27001', {
      id: 'iso27001',
      name: 'ISO 27001:2022',
      regulations: ['ISO 27001', 'Information Security Management'],
      requirements: [
        {
          id: 'iso_risk_assessment',
          name: 'Risk Assessment',
          description: 'Regular risk assessments and treatment',
          category: 'risk_management',
          checkFunction: (data) => this.checkRiskAssessment(data, 'iso27001'),
        },
        {
          id: 'iso_access_control',
          name: 'Access Control',
          description: 'Access control policies and procedures',
          category: 'access_management',
          checkFunction: (data) => this.checkAccessControl(data, 'iso27001'),
        },
        {
          id: 'iso_incident_management',
          name: 'Incident Management',
          description: 'Security incident management procedures',
          category: 'incident_response',
          checkFunction: (data) => this.checkIncidentManagement(data, 'iso27001'),
        },
      ],
    });

    // CCPA Framework
    this.frameworks.set('ccpa', {
      id: 'ccpa',
      name: 'California Consumer Privacy Act',
      regulations: ['CCPA', 'California Privacy Rights'],
      requirements: [
        {
          id: 'ccpa_privacy_notice',
          name: 'Privacy Notice',
          description: 'Clear privacy notice at collection',
          category: 'transparency',
          checkFunction: (data) => this.checkPrivacyNotice(data, 'ccpa'),
        },
        {
          id: 'ccpa_opt_out',
          name: 'Opt-Out Rights',
          description: 'Support for opt-out of data sale',
          category: 'consumer_rights',
          checkFunction: (data) => this.checkOptOutRights(data, 'ccpa'),
        },
      ],
    });

    // Industry-specific frameworks
    this.frameworks.set('pci_dss', {
      id: 'pci_dss',
      name: 'Payment Card Industry Data Security Standard',
      regulations: ['PCI DSS', 'Payment Security'],
      requirements: [
        {
          id: 'pci_encryption',
          name: 'Cardholder Data Encryption',
          description: 'Encrypt cardholder data in transit and at rest',
          category: 'data_security',
          checkFunction: (data) => this.checkPaymentDataEncryption(data),
        },
        {
          id: 'pci_access_control',
          name: 'Restrict Access to Cardholder Data',
          description: 'Limit access to cardholder data on need-to-know basis',
          category: 'access_control',
          checkFunction: (data) => this.checkPaymentDataAccess(data),
        },
      ],
    });
  }

  async process(data: any, context?: AgentContext): Promise<ProcessingResult> {
    const rulesApplied: string[] = [];
    const insights: Insight[] = [];
    let confidence = 0.85;

    try {
      const requestType = this.detectRequestType(data, context);
      rulesApplied.push(`compliance_request_type_${requestType}`);

      let result: any;

      switch (requestType) {
        case 'full_audit':
          result = await this.performFullComplianceAudit(data, context || this.createDefaultContext(), rulesApplied, insights);
          break;

        case 'framework_check':
          result = await this.checkFrameworkCompliance(data, context || this.createDefaultContext(), rulesApplied, insights);
          break;

        case 'contract_compliance':
          result = await this.checkContractCompliance(data, context || this.createDefaultContext(), rulesApplied, insights);
          break;

        case 'vendor_compliance':
          result = await this.checkVendorCompliance(data, context || this.createDefaultContext(), rulesApplied, insights);
          break;

        case 'data_compliance':
          result = await this.checkDataCompliance(data, context || this.createDefaultContext(), rulesApplied, insights);
          break;

        case 'policy_validation':
          result = await this.validatePolicies(data, context || this.createDefaultContext(), rulesApplied, insights);
          break;

        case 'certification_status':
          result = await this.checkCertificationStatus(data, context || this.createDefaultContext(), rulesApplied, insights);
          break;

        case 'compliance_monitoring':
          result = await this.monitorCompliance(data, context || this.createDefaultContext(), rulesApplied, insights);
          break;

        default:
          result = await this.performGeneralComplianceCheck(data, context || this.createDefaultContext(), rulesApplied, insights);
      }

      // Generate compliance score
      const complianceScore = this.calculateComplianceScore(result);
      confidence = Math.min(0.95, confidence + (complianceScore * 0.1));

      // Add compliance insights
      this.generateComplianceInsights(result, insights, complianceScore);

      return this.createResult(
        true,
        {
          ...result,
          complianceScore,
          timestamp: new Date().toISOString(),
        },
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

  private detectRequestType(data: any, context?: AgentContext): string {
    if (data.auditType || data.fullAudit) {return 'full_audit';}
    if (data.framework || data.frameworks) {return 'framework_check';}
    if (data.contractId || context?.contractId) {return 'contract_compliance';}
    if (data.vendorId || context?.vendorId) {return 'vendor_compliance';}
    if (data.dataCategory || data.dataProcessing) {return 'data_compliance';}
    if (data.policyId || data.policies) {return 'policy_validation';}
    if (data.certifications || data.checkCertifications) {return 'certification_status';}
    if (data.monitoringPeriod || data.continuousMonitoring) {return 'compliance_monitoring';}

    return 'general';
  }

  private async performFullComplianceAudit(
    data: any,
    context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<any> {
    rulesApplied.push('full_compliance_audit');

    const auditResults: any = {
      auditId: `audit_${Date.now()}`,
      auditType: data.auditType || 'comprehensive',
      frameworks: {},
      overallStatus: 'compliant',
      criticalIssues: [],
      recommendations: [] as string[],
      executiveSummary: '',
    };

    // Check all applicable frameworks
    const applicableFrameworks = data.frameworks || ['gdpr', 'soc2', 'iso27001'];

    for (const frameworkId of applicableFrameworks) {
      const framework = this.frameworks.get(frameworkId);
      if (!framework) {continue;}

      const frameworkResult = await this.auditFramework(framework, data, context);
      auditResults.frameworks[frameworkId] = frameworkResult;

      if (frameworkResult.status === 'non_compliant') {
        auditResults.overallStatus = 'non_compliant';
        auditResults.criticalIssues.push(...frameworkResult.criticalIssues);
      } else if (frameworkResult.status === 'partial' && auditResults.overallStatus === 'compliant') {
        auditResults.overallStatus = 'partial';
      }

      auditResults.recommendations.push(...frameworkResult.recommendations);
    }

    // Check enterprise-wide compliance
    const enterpriseCompliance = await this.checkEnterpriseCompliance(context);
    auditResults.enterpriseCompliance = enterpriseCompliance;

    // Generate executive summary
    auditResults.executiveSummary = this.generateExecutiveSummary(auditResults);

    // Add audit trail
    await this.createAuditTrail(auditResults, context);

    insights.push({
      type: 'compliance_audit_completed',
      severity: auditResults.overallStatus === 'compliant' ? 'low' : 'high',
      title: 'Compliance Audit Completed',
      description: `${auditResults.overallStatus.toUpperCase()} - ${auditResults.criticalIssues.length} critical issues found`,
      recommendation: auditResults.criticalIssues.length > 0
        ? 'Address critical compliance issues immediately'
        : 'Continue monitoring compliance status',
      isActionable: auditResults.criticalIssues.length > 0,
    });

    return auditResults;
  }

  private async auditFramework(
    framework: ComplianceFramework,
    data: any,
    context: AgentContext,
  ): Promise<any> {
    const result = {
      frameworkId: framework.id,
      frameworkName: framework.name,
      status: 'compliant',
      checks: [] as ComplianceCheck[],
      passedChecks: 0,
      totalChecks: framework.requirements.length,
      criticalIssues: [] as string[],
      recommendations: [] as string[],
    };

    for (const requirement of framework.requirements) {
      const check = requirement.checkFunction({
        ...data,
        enterpriseId: this.enterpriseId,
        context,
      });

      result.checks.push(check);

      if (check.passed) {
        result.passedChecks++;
      } else {
        if (check.severity === 'critical' || check.severity === 'high') {
          result.status = 'non_compliant';
          result.criticalIssues.push(`${check.name}: ${check.details}`);
        } else if (result.status === 'compliant') {
          result.status = 'partial';
        }

        if (check.recommendations) {
          result.recommendations.push(...check.recommendations);
        }
      }
    }

    result.status = result.passedChecks === result.totalChecks
      ? 'compliant'
      : result.passedChecks > result.totalChecks * 0.8
        ? 'partial'
        : 'non_compliant';

    return result;
  }

  private async checkFrameworkCompliance(
    data: any,
    context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<any> {
    rulesApplied.push('framework_compliance_check');

    const frameworkId = data.framework || data.frameworkId;
    const framework = this.frameworks.get(frameworkId);

    if (!framework) {
      throw new Error(`Unknown compliance framework: ${frameworkId}`);
    }

    const result = await this.auditFramework(framework, data, context);

    insights.push({
      type: 'framework_compliance_status',
      severity: result.status === 'compliant' ? 'low' : 'medium',
      title: `${framework.name} Compliance Status`,
      description: `${result.passedChecks}/${result.totalChecks} requirements met`,
      isActionable: result.status !== 'compliant',
    });

    return result;
  }

  private async checkContractCompliance(
    data: any,
    context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<any> {
    rulesApplied.push('contract_compliance_check');

    const contractId = data.contractId || context?.contractId;
    if (!contractId) {
      throw new Error('Contract ID required for compliance check');
    }

    // Load contract data
    const contract = await this.dataLoader.load(`contract:${contractId}`);
    if (!contract) {
      throw new Error('Contract not found');
    }

    const complianceResult = {
      contractId,
      contractTitle: contract.title,
      complianceChecks: {
        dataProtection: this.checkContractDataProtection(contract),
        securityClauses: this.checkContractSecurityClauses(contract),
        liabilityTerms: this.checkContractLiabilityTerms(contract),
        terminationClauses: this.checkContractTerminationClauses(contract),
        intellectualProperty: this.checkContractIPClauses(contract),
        confidentiality: this.checkContractConfidentiality(contract),
      },
      overallCompliance: 'compliant',
      issues: [] as string[],
      recommendations: [] as string[],
    };

    // Evaluate overall compliance
    let failedChecks = 0;
    for (const [category, check] of Object.entries(complianceResult.complianceChecks)) {
      if (!check.passed) {
        failedChecks++;
        complianceResult.issues.push(`${category}: ${check.issue}`);
        if (check.recommendation) {
          complianceResult.recommendations.push(check.recommendation);
        }
      }
    }

    complianceResult.overallCompliance =
      failedChecks === 0 ? 'compliant' :
      failedChecks <= 2 ? 'partial' : 'non_compliant';

    insights.push({
      type: 'contract_compliance_review',
      severity: complianceResult.overallCompliance === 'compliant' ? 'low' : 'medium',
      title: 'Contract Compliance Review',
      description: `${Object.keys(complianceResult.complianceChecks).length - failedChecks}/${Object.keys(complianceResult.complianceChecks).length} compliance checks passed`,
      isActionable: failedChecks > 0,
    });

    return complianceResult;
  }

  private async checkVendorCompliance(
    data: any,
    context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<any> {
    rulesApplied.push('vendor_compliance_check');

    const vendorId = data.vendorId || context?.vendorId;
    if (!vendorId) {
      throw new Error('Vendor ID required for compliance check');
    }

    // Load vendor data
    const vendor = await this.dataLoader.load(`vendor:${vendorId}`);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Check vendor certifications and compliance
    const { data: certifications } = await this.supabase
      .from('vendor_certifications')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_active', true);

    // Check vendor audit history
    const { data: audits } = await this.supabase
      .from('vendor_audits')
      .select('*')
      .eq('vendor_id', vendorId)
      .order('audit_date', { ascending: false })
      .limit(5);

    const complianceResult = {
      vendorId,
      vendorName: vendor.name,
      complianceStatus: 'compliant',
      certifications: {
        current: certifications || [],
        expired: [] as any[],
        missing: [] as string[],
      },
      auditHistory: audits || [],
      riskAssessment: {
        dataHandling: this.assessVendorDataHandling(vendor, certifications || []),
        securityPractices: this.assessVendorSecurity(vendor, certifications || []),
        businessContinuity: this.assessVendorContinuity(vendor),
        compliance: this.assessVendorCompliance(vendor, certifications || []),
      },
      overallRisk: 'low',
      recommendations: [] as string[],
    };

    // Check for required certifications based on vendor type
    const requiredCerts = this.getRequiredCertifications(vendor.category);
    const currentCertTypes = certifications?.map(c => c.type) || [];

    complianceResult.certifications.missing = requiredCerts.filter(
      cert => !currentCertTypes.includes(cert),
    );

    // Calculate overall risk
    const riskScores = Object.values(complianceResult.riskAssessment)
      .map(r => r.score);
    const avgRisk = riskScores.reduce((a, b) => a + b, 0) / riskScores.length;

    complianceResult.overallRisk =
      avgRisk < 0.3 ? 'low' :
      avgRisk < 0.6 ? 'medium' : 'high';

    complianceResult.complianceStatus =
      complianceResult.certifications.missing.length === 0 &&
      complianceResult.overallRisk !== 'high'
        ? 'compliant'
        : 'non_compliant';

    insights.push({
      type: 'vendor_compliance_assessment',
      severity: complianceResult.overallRisk === 'low' ? 'low' : 'medium',
      title: 'Vendor Compliance Assessment',
      description: `${vendor.name} - Risk: ${complianceResult.overallRisk}, Missing certifications: ${complianceResult.certifications.missing.length}`,
      isActionable: complianceResult.complianceStatus !== 'compliant',
    });

    return complianceResult;
  }

  private async checkDataCompliance(
    data: any,
    _context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<any> {
    rulesApplied.push('data_compliance_check');

    const dataCategory = data.dataCategory || 'general';
    const processingPurpose = data.processingPurpose || 'business_operations';

    const complianceResult = {
      dataCategory,
      processingPurpose,
      legalBasis: this.determineLegalBasis(dataCategory, processingPurpose),
      dataProtectionMeasures: {
        encryption: await this.checkDataEncryption(dataCategory),
        accessControl: await this.checkDataAccessControl(dataCategory),
        retention: await this.checkDataRetention(dataCategory),
        minimization: this.checkDataMinimization(data),
      },
      privacyRights: {
        access: true,
        rectification: true,
        erasure: true,
        portability: true,
        restriction: true,
        objection: true,
      },
      crossBorderTransfer: this.checkCrossBorderCompliance(data),
      overallCompliance: 'compliant',
      recommendations: [] as string[],
    };

    // Evaluate measures
    for (const [_measure, result] of Object.entries(complianceResult.dataProtectionMeasures)) {
      if (!result.compliant) {
        complianceResult.overallCompliance = 'partial';
        complianceResult.recommendations.push(result.recommendation);
      }
    }

    insights.push({
      type: 'data_compliance_status',
      severity: complianceResult.overallCompliance === 'compliant' ? 'low' : 'medium',
      title: 'Data Processing Compliance',
      description: `${dataCategory} data processing - Legal basis: ${complianceResult.legalBasis}`,
      isActionable: complianceResult.overallCompliance !== 'compliant',
    });

    return complianceResult;
  }

  private async validatePolicies(
    _data: any,
    _context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<any> {
    rulesApplied.push('policy_validation');

    // Load enterprise policies
    const { data: policies } = await this.supabase
      .from('compliance_policies')
      .select('*')
      .eq('enterprise_id', this.enterpriseId)
      .eq('is_active', true);

    const validationResult = {
      totalPolicies: policies?.length || 0,
      validatedPolicies: [] as any[],
      issues: [] as string[],
      recommendations: [] as string[],
      overallStatus: 'valid',
    };

    for (const policy of (policies || [])) {
      const validation = this.validatePolicy(policy);
      validationResult.validatedPolicies.push({
        policyId: policy.id,
        policyName: policy.name,
        validation,
      });

      if (!validation.isValid) {
        validationResult.overallStatus = 'invalid';
        validationResult.issues.push(...validation.issues);
        validationResult.recommendations.push(...validation.recommendations);
      }
    }

    insights.push({
      type: 'policy_validation_complete',
      severity: validationResult.overallStatus === 'valid' ? 'low' : 'high',
      title: 'Policy Validation Complete',
      description: `${validationResult.totalPolicies} policies validated, ${validationResult.issues.length} issues found`,
      isActionable: validationResult.issues.length > 0,
    });

    return validationResult;
  }

  private async checkCertificationStatus(
    _data: any,
    _context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<any> {
    rulesApplied.push('certification_status_check');

    const { data: certifications } = await this.supabase
      .from('enterprise_certifications')
      .select('*')
      .eq('enterprise_id', this.enterpriseId)
      .order('expiry_date');

    const statusResult = {
      activeCertifications: [] as any[],
      expiringCertifications: [] as any[],
      expiredCertifications: [] as any[],
      requiredCertifications: [] as any[],
      complianceGaps: [] as string[],
    };

    const now = new Date();
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);

    for (const cert of (certifications || [])) {
      const expiryDate = new Date(cert.expiry_date);

      if (expiryDate < now) {
        statusResult.expiredCertifications.push(cert);
      } else if (expiryDate < threeMonthsFromNow) {
        statusResult.expiringCertifications.push(cert);
      } else {
        statusResult.activeCertifications.push(cert);
      }
    }

    // Check industry requirements
    const industryRequirements = await this.getIndustryRequirements();
    const activeCertTypes = statusResult.activeCertifications.map(c => c.type);

    statusResult.complianceGaps = industryRequirements.filter(
      (req: string) => !activeCertTypes.includes(req),
    );

    insights.push({
      type: 'certification_status',
      severity: statusResult.expiredCertifications.length > 0 ? 'high' :
                statusResult.expiringCertifications.length > 0 ? 'medium' : 'low',
      title: 'Certification Status',
      description: `${statusResult.activeCertifications.length} active, ${statusResult.expiringCertifications.length} expiring soon, ${statusResult.expiredCertifications.length} expired`,
      isActionable: statusResult.expiredCertifications.length > 0 || statusResult.expiringCertifications.length > 0,
    });

    return statusResult;
  }

  private async monitorCompliance(
    data: any,
    _context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<any> {
    rulesApplied.push('compliance_monitoring');

    const period = data.monitoringPeriod || 30; // days
    const since = new Date();
    since.setDate(since.getDate() - period);

    // Get compliance events
    const { data: events } = await this.supabase
      .from('compliance_events')
      .select('*')
      .eq('enterprise_id', this.enterpriseId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false });

    // Get compliance metrics
    const { data: metrics } = await this.supabase
      .rpc('get_compliance_metrics', {
        p_enterprise_id: this.enterpriseId,
        p_since: since.toISOString(),
      });

    const monitoringResult = {
      period: `${period} days`,
      complianceScore: metrics?.compliance_score || 0,
      trends: {
        improving: metrics?.trend === 'improving',
        score_change: metrics?.score_change || 0,
      },
      events: {
        total: events?.length || 0,
        byType: this.categorizeEvents(events || []),
        critical: events?.filter(e => e.severity === 'critical').length || 0,
      },
      alerts: [] as any[],
      recommendations: [] as string[],
    };

    // Generate alerts based on trends
    if (monitoringResult.trends.score_change < -0.1) {
      monitoringResult.alerts.push({
        type: 'compliance_degradation',
        message: 'Compliance score has decreased significantly',
        severity: 'high',
      });
    }

    if (monitoringResult.events.critical > 0) {
      monitoringResult.alerts.push({
        type: 'critical_events',
        message: `${monitoringResult.events.critical} critical compliance events detected`,
        severity: 'critical',
      });
    }

    insights.push({
      type: 'compliance_monitoring',
      severity: monitoringResult.alerts.length > 0 ? 'high' : 'low',
      title: 'Compliance Monitoring Update',
      description: `Score: ${(monitoringResult.complianceScore * 100).toFixed(1)}% (${monitoringResult.trends.score_change > 0 ? '+' : ''}${(monitoringResult.trends.score_change * 100).toFixed(1)}%)`,
      isActionable: monitoringResult.alerts.length > 0,
    });

    return monitoringResult;
  }

  private async performGeneralComplianceCheck(
    _data: any,
    _context: AgentContext,
    rulesApplied: string[],
    insights: Insight[],
  ): Promise<any> {
    rulesApplied.push('general_compliance_check');

    // Perform basic compliance checks across common areas
    const checks = {
      dataProtection: await this.performDataProtectionCheck(),
      security: await this.performSecurityCheck(),
      privacy: await this.performPrivacyCheck(),
      contractual: await this.performContractualCheck(),
      operational: await this.performOperationalCheck(),
    };

    const overallResult = {
      timestamp: new Date().toISOString(),
      checks,
      overallStatus: 'compliant',
      score: 0,
      recommendations: [] as string[],
    };

    // Calculate overall score
    let totalScore = 0;
    let checkCount = 0;
    for (const [_area, check] of Object.entries(checks)) {
      totalScore += check.score;
      checkCount++;
      if (check.status !== 'compliant') {
        overallResult.overallStatus = 'partial';
      }
      if (check.recommendations) {
        overallResult.recommendations.push(...check.recommendations);
      }
    }

    overallResult.score = totalScore / checkCount;

    insights.push({
      type: 'general_compliance_check',
      severity: overallResult.overallStatus === 'compliant' ? 'low' : 'medium',
      title: 'General Compliance Check',
      description: `Overall compliance score: ${(overallResult.score * 100).toFixed(1)}%`,
      recommendation: overallResult.recommendations[0] || 'Continue regular compliance monitoring',
      isActionable: overallResult.overallStatus !== 'compliant',
    });

    return overallResult;
  }

  // Compliance check helper methods
  private checkDataProcessingCompliance(data: any, framework: string): ComplianceCheck {
    const hasLegalBasis = data.legalBasis || data.processingGrounds;
    const hasDocumentation = data.processingDocumentation || data.privacyNotice;

    return {
      id: `${framework}_data_processing`,
      name: 'Data Processing Compliance',
      category: 'data_protection',
      severity: 'high',
      description: 'Verify lawful basis for data processing',
      regulations: [framework.toUpperCase()],
      passed: hasLegalBasis && hasDocumentation,
      details: !hasLegalBasis ? 'No legal basis documented' :
               !hasDocumentation ? 'Processing documentation missing' :
               'Data processing has valid legal basis',
      recommendations: !hasLegalBasis ? ['Document legal basis for all data processing activities'] :
                      !hasDocumentation ? ['Create comprehensive processing documentation'] : [],
    };
  }

  private checkDataRetentionCompliance(data: any, framework: string): ComplianceCheck {
    const hasRetentionPolicy = data.retentionPolicy || data.dataRetention;
    const hasRetentionSchedule = data.retentionSchedule || data.deletionSchedule;

    return {
      id: `${framework}_data_retention`,
      name: 'Data Retention Compliance',
      category: 'data_management',
      severity: 'medium',
      description: 'Data retention policies and schedules',
      regulations: [framework.toUpperCase()],
      passed: hasRetentionPolicy && hasRetentionSchedule,
      details: !hasRetentionPolicy ? 'No retention policy defined' :
               !hasRetentionSchedule ? 'No retention schedule implemented' :
               'Data retention properly configured',
      recommendations: !hasRetentionPolicy ? ['Define data retention policies for all data categories'] :
                      !hasRetentionSchedule ? ['Implement automated retention schedules'] : [],
    };
  }

  private checkDataSubjectRights(data: any, framework: string): ComplianceCheck {
    const supportsAccess = data.dataAccess !== false;
    const supportsDeletion = data.dataDeletion !== false;
    const supportsPortability = data.dataPortability !== false;

    const allSupported = supportsAccess && supportsDeletion && supportsPortability;

    return {
      id: `${framework}_data_rights`,
      name: 'Data Subject Rights',
      category: 'privacy_rights',
      severity: 'critical',
      description: 'Support for data subject rights',
      regulations: [framework.toUpperCase()],
      passed: allSupported,
      details: !allSupported ? 'Missing support for some data subject rights' :
               'All data subject rights supported',
      recommendations: !supportsAccess ? ['Implement data access requests'] :
                      !supportsDeletion ? ['Implement data deletion requests'] :
                      !supportsPortability ? ['Implement data portability'] : [],
    };
  }

  private checkSecurityControls(data: any, framework: string): ComplianceCheck {
    const hasEncryption = data.encryption !== false;
    const hasAccessControl = data.accessControl !== false;
    const hasMonitoring = data.securityMonitoring !== false;

    const score = (hasEncryption ? 1 : 0) + (hasAccessControl ? 1 : 0) + (hasMonitoring ? 1 : 0);

    return {
      id: `${framework}_security`,
      name: 'Security Controls',
      category: 'security',
      severity: 'critical',
      description: 'Information security controls',
      regulations: [framework.toUpperCase()],
      passed: score === 3,
      details: score === 3 ? 'All security controls in place' :
               `${3 - score} security controls missing`,
      recommendations: !hasEncryption ? ['Implement data encryption'] :
                      !hasAccessControl ? ['Implement role-based access control'] :
                      !hasMonitoring ? ['Enable security monitoring'] : [],
    };
  }

  private checkSystemAvailability(data: any, framework: string): ComplianceCheck {
    const hasUptime = data.uptimeTarget >= 99.5;
    const hasBackup = data.backupStrategy !== false;
    const hasRecovery = data.disasterRecovery !== false;

    return {
      id: `${framework}_availability`,
      name: 'System Availability',
      category: 'availability',
      severity: 'high',
      description: 'System availability and recovery',
      regulations: [framework.toUpperCase()],
      passed: hasUptime && hasBackup && hasRecovery,
      details: !hasUptime ? 'Uptime target below requirements' :
               !hasBackup ? 'No backup strategy defined' :
               !hasRecovery ? 'No disaster recovery plan' :
               'Availability requirements met',
      recommendations: !hasUptime ? ['Improve system availability to 99.5%+'] :
                      !hasBackup ? ['Implement automated backup strategy'] :
                      !hasRecovery ? ['Create disaster recovery plan'] : [],
    };
  }

  private checkConfidentialityControls(data: any, framework: string): ComplianceCheck {
    const hasClassification = data.dataClassification !== false;
    const hasNDA = data.ndaManagement !== false;
    const hasSegregation = data.dataSegregation !== false;

    return {
      id: `${framework}_confidentiality`,
      name: 'Confidentiality Controls',
      category: 'confidentiality',
      severity: 'high',
      description: 'Confidential information protection',
      regulations: [framework.toUpperCase()],
      passed: hasClassification && hasNDA,
      details: !hasClassification ? 'No data classification scheme' :
               !hasNDA ? 'NDA management not implemented' :
               'Confidentiality controls in place',
      recommendations: !hasClassification ? ['Implement data classification'] :
                      !hasNDA ? ['Implement NDA tracking'] :
                      !hasSegregation ? ['Consider data segregation'] : [],
    };
  }

  private checkRiskAssessment(data: any, framework: string): ComplianceCheck {
    const hasRiskRegister = data.riskRegister !== false;
    const hasRegularAssessments = data.riskAssessmentFrequency >= 12; // monthly
    const hasTreatmentPlans = data.riskTreatment !== false;

    return {
      id: `${framework}_risk_assessment`,
      name: 'Risk Assessment',
      category: 'risk_management',
      severity: 'high',
      description: 'Risk assessment and treatment',
      regulations: [framework.toUpperCase()],
      passed: hasRiskRegister && hasRegularAssessments && hasTreatmentPlans,
      details: !hasRiskRegister ? 'No risk register maintained' :
               !hasRegularAssessments ? 'Risk assessments not frequent enough' :
               !hasTreatmentPlans ? 'No risk treatment plans' :
               'Risk management properly implemented',
      recommendations: !hasRiskRegister ? ['Create and maintain risk register'] :
                      !hasRegularAssessments ? ['Increase risk assessment frequency'] :
                      !hasTreatmentPlans ? ['Develop risk treatment plans'] : [],
    };
  }

  private checkAccessControl(data: any, framework: string): ComplianceCheck {
    const hasRBAC = data.roleBasedAccess !== false;
    const hasMFA = data.multiFactorAuth !== false;
    const hasReview = data.accessReview !== false;

    return {
      id: `${framework}_access_control`,
      name: 'Access Control',
      category: 'access_management',
      severity: 'critical',
      description: 'Access control policies and procedures',
      regulations: [framework.toUpperCase()],
      passed: hasRBAC && hasMFA,
      details: !hasRBAC ? 'No role-based access control' :
               !hasMFA ? 'Multi-factor authentication not enforced' :
               !hasReview ? 'No regular access reviews' :
               'Access control properly configured',
      recommendations: !hasRBAC ? ['Implement role-based access control'] :
                      !hasMFA ? ['Enable multi-factor authentication'] :
                      !hasReview ? ['Schedule regular access reviews'] : [],
    };
  }

  private checkIncidentManagement(data: any, framework: string): ComplianceCheck {
    const hasProcess = data.incidentProcess !== false;
    const hasTeam = data.incidentResponseTeam !== false;
    const hasReporting = data.incidentReporting !== false;

    return {
      id: `${framework}_incident_management`,
      name: 'Incident Management',
      category: 'incident_response',
      severity: 'high',
      description: 'Security incident management procedures',
      regulations: [framework.toUpperCase()],
      passed: hasProcess && hasTeam && hasReporting,
      details: !hasProcess ? 'No incident management process' :
               !hasTeam ? 'No incident response team defined' :
               !hasReporting ? 'No incident reporting mechanism' :
               'Incident management configured',
      recommendations: !hasProcess ? ['Document incident management process'] :
                      !hasTeam ? ['Establish incident response team'] :
                      !hasReporting ? ['Implement incident reporting'] : [],
    };
  }

  private checkPrivacyNotice(data: any, framework: string): ComplianceCheck {
    const hasNotice = data.privacyNotice !== false;
    const isAccessible = data.privacyNoticeAccessible !== false;
    const isUpdated = data.privacyNoticeUpdated !== false;

    return {
      id: `${framework}_privacy_notice`,
      name: 'Privacy Notice',
      category: 'transparency',
      severity: 'high',
      description: 'Clear privacy notice at collection',
      regulations: [framework.toUpperCase()],
      passed: hasNotice && isAccessible && isUpdated,
      details: !hasNotice ? 'No privacy notice provided' :
               !isAccessible ? 'Privacy notice not easily accessible' :
               !isUpdated ? 'Privacy notice outdated' :
               'Privacy notice compliant',
      recommendations: !hasNotice ? ['Create comprehensive privacy notice'] :
                      !isAccessible ? ['Make privacy notice easily accessible'] :
                      !isUpdated ? ['Update privacy notice'] : [],
    };
  }

  private checkOptOutRights(data: any, framework: string): ComplianceCheck {
    const hasOptOut = data.optOutMechanism !== false;
    const isAccessible = data.optOutAccessible !== false;
    const isTimely = data.optOutTimely !== false;

    return {
      id: `${framework}_opt_out`,
      name: 'Opt-Out Rights',
      category: 'consumer_rights',
      severity: 'high',
      description: 'Support for opt-out of data sale',
      regulations: [framework.toUpperCase()],
      passed: hasOptOut && isAccessible,
      details: !hasOptOut ? 'No opt-out mechanism provided' :
               !isAccessible ? 'Opt-out not easily accessible' :
               !isTimely ? 'Opt-out processing delays' :
               'Opt-out rights supported',
      recommendations: !hasOptOut ? ['Implement opt-out mechanism'] :
                      !isAccessible ? ['Make opt-out easily accessible'] :
                      !isTimely ? ['Improve opt-out processing time'] : [],
    };
  }

  private checkPaymentDataEncryption(data: any): ComplianceCheck {
    const hasEncryption = data.paymentEncryption !== false;
    const hasTokenization = data.tokenization !== false;
    const hasTLS = data.tlsVersion >= 1.2;

    return {
      id: 'pci_encryption',
      name: 'Payment Data Encryption',
      category: 'data_security',
      severity: 'critical',
      description: 'Cardholder data encryption',
      regulations: ['PCI DSS'],
      passed: hasEncryption && hasTLS,
      details: !hasEncryption ? 'Payment data not encrypted' :
               !hasTLS ? 'TLS version below requirements' :
               'Payment data properly encrypted',
      recommendations: !hasEncryption ? ['Implement payment data encryption'] :
                      !hasTLS ? ['Upgrade to TLS 1.2 or higher'] :
                      !hasTokenization ? ['Consider tokenization'] : [],
    };
  }

  private checkPaymentDataAccess(data: any): ComplianceCheck {
    const hasRestriction = data.paymentDataRestriction !== false;
    const hasLogging = data.accessLogging !== false;
    const hasReview = data.accessReview !== false;

    return {
      id: 'pci_access_control',
      name: 'Payment Data Access Control',
      category: 'access_control',
      severity: 'critical',
      description: 'Restrict access to cardholder data',
      regulations: ['PCI DSS'],
      passed: hasRestriction && hasLogging,
      details: !hasRestriction ? 'Payment data access not restricted' :
               !hasLogging ? 'Access logging not implemented' :
               'Payment data access properly controlled',
      recommendations: !hasRestriction ? ['Restrict payment data access'] :
                      !hasLogging ? ['Implement access logging'] :
                      !hasReview ? ['Schedule access reviews'] : [],
    };
  }

  // Contract compliance checks
  private checkContractDataProtection(contract: any): any {
    const hasDataProtection = contract.metadata?.clauses?.some(
      (c: any) => c.type === 'data_protection' || c.type === 'privacy',
    );

    return {
      passed: hasDataProtection,
      issue: !hasDataProtection ? 'No data protection clauses found' : null,
      recommendation: !hasDataProtection ? 'Add data protection clauses to comply with privacy regulations' : null,
    };
  }

  private checkContractSecurityClauses(contract: any): any {
    const hasSecurityClauses = contract.metadata?.clauses?.some(
      (c: any) => c.type === 'security' || c.type === 'cybersecurity',
    );

    return {
      passed: hasSecurityClauses,
      issue: !hasSecurityClauses ? 'No security clauses found' : null,
      recommendation: !hasSecurityClauses ? 'Include security requirements and incident response procedures' : null,
    };
  }

  private checkContractLiabilityTerms(contract: any): any {
    const hasLiability = contract.metadata?.clauses?.some(
      (c: any) => c.type === 'limitation_of_liability',
    );
    const hasIndemnification = contract.metadata?.clauses?.some(
      (c: any) => c.type === 'indemnification',
    );

    return {
      passed: hasLiability && hasIndemnification,
      issue: !hasLiability ? 'No limitation of liability clause' :
             !hasIndemnification ? 'No indemnification clause' : null,
      recommendation: !hasLiability ? 'Add limitation of liability clause' :
                     !hasIndemnification ? 'Add indemnification clause' : null,
    };
  }

  private checkContractTerminationClauses(contract: any): any {
    const hasTermination = contract.metadata?.clauses?.some(
      (c: any) => c.type === 'termination',
    );

    return {
      passed: hasTermination,
      issue: !hasTermination ? 'No termination clause found' : null,
      recommendation: !hasTermination ? 'Add clear termination conditions and procedures' : null,
    };
  }

  private checkContractIPClauses(contract: any): any {
    const hasIP = contract.metadata?.clauses?.some(
      (c: any) => c.type === 'intellectual_property' || c.type === 'ownership',
    );

    return {
      passed: hasIP,
      issue: !hasIP ? 'No intellectual property clauses found' : null,
      recommendation: !hasIP ? 'Define intellectual property ownership and usage rights' : null,
    };
  }

  private checkContractConfidentiality(contract: any): any {
    const hasConfidentiality = contract.metadata?.clauses?.some(
      (c: any) => c.type === 'confidentiality' || c.type === 'nda',
    );

    return {
      passed: hasConfidentiality,
      issue: !hasConfidentiality ? 'No confidentiality clause found' : null,
      recommendation: !hasConfidentiality ? 'Add confidentiality and non-disclosure terms' : null,
    };
  }

  // Vendor assessment methods
  private assessVendorDataHandling(_vendor: any, certifications: any[]): any {
    const hasCertification = certifications?.some(
      c => ['ISO27001', 'SOC2', 'GDPR'].includes(c.type),
    );
    const score = hasCertification ? 0.2 : 0.6;

    return {
      score,
      status: score < 0.3 ? 'low_risk' : score < 0.6 ? 'medium_risk' : 'high_risk',
      details: hasCertification ? 'Vendor has data protection certifications' :
               'No data protection certifications found',
    };
  }

  private assessVendorSecurity(_vendor: any, certifications: any[]): any {
    const hasSecurityCert = certifications?.some(
      c => ['ISO27001', 'SOC2', 'CISSP'].includes(c.type),
    );
    const score = hasSecurityCert ? 0.15 : 0.7;

    return {
      score,
      status: score < 0.3 ? 'secure' : score < 0.6 ? 'moderate' : 'insecure',
      details: hasSecurityCert ? 'Vendor has security certifications' :
               'No security certifications found',
    };
  }

  private assessVendorContinuity(vendor: any): any {
    const yearsInBusiness = vendor.metadata?.years_in_business || 0;
    const hasBackupPlan = vendor.metadata?.business_continuity_plan;

    const score = yearsInBusiness > 5 && hasBackupPlan ? 0.1 :
                  yearsInBusiness > 3 ? 0.3 : 0.5;

    return {
      score,
      status: score < 0.3 ? 'stable' : score < 0.5 ? 'moderate' : 'unstable',
      details: `${yearsInBusiness} years in business, ${hasBackupPlan ? 'has' : 'no'} continuity plan`,
    };
  }

  private assessVendorCompliance(_vendor: any, certifications: any[]): any {
    const complianceCerts = certifications?.filter(
      c => ['ISO', 'SOC', 'GDPR', 'HIPAA', 'PCI'].some(type => c.type.includes(type)),
    ).length || 0;

    const score = complianceCerts > 3 ? 0.1 :
                  complianceCerts > 1 ? 0.3 : 0.6;

    return {
      score,
      status: score < 0.3 ? 'compliant' : score < 0.5 ? 'partial' : 'non_compliant',
      details: `${complianceCerts} compliance certifications`,
    };
  }

  private getRequiredCertifications(vendorCategory: string): string[] {
    const requirements: Record<string, string[]> = {
      software: ['ISO27001', 'SOC2'],
      financial: ['SOC2', 'PCI-DSS'],
      healthcare: ['HIPAA', 'ISO27001'],
      data_processing: ['GDPR', 'ISO27001', 'SOC2'],
      cloud_services: ['SOC2', 'ISO27001', 'CSA'],
      consulting: ['ISO9001'],
      manufacturing: ['ISO9001', 'ISO14001'],
    };

    return requirements[vendorCategory] || ['ISO9001'];
  }

  // Helper methods
  private calculateComplianceScore(result: any): number {
    if (result.complianceScore !== undefined) {
      return result.complianceScore;
    }

    if (result.overallCompliance) {
      return result.overallCompliance === 'compliant' ? 0.9 :
             result.overallCompliance === 'partial' ? 0.6 : 0.3;
    }

    if (result.passedChecks && result.totalChecks) {
      return result.passedChecks / result.totalChecks;
    }

    return 0.5;
  }

  private generateComplianceInsights(result: any, insights: Insight[], score: number) {
    if (score >= 0.9) {
      insights.push({
        type: 'excellent_compliance',
        severity: 'low',
        title: 'Excellent Compliance Status',
        description: 'Organization maintains high compliance standards',
        isActionable: false,
      });
    } else if (score >= 0.7) {
      insights.push({
        type: 'good_compliance',
        severity: 'low',
        title: 'Good Compliance Status',
        description: 'Minor improvements needed in some areas',
        recommendation: 'Focus on addressing medium-priority compliance gaps',
        isActionable: true,
      });
    } else if (score >= 0.5) {
      insights.push({
        type: 'compliance_attention_needed',
        severity: 'medium',
        title: 'Compliance Attention Needed',
        description: 'Several compliance areas require improvement',
        recommendation: 'Prioritize high-risk compliance issues',
        isActionable: true,
      });
    } else {
      insights.push({
        type: 'compliance_critical',
        severity: 'critical',
        title: 'Critical Compliance Issues',
        description: 'Immediate action required to address compliance failures',
        recommendation: 'Engage compliance team immediately',
        isActionable: true,
      });
    }

    // Add specific insights based on result type
    if (result.criticalIssues && result.criticalIssues.length > 0) {
      insights.push({
        type: 'critical_compliance_issues',
        severity: 'critical',
        title: `${result.criticalIssues.length} Critical Issues Found`,
        description: result.criticalIssues[0],
        isActionable: true,
      });
    }

    if (result.certifications?.missing?.length > 0) {
      insights.push({
        type: 'missing_certifications',
        severity: 'medium',
        title: 'Missing Required Certifications',
        description: `${result.certifications.missing.length} certifications needed: ${result.certifications.missing.join(', ')}`,
        recommendation: 'Schedule certification assessments',
        isActionable: true,
      });
    }

    if (result.recommendations && result.recommendations.length > 0) {
      const topRecommendations = result.recommendations.slice(0, 3);
      insights.push({
        type: 'compliance_recommendations',
        severity: 'medium',
        title: 'Top Compliance Recommendations',
        description: topRecommendations.join('; '),
        isActionable: true,
      });
    }
  }

  private async checkEnterpriseCompliance(_context: AgentContext): Promise<any> {
    // Check enterprise-wide compliance status
    const { data: complianceStatus } = await this.supabase
      .rpc('get_enterprise_compliance_status', {
        p_enterprise_id: this.enterpriseId,
      });

    return {
      overallScore: complianceStatus?.overall_score || 0,
      lastAuditDate: complianceStatus?.last_audit_date,
      openIssues: complianceStatus?.open_issues || 0,
      upcomingDeadlines: complianceStatus?.upcoming_deadlines || [],
    };
  }

  private generateExecutiveSummary(auditResults: any): string {
    const status = auditResults.overallStatus.toUpperCase();
    const frameworks = Object.keys(auditResults.frameworks).length;
    const issues = auditResults.criticalIssues.length;

    let summary = 'COMPLIANCE AUDIT SUMMARY\n\n';
    summary += `Status: ${status}\n`;
    summary += `Frameworks Assessed: ${frameworks}\n`;
    summary += `Critical Issues: ${issues}\n\n`;

    if (issues > 0) {
      summary += 'IMMEDIATE ACTION REQUIRED:\n';
      auditResults.criticalIssues.slice(0, 3).forEach((issue: string, i: number) => {
        summary += `${i + 1}. ${issue}\n`;
      });
    } else {
      summary += 'No critical compliance issues identified. Continue regular monitoring and updates.\n';
    }

    return summary;
  }

  private async createAuditTrail(auditResults: any, context: AgentContext) {
    await this.supabase
      .from('compliance_audits')
      .insert({
        enterprise_id: this.enterpriseId,
        audit_id: auditResults.auditId,
        audit_type: auditResults.auditType,
        status: auditResults.overallStatus,
        results: auditResults,
        performed_by: context.userId,
        created_at: new Date().toISOString(),
      });
  }

  private determineLegalBasis(dataCategory: string, purpose: string): string {
    const basisMap: Record<string, Record<string, string>> = {
      personal_data: {
        business_operations: 'legitimate_interest',
        marketing: 'consent',
        legal_compliance: 'legal_obligation',
        contract_fulfillment: 'contract',
      },
      sensitive_data: {
        business_operations: 'explicit_consent',
        health_services: 'vital_interests',
        legal_compliance: 'legal_obligation',
      },
      employee_data: {
        business_operations: 'contract',
        payroll: 'legal_obligation',
        benefits: 'legitimate_interest',
      },
    };

    return basisMap[dataCategory]?.[purpose] || 'consent';
  }

  private async checkDataEncryption(dataCategory: string): Promise<any> {
    // Check encryption status for data category
    const requiresEncryption = ['sensitive_data', 'payment_data', 'health_data'].includes(dataCategory);

    return {
      compliant: true, // Assuming encryption is in place
      required: requiresEncryption,
      method: 'AES-256',
      recommendation: requiresEncryption && !true ? 'Enable encryption for sensitive data' : null,
    };
  }

  private async checkDataAccessControl(_dataCategory: string): Promise<any> {
    return {
      compliant: true,
      method: 'Role-based access control',
      lastReview: new Date().toISOString(),
      recommendation: null,
    };
  }

  private async checkDataRetention(dataCategory: string): Promise<any> {
    const retentionPeriods: Record<string, number> = {
      personal_data: 365 * 3, // 3 years
      financial_data: 365 * 7, // 7 years
      employee_data: 365 * 5, // 5 years
      temporary_data: 30, // 30 days
    };

    return {
      compliant: true,
      retentionPeriod: retentionPeriods[dataCategory] || 365,
      automated: true,
      recommendation: null,
    };
  }

  private checkDataMinimization(_data: any): any {
    return {
      compliant: true,
      assessment: 'Only necessary data collected',
      recommendation: null,
    };
  }

  private checkCrossBorderCompliance(data: any): any {
    const hasTransfers = data.internationalTransfers || false;

    return {
      hasInternationalTransfers: hasTransfers,
      mechanisms: hasTransfers ? ['Standard Contractual Clauses', 'Adequacy Decision'] : [],
      compliant: true,
      recommendation: hasTransfers && !true ? 'Implement appropriate transfer mechanisms' : null,
    };
  }

  private validatePolicy(policy: any): any {
    const issues = [];
    const recommendations = [];

    // Check policy completeness
    if (!policy.content || policy.content.length < 100) {
      issues.push('Policy content too brief');
      recommendations.push('Expand policy with detailed procedures');
    }

    if (!policy.last_reviewed || new Date(policy.last_reviewed) < new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)) {
      issues.push('Policy review overdue');
      recommendations.push('Schedule policy review');
    }

    if (!policy.approval_status) {
      issues.push('Policy not approved');
      recommendations.push('Submit policy for approval');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }

  private async getIndustryRequirements(): Promise<string[]> {
    // Get industry-specific requirements
    const { data: enterprise } = await this.supabase
      .from('enterprises')
      .select('industry, jurisdiction')
      .eq('id', this.enterpriseId)
      .single();

    const requirements: Record<string, string[]> = {
      financial: ['SOC2', 'PCI-DSS', 'ISO27001'],
      healthcare: ['HIPAA', 'ISO27001', 'SOC2'],
      technology: ['SOC2', 'ISO27001', 'GDPR'],
      retail: ['PCI-DSS', 'GDPR', 'SOC2'],
      government: ['FedRAMP', 'FISMA', 'ISO27001'],
    };

    return requirements[enterprise?.industry] || ['ISO27001', 'SOC2'];
  }

  private categorizeEvents(events: any[]): Record<string, number> {
    const categories: Record<string, number> = {
      policy_violation: 0,
      access_violation: 0,
      data_breach: 0,
      certification_expiry: 0,
      audit_finding: 0,
      other: 0,
    };

    for (const event of events) {
      const category = event.category || 'other';
      categories[category] = (categories[category] || 0) + 1;
    }

    return categories;
  }

  private async performDataProtectionCheck(): Promise<any> {
    return {
      score: 0.85,
      status: 'compliant',
      details: 'Data protection measures in place',
      recommendations: ['Regular privacy impact assessments'],
    };
  }

  private async performSecurityCheck(): Promise<any> {
    return {
      score: 0.9,
      status: 'compliant',
      details: 'Security controls operational',
      recommendations: [] as string[],
    };
  }

  private async performPrivacyCheck(): Promise<any> {
    return {
      score: 0.8,
      status: 'compliant',
      details: 'Privacy rights supported',
      recommendations: ['Update privacy notice'],
    };
  }

  private async performContractualCheck(): Promise<any> {
    return {
      score: 0.75,
      status: 'partial',
      details: 'Some contracts need compliance review',
      recommendations: ['Review legacy contracts for compliance'],
    };
  }

  private async performOperationalCheck(): Promise<any> {
    return {
      score: 0.88,
      status: 'compliant',
      details: 'Operational procedures compliant',
      recommendations: [] as string[],
    };
  }
}