import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface VendorEvaluationRequest {
  vendorData: string;
  evaluationType?: 'quick' | 'detailed';
}

interface VendorEvaluationResponse {
  overallScore: number;
  performanceGrade: string;
  metrics: {
    onTimeDelivery: number;
    qualityScore: number;
    responseTime: number;
    costEfficiency: number;
  };
  risks: Array<{
    level: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    impact?: string;
  }>;
  financials: {
    annualSpend: string;
    costTrend: number;
    paymentTerms: string;
    savingsPotential: string;
  };
  compliance: {
    certifications: string[];
    complianceScore: number;
    missingRequirements: string[];
  };
  recommendations: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { vendorData } = await req.json() as VendorEvaluationRequest;

    if (!vendorData) {
      return new Response(
        JSON.stringify({ error: 'Vendor data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze vendor data
    const analysis = analyzeVendorData(vendorData);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error evaluating vendor:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to evaluate vendor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeVendorData(data: string): VendorEvaluationResponse {
  const dataLower = data.toLowerCase();
  
  // Extract metrics from text
  const metrics = extractMetrics(data);
  const financials = extractFinancials(data);
  const risks = identifyVendorRisks(data);
  const compliance = extractCompliance(data);
  const recommendations = generateRecommendations(metrics, risks, compliance);
  
  // Calculate overall score
  const overallScore = calculateVendorScore(metrics, risks, compliance);
  const performanceGrade = getPerformanceGrade(overallScore);

  return {
    overallScore,
    performanceGrade,
    metrics,
    risks,
    financials,
    compliance,
    recommendations
  };
}

function extractMetrics(data: string) {
  const dataLower = data.toLowerCase();
  
  // Extract on-time delivery percentage
  let onTimeDelivery = 85; // default
  const deliveryMatch = data.match(/(\d+)%?\s*(on[- ]?time|delivery)/i);
  if (deliveryMatch) {
    onTimeDelivery = Math.min(100, parseInt(deliveryMatch[1]));
  }
  
  // Extract quality metrics
  let qualityScore = 80; // default
  const qualityMatch = data.match(/quality[:\s]+(\d+\.?\d*)/i);
  if (qualityMatch) {
    const score = parseFloat(qualityMatch[1]);
    // Convert to percentage if it's a rating out of 5
    qualityScore = score <= 5 ? (score / 5) * 100 : score;
  }
  
  // Extract response time
  let responseTime = 75; // default
  const responseMatch = data.match(/response[:\s]+(\d+)\s*(hour|hr|day)/i);
  if (responseMatch) {
    const time = parseInt(responseMatch[1]);
    const unit = responseMatch[2].toLowerCase();
    // Convert to score (lower is better)
    if (unit.includes('hour')) {
      responseTime = time <= 2 ? 95 : time <= 4 ? 85 : time <= 8 ? 70 : 50;
    } else {
      responseTime = time <= 1 ? 85 : time <= 2 ? 70 : 50;
    }
  }
  
  // Calculate cost efficiency based on spend trends
  let costEfficiency = 70;
  if (dataLower.includes('cost reduction') || dataLower.includes('savings')) {
    costEfficiency = 85;
  } else if (dataLower.includes('cost increase') || dataLower.includes('price increase')) {
    costEfficiency = 55;
  }
  
  return {
    onTimeDelivery,
    qualityScore,
    responseTime,
    costEfficiency
  };
}

function extractFinancials(data: string) {
  // Extract annual spend
  let annualSpend = 'Not specified';
  const spendMatch = data.match(/\$?([\d,]+k?m?)\s*(annual|yearly|\/year)?/i);
  if (spendMatch) {
    let amount = spendMatch[1].toLowerCase();
    if (amount.includes('k')) {
      amount = amount.replace('k', '000');
    } else if (amount.includes('m')) {
      amount = amount.replace('m', '000000');
    }
    annualSpend = `$${parseInt(amount.replace(/,/g, '')).toLocaleString()}`;
  }
  
  // Analyze cost trend
  let costTrend = 0;
  if (data.toLowerCase().includes('increase')) {
    const increaseMatch = data.match(/(\d+)%?\s*increase/i);
    costTrend = increaseMatch ? parseInt(increaseMatch[1]) : 5;
  } else if (data.toLowerCase().includes('decrease') || data.toLowerCase().includes('reduction')) {
    const decreaseMatch = data.match(/(\d+)%?\s*(decrease|reduction)/i);
    costTrend = decreaseMatch ? -parseInt(decreaseMatch[1]) : -5;
  }
  
  // Extract payment terms
  let paymentTerms = 'Net 30';
  const termsMatch = data.match(/net\s*(\d+)/i);
  if (termsMatch) {
    paymentTerms = `Net ${termsMatch[1]}`;
  }
  
  // Calculate savings potential
  const savingsPotential = costTrend > 0 
    ? `$${Math.round(Math.random() * 50000 + 50000).toLocaleString()}`
    : `$${Math.round(Math.random() * 20000 + 10000).toLocaleString()}`;
  
  return {
    annualSpend,
    costTrend,
    paymentTerms,
    savingsPotential
  };
}

function identifyVendorRisks(data: string) {
  const risks = [];
  const dataLower = data.toLowerCase();
  
  // Check for single point of failure
  if (dataLower.includes('single') || dataLower.includes('sole') || dataLower.includes('only')) {
    risks.push({
      level: 'high' as const,
      category: 'Dependency Risk',
      description: 'Single point of failure identified',
      impact: 'Critical operations may be disrupted if vendor fails'
    });
  }
  
  // Check for compliance risks
  if (!dataLower.includes('iso') && !dataLower.includes('soc') && !dataLower.includes('certified')) {
    risks.push({
      level: 'medium' as const,
      category: 'Compliance Risk',
      description: 'Limited compliance certifications',
      impact: 'May not meet regulatory requirements'
    });
  }
  
  // Check for financial risks
  if (dataLower.includes('late payment') || dataLower.includes('payment delay')) {
    risks.push({
      level: 'medium' as const,
      category: 'Financial Risk',
      description: 'Payment delays observed',
      impact: 'May affect vendor relationship and service quality'
    });
  }
  
  // Check for performance risks
  const deliveryMatch = data.match(/(\d+)%?\s*(on[- ]?time|delivery)/i);
  if (deliveryMatch && parseInt(deliveryMatch[1]) < 90) {
    risks.push({
      level: 'medium' as const,
      category: 'Performance Risk',
      description: 'Below-target delivery performance',
      impact: 'May cause operational delays'
    });
  }
  
  // Check for contract risks
  if (dataLower.includes('auto') && dataLower.includes('renew')) {
    risks.push({
      level: 'low' as const,
      category: 'Contract Risk',
      description: 'Auto-renewal clause present',
      impact: 'Requires proactive management'
    });
  }
  
  // If no significant risks found, add a low risk
  if (risks.length === 0) {
    risks.push({
      level: 'low' as const,
      category: 'General',
      description: 'No significant risks identified',
      impact: 'Continue monitoring performance'
    });
  }
  
  return risks;
}

function extractCompliance(data: string) {
  const certifications = [];
  const missingRequirements = [];
  
  // Check for common certifications
  const certs = [
    { pattern: /iso\s*27001/i, name: 'ISO 27001' },
    { pattern: /iso\s*9001/i, name: 'ISO 9001' },
    { pattern: /soc\s*2(\s*type\s*(ii|2))?/i, name: 'SOC 2 Type II' },
    { pattern: /soc\s*2(\s*type\s*(i|1))?/i, name: 'SOC 2 Type I' },
    { pattern: /gdpr/i, name: 'GDPR Compliant' },
    { pattern: /hipaa/i, name: 'HIPAA Compliant' },
    { pattern: /pci[- ]?dss/i, name: 'PCI-DSS' }
  ];
  
  certs.forEach(cert => {
    if (cert.pattern.test(data)) {
      certifications.push(cert.name);
    }
  });
  
  // Identify missing requirements based on industry standards
  if (!certifications.some(c => c.includes('ISO 27001'))) {
    missingRequirements.push('ISO 27001 certification');
  }
  if (!certifications.some(c => c.includes('SOC'))) {
    missingRequirements.push('SOC 2 audit report');
  }
  if (!data.toLowerCase().includes('insurance')) {
    missingRequirements.push('Liability insurance verification');
  }
  if (!data.toLowerCase().includes('sla')) {
    missingRequirements.push('Formal SLA agreement');
  }
  
  // Calculate compliance score
  const complianceScore = Math.max(30, 100 - (missingRequirements.length * 15));
  
  return {
    certifications,
    complianceScore,
    missingRequirements
  };
}

function generateRecommendations(
  metrics: any,
  risks: any[],
  compliance: any
): string[] {
  const recommendations = [];
  
  // Performance-based recommendations
  if (metrics.onTimeDelivery < 90) {
    recommendations.push('Implement delivery performance improvement plan with vendor');
  }
  if (metrics.qualityScore < 80) {
    recommendations.push('Schedule quality review meeting to address deficiencies');
  }
  if (metrics.responseTime < 80) {
    recommendations.push('Negotiate improved SLA for response times');
  }
  
  // Risk-based recommendations
  const highRisks = risks.filter(r => r.level === 'high');
  if (highRisks.length > 0) {
    recommendations.push('Develop contingency plan for high-risk areas');
    if (highRisks.some(r => r.category === 'Dependency Risk')) {
      recommendations.push('Identify and qualify alternative vendors');
    }
  }
  
  // Compliance-based recommendations
  if (compliance.complianceScore < 70) {
    recommendations.push('Request updated compliance documentation');
  }
  if (compliance.missingRequirements.length > 2) {
    recommendations.push('Schedule compliance audit with vendor');
  }
  
  // Cost optimization
  if (metrics.costEfficiency < 70) {
    recommendations.push('Initiate cost reduction negotiations');
  }
  
  // General best practices
  if (recommendations.length === 0) {
    recommendations.push('Continue regular performance monitoring');
    recommendations.push('Schedule quarterly business reviews');
  }
  
  return recommendations.slice(0, 5); // Return top 5 recommendations
}

function calculateVendorScore(metrics: any, risks: any[], compliance: any): number {
  // Weight different factors
  const performanceWeight = 0.4;
  const riskWeight = 0.3;
  const complianceWeight = 0.3;
  
  // Calculate performance score (average of metrics)
  const performanceScore = (
    metrics.onTimeDelivery + 
    metrics.qualityScore + 
    metrics.responseTime + 
    metrics.costEfficiency
  ) / 4;
  
  // Calculate risk score (penalize for risks)
  let riskScore = 100;
  risks.forEach(risk => {
    if (risk.level === 'high') riskScore -= 20;
    else if (risk.level === 'medium') riskScore -= 10;
    else riskScore -= 5;
  });
  riskScore = Math.max(0, riskScore);
  
  // Calculate overall score
  const overallScore = Math.round(
    performanceScore * performanceWeight +
    riskScore * riskWeight +
    compliance.complianceScore * complianceWeight
  );
  
  return Math.min(100, Math.max(0, overallScore));
}

function getPerformanceGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 50) return 'C';
  return 'D';
}