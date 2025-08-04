import { BaseAgent, ProcessingResult, Insight, AgentContext } from './base.ts';
// import { getFeatureFlag, getAgentConfig } from '../config/index.ts';
// import DataLoader from 'dataloader';

interface RiskDimension {
  category: string;
  score: number;
  weight: number;
  factors: RiskFactor[];
}

interface RiskFactor {
  name: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  likelihood: 'certain' | 'likely' | 'possible' | 'unlikely';
  score: number;
  description: string;
  mitigations?: string[];
}

interface RiskProfile {
  overallScore: number;
  level: 'critical' | 'high' | 'medium' | 'low';
  dimensions: RiskDimension[];
  topRisks: RiskFactor[];
  recommendations: string[];
  mitigationPlan?: MitigationPlan;
}

interface MitigationPlan {
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
  estimatedCost?: number;
  estimatedEffort?: string;
}

export class RiskAssessmentAgent extends BaseAgent {
  private dataLoader: any; // DataLoader type commented out

  get agentType() {
    return 'risk_assessment';
  }

  get capabilities() {
    return [
      'risk_assessment',
      'risk_scoring',
      'risk_mitigation',
      'compliance_checking',
      'vulnerability_analysis',
    ];
  }

  // Risk scoring matrices
  private readonly impactScores = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  private readonly likelihoodScores = {
    certain: 4,
    likely: 3,
    possible: 2,
    unlikely: 1,
  };

  // Risk categories and their weights
  private readonly riskCategories = {
    financial: { weight: 0.25, description: 'Financial and monetary risks' },
    operational: { weight: 0.20, description: 'Operational and process risks' },
    legal: { weight: 0.20, description: 'Legal and regulatory risks' },
    reputational: { weight: 0.15, description: 'Brand and reputation risks' },
    security: { weight: 0.10, description: 'Security and data protection risks' },
    strategic: { weight: 0.10, description: 'Strategic and market risks' },
  };

  constructor(supabase: any, enterpriseId: string) {
    super(supabase, enterpriseId, 'risk-assessment');
    // DataLoader initialization commented out
    this.dataLoader = null;
  }

  async process(data: any, context?: AgentContext): Promise<ProcessingResult> {
    const taskType = context?.taskType || this.inferTaskType(data);
    const insights: Insight[] = [];
    const rulesApplied: string[] = [];

    try {
      let result: any;
      let confidence = 0.85;

      switch (taskType) {
        case 'contract_risk':
          result = await this.assessContractRisk(data, insights, rulesApplied);
          break;

        case 'vendor_risk':
          result = await this.assessVendorRisk(data, insights, rulesApplied);
          break;

        case 'project_risk':
          result = await this.assessProjectRisk(data, insights, rulesApplied);
          break;

        case 'compliance_risk':
          result = await this.assessComplianceRisk(data, insights, rulesApplied);
          break;

        case 'financial_risk':
          result = await this.assessFinancialRisk(data, insights, rulesApplied);
          break;

        case 'comprehensive_risk':
          result = await this.performComprehensiveRiskAssessment(data, insights, rulesApplied);
          confidence = 0.9;
          break;

        default:
          throw new Error(`Unsupported risk assessment type: ${taskType}`);
      }

      return this.createResult(true, result, insights, rulesApplied, confidence);
    } catch (error) {
      return this.createResult(
        false,
        null,
        insights,
        rulesApplied,
        0.0,
        { error: `Risk assessment failed: ${error instanceof Error ? error.message : String(error)}` },
      );
    }
  }

  private inferTaskType(data: any): string {
    if (data.contractId) {return 'contract_risk';}
    if (data.vendorId) {return 'vendor_risk';}
    if (data.projectId) {return 'project_risk';}
    if (data.complianceFramework) {return 'compliance_risk';}
    if (data.financialData) {return 'financial_risk';}
    return 'comprehensive_risk';
  }

