import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from '../_shared/supabase.ts';

interface ContractAnalysisRequest {
  contractText: string;
  analysisType?: 'risk' | 'compliance' | 'full' | 'quick' | 'deep';
  regulations?: string[];
  includeExplanations?: boolean;
  enterpriseId?: string;
}

interface ClauseAnalysis {
  id: string;
  type: string;
  text: string;
  risk_level: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  importance: number;
  obligations: string[];
  deadlines: string[];
  monetary_values: number[];
}

interface RiskFactor {
  category: string;
  description: string;
  severity: number;
  mitigation?: string;
  confidence: number;
}

interface ComplianceIssue {
  regulation: string;
  compliant: boolean;
  score: number;
  issues: string[];
  recommendations: string[];
}

interface ContractIntelligenceResponse {
  success: boolean;
  data?: {
    clauses: ClauseAnalysis[];
    riskScore: number;
    riskFactors: RiskFactor[];
    complianceChecks: ComplianceIssue[];
    overallComplianceScore: number;
    recommendations: string[];
    keyObligations: unknown[];
    timeline: unknown[];
    confidence: string;
    processingTime: number;
  };
  error?: string;
}

// Advanced regex patterns for contract analysis
const CONTRACT_PATTERNS = {
  // Financial terms
  monetary: /\$[\d,]+(\.\d{2})?|\d+\s*(USD|EUR|GBP|dollars?|euros?|pounds?)/gi,
  percentage: /\d+(\.\d+)?%/g,
  
  // Temporal expressions
  dates: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}/g,
  durations: /\d+\s*(days?|weeks?|months?|years?|hours?)/gi,
  deadlines: /(within|by|before|no later than|prior to)\s+\d+\s*(days?|weeks?|months?)/gi,
  
  // Legal obligations
  obligations: /(shall|must|will|agrees to|undertakes to|commits to|is obligated to)/gi,
  rights: /(may|can|is entitled to|has the right to|reserves the right)/gi,
  prohibitions: /(shall not|must not|may not|cannot|is prohibited from)/gi,
  
  // Risk indicators
  penalties: /(penalty|penalties|fine|liquidated damages|breach|default)/gi,
  termination: /(terminat\w+|cancel\w+|expir\w+|end of term)/gi,
  liability: /(liability|liable|indemnif\w+|damages|loss|claim)/gi,
  warranties: /(warrant\w+|guarantee\w+|represent\w+|covenant\w+)/gi,
  
  // Compliance indicators
  gdpr: /(GDPR|General Data Protection|personal data|data subject|controller|processor)/gi,
  ccpa: /(CCPA|California Consumer Privacy|consumer rights|opt-out|do not sell)/gi,
  hipaa: /(HIPAA|protected health information|PHI|medical records|patient data)/gi,
  sox: /(SOX|Sarbanes-Oxley|financial reporting|internal controls|audit)/gi,
};

