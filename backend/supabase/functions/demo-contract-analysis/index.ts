import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0';
import { corsHeaders } from '../_shared/cors.ts';

interface ContractAnalysisRequest {
  contractText: string;
  analysisType?: 'quick' | 'detailed';
}

interface ContractAnalysisResponse {
  keyTerms: Array<{
    type: string;
    value: string;
    context?: string;
  }>;
  risks: Array<{
    level: 'high' | 'medium' | 'low';
    description: string;
    recommendation?: string;
  }>;
  obligations: Array<{
    party: string;
    obligation: string;
    date?: string;
  }>;
  compliance: Array<{
    status: 'compliant' | 'non-compliant' | 'warning';
    area: string;
    details: string;
  }>;
  dates: Array<{
    event: string;
    date: string;
    importance: 'critical' | 'important' | 'informational';
  }>;
  summary: string;
  score: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { contractText, analysisType = 'quick' } = await req.json() as ContractAnalysisRequest;

    if (!contractText) {
      return new Response(
        JSON.stringify({ error: 'Contract text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract key terms using regex patterns
    const keyTerms = extractKeyTerms(contractText);
    
    // Identify risks based on problematic clauses
    const risks = identifyRisks(contractText);
    
    // Extract obligations
    const obligations = extractObligations(contractText);
    
    // Check compliance
    const compliance = checkCompliance(contractText);
    
    // Extract important dates
    const dates = extractDates(contractText);
    
    // Generate summary and score
    const summary = generateSummary(contractText, keyTerms, risks);
    const score = calculateScore(risks, compliance);

    const response: ContractAnalysisResponse = {
      keyTerms,
      risks,
      obligations,
      compliance,
      dates,
      summary,
      score
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error analyzing contract:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to analyze contract' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function extractKeyTerms(text: string) {
  const terms = [];
  
  // Extract monetary values
  const moneyPattern = /\$[\d,]+(\.\d{2})?|\d+\s*(USD|dollars?)/gi;
  const moneyMatches = text.match(moneyPattern);
  if (moneyMatches) {
    moneyMatches.forEach(match => {
      terms.push({ type: 'Payment', value: match });
    });
  }
  
  // Extract duration/time periods
  const durationPattern = /\d+\s*(days?|months?|years?|weeks?)/gi;
  const durationMatches = text.match(durationPattern);
  if (durationMatches) {
    durationMatches.forEach(match => {
      terms.push({ type: 'Duration', value: match });
    });
  }
  
  // Extract percentages
  const percentPattern = /\d+(\.\d+)?%/g;
  const percentMatches = text.match(percentPattern);
  if (percentMatches) {
    percentMatches.forEach(match => {
      terms.push({ type: 'Percentage', value: match });
    });
  }
  
  return terms;
}

function identifyRisks(text: string) {
  const risks = [];
  const textLower = text.toLowerCase();
  
  // High risk patterns
  if (textLower.includes('unlimited liability') || textLower.includes('uncapped')) {
    risks.push({
      level: 'high' as const,
      description: 'Unlimited liability exposure detected',
      recommendation: 'Negotiate liability cap'
    });
  }
  
  if (textLower.includes('automatic renewal') || textLower.includes('auto-renew')) {
    risks.push({
      level: 'medium' as const,
      description: 'Automatic renewal clause present',
      recommendation: 'Set calendar reminder for renewal date'
    });
  }
  
  if (textLower.includes('termination penalty') || textLower.includes('early termination')) {
    risks.push({
      level: 'high' as const,
      description: 'Early termination penalties apply',
      recommendation: 'Review penalty terms carefully'
    });
  }
  
  if (textLower.includes('exclusive') || textLower.includes('exclusivity')) {
    risks.push({
      level: 'medium' as const,
      description: 'Exclusivity clause may limit options',
      recommendation: 'Evaluate impact on business flexibility'
    });
  }
  
  if (!textLower.includes('confidential')) {
    risks.push({
      level: 'low' as const,
      description: 'No confidentiality clause found',
      recommendation: 'Add mutual NDA if handling sensitive data'
    });
  }
  
  return risks;
}

function extractObligations(text: string) {
  const obligations = [];
  const sentences = text.split(/[.!?]+/);
  
  sentences.forEach(sentence => {
    const sentenceLower = sentence.toLowerCase();
    
    if (sentenceLower.includes('shall') || sentenceLower.includes('must') || sentenceLower.includes('agrees to')) {
      // Determine party (simplified)
      let party = 'Party';
      if (sentenceLower.includes('client') || sentenceLower.includes('customer')) {
        party = 'Client';
      } else if (sentenceLower.includes('provider') || sentenceLower.includes('vendor') || sentenceLower.includes('supplier')) {
        party = 'Provider';
      }
      
      obligations.push({
        party,
        obligation: sentence.trim(),
        date: extractFirstDate(sentence)
      });
    }
  });
  
  return obligations.slice(0, 5); // Return top 5 obligations
}

function checkCompliance(text: string) {
  const compliance = [];
  const textLower = text.toLowerCase();
  
  // Check for essential clauses
  if (textLower.includes('governing law') || textLower.includes('jurisdiction')) {
    compliance.push({
      status: 'compliant' as const,
      area: 'Governing Law',
      details: 'Governing law clause is present'
    });
  } else {
    compliance.push({
      status: 'warning' as const,
      area: 'Governing Law',
      details: 'No governing law clause found'
    });
  }
  
  if (textLower.includes('intellectual property') || textLower.includes('ip ') || textLower.includes('ownership')) {
    compliance.push({
      status: 'compliant' as const,
      area: 'IP Rights',
      details: 'Intellectual property rights are addressed'
    });
  }
  
  if (textLower.includes('data protection') || textLower.includes('gdpr') || textLower.includes('privacy')) {
    compliance.push({
      status: 'compliant' as const,
      area: 'Data Protection',
      details: 'Data protection measures included'
    });
  } else {
    compliance.push({
      status: 'non-compliant' as const,
      area: 'Data Protection',
      details: 'Missing data protection clauses'
    });
  }
  
  if (textLower.includes('dispute') || textLower.includes('arbitration') || textLower.includes('mediation')) {
    compliance.push({
      status: 'compliant' as const,
      area: 'Dispute Resolution',
      details: 'Dispute resolution mechanism defined'
    });
  } else {
    compliance.push({
      status: 'warning' as const,
      area: 'Dispute Resolution',
      details: 'No dispute resolution process specified'
    });
  }
  
  return compliance;
}

function extractDates(text: string) {
  const dates = [];
  
  // Simple date patterns
  const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi;
  const dateMatches = text.match(datePattern);
  
  if (dateMatches) {
    dateMatches.forEach(match => {
      dates.push({
        event: 'Contract Date',
        date: match,
        importance: 'important' as const
      });
    });
  }
  
  // Extract period-based dates
  const periodPattern = /within\s+(\d+)\s+(days?|months?|years?)/gi;
  const periodMatches = text.match(periodPattern);
  
  if (periodMatches) {
    periodMatches.forEach(match => {
      dates.push({
        event: 'Deadline',
        date: match,
        importance: 'critical' as const
      });
    });
  }
  
  return dates;
}

function extractFirstDate(text: string): string | undefined {
  const datePattern = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i;
  const match = text.match(datePattern);
  return match ? match[0] : undefined;
}

function generateSummary(text: string, keyTerms: any[], risks: any[]): string {
  const wordCount = text.split(/\s+/).length;
  const highRisks = risks.filter(r => r.level === 'high').length;
  const mediumRisks = risks.filter(r => r.level === 'medium').length;
  
  return `Contract analyzed: ${wordCount} words processed. Found ${keyTerms.length} key terms, ${highRisks} high-risk and ${mediumRisks} medium-risk items requiring attention.`;
}

function calculateScore(risks: any[], compliance: any[]): number {
  let score = 100;
  
  // Deduct points for risks
  risks.forEach(risk => {
    if (risk.level === 'high') score -= 15;
    else if (risk.level === 'medium') score -= 10;
    else score -= 5;
  });
  
  // Deduct points for non-compliance
  compliance.forEach(item => {
    if (item.status === 'non-compliant') score -= 10;
    else if (item.status === 'warning') score -= 5;
  });
  
  return Math.max(0, Math.min(100, score));
}