  private async assessContractRisk(
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<RiskProfile> {
    rulesApplied.push('contract_risk_assessment');

    const { contractId } = data;
    const contract = await this.dataLoader.getContract(contractId);

    if (!contract) {
      throw new Error('Contract not found');
    }

    const dimensions: RiskDimension[] = [];
    const allRisks: RiskFactor[] = [];

    // Financial Risk Assessment
    const financialRisks = await this.assessFinancialRisks(contract);
    dimensions.push({
      category: 'financial',
      score: this.calculateDimensionScore(financialRisks),
      weight: this.riskCategories.financial.weight,
      factors: financialRisks,
    });
    allRisks.push(...financialRisks);

    // Legal Risk Assessment
    const legalRisks = await this.assessLegalRisks(contract);
    dimensions.push({
      category: 'legal',
      score: this.calculateDimensionScore(legalRisks),
      weight: this.riskCategories.legal.weight,
      factors: legalRisks,
    });
    allRisks.push(...legalRisks);

    // Operational Risk Assessment
    const operationalRisks = await this.assessOperationalRisks(contract);
    dimensions.push({
      category: 'operational',
      score: this.calculateDimensionScore(operationalRisks),
      weight: this.riskCategories.operational.weight,
      factors: operationalRisks,
    });
    allRisks.push(...operationalRisks);

    // Calculate overall risk profile
    const riskProfile = this.calculateRiskProfile(dimensions, allRisks);

    // Add insights based on risk level
    if (riskProfile.level === 'critical') {
      insights.push(this.createInsight(
        'critical_risk_detected',
        'critical',
        'Critical Risk Level',
        `Contract ${contract.contract_number} has critical risk level requiring immediate attention`,
        undefined,
        { riskScore: riskProfile.overallScore, topRisks: riskProfile.topRisks.slice(0, 3) },
        true,
      ));
    } else if (riskProfile.level === 'high') {
      insights.push(this.createInsight(
        'high_risk_detected',
        'high',
        'High Risk Level',
        `Contract ${contract.contract_number} has high risk level requiring mitigation`,
        undefined,
        { riskScore: riskProfile.overallScore },
        true,
      ));
    }

    return riskProfile;
  }

  private async assessVendorRisk(
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<RiskProfile> {
    rulesApplied.push('vendor_risk_assessment');

    const { vendorId } = data;
    const vendor = await this.dataLoader.getVendor(vendorId);

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const dimensions: RiskDimension[] = [];
    const allRisks: RiskFactor[] = [];

    // Financial Stability
    const financialRisks = await this.assessVendorFinancialStability(vendor);
    dimensions.push({
      category: 'financial',
      score: this.calculateDimensionScore(financialRisks),
      weight: this.riskCategories.financial.weight,
      factors: financialRisks,
    });
    allRisks.push(...financialRisks);

    // Operational Capability
    const operationalRisks = await this.assessVendorOperationalCapability(vendor);
    dimensions.push({
      category: 'operational',
      score: this.calculateDimensionScore(operationalRisks),
      weight: this.riskCategories.operational.weight,
      factors: operationalRisks,
    });
    allRisks.push(...operationalRisks);

    // Compliance & Legal
    const complianceRisks = await this.assessVendorCompliance(vendor);
    dimensions.push({
      category: 'legal',
      score: this.calculateDimensionScore(complianceRisks),
      weight: this.riskCategories.legal.weight,
      factors: complianceRisks,
    });
    allRisks.push(...complianceRisks);

    // Reputational Risk
    const reputationalRisks = await this.assessVendorReputation(vendor);
    dimensions.push({
      category: 'reputational',
      score: this.calculateDimensionScore(reputationalRisks),
      weight: this.riskCategories.reputational.weight,
      factors: reputationalRisks,
    });
    allRisks.push(...reputationalRisks);

    const riskProfile = this.calculateRiskProfile(dimensions, allRisks);

    // Vendor-specific insights
    if (vendor.risk_score && vendor.risk_score > 70) {
      insights.push(this.createInsight(
        'vendor_risk_increase',
        'high',
        'Vendor Risk Increase',
        `Vendor ${vendor.name} risk score has increased to ${vendor.risk_score}`,
        undefined,
        { previousScore: vendor.previous_risk_score, currentScore: vendor.risk_score },
        true,
      ));
    }

    return riskProfile;
  }

  private async assessProjectRisk(
    data: any,
    _insights: Insight[],
    rulesApplied: string[],
  ): Promise<RiskProfile> {
    rulesApplied.push('project_risk_assessment');

    const dimensions: RiskDimension[] = [];
    const allRisks: RiskFactor[] = [];

    // Timeline Risks
    const timelineRisks = this.assessTimelineRisks(data);
    dimensions.push({
      category: 'operational',
      score: this.calculateDimensionScore(timelineRisks),
      weight: 0.3,
      factors: timelineRisks,
    });
    allRisks.push(...timelineRisks);

    // Budget Risks
    const budgetRisks = this.assessBudgetRisks(data);
    dimensions.push({
      category: 'financial',
      score: this.calculateDimensionScore(budgetRisks),
      weight: 0.3,
      factors: budgetRisks,
    });
    allRisks.push(...budgetRisks);

    // Resource Risks
    const resourceRisks = this.assessResourceRisks(data);
    dimensions.push({
      category: 'operational',
      score: this.calculateDimensionScore(resourceRisks),
      weight: 0.2,
      factors: resourceRisks,
    });
    allRisks.push(...resourceRisks);

    // Technical Risks
    const technicalRisks = this.assessTechnicalRisks(data);
    dimensions.push({
      category: 'operational',
      score: this.calculateDimensionScore(technicalRisks),
      weight: 0.2,
      factors: technicalRisks,
    });
    allRisks.push(...technicalRisks);

    return this.calculateRiskProfile(dimensions, allRisks);
  }

  private async assessComplianceRisk(
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<RiskProfile> {
    rulesApplied.push('compliance_risk_assessment');

    const framework = data.complianceFramework;
    const dimensions: RiskDimension[] = [];
    const allRisks: RiskFactor[] = [];

    // Regulatory Compliance Risks
    const regulatoryRisks = await this.assessRegulatoryRisks(framework, data);
    dimensions.push({
      category: 'legal',
      score: this.calculateDimensionScore(regulatoryRisks),
      weight: 0.4,
      factors: regulatoryRisks,
    });
    allRisks.push(...regulatoryRisks);

    // Data Protection Risks
    const dataRisks = this.assessDataProtectionRisks(data);
    dimensions.push({
      category: 'security',
      score: this.calculateDimensionScore(dataRisks),
      weight: 0.3,
      factors: dataRisks,
    });
    allRisks.push(...dataRisks);

    // Process Compliance Risks
    const processRisks = this.assessProcessComplianceRisks(data);
    dimensions.push({
      category: 'operational',
      score: this.calculateDimensionScore(processRisks),
      weight: 0.3,
      factors: processRisks,
    });
    allRisks.push(...processRisks);

    const riskProfile = this.calculateRiskProfile(dimensions, allRisks);

    // Compliance-specific insights
    if (riskProfile.level === 'critical' || riskProfile.level === 'high') {
      insights.push(this.createInsight(
        'compliance_risk_alert',
        'high',
        'Compliance Risk Alert',
        `High compliance risk detected for ${framework} framework`,
        undefined,
        { framework, riskLevel: riskProfile.level },
        true,
      ));
    }

    return riskProfile;
  }

  private async assessFinancialRisk(
    data: any,
    _insights: Insight[],
    rulesApplied: string[],
  ): Promise<RiskProfile> {
    rulesApplied.push('financial_risk_assessment');

    const dimensions: RiskDimension[] = [];
    const allRisks: RiskFactor[] = [];

    // Cash Flow Risks
    const cashFlowRisks = this.assessCashFlowRisks(data.financialData);
    dimensions.push({
      category: 'financial',
      score: this.calculateDimensionScore(cashFlowRisks),
      weight: 0.3,
      factors: cashFlowRisks,
    });
    allRisks.push(...cashFlowRisks);

    // Credit Risks
    const creditRisks = this.assessCreditRisks(data.financialData);
    dimensions.push({
      category: 'financial',
      score: this.calculateDimensionScore(creditRisks),
      weight: 0.25,
      factors: creditRisks,
    });
    allRisks.push(...creditRisks);

    // Market Risks
    const marketRisks = this.assessMarketRisks(data.financialData);
    dimensions.push({
      category: 'strategic',
      score: this.calculateDimensionScore(marketRisks),
      weight: 0.25,
      factors: marketRisks,
    });
    allRisks.push(...marketRisks);

    // Liquidity Risks
    const liquidityRisks = this.assessLiquidityRisks(data.financialData);
    dimensions.push({
      category: 'financial',
      score: this.calculateDimensionScore(liquidityRisks),
      weight: 0.2,
      factors: liquidityRisks,
    });
    allRisks.push(...liquidityRisks);

    return this.calculateRiskProfile(dimensions, allRisks);
  }

  private async performComprehensiveRiskAssessment(
    data: any,
    insights: Insight[],
    rulesApplied: string[],
  ): Promise<RiskProfile> {
    rulesApplied.push('comprehensive_risk_assessment');

    const dimensions: RiskDimension[] = [];
    const allRisks: RiskFactor[] = [];

    // Assess all risk categories
    for (const [category, config] of Object.entries(this.riskCategories)) {
      const categoryRisks = await this.assessCategoryRisks(category, data);
      dimensions.push({
        category,
        score: this.calculateDimensionScore(categoryRisks),
        weight: config.weight,
        factors: categoryRisks,
      });
      allRisks.push(...categoryRisks);
    }

    const riskProfile = this.calculateRiskProfile(dimensions, allRisks);

    // Generate mitigation plan for comprehensive assessment
    riskProfile.mitigationPlan = this.generateMitigationPlan(riskProfile);

    // Add strategic insights
    insights.push(this.createInsight(
      'comprehensive_risk_profile',
      'medium',
      'Comprehensive Risk Profile',
      `Overall risk assessment completed with ${riskProfile.level} risk level`,
      undefined,
      {
        score: riskProfile.overallScore,
        highRiskAreas: dimensions.filter(d => d.score > 3).map(d => d.category),
      },
      false,
    ));

    return riskProfile;
  }

  // Risk calculation methods
  private calculateRiskScore(impact: string, likelihood: string): number {
    return this.impactScores[impact as keyof typeof this.impactScores] * this.likelihoodScores[likelihood as keyof typeof this.likelihoodScores];
  }

  private calculateDimensionScore(factors: RiskFactor[]): number {
    if (factors.length === 0) {return 0;}

    const totalScore = factors.reduce((sum, factor) => sum + factor.score, 0);
    return totalScore / factors.length;
  }

  private calculateRiskProfile(dimensions: RiskDimension[], allRisks: RiskFactor[]): RiskProfile {
    // Calculate weighted overall score
    const overallScore = dimensions.reduce((sum, dim) => sum + (dim.score * dim.weight), 0);

    // Determine risk level
    let level: 'critical' | 'high' | 'medium' | 'low';
    if (overallScore >= 3.5) {level = 'critical';}
    else if (overallScore >= 2.5) {level = 'high';}
    else if (overallScore >= 1.5) {level = 'medium';}
    else {level = 'low';}

    // Get top risks
    const topRisks = allRisks
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Generate recommendations
    const recommendations = this.generateRecommendations(dimensions, topRisks);

    return {
      overallScore,
      level,
      dimensions,
      topRisks,
      recommendations,
    };
  }

  private generateRecommendations(dimensions: RiskDimension[], topRisks: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    // High-level recommendations based on dimensions
    dimensions
      .filter(d => d.score >= 3)
      .forEach(d => {
        recommendations.push(`Implement immediate risk mitigation for ${d.category} risks`);
      });

    // Specific recommendations for top risks
    topRisks.forEach(risk => {
      if (risk.mitigations && risk.mitigations.length > 0) {
        recommendations.push(...risk.mitigations.slice(0, 2));
      }
    });

    // General recommendations
    if (dimensions.some(d => d.category === 'financial' && d.score > 2)) {
      recommendations.push('Establish financial risk monitoring and early warning system');
    }
    if (dimensions.some(d => d.category === 'operational' && d.score > 2)) {
      recommendations.push('Review and update operational procedures and controls');
    }
    if (dimensions.some(d => d.category === 'legal' && d.score > 2)) {
      recommendations.push('Conduct legal compliance audit and update policies');
    }

    return [...new Set(recommendations)].slice(0, 10); // Remove duplicates and limit
  }

  private generateMitigationPlan(riskProfile: RiskProfile): MitigationPlan {
    const plan: MitigationPlan = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
    };

    // Immediate actions for critical risks
    riskProfile.topRisks
      .filter(r => r.impact === 'critical')
      .forEach(r => {
        if (r.mitigations && r.mitigations.length > 0) {
          plan.immediate.push(r.mitigations[0]);
        }
      });

    // Short-term actions for high risks
    riskProfile.topRisks
      .filter(r => r.impact === 'high')
      .forEach(r => {
        if (r.mitigations && r.mitigations.length > 1) {
          plan.shortTerm.push(r.mitigations[1]);
        }
      });

    // Long-term strategic improvements
    if (riskProfile.level === 'critical' || riskProfile.level === 'high') {
      plan.longTerm.push('Implement comprehensive risk management framework');
      plan.longTerm.push('Establish risk monitoring dashboard and KPIs');
      plan.longTerm.push('Develop risk appetite statement and tolerance levels');
    }

    // Estimate effort
    const totalActions = plan.immediate.length + plan.shortTerm.length + plan.longTerm.length;
    plan.estimatedEffort = totalActions < 5 ? 'Low' : totalActions < 10 ? 'Medium' : 'High';

    return plan;
  }

  // Specific risk assessment methods
  private async assessFinancialRisks(contract: any): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Payment terms risk
    if (contract.payment_terms?.includes('Net 90')) {
      risks.push({
        name: 'Extended Payment Terms',
        impact: 'high',
        likelihood: 'likely',
        score: this.calculateRiskScore('high', 'likely'),
        description: 'Payment terms exceed standard 30 days, impacting cash flow',
        mitigations: ['Negotiate shorter payment terms', 'Implement invoice factoring'],
      });
    }

    // High value contract risk
    if (contract.total_value > 1000000) {
      risks.push({
        name: 'High Value Exposure',
        impact: 'critical',
        likelihood: 'possible',
        score: this.calculateRiskScore('critical', 'possible'),
        description: 'Contract value exceeds $1M creating significant financial exposure',
        mitigations: ['Obtain performance bonds', 'Implement milestone-based payments'],
      });
    }

    // Currency risk
    if (contract.currency && contract.currency !== 'USD') {
      risks.push({
        name: 'Foreign Exchange Risk',
        impact: 'medium',
        likelihood: 'likely',
        score: this.calculateRiskScore('medium', 'likely'),
        description: 'Contract in foreign currency subject to exchange rate fluctuations',
        mitigations: ['Use currency hedging', 'Include exchange rate adjustment clause'],
      });
    }

    return risks;
  }

  private async assessLegalRisks(contract: any): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Liability risk
    if (!contract.liability_cap || contract.liability_cap === 'unlimited') {
      risks.push({
        name: 'Unlimited Liability',
        impact: 'critical',
        likelihood: 'possible',
        score: this.calculateRiskScore('critical', 'possible'),
        description: 'No liability cap exposes organization to unlimited damages',
        mitigations: ['Negotiate liability cap', 'Obtain comprehensive insurance'],
      });
    }

    // Jurisdiction risk
    if (contract.governing_law && !['US', 'UK', 'EU'].includes(contract.governing_law)) {
      risks.push({
        name: 'Foreign Jurisdiction',
        impact: 'high',
        likelihood: 'possible',
        score: this.calculateRiskScore('high', 'possible'),
        description: 'Contract governed by unfamiliar legal system',
        mitigations: ['Consult local legal counsel', 'Include arbitration clause'],
      });
    }

    // Termination clause risk
    if (!contract.termination_clause || contract.termination_clause === 'none') {
      risks.push({
        name: 'No Exit Strategy',
        impact: 'high',
        likelihood: 'likely',
        score: this.calculateRiskScore('high', 'likely'),
        description: 'Lack of termination clause makes it difficult to exit',
        mitigations: ['Add termination for convenience clause', 'Define clear exit conditions'],
      });
    }

    return risks;
  }

