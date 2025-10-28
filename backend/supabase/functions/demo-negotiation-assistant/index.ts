import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

interface NegotiationRequest {
  negotiationData: string;
  context?: 'renewal' | 'new' | 'renegotiation';
}

interface NegotiationResponse {
  strategy: {
    likelihoodOfSuccess: number;
    potentialSavings: string;
    negotiationPower: 'strong' | 'moderate' | 'weak';
  };
  priorities: Array<{
    priority: 'high' | 'medium' | 'low' | 'quick-win';
    item: string;
    description: string;
    expectedOutcome?: string;
  }>;
  leveragePoints: string[];
  talkingPoints: Array<{
    stage: string;
    script: string;
    fallbackPosition?: string;
  }>;
  concessionsToOffer: string[];
  redLines: string[];
  alternativeProposals: Array<{
    proposal: string;
    tradeoff: string;
    benefit: string;
  }>;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { negotiationData, context = 'renegotiation' } = await req.json() as NegotiationRequest;

    if (!negotiationData) {
      return new Response(
        JSON.stringify({ error: 'Negotiation data is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze negotiation parameters
    const strategy = analyzeNegotiationStrategy(negotiationData, context);

    return new Response(
      JSON.stringify(strategy),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error generating negotiation strategy:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate strategy' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeNegotiationStrategy(data: string, context: string): NegotiationResponse {
  // Extract current and desired terms
  const currentTerms = extractCurrentTerms(data);
  const desiredTerms = extractDesiredTerms(data);
  
  // Analyze gaps and opportunities
  const gaps = analyzeGaps(currentTerms, desiredTerms);
  const leveragePoints = identifyLeveragePoints(data, currentTerms);
  
  // Generate negotiation strategy
  const strategy = calculateStrategy(gaps, leveragePoints, context);
  const priorities = prioritizeNegotiationPoints(gaps, currentTerms, desiredTerms);
  const talkingPoints = generateTalkingPoints(priorities, leveragePoints, context);
  const concessionsToOffer = identifyPossibleConcessions(currentTerms, desiredTerms);
  const redLines = identifyRedLines(desiredTerms);
  const alternativeProposals = generateAlternatives(gaps, currentTerms, desiredTerms);

  return {
    strategy,
    priorities,
    leveragePoints,
    talkingPoints,
    concessionsToOffer,
    redLines,
    alternativeProposals
  };
}

function extractCurrentTerms(data: string): Record<string, unknown> {
  const terms: Record<string, unknown> = {};
  
  // Extract contract value
  const valueMatch = data.match(/current[^:]*:\s*\$?([\d,]+k?m?)/i);
  if (valueMatch) {
    terms.value = parseAmount(valueMatch[1]);
  }
  
  // Extract payment terms
  const paymentMatch = data.match(/payment[^:]*:\s*net\s*(\d+)/i);
  if (paymentMatch) {
    terms.paymentDays = parseInt(paymentMatch[1]);
  }
  
  // Extract SLA/service levels
  const slaMatch = data.match(/(\d+\.?\d*)%?\s*(uptime|sla|availability)/i);
  if (slaMatch) {
    terms.sla = parseFloat(slaMatch[1]);
  }
  
  // Extract support terms
  if (data.toLowerCase().includes('24/7')) {
    terms.support = '24/7';
  } else if (data.toLowerCase().includes('business hours')) {
    terms.support = 'business hours';
  }
  
  // Extract price increase terms
  const increaseMatch = data.match(/(\d+)%?\s*(cap|increase|escalation)/i);
  if (increaseMatch) {
    terms.priceIncreaseCap = parseInt(increaseMatch[1]);
  } else if (data.toLowerCase().includes('uncapped')) {
    terms.priceIncreaseCap = null;
  }
  
  return terms;
}

function extractDesiredTerms(data: string): Record<string, unknown> {
  const terms: Record<string, unknown> = {};
  
  // Look for desired/target/want patterns
  const sections = data.split(/desired|target|want/i);
  if (sections.length > 1) {
    const desiredSection = sections[1];
    
    const valueMatch = desiredSection.match(/\$?([\d,]+k?m?)/);
    if (valueMatch) {
      terms.value = parseAmount(valueMatch[1]);
    }
    
    const paymentMatch = desiredSection.match(/net\s*(\d+)/i);
    if (paymentMatch) {
      terms.paymentDays = parseInt(paymentMatch[1]);
    }
    
    const slaMatch = desiredSection.match(/(\d+\.?\d*)%?\s*(uptime|sla|availability)/i);
    if (slaMatch) {
      terms.sla = parseFloat(slaMatch[1]);
    }
    
    if (desiredSection.toLowerCase().includes('24/7')) {
      terms.support = '24/7';
    }
    
    const capMatch = desiredSection.match(/(\d+)%?\s*cap/i);
    if (capMatch) {
      terms.priceIncreaseCap = parseInt(capMatch[1]);
    }
  }
  
  return terms;
}

function parseAmount(amount: string): number {
  let value = amount.toLowerCase().replace(/,/g, '');
  if (value.includes('k')) {
    return parseFloat(value.replace('k', '')) * 1000;
  } else if (value.includes('m')) {
    return parseFloat(value.replace('m', '')) * 1000000;
  }
  return parseFloat(value);
}

function analyzeGaps(current: Record<string, unknown>, desired: Record<string, unknown>): unknown[] {
  const gaps = [];
  
  if (current.value && desired.value) {
    const reduction = ((current.value - desired.value) / current.value) * 100;
    gaps.push({
      area: 'price',
      current: current.value,
      desired: desired.value,
      gap: reduction,
      difficulty: reduction > 15 ? 'high' : reduction > 10 ? 'medium' : 'low'
    });
  }
  
  if (current.paymentDays && desired.paymentDays) {
    gaps.push({
      area: 'payment',
      current: current.paymentDays,
      desired: desired.paymentDays,
      gap: current.paymentDays - desired.paymentDays,
      difficulty: 'low'
    });
  }
  
  if (current.sla && desired.sla) {
    const slaGap = desired.sla - current.sla;
    gaps.push({
      area: 'sla',
      current: current.sla,
      desired: desired.sla,
      gap: slaGap,
      difficulty: slaGap > 2 ? 'high' : 'medium'
    });
  }
  
  if (current.support !== desired.support && desired.support === '24/7') {
    gaps.push({
      area: 'support',
      current: current.support,
      desired: desired.support,
      gap: 'upgrade',
      difficulty: 'medium'
    });
  }
  
  if (!current.priceIncreaseCap && desired.priceIncreaseCap) {
    gaps.push({
      area: 'priceProtection',
      current: 'uncapped',
      desired: `${desired.priceIncreaseCap}% cap`,
      gap: 'new requirement',
      difficulty: 'medium'
    });
  }
  
  return gaps;
}

function identifyLeveragePoints(data: string, currentTerms: Record<string, unknown>): string[] {
  const leverage = [];
  const dataLower = data.toLowerCase();
  
  // Check for relationship length
  const yearMatch = data.match(/(\d+)\s*(year|yr)/i);
  if (yearMatch && parseInt(yearMatch[1]) >= 2) {
    leverage.push(`Long-term partnership of ${yearMatch[1]} years demonstrates loyalty`);
  }
  
  // Check for payment history
  if (dataLower.includes('on-time') || dataLower.includes('consistent payment')) {
    leverage.push('Consistent on-time payment history');
  }
  
  // Check for volume
  if (currentTerms.value > 100000) {
    leverage.push(`Significant contract value of $${currentTerms.value.toLocaleString()}`);
  }
  
  // Check for growth potential
  if (dataLower.includes('growth') || dataLower.includes('expansion')) {
    leverage.push('Potential for business expansion and increased volume');
  }
  
  // Market alternatives
  if (dataLower.includes('competitor') || dataLower.includes('alternative')) {
    leverage.push('Competitive alternatives available in the market');
  }
  
  // Multi-year commitment
  if (dataLower.includes('multi-year') || dataLower.includes('3 year') || dataLower.includes('5 year')) {
    leverage.push('Willing to commit to multi-year agreement');
  }
  
  // Default leverage points if none found
  if (leverage.length === 0) {
    leverage.push('Current market conditions favor buyers');
    leverage.push('Opportunity to streamline vendor portfolio');
  }
  
  return leverage;
}

function calculateStrategy(gaps: unknown[], leverage: string[], context: string): Record<string, unknown> {
  // Calculate likelihood of success based on gaps and leverage
  let baseSuccess = 60;
  
  // Adjust for gap difficulty
  gaps.forEach(gap => {
    if (gap.difficulty === 'high') baseSuccess -= 10;
    else if (gap.difficulty === 'low') baseSuccess += 5;
  });
  
  // Adjust for leverage points
  baseSuccess += leverage.length * 5;
  
  // Adjust for context
  if (context === 'renewal') baseSuccess += 10;
  else if (context === 'new') baseSuccess -= 5;
  
  const likelihoodOfSuccess = Math.min(95, Math.max(25, baseSuccess));
  
  // Calculate potential savings
  const priceGap = gaps.find(g => g.area === 'price');
  const potentialSavings = priceGap 
    ? `$${Math.round((priceGap.current - priceGap.desired) / 12).toLocaleString()}/month`
    : '$10,000-25,000/year';
  
  // Determine negotiation power
  let negotiationPower: 'strong' | 'moderate' | 'weak' = 'moderate';
  if (leverage.length >= 4 && likelihoodOfSuccess > 70) {
    negotiationPower = 'strong';
  } else if (leverage.length <= 2 || likelihoodOfSuccess < 50) {
    negotiationPower = 'weak';
  }
  
  return {
    likelihoodOfSuccess,
    potentialSavings,
    negotiationPower
  };
}

function prioritizeNegotiationPoints(gaps: unknown[], current: Record<string, unknown>, desired: Record<string, unknown>): unknown[] {
  const priorities = [];
  
  gaps.forEach(gap => {
    let priority: 'high' | 'medium' | 'low' | 'quick-win' = 'medium';
    let description = '';
    let expectedOutcome = '';
    
    switch (gap.area) {
      case 'price':
        priority = gap.gap > 10 ? 'high' : 'medium';
        description = `Target ${gap.gap.toFixed(1)}% price reduction`;
        expectedOutcome = `Achieve 5-${gap.gap.toFixed(0)}% reduction`;
        break;
      
      case 'payment':
        priority = 'quick-win';
        description = `Improve payment terms from Net ${gap.current} to Net ${gap.desired}`;
        expectedOutcome = 'High likelihood of acceptance';
        break;
      
      case 'sla':
        priority = gap.gap > 2 ? 'high' : 'medium';
        description = `Increase SLA from ${gap.current}% to ${gap.desired}%`;
        expectedOutcome = 'May require additional investment';
        break;
      
      case 'support':
        priority = 'medium';
        description = `Upgrade support from ${gap.current} to ${gap.desired}`;
        expectedOutcome = 'Negotiate included in base price';
        break;
      
      case 'priceProtection':
        priority = 'high';
        description = `Implement ${desired.priceIncreaseCap}% annual price increase cap`;
        expectedOutcome = 'Critical for budget predictability';
        break;
    }
    
    priorities.push({
      priority,
      item: gap.area,
      description,
      expectedOutcome
    });
  });
  
  // Sort by priority
  const order = { 'high': 0, 'medium': 1, 'quick-win': 2, 'low': 3 };
  priorities.sort((a, b) => order[a.priority] - order[b.priority]);
  
  return priorities;
}

function generateTalkingPoints(priorities: unknown[], leverage: string[], context: string): unknown[] {
  const talkingPoints = [];
  
  // Opening statement
  talkingPoints.push({
    stage: 'Opening',
    script: context === 'renewal' 
      ? `We've valued our partnership over the past contract term and are looking forward to continuing. Based on our experience and current market conditions, we'd like to discuss some adjustments that will ensure mutual success.`
      : `We're excited about the potential partnership. To move forward, we need to align on terms that reflect both market standards and our specific requirements.`,
    fallbackPosition: 'Emphasize long-term partnership value over short-term gains'
  });
  
  // Value proposition
  if (leverage.length > 0) {
    talkingPoints.push({
      stage: 'Value Proposition',
      script: `It's important to note that ${leverage[0].toLowerCase()}. Additionally, ${leverage.length > 1 ? leverage[1].toLowerCase() : 'we bring stability and growth potential to this partnership'}.`,
      fallbackPosition: 'Highlight future business opportunities and referral potential'
    });
  }
  
  // Primary ask
  const highPriority = priorities.find(p => p.priority === 'high');
  if (highPriority) {
    talkingPoints.push({
      stage: 'Primary Ask',
      script: `Our primary concern is ${highPriority.description.toLowerCase()}. This is critical because ${highPriority.expectedOutcome || 'it aligns with our strategic objectives'}.`,
      fallbackPosition: 'Propose phased implementation or performance-based adjustments'
    });
  }
  
  // Win-win proposal
  talkingPoints.push({
    stage: 'Win-Win Proposal',
    script: `If we can achieve these adjustments, we're prepared to ${context === 'renewal' ? 'extend for an additional 2-3 years' : 'move forward immediately'}, providing you with guaranteed revenue and the opportunity to grow together.`,
    fallbackPosition: 'Offer volume commitments or exclusive partnership in specific areas'
  });
  
  // Closing
  talkingPoints.push({
    stage: 'Closing',
    script: `Let's work together to find a solution that works for both parties. What aspects of this proposal resonate with you, and where do you see flexibility?`,
    fallbackPosition: 'Request time to consider counter-proposals and schedule follow-up'
  });
  
  return talkingPoints;
}

function identifyPossibleConcessions(current: Record<string, unknown>, desired: Record<string, unknown>): string[] {
  const concessions = [];
  
  // Payment terms flexibility
  if (desired.paymentDays && desired.paymentDays < current.paymentDays) {
    concessions.push('Flexible on payment terms if other priorities are met');
  }
  
  // Volume commitments
  concessions.push('Willing to increase volume commitment by 10-20%');
  
  // Contract length
  concessions.push('Open to longer contract term for better pricing');
  
  // Implementation timeline
  concessions.push('Flexible on implementation timeline');
  
  // Reference and case study
  concessions.push('Willing to serve as reference customer');
  
  return concessions.slice(0, 4);
}

function identifyRedLines(desired: Record<string, unknown>): string[] {
  const redLines = [];
  
  // Critical requirements that cannot be compromised
  if (desired.sla && desired.sla >= 99) {
    redLines.push(`Minimum ${desired.sla}% SLA is non-negotiable due to business criticality`);
  }
  
  if (desired.priceIncreaseCap) {
    redLines.push('Must have predictable pricing with defined caps');
  }
  
  redLines.push('Data security and compliance standards cannot be compromised');
  redLines.push('Termination for convenience clause must be included');
  
  return redLines;
}

function generateAlternatives(gaps: unknown[], current: Record<string, unknown>, desired: Record<string, unknown>): unknown[] {
  const alternatives = [];
  
  // Price vs volume trade-off
  const priceGap = gaps.find(g => g.area === 'price');
  if (priceGap) {
    alternatives.push({
      proposal: 'Tiered pricing based on volume commitments',
      tradeoff: `Commit to 20% higher volume for ${(priceGap.gap / 2).toFixed(0)}% discount`,
      benefit: 'Achieves cost reduction while increasing vendor revenue'
    });
  }
  
  // Payment terms vs discount
  alternatives.push({
    proposal: 'Early payment discount',
    tradeoff: 'Net 15 payment for additional 2% discount',
    benefit: 'Improves vendor cash flow while reducing costs'
  });
  
  // Service level trade-offs
  const slaGap = gaps.find(g => g.area === 'sla');
  if (slaGap) {
    alternatives.push({
      proposal: 'Performance-based SLA pricing',
      tradeoff: 'Pay premium only when higher SLA is actually delivered',
      benefit: 'Aligns cost with actual service delivery'
    });
  }
  
  // Bundling opportunities
  alternatives.push({
    proposal: 'Bundle additional services for better overall value',
    tradeoff: 'Add complementary services for marginal cost increase',
    benefit: 'Increases value while strengthening partnership'
  });
  
  return alternatives;
}