// Clause type classification
const CLAUSE_TYPES = {
  payment: ['payment', 'invoice', 'billing', 'fee', 'cost', 'price'],
  delivery: ['delivery', 'deliver', 'ship', 'provide', 'supply'],
  termination: ['termination', 'terminate', 'cancel', 'end', 'expire'],
  liability: ['liability', 'liable', 'responsible', 'damages', 'loss'],
  confidentiality: ['confidential', 'proprietary', 'non-disclosure', 'secret'],
  warranty: ['warranty', 'warrant', 'guarantee', 'defect', 'repair'],
  indemnification: ['indemnify', 'indemnification', 'hold harmless', 'defend'],
  compliance: ['comply', 'compliance', 'regulatory', 'law', 'regulation'],
  dispute: ['dispute', 'arbitration', 'mediation', 'litigation', 'court'],
  intellectual_property: ['intellectual property', 'copyright', 'patent', 'trademark', 'IP'],
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { 
      contractText, 
      analysisType = 'full',
      regulations = ['GDPR', 'CCPA', 'SOC2', 'HIPAA'],
      includeExplanations = true,
      enterpriseId
    } = await req.json() as ContractAnalysisRequest;

    if (!contractText) {
      return new Response(
        JSON.stringify({ error: 'Contract text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();

    // Step 1: Extract and classify clauses
    const clauses = extractClauses(contractText);
    
    // Step 2: Analyze risks
    const riskAnalysis = analyzeRisks(contractText, clauses);
    
    // Step 3: Check compliance
    const complianceResults = checkCompliance(contractText, regulations);
    
    // Step 4: Extract obligations and timeline
    const obligations = extractObligations(contractText);
    const timeline = extractTimeline(contractText);
    
    // Step 5: Generate recommendations
    const recommendations = generateRecommendations(
      riskAnalysis,
      complianceResults,
      clauses
    );

    // Step 6: Calculate confidence based on analysis completeness
    const confidence = calculateConfidence(clauses, riskAnalysis, complianceResults);

    // Step 7: Store analysis results if enterprise ID provided
    if (enterpriseId) {
      await storeAnalysisResults(enterpriseId, {
        contractText,
        analysis: {
          clauses,
          riskAnalysis,
          complianceResults,
          recommendations
        }
      });
    }

    const processingTime = Date.now() - startTime;

    const response: ContractIntelligenceResponse = {
      success: true,
      data: {
        clauses,
        riskScore: riskAnalysis.overallScore,
        riskFactors: riskAnalysis.factors,
        complianceChecks: complianceResults,
        overallComplianceScore: calculateOverallCompliance(complianceResults),
        recommendations,
        keyObligations: obligations,
        timeline,
        confidence,
        processingTime
      }
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing contract:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to analyze contract',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractClauses(text: string): ClauseAnalysis[] {
  const clauses: ClauseAnalysis[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  sentences.forEach((sentence, index) => {
    const clauseType = identifyClauseType(sentence);
    if (clauseType) {
      const importance = calculateClauseImportance(sentence, clauseType);
      const riskLevel = assessClauseRisk(sentence, clauseType);
      
      clauses.push({
        id: `clause-${index}`,
        type: clauseType,
        text: sentence.trim(),
        risk_level: riskLevel,
        importance,
        obligations: extractObligationsFromClause(sentence),
        deadlines: extractDeadlinesFromClause(sentence),
        monetary_values: extractMonetaryValues(sentence)
      });
    }
  });
  
  return clauses;
}

function identifyClauseType(text: string): string | null {
  const lowerText = text.toLowerCase();
  
  for (const [type, keywords] of Object.entries(CLAUSE_TYPES)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return type;
    }
  }
  
  return null;
}

function calculateClauseImportance(text: string, type: string): number {
  let importance = 0.5; // Base importance
  
  // Increase importance for critical clause types
  const criticalTypes = ['termination', 'liability', 'indemnification', 'payment'];
  if (criticalTypes.includes(type)) {
    importance += 0.2;
  }
  
  // Increase importance for clauses with obligations
  if (CONTRACT_PATTERNS.obligations.test(text)) {
    importance += 0.15;
  }
  
  // Increase importance for clauses with monetary values
  if (CONTRACT_PATTERNS.monetary.test(text)) {
    importance += 0.15;
  }
  
  // Increase importance for clauses with deadlines
  if (CONTRACT_PATTERNS.deadlines.test(text)) {
    importance += 0.1;
  }
  
  return Math.min(1, importance);
}

function assessClauseRisk(text: string, type: string): 'critical' | 'high' | 'medium' | 'low' | 'minimal' {
  const lowerText = text.toLowerCase();
  
  // Critical risk indicators
  if (
    (type === 'liability' && !lowerText.includes('cap')) ||
    (type === 'indemnification' && lowerText.includes('unlimited')) ||
    (CONTRACT_PATTERNS.penalties.test(text) && CONTRACT_PATTERNS.monetary.test(text))
  ) {
    return 'critical';
  }
  
  // High risk indicators
  if (
    type === 'termination' ||
    CONTRACT_PATTERNS.liability.test(text) ||
    (CONTRACT_PATTERNS.deadlines.test(text) && CONTRACT_PATTERNS.penalties.test(text))
  ) {
    return 'high';
  }
  
  // Medium risk indicators
  if (
    CONTRACT_PATTERNS.warranties.test(text) ||
    CONTRACT_PATTERNS.obligations.test(text)
  ) {
    return 'medium';
  }
  
  // Low risk indicators
  if (CONTRACT_PATTERNS.rights.test(text)) {
    return 'low';
  }
  
  return 'minimal';
}

function extractObligationsFromClause(text: string): string[] {
  const obligations: string[] = [];
  const matches = text.match(CONTRACT_PATTERNS.obligations);
  
  if (matches) {
    matches.forEach(match => {
      const context = text.substring(
        Math.max(0, text.indexOf(match) - 20),
        Math.min(text.length, text.indexOf(match) + 100)
      );
      obligations.push(context.trim());
    });
  }
  
  return obligations;
}

function extractDeadlinesFromClause(text: string): string[] {
  const deadlines: string[] = [];
  
  // Extract explicit deadlines
  const deadlineMatches = text.match(CONTRACT_PATTERNS.deadlines);
  if (deadlineMatches) {
    deadlines.push(...deadlineMatches);
  }
  
  // Extract dates
  const dateMatches = text.match(CONTRACT_PATTERNS.dates);
  if (dateMatches) {
    deadlines.push(...dateMatches);
  }
  
  return deadlines;
}

function extractMonetaryValues(text: string): number[] {
  const values: number[] = [];
  const matches = text.match(CONTRACT_PATTERNS.monetary);
  
  if (matches) {
    matches.forEach(match => {
      const numStr = match.replace(/[^0-9.]/g, '');
      const value = parseFloat(numStr);
      if (!isNaN(value)) {
        values.push(value);
      }
    });
  }
  
  return values;
}

function analyzeRisks(text: string, clauses: ClauseAnalysis[]): RiskAnalysis {
  const factors: RiskFactor[] = [];
  
  // Check for unlimited liability
  if (text.toLowerCase().includes('unlimited liability')) {
    factors.push({
      category: 'Financial',
      description: 'Unlimited liability exposure',
      severity: 0.95,
      mitigation: 'Negotiate liability cap or purchase additional insurance',
      confidence: 0.9
    });
  }
  
  // Check for one-sided termination
  const terminationClauses = clauses.filter(c => c.type === 'termination');
  if (terminationClauses.some(c => c.text.toLowerCase().includes('sole discretion'))) {
    factors.push({
      category: 'Operational',
      description: 'One-sided termination rights',
      severity: 0.8,
      mitigation: 'Negotiate mutual termination rights or notice period',
      confidence: 0.85
    });
  }
  
  // Check for auto-renewal
  if (text.toLowerCase().includes('automatically renew')) {
    factors.push({
      category: 'Contractual',
      description: 'Automatic renewal clause present',
      severity: 0.4,
      mitigation: 'Set calendar reminders for renewal dates',
      confidence: 0.95
    });
  }
  
  // Check for missing key clauses
  if (!text.toLowerCase().includes('force majeure')) {
    factors.push({
      category: 'Legal',
      description: 'No force majeure clause',
      severity: 0.6,
      mitigation: 'Add force majeure provision for unforeseen events',
      confidence: 0.9
    });
  }
  
  // Calculate overall risk score
  const overallScore = factors.reduce((sum, factor) => sum + factor.severity * 20, 0);
  
  return {
    overallScore: Math.min(100, overallScore),
    factors
  };
}

function checkCompliance(text: string, regulations: string[]): ComplianceIssue[] {
  const results: ComplianceIssue[] = [];
  
  regulations.forEach(regulation => {
    const check = checkSpecificRegulation(text, regulation);
    results.push(check);
  });
  
  return results;
}

function checkSpecificRegulation(text: string, regulation: string): ComplianceIssue {
  const lowerText = text.toLowerCase();
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;
  
  switch (regulation) {
    case 'GDPR':
      if (!CONTRACT_PATTERNS.gdpr.test(text)) {
        issues.push('No GDPR-specific provisions found');
        recommendations.push('Add GDPR compliance clause');
        score -= 30;
      }
      if (!lowerText.includes('data protection officer') && !lowerText.includes('dpo')) {
        issues.push('No DPO designation');
        recommendations.push('Designate Data Protection Officer if required');
        score -= 20;
      }
      if (!lowerText.includes('lawful basis')) {
        issues.push('Lawful basis for processing not specified');
        recommendations.push('Specify lawful basis under GDPR Article 6');
        score -= 25;
      }
      break;
      
    case 'CCPA':
      if (!lowerText.includes('opt-out') && !lowerText.includes('do not sell')) {
        issues.push('No CCPA opt-out mechanism');
        recommendations.push('Add consumer opt-out provisions');
        score -= 30;
      }
      break;
      
    case 'HIPAA':
      if (CONTRACT_PATTERNS.hipaa.test(text)) {
        if (!lowerText.includes('business associate')) {
          issues.push('Missing Business Associate Agreement provisions');
          recommendations.push('Add BAA requirements for HIPAA compliance');
          score -= 40;
        }
      }
      break;
      
    case 'SOC2':
      if (!lowerText.includes('security') && !lowerText.includes('encrypt')) {
        issues.push('No security measures specified');
        recommendations.push('Add security and encryption requirements');
        score -= 25;
      }
      break;
  }
  
  return {
    regulation,
    compliant: score >= 70,
    score: Math.max(0, score),
    issues,
    recommendations
  };
}

function extractObligations(text: string): unknown[] {
  const obligations: unknown[] = [];
  const sentences = text.split(/[.!?]+/);
  
  sentences.forEach((sentence, index) => {
    if (CONTRACT_PATTERNS.obligations.test(sentence)) {
      const deadlines = extractDeadlinesFromClause(sentence);
      const monetaryValues = extractMonetaryValues(sentence);
      
      obligations.push({
        id: `obligation-${index}`,
        text: sentence.trim(),
        type: 'contractual',
        deadlines,
        monetaryValues,
        priority: deadlines.length > 0 ? 'high' : 'medium'
      });
    }
  });
  
  return obligations;
}

function extractTimeline(text: string): unknown[] {
  const timeline: unknown[] = [];
  const dateMatches = [...text.matchAll(CONTRACT_PATTERNS.dates)];
  const durationMatches = [...text.matchAll(CONTRACT_PATTERNS.durations)];
  const deadlineMatches = [...text.matchAll(CONTRACT_PATTERNS.deadlines)];
  
  // Combine and sort all temporal events
  const allEvents = [
    ...dateMatches.map(m => ({ type: 'date', value: m[0], index: m.index })),
    ...durationMatches.map(m => ({ type: 'duration', value: m[0], index: m.index })),
    ...deadlineMatches.map(m => ({ type: 'deadline', value: m[0], index: m.index }))
  ];
  
  allEvents.sort((a, b) => (a.index || 0) - (b.index || 0));
  
  allEvents.forEach((event, index) => {
    const context = text.substring(
      Math.max(0, (event.index || 0) - 50),
      Math.min(text.length, (event.index || 0) + 100)
    ).trim();
    
    timeline.push({
      id: `timeline-${index}`,
      type: event.type,
      value: event.value,
      context,
      position: event.index
    });
  });
  
  return timeline;
}

function generateRecommendations(
  riskAnalysis: RiskAnalysis,
  complianceResults: ComplianceIssue[],
  clauses: ClauseAnalysis[]
): string[] {
  const recommendations: string[] = [];
  
  // Risk-based recommendations
  if (riskAnalysis.overallScore > 70) {
    recommendations.push('Consider additional legal review due to high risk score');
  }
  
  riskAnalysis.factors.forEach((factor: RiskFactor) => {
    if (factor.severity > 0.7 && factor.mitigation) {
      recommendations.push(factor.mitigation);
    }
  });
  
  // Compliance-based recommendations
  complianceResults.forEach(result => {
    if (!result.compliant) {
      recommendations.push(...result.recommendations);
    }
  });
  
  // Clause-based recommendations
  const highRiskClauses = clauses.filter(c => 
    c.risk_level === 'critical' || c.risk_level === 'high'
  );
  
  if (highRiskClauses.length > 3) {
    recommendations.push('Multiple high-risk clauses identified - prioritize legal review');
  }
  
  // Check for missing important clauses
  const clauseTypes = new Set(clauses.map(c => c.type));
  const importantTypes = ['dispute', 'termination', 'liability', 'confidentiality'];
  
  importantTypes.forEach(type => {
    if (!clauseTypes.has(type)) {
      recommendations.push(`Add ${type} clause for comprehensive coverage`);
    }
  });
  
  return [...new Set(recommendations)]; // Remove duplicates
}

function calculateConfidence(
  clauses: ClauseAnalysis[],
  riskAnalysis: RiskAnalysis,
  complianceResults: ComplianceIssue[]
): string {
  let confidence = 0;
  
  // Based on number of clauses extracted
  if (clauses.length > 10) confidence += 30;
  else if (clauses.length > 5) confidence += 20;
  else confidence += 10;
  
  // Based on risk factors identified
  if (riskAnalysis.factors.length > 3) confidence += 25;
  else if (riskAnalysis.factors.length > 1) confidence += 15;
  else confidence += 5;
  
  // Based on compliance checks
  const avgComplianceScore = complianceResults.reduce((sum, r) => sum + r.score, 0) / complianceResults.length;
  confidence += avgComplianceScore * 0.45;
  
  if (confidence >= 80) return 'very_high';
  if (confidence >= 65) return 'high';
  if (confidence >= 50) return 'medium';
  if (confidence >= 35) return 'low';
  return 'very_low';
}

function calculateOverallCompliance(results: ComplianceIssue[]): number {
  if (results.length === 0) return 0;
  return results.reduce((sum, r) => sum + r.score, 0) / results.length;
}

async function storeAnalysisResults(enterpriseId: string, data: Record<string, unknown>): Promise<void> {
  try {
    const supabase = createClient();
    
    await supabase
      .from('contract_analyses')
      .insert({
        enterprise_id: enterpriseId,
        contract_text: data.contractText,
        analysis_results: data.analysis,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    console.error('Error storing analysis results:', error);
    // Non-critical error, continue processing
  }
}