  private async assessOperationalRisks(contract: any): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // SLA risk
    if (contract.sla_requirements && contract.sla_requirements.uptime > 99.9) {
      risks.push({
        name: 'Stringent SLA Requirements',
        impact: 'high',
        likelihood: 'likely',
        score: this.calculateRiskScore('high', 'likely'),
        description: 'SLA requirements exceed standard capabilities',
        mitigations: ['Invest in redundancy', 'Negotiate realistic SLAs'],
      });
    }

    // Resource availability risk
    if (contract.required_resources && contract.required_resources > 10) {
      risks.push({
        name: 'Resource Constraints',
        impact: 'medium',
        likelihood: 'likely',
        score: this.calculateRiskScore('medium', 'likely'),
        description: 'Contract requires significant resource allocation',
        mitigations: ['Plan resource allocation', 'Consider outsourcing options'],
      });
    }

    return risks;
  }

  private async assessVendorFinancialStability(vendor: any): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Credit rating risk
    if (vendor.credit_rating && ['C', 'D'].includes(vendor.credit_rating)) {
      risks.push({
        name: 'Poor Credit Rating',
        impact: 'high',
        likelihood: 'likely',
        score: this.calculateRiskScore('high', 'likely'),
        description: 'Vendor has poor credit rating indicating financial instability',
        mitigations: ['Require advance payments', 'Monitor financial health closely'],
      });
    }

    // Revenue concentration risk
    if (vendor.customer_concentration && vendor.customer_concentration > 50) {
      risks.push({
        name: 'Customer Concentration',
        impact: 'medium',
        likelihood: 'possible',
        score: this.calculateRiskScore('medium', 'possible'),
        description: 'Vendor heavily dependent on few customers',
        mitigations: ['Assess vendor diversification plans', 'Have backup vendors'],
      });
    }

    return risks;
  }

  private async assessVendorOperationalCapability(vendor: any): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Capacity risk
    if (vendor.capacity_utilization && vendor.capacity_utilization > 85) {
      risks.push({
        name: 'Capacity Constraints',
        impact: 'medium',
        likelihood: 'likely',
        score: this.calculateRiskScore('medium', 'likely'),
        description: 'Vendor operating near capacity limits',
        mitigations: ['Secure capacity commitments', 'Identify alternative vendors'],
      });
    }

    // Geographic risk
    if (vendor.locations && vendor.locations.length === 1) {
      risks.push({
        name: 'Single Point of Failure',
        impact: 'high',
        likelihood: 'unlikely',
        score: this.calculateRiskScore('high', 'unlikely'),
        description: 'Vendor operates from single location',
        mitigations: ['Require business continuity plan', 'Assess disaster recovery'],
      });
    }

    return risks;
  }

  private async assessVendorCompliance(vendor: any): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Certification risk
    if (!vendor.certifications || vendor.certifications.length === 0) {
      risks.push({
        name: 'Lack of Certifications',
        impact: 'medium',
        likelihood: 'certain',
        score: this.calculateRiskScore('medium', 'certain'),
        description: 'Vendor lacks industry standard certifications',
        mitigations: ['Require certification roadmap', 'Conduct vendor audits'],
      });
    }

    // Data protection risk
    if (!vendor.gdpr_compliant && vendor.handles_personal_data) {
      risks.push({
        name: 'Data Protection Non-Compliance',
        impact: 'critical',
        likelihood: 'certain',
        score: this.calculateRiskScore('critical', 'certain'),
        description: 'Vendor not GDPR compliant while handling personal data',
        mitigations: ['Require immediate compliance', 'Implement data processing agreement'],
      });
    }

    return risks;
  }

  private async assessVendorReputation(vendor: any): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    // Recent incidents
    if (vendor.incidents_last_year && vendor.incidents_last_year > 2) {
      risks.push({
        name: 'Recent Security Incidents',
        impact: 'high',
        likelihood: 'likely',
        score: this.calculateRiskScore('high', 'likely'),
        description: 'Multiple security incidents in past year',
        mitigations: ['Review incident response', 'Increase monitoring'],
      });
    }

    // Customer satisfaction
    if (vendor.customer_satisfaction && vendor.customer_satisfaction < 3) {
      risks.push({
        name: 'Low Customer Satisfaction',
        impact: 'medium',
        likelihood: 'likely',
        score: this.calculateRiskScore('medium', 'likely'),
        description: 'Below average customer satisfaction scores',
        mitigations: ['Set performance KPIs', 'Regular performance reviews'],
      });
    }

    return risks;
  }

  // Additional risk assessment methods
  private assessTimelineRisks(data: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (data.timeline?.aggressive) {
      risks.push({
        name: 'Aggressive Timeline',
        impact: 'high',
        likelihood: 'likely',
        score: this.calculateRiskScore('high', 'likely'),
        description: 'Project timeline is aggressive with little buffer',
        mitigations: ['Add buffer time', 'Identify critical path'],
      });
    }

    return risks;
  }

  private assessBudgetRisks(data: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (data.budget && data.budget.contingency < 10) {
      risks.push({
        name: 'Insufficient Contingency',
        impact: 'medium',
        likelihood: 'likely',
        score: this.calculateRiskScore('medium', 'likely'),
        description: 'Budget contingency below recommended 10%',
        mitigations: ['Increase contingency', 'Implement change control'],
      });
    }

    return risks;
  }

  private assessResourceRisks(data: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (data.resources?.keyPersonDependency) {
      risks.push({
        name: 'Key Person Dependency',
        impact: 'high',
        likelihood: 'possible',
        score: this.calculateRiskScore('high', 'possible'),
        description: 'Project success dependent on specific individuals',
        mitigations: ['Cross-train team members', 'Document knowledge'],
      });
    }

    return risks;
  }

  private assessTechnicalRisks(data: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (data.technology?.new) {
      risks.push({
        name: 'New Technology Risk',
        impact: 'medium',
        likelihood: 'likely',
        score: this.calculateRiskScore('medium', 'likely'),
        description: 'Using untested or new technology',
        mitigations: ['Proof of concept', 'Phased implementation'],
      });
    }

    return risks;
  }

  private async assessRegulatoryRisks(framework: string, data: any): Promise<RiskFactor[]> {
    const risks: RiskFactor[] = [];

    if (framework === 'GDPR' && !data.privacyImpactAssessment) {
      risks.push({
        name: 'Missing Privacy Impact Assessment',
        impact: 'critical',
        likelihood: 'certain',
        score: this.calculateRiskScore('critical', 'certain'),
        description: 'GDPR requires PIA for high-risk processing',
        mitigations: ['Conduct PIA immediately', 'Implement privacy by design'],
      });
    }

    return risks;
  }

  private assessDataProtectionRisks(data: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (data.dataProcessing && !data.encryption) {
      risks.push({
        name: 'Unencrypted Data Processing',
        impact: 'critical',
        likelihood: 'certain',
        score: this.calculateRiskScore('critical', 'certain'),
        description: 'Processing sensitive data without encryption',
        mitigations: ['Implement encryption', 'Use secure protocols'],
      });
    }

    return risks;
  }

  private assessProcessComplianceRisks(data: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (!data.auditTrail) {
      risks.push({
        name: 'Insufficient Audit Trail',
        impact: 'high',
        likelihood: 'certain',
        score: this.calculateRiskScore('high', 'certain'),
        description: 'Lack of comprehensive audit trail for compliance',
        mitigations: ['Implement audit logging', 'Regular compliance reviews'],
      });
    }

    return risks;
  }

  private assessCashFlowRisks(financialData: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (financialData.cashFlowRatio && financialData.cashFlowRatio < 1) {
      risks.push({
        name: 'Negative Cash Flow',
        impact: 'critical',
        likelihood: 'likely',
        score: this.calculateRiskScore('critical', 'likely'),
        description: 'Cash outflows exceed inflows',
        mitigations: ['Improve collections', 'Negotiate payment terms'],
      });
    }

    return risks;
  }

  private assessCreditRisks(financialData: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (financialData.daysOutstanding && financialData.daysOutstanding > 60) {
      risks.push({
        name: 'High Days Sales Outstanding',
        impact: 'high',
        likelihood: 'likely',
        score: this.calculateRiskScore('high', 'likely'),
        description: 'Average collection period exceeds 60 days',
        mitigations: ['Tighten credit policies', 'Offer early payment discounts'],
      });
    }

    return risks;
  }

  private assessMarketRisks(financialData: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (financialData.marketVolatility && financialData.marketVolatility > 0.3) {
      risks.push({
        name: 'High Market Volatility',
        impact: 'high',
        likelihood: 'likely',
        score: this.calculateRiskScore('high', 'likely'),
        description: 'Market conditions highly volatile',
        mitigations: ['Diversify portfolio', 'Implement hedging strategies'],
      });
    }

    return risks;
  }

  private assessLiquidityRisks(financialData: any): RiskFactor[] {
    const risks: RiskFactor[] = [];

    if (financialData.currentRatio && financialData.currentRatio < 1.5) {
      risks.push({
        name: 'Low Liquidity',
        impact: 'high',
        likelihood: 'possible',
        score: this.calculateRiskScore('high', 'possible'),
        description: 'Current ratio below healthy threshold',
        mitigations: ['Improve working capital', 'Establish credit facilities'],
      });
    }

    return risks;
  }

  private async assessCategoryRisks(category: string, _data: any): Promise<RiskFactor[]> {
    // Generic category risk assessment
    const risks: RiskFactor[] = [];

    // This would be expanded based on specific category requirements
    risks.push({
      name: `General ${category} risk`,
      impact: 'medium',
      likelihood: 'possible',
      score: this.calculateRiskScore('medium', 'possible'),
      description: `Standard risks associated with ${category}`,
      mitigations: [`Monitor ${category} indicators`, `Implement ${category} controls`],
    });

    return risks;
  }
}