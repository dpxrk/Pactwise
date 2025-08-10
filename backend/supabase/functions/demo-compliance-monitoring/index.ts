import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface ComplianceRequest {
  contractData: string;
  regulations?: string[];
}

interface ComplianceResponse {
  overallScore: number;
  status: 'compliant' | 'attention-required' | 'non-compliant';
  regulations: Array<{
    name: string;
    score: number;
    status: 'pass' | 'warning' | 'fail';
    findings: Array<{
      type: 'compliant' | 'warning' | 'violation';
      clause: string;
      details: string;
      recommendation?: string;
    }>;
  }>;
  criticalIssues: Array<{
    severity: 'critical' | 'high' | 'medium';
    category: string;
    description: string;
    impact: string;
    remediation: string;
  }>;
  remediationPlan: Array<{
    priority: 'urgent' | 'high' | 'medium' | 'low';
    action: string;
    timeline: string;
    responsibility: string;
  }>;
  regulatoryUpdates: Array<{
    regulation: string;
    update: string;
    date: string;
    impact: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { contractData, regulations = ['GDPR', 'CCPA', 'SOC2', 'ISO27001', 'HIPAA'] } = await req.json() as ComplianceRequest;

    if (!contractData) {
      return new Response(
        JSON.stringify({ error: 'Contract data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Perform compliance analysis
    const analysis = analyzeCompliance(contractData, regulations);

    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing compliance:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze compliance' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeCompliance(data: string, requestedRegulations: string[]): ComplianceResponse {
  const regulations = requestedRegulations.map(reg => checkRegulation(data, reg));
  const criticalIssues = identifyCriticalIssues(data, regulations);
  const remediationPlan = generateRemediationPlan(criticalIssues, regulations);
  const regulatoryUpdates = getRecentRegulatoryUpdates();
  
  // Calculate overall score
  const overallScore = Math.round(
    regulations.reduce((sum, reg) => sum + reg.score, 0) / regulations.length
  );
  
  // Determine overall status
  let status: 'compliant' | 'attention-required' | 'non-compliant' = 'compliant';
  if (overallScore < 60) status = 'non-compliant';
  else if (overallScore < 80) status = 'attention-required';
  
  return {
    overallScore,
    status,
    regulations,
    criticalIssues,
    remediationPlan,
    regulatoryUpdates
  };
}

function checkRegulation(data: string, regulation: string): any {
  const dataLower = data.toLowerCase();
  const findings: any[] = [];
  let score = 100;
  
  switch (regulation) {
    case 'GDPR':
      score = checkGDPR(dataLower, findings);
      break;
    case 'CCPA':
      score = checkCCPA(dataLower, findings);
      break;
    case 'SOC2':
      score = checkSOC2(dataLower, findings);
      break;
    case 'ISO27001':
      score = checkISO27001(dataLower, findings);
      break;
    case 'HIPAA':
      score = checkHIPAA(dataLower, findings);
      break;
    default:
      score = 70;
  }
  
  const status = score >= 80 ? 'pass' : score >= 60 ? 'warning' : 'fail';
  
  return {
    name: regulation,
    score,
    status,
    findings
  };
}

function checkGDPR(data: string, findings: any[]): number {
  let score = 100;
  
  // Check for data subject rights
  if (!data.includes('data subject') && !data.includes('right to')) {
    findings.push({
      type: 'violation',
      clause: 'Data Subject Rights',
      details: 'No mention of data subject rights (access, deletion, portability)',
      recommendation: 'Add comprehensive data subject rights clause per GDPR Articles 15-22'
    });
    score -= 25;
  } else {
    findings.push({
      type: 'compliant',
      clause: 'Data Subject Rights',
      details: 'Data subject rights are addressed'
    });
  }
  
  // Check for lawful basis
  if (!data.includes('lawful basis') && !data.includes('consent') && !data.includes('legitimate interest')) {
    findings.push({
      type: 'warning',
      clause: 'Lawful Basis',
      details: 'Lawful basis for processing not clearly specified',
      recommendation: 'Specify lawful basis under GDPR Article 6'
    });
    score -= 15;
  }
  
  // Check for data breach notification
  const breachMatch = data.match(/(\d+)\s*(hours?|days?)\s*(breach|notification|notify)/i);
  if (!breachMatch) {
    findings.push({
      type: 'violation',
      clause: 'Breach Notification',
      details: 'No breach notification timeline specified',
      recommendation: 'Must specify 72-hour breach notification per GDPR Article 33'
    });
    score -= 20;
  } else {
    const hours = breachMatch[2].includes('day') ? parseInt(breachMatch[1]) * 24 : parseInt(breachMatch[1]);
    if (hours > 72) {
      findings.push({
        type: 'violation',
        clause: 'Breach Notification',
        details: `Breach notification timeline (${hours} hours) exceeds GDPR requirement`,
        recommendation: 'Reduce to 72 hours maximum'
      });
      score -= 15;
    } else {
      findings.push({
        type: 'compliant',
        clause: 'Breach Notification',
        details: `Breach notification within ${hours} hours meets GDPR requirements`
      });
    }
  }
  
  // Check for data retention
  if (!data.includes('retention') && !data.includes('retain')) {
    findings.push({
      type: 'warning',
      clause: 'Data Retention',
      details: 'Data retention period not specified',
      recommendation: 'Define clear data retention periods and deletion procedures'
    });
    score -= 10;
  }
  
  // Check for data transfers
  if (data.includes('transfer') || data.includes('cross-border')) {
    if (!data.includes('standard contractual clauses') && !data.includes('scc') && !data.includes('adequacy')) {
      findings.push({
        type: 'warning',
        clause: 'International Transfers',
        details: 'Cross-border transfer safeguards not specified',
        recommendation: 'Implement Standard Contractual Clauses or adequacy decision'
      });
      score -= 10;
    } else {
      findings.push({
        type: 'compliant',
        clause: 'International Transfers',
        details: 'Appropriate transfer mechanisms in place'
      });
    }
  }
  
  // Check for DPO requirement
  if (data.includes('large scale') || data.includes('systematic monitoring')) {
    if (!data.includes('data protection officer') && !data.includes('dpo')) {
      findings.push({
        type: 'warning',
        clause: 'Data Protection Officer',
        details: 'DPO may be required for large-scale processing',
        recommendation: 'Assess need for DPO under GDPR Article 37'
      });
      score -= 5;
    }
  }
  
  return Math.max(0, score);
}

function checkCCPA(data: string, findings: any[]): number {
  let score = 100;
  
  // Check for consumer rights
  if (!data.includes('opt-out') && !data.includes('opt out')) {
    findings.push({
      type: 'violation',
      clause: 'Right to Opt-Out',
      details: 'No opt-out mechanism specified',
      recommendation: 'Implement clear opt-out process for data sale'
    });
    score -= 20;
  }
  
  // Check for disclosure requirements
  if (!data.includes('categories') && !data.includes('personal information')) {
    findings.push({
      type: 'warning',
      clause: 'Information Disclosure',
      details: 'Categories of personal information not specified',
      recommendation: 'Disclose categories of PI collected and purposes'
    });
    score -= 15;
  }
  
  // Check for non-discrimination
  if (!data.includes('discriminat')) {
    findings.push({
      type: 'warning',
      clause: 'Non-Discrimination',
      details: 'Non-discrimination clause not found',
      recommendation: 'Add non-discrimination provision for consumers exercising rights'
    });
    score -= 10;
  }
  
  // Check for data sale provisions
  if (data.includes('sell') || data.includes('sale')) {
    if (!data.includes('do not sell')) {
      findings.push({
        type: 'warning',
        clause: 'Data Sale',
        details: 'Data sale provisions lack opt-out mechanism',
        recommendation: 'Implement "Do Not Sell My Personal Information" option'
      });
      score -= 15;
    } else {
      findings.push({
        type: 'compliant',
        clause: 'Data Sale',
        details: 'Appropriate data sale opt-out provisions present'
      });
    }
  }
  
  return Math.max(0, score);
}

function checkSOC2(data: string, findings: any[]): number {
  let score = 100;
  
  // Security criteria
  if (!data.includes('encrypt') && !data.includes('security measures')) {
    findings.push({
      type: 'warning',
      clause: 'Security',
      details: 'Encryption and security measures not specified',
      recommendation: 'Define encryption standards and security controls'
    });
    score -= 15;
  } else {
    findings.push({
      type: 'compliant',
      clause: 'Security',
      details: 'Security measures are addressed'
    });
  }
  
  // Availability criteria
  const slaMatch = data.match(/(\d+\.?\d*)%?\s*(uptime|availability|sla)/i);
  if (slaMatch) {
    const sla = parseFloat(slaMatch[1]);
    if (sla < 99) {
      findings.push({
        type: 'warning',
        clause: 'Availability',
        details: `SLA of ${sla}% may not meet SOC 2 expectations`,
        recommendation: 'Consider improving to 99.9% availability'
      });
      score -= 10;
    } else {
      findings.push({
        type: 'compliant',
        clause: 'Availability',
        details: `${sla}% availability meets standards`
      });
    }
  }
  
  // Confidentiality criteria
  if (!data.includes('confidential')) {
    findings.push({
      type: 'violation',
      clause: 'Confidentiality',
      details: 'No confidentiality provisions found',
      recommendation: 'Add comprehensive confidentiality clause'
    });
    score -= 20;
  }
  
  // Processing integrity
  if (!data.includes('integrity') && !data.includes('accurate') && !data.includes('complete')) {
    findings.push({
      type: 'warning',
      clause: 'Processing Integrity',
      details: 'Data integrity measures not specified',
      recommendation: 'Define data accuracy and completeness requirements'
    });
    score -= 10;
  }
  
  // Privacy criteria (if applicable)
  if (data.includes('personal')) {
    if (!data.includes('privacy')) {
      findings.push({
        type: 'warning',
        clause: 'Privacy',
        details: 'Privacy controls not adequately addressed',
        recommendation: 'Add privacy protection measures'
      });
      score -= 10;
    }
  }
  
  return Math.max(0, score);
}

function checkISO27001(data: string, findings: any[]): number {
  let score = 100;
  
  // Information security policy
  if (!data.includes('security polic') && !data.includes('information security')) {
    findings.push({
      type: 'warning',
      clause: 'Security Policy',
      details: 'No reference to information security policy',
      recommendation: 'Reference ISO 27001 security policy requirements'
    });
    score -= 10;
  }
  
  // Risk assessment
  if (!data.includes('risk') || !data.includes('assess')) {
    findings.push({
      type: 'warning',
      clause: 'Risk Assessment',
      details: 'Risk assessment procedures not mentioned',
      recommendation: 'Include risk assessment and treatment requirements'
    });
    score -= 15;
  }
  
  // Access control
  if (!data.includes('access control') && !data.includes('authorization')) {
    findings.push({
      type: 'warning',
      clause: 'Access Control',
      details: 'Access control measures not specified',
      recommendation: 'Define access control and authorization procedures'
    });
    score -= 15;
  } else {
    findings.push({
      type: 'compliant',
      clause: 'Access Control',
      details: 'Access control measures present'
    });
  }
  
  // Incident management
  if (!data.includes('incident')) {
    findings.push({
      type: 'warning',
      clause: 'Incident Management',
      details: 'Incident response procedures not defined',
      recommendation: 'Add incident management and response procedures'
    });
    score -= 10;
  }
  
  // Business continuity
  if (!data.includes('continuity') && !data.includes('disaster recovery') && !data.includes('backup')) {
    findings.push({
      type: 'warning',
      clause: 'Business Continuity',
      details: 'Business continuity measures not addressed',
      recommendation: 'Include BCM and disaster recovery requirements'
    });
    score -= 10;
  }
  
  // Audit rights
  if (!data.includes('audit')) {
    findings.push({
      type: 'violation',
      clause: 'Audit Rights',
      details: 'No audit rights specified',
      recommendation: 'Include right to audit compliance with ISO 27001'
    });
    score -= 15;
  } else {
    findings.push({
      type: 'compliant',
      clause: 'Audit Rights',
      details: 'Audit rights are included'
    });
  }
  
  return Math.max(0, score);
}

function checkHIPAA(data: string, findings: any[]): number {
  let score = 100;
  
  // Check if HIPAA is applicable
  if (!data.includes('health') && !data.includes('medical') && !data.includes('patient')) {
    findings.push({
      type: 'compliant',
      clause: 'HIPAA Applicability',
      details: 'HIPAA may not apply to this contract'
    });
    return 90; // Not fully applicable
  }
  
  // Business Associate Agreement
  if (!data.includes('business associate') && !data.includes('baa')) {
    findings.push({
      type: 'violation',
      clause: 'Business Associate Agreement',
      details: 'No BAA provisions found',
      recommendation: 'Require signed Business Associate Agreement'
    });
    score -= 30;
  }
  
  // PHI safeguards
  if (!data.includes('phi') && !data.includes('protected health')) {
    findings.push({
      type: 'violation',
      clause: 'PHI Protection',
      details: 'Protected Health Information safeguards not specified',
      recommendation: 'Define administrative, physical, and technical safeguards for PHI'
    });
    score -= 25;
  }
  
  // Minimum necessary standard
  if (!data.includes('minimum necessary')) {
    findings.push({
      type: 'warning',
      clause: 'Minimum Necessary',
      details: 'Minimum necessary standard not addressed',
      recommendation: 'Limit PHI use/disclosure to minimum necessary'
    });
    score -= 10;
  }
  
  // Breach notification (specific to HIPAA)
  if (data.includes('health') && !data.includes('60 days')) {
    findings.push({
      type: 'warning',
      clause: 'HIPAA Breach Notification',
      details: 'HIPAA-specific breach timeline not specified',
      recommendation: 'Specify 60-day breach notification for HIPAA'
    });
    score -= 10;
  }
  
  return Math.max(0, score);
}

function identifyCriticalIssues(data: string, regulations: any[]): any[] {
  const issues = [];
  
  // Collect all violations and high-risk warnings
  regulations.forEach(reg => {
    reg.findings.forEach((finding: any) => {
      if (finding.type === 'violation') {
        issues.push({
          severity: 'critical' as const,
          category: reg.name,
          description: finding.details,
          impact: `Non-compliance with ${reg.name} - potential fines and legal liability`,
          remediation: finding.recommendation || 'Immediate correction required'
        });
      } else if (finding.type === 'warning' && reg.score < 70) {
        issues.push({
          severity: 'high' as const,
          category: reg.name,
          description: finding.details,
          impact: `Partial compliance with ${reg.name} - increased risk exposure`,
          remediation: finding.recommendation || 'Address within 30 days'
        });
      }
    });
  });
  
  // Add general compliance issues
  const dataLower = data.toLowerCase();
  
  if (!dataLower.includes('governing law')) {
    issues.push({
      severity: 'medium' as const,
      category: 'General',
      description: 'No governing law specified',
      impact: 'Legal uncertainty in dispute resolution',
      remediation: 'Add governing law and jurisdiction clause'
    });
  }
  
  if (!dataLower.includes('terminat')) {
    issues.push({
      severity: 'medium' as const,
      category: 'General',
      description: 'Termination provisions missing',
      impact: 'Difficulty exiting contract if needed',
      remediation: 'Define clear termination conditions and procedures'
    });
  }
  
  // Sort by severity
  const severityOrder = { 'critical': 0, 'high': 1, 'medium': 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  
  return issues.slice(0, 10); // Return top 10 issues
}

function generateRemediationPlan(issues: any[], regulations: any[]): any[] {
  const plan = [];
  
  // Address critical issues first
  issues.filter(i => i.severity === 'critical').forEach(issue => {
    plan.push({
      priority: 'urgent' as const,
      action: issue.remediation,
      timeline: 'Immediate - within 7 days',
      responsibility: 'Legal team with compliance officer'
    });
  });
  
  // Address high-priority issues
  issues.filter(i => i.severity === 'high').forEach(issue => {
    plan.push({
      priority: 'high' as const,
      action: issue.remediation,
      timeline: 'Within 30 days',
      responsibility: 'Contract management team'
    });
  });
  
  // Add proactive measures for low-scoring regulations
  regulations.filter(r => r.score < 70).forEach(reg => {
    if (!plan.some(p => p.action.includes(reg.name))) {
      plan.push({
        priority: 'medium' as const,
        action: `Conduct comprehensive ${reg.name} compliance review`,
        timeline: 'Within 60 days',
        responsibility: 'Compliance team'
      });
    }
  });
  
  // Add general best practices
  if (plan.length < 3) {
    plan.push({
      priority: 'low' as const,
      action: 'Schedule quarterly compliance review',
      timeline: 'Ongoing - quarterly',
      responsibility: 'Compliance officer'
    });
  }
  
  return plan.slice(0, 8); // Return top 8 action items
}

function getRecentRegulatoryUpdates(): any[] {
  // Simulated recent updates - in production, this would pull from a database
  const updates = [
    {
      regulation: 'GDPR',
      update: 'New guidance on AI and automated decision-making',
      date: '2 days ago',
      impact: 'May require additional transparency for AI-powered contract analysis'
    },
    {
      regulation: 'CCPA',
      update: 'CPRA amendments taking effect - enhanced requirements',
      date: '1 week ago',
      impact: 'Additional consumer rights and business obligations'
    },
    {
      regulation: 'ISO 27001',
      update: '2022 version adoption deadline approaching',
      date: '2 weeks ago',
      impact: 'Review and update security controls to new standard'
    },
    {
      regulation: 'SOC 2',
      update: 'Updated criteria for cloud service providers',
      date: '1 month ago',
      impact: 'Additional controls required for cloud-based services'
    },
    {
      regulation: 'HIPAA',
      update: 'Increased penalties for violations announced',
      date: '1 month ago',
      impact: 'Greater financial risk for non-compliance'
    }
  ];
  
  return updates.slice(0, 3);
}