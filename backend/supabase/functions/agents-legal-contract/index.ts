/// <reference path="../../types/global.d.ts" />
/**
 * Legal Contract Agent - Advanced AI-powered contract analysis
 *
 * Capabilities:
 * - Comprehensive contract review and scoring
 * - Risk assessment and clause extraction
 * - Compliance checking
 * - Negotiation recommendations
 * - Template-based contract generation
 */

import { getCorsHeaders, handleCors } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';
import { validateRequest } from '../_shared/validation.ts';
import { handleError } from '../_shared/errors.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.17.1';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.ts';
import type {
  UserData,
  AnalyzeContractRequest,
  ExtractClausesRequest,
  AssessRiskRequest,
  ComplianceCheckRequest,
  GenerateRecommendationsRequest,
  CompareContractsRequest,
  AnalysisResult,
  ClauseScore,
  ExtractedClause,
  ContractInsight,
  RiskAssessment,
  RiskAnalysis,
  ComplianceIssue,
  NegotiationRecommendation,
  ContractComparison,
  AnalysisResponse,
  ClausesResponse,
  RiskAssessmentResponse,
  ComplianceCheckResponse,
  RecommendationsResponse,
  ComparisonResponse,
  Grade,
} from './types.ts';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY') || Deno.env.get('LLM_API_KEY'),
});

const MODEL = Deno.env.get('LLM_MODEL') || 'claude-3-5-sonnet-20241022';

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient(authHeader);

    // Get user context
    const { data: userData } = await supabase
      .from('users')
      .select('id, enterprise_id, role')
      .eq('auth_id', user.id)
      .single();

    if (!userData) {
      throw new Error('User not found');
    }

    const { method } = req;
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    // Route to appropriate handler
    switch (action) {
      case 'analyze':
        if (method === 'POST') {
          return await handleAnalyzeContract(req, supabase, userData);
        }
        break;

      case 'extract-clauses':
        if (method === 'POST') {
          return await handleExtractClauses(req, supabase, userData);
        }
        break;

      case 'assess-risk':
        if (method === 'POST') {
          return await handleAssessRisk(req, supabase, userData);
        }
        break;

      case 'compliance-check':
        if (method === 'POST') {
          return await handleComplianceCheck(req, supabase, userData);
        }
        break;

      case 'generate-recommendations':
        if (method === 'POST') {
          return await handleGenerateRecommendations(req, supabase, userData);
        }
        break;

      case 'compare':
        if (method === 'POST') {
          return await handleCompareContracts(req, supabase, userData);
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    throw new Error('Invalid request');

  } catch (error) {
    return handleError(error);
  }
});

/**
 * Main contract analysis endpoint
 * Provides comprehensive contract review with scoring
 */
async function handleAnalyzeContract(
  req: Request,
  supabase: SupabaseClient<Database>,
  userData: UserData
): Promise<Response> {
  const body = await req.json();
  const { contractId, contractText, contractType } = body as AnalyzeContractRequest;

  if (!contractId && !contractText) {
    throw new Error('Either contractId or contractText required');
  }

  let text = contractText;

  // Fetch contract from database if contractId provided
  if (contractId) {
    const { data: contract, error } = await supabase
      .from('contracts')
      .select('file_content, contract_type')
      .eq('id', contractId)
      .eq('enterprise_id', userData.enterprise_id)
      .single();

    if (error) throw error;
    text = contract.file_content;
  }

  // Create analysis task
  const { data: task, error: taskError } = await supabase
    .from('agent_tasks')
    .insert({
      agent_id: await getAgentId(supabase, 'legal', userData.enterprise_id),
      task_type: 'analyze_contract',
      priority: 7,
      status: 'processing',
      payload: { contractId, contractType },
      contract_id: contractId,
      enterprise_id: userData.enterprise_id,
      started_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (taskError) throw taskError;

  try {
    // Perform comprehensive analysis using Claude
    const analysisPrompt = buildAnalysisPrompt(text, contractType);

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4096,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: analysisPrompt,
      }],
    });

    const analysisResult = JSON.parse(message.content[0].text) as AnalysisResult;

    // Calculate overall score
    const overallScore = calculateOverallScore(analysisResult);
    const grade = calculateGrade(overallScore);

    // Extract and save clauses
    if (contractId && analysisResult.clauses) {
      await saveClauses(supabase, contractId, analysisResult.clauses, userData.enterprise_id);
    }

    // Create insights
    if (analysisResult.insights) {
      await createInsights(supabase, contractId, analysisResult.insights, userData);
    }

    // Update contract with analysis
    if (contractId) {
      await supabase
        .from('contracts')
        .update({
          overall_score: overallScore,
          grade,
          completeness_score: analysisResult.scores?.completeness,
          risk_coverage_score: analysisResult.scores?.risk_coverage,
          legal_compliance_score: analysisResult.scores?.legal_compliance,
          clarity_score: analysisResult.scores?.clarity,
          commercial_protection_score: analysisResult.scores?.commercial_protection,
          ai_analysis_completed: true,
          ai_analysis_date: new Date().toISOString(),
        })
        .eq('id', contractId);
    }

    // Update task as completed
    await supabase
      .from('agent_tasks')
      .update({
        status: 'completed',
        result: { overallScore, grade, ...analysisResult },
        completed_at: new Date().toISOString(),
      })
      .eq('id', task.id);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          taskId: task.id,
          overallScore,
          grade,
          ...analysisResult,
        },
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    // Update task as failed
    await supabase
      .from('agent_tasks')
      .update({
        status: 'failed',
        error: error.message,
      })
      .eq('id', task.id);

    throw error;
  }
}

/**
 * Extract and classify contract clauses
 */
async function handleExtractClauses(
  req: Request,
  supabase: SupabaseClient<Database>,
  userData: UserData
): Promise<Response> {
  const body = await req.json();
  const { contractId, contractText } = body as ExtractClausesRequest;

  const prompt = `
Extract and classify all significant clauses from this contract. For each clause:

1. Identify the clause type (e.g., Payment Terms, Termination, Liability, IP Rights, etc.)
2. Extract the exact text
3. Assess risk level (low, medium, high, critical)
4. Explain the risk or benefit
5. Provide recommendations if needed

Contract text:
${contractText}

Return as JSON array with structure:
[{
  "clause_type": "string",
  "clause_text": "string",
  "risk_level": "low|medium|high|critical",
  "risk_reason": "string",
  "recommendation": "string"
}]`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }],
  });

  const clauses = JSON.parse(message.content[0].text) as ExtractedClause[];

  // Save clauses to database
  if (contractId) {
    await saveClauses(supabase, contractId, clauses, userData.enterprise_id);
  }

  return new Response(
    JSON.stringify({ success: true, data: { clauses } }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

/**
 * Comprehensive risk assessment
 */
async function handleAssessRisk(
  req: Request,
  supabase: SupabaseClient<Database>,
  userData: UserData
): Promise<Response> {
  const body = await req.json();
  const { contractId, contractText, riskAreas } = body as AssessRiskRequest;

  const prompt = `
Perform a comprehensive risk assessment of this contract:

1. Identify all high-risk provisions
2. Assess liability exposure
3. Evaluate termination rights and exit clauses
4. Check for one-sided terms
5. Identify missing protections
6. Calculate overall risk score (0-100)
7. Provide mitigation strategies

Contract text:
${contractText}

Return detailed risk analysis as JSON:
{
  "overall_risk_score": number,
  "risk_level": "low|medium|high|critical",
  "risk_categories": {
    "liability": {"score": number, "issues": ["string"]},
    "termination": {"score": number, "issues": ["string"]},
    "payment": {"score": number, "issues": ["string"]},
    "intellectual_property": {"score": number, "issues": ["string"]},
    "compliance": {"score": number, "issues": ["string"]}
  },
  "critical_issues": ["string"],
  "recommendations": ["string"]
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }],
  });

  const riskAssessment = JSON.parse(message.content[0].text) as RiskAnalysis;

  // Create high-risk insights
  if (riskAssessment.critical_issues && contractId) {
    for (const issue of riskAssessment.critical_issues.slice(0, 5)) {
      await supabase.from('agent_insights').insert({
        agent_id: await getAgentId(supabase, 'legal', userData.enterprise_id),
        insight_type: 'risk_alert',
        title: 'Critical Risk Identified',
        description: issue,
        severity: 'critical',
        confidence_score: 0.9,
        contract_id: contractId,
        is_actionable: true,
        enterprise_id: userData.enterprise_id,
      });
    }
  }

  return new Response(
    JSON.stringify({ success: true, data: riskAssessment }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

/**
 * Compliance checking
 */
async function handleComplianceCheck(
  req: Request,
  supabase: SupabaseClient<Database>,
  userData: UserData
): Promise<Response> {
  const body = await req.json();
  const { contractText, jurisdiction, regulations } = body as ComplianceCheckRequest;

  const prompt = `
Check this contract for legal compliance:

Jurisdiction: ${jurisdiction}
Industry: ${industry || 'General'}

Verify compliance with:
1. Jurisdiction-specific requirements (e.g., GDPR for EU, CCPA for California)
2. Industry regulations (e.g., HIPAA for healthcare, SOX for public companies)
3. Required clauses (governing law, dispute resolution, etc.)
4. Data protection and privacy requirements
5. Anti-corruption and compliance standards

Contract text:
${contractText}

Return compliance report as JSON:
{
  "is_compliant": boolean,
  "compliance_score": number,
  "checks": {
    "jurisdiction_compliance": {"passed": boolean, "issues": ["string"]},
    "industry_compliance": {"passed": boolean, "issues": ["string"]},
    "data_protection": {"passed": boolean, "issues": ["string"]},
    "required_clauses": {"passed": boolean, "missing": ["string"]}
  },
  "recommendations": ["string"]
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }],
  });

  const complianceReport = JSON.parse(message.content[0].text);

  return new Response(
    JSON.stringify({ success: true, data: complianceReport }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

/**
 * Generate negotiation recommendations
 */
async function handleGenerateRecommendations(req: Request, supabase: SupabaseClient, userData: any) {
  const body = await req.json();
  const { contractId, analysisData } = body;

  const prompt = `
Based on this contract analysis, generate negotiation recommendations:

Analysis Summary:
${JSON.stringify(analysisData, null, 2)}

Provide:
1. Top 5 MUST-NEGOTIATE items (deal-breakers)
2. Important but negotiable items
3. Suggested alternative language for key provisions
4. Negotiation strategy and talking points
5. Potential trade-offs
6. Timeline and approach recommendations

Return as JSON:
{
  "must_negotiate": [{"item": "string", "current": "string", "proposed": "string", "reasoning": "string"}],
  "important_items": [{"item": "string", "rationale": "string"}],
  "alternative_language": {"provision_name": "suggested_text"},
  "strategy": {"approach": "string", "timeline": "string", "key_points": ["string"]},
  "trade_offs": [{"give": "string", "get": "string"}]
}`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3072,
    temperature: 0.3, // Slightly higher for creative recommendations
    messages: [{ role: 'user', content: prompt }],
  });

  const recommendations = JSON.parse(message.content[0].text);

  return new Response(
    JSON.stringify({ success: true, data: recommendations }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

/**
 * Compare two contracts
 */
async function handleCompareContracts(req: Request, supabase: SupabaseClient, userData: any) {
  const body = await req.json();
  const { contract1Text, contract2Text, purpose } = body;

  const prompt = `
Compare these two contracts and identify key differences:

Purpose: ${purpose || 'General comparison'}

Contract 1:
${contract1Text}

---

Contract 2:
${contract2Text}

Analyze:
1. Material differences in terms
2. Which contract is more favorable (and why)
3. Risk profile comparison
4. Clause-by-clause comparison
5. Recommendations for harmonization or selection

Return comparison as JSON`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    temperature: 0.1,
    messages: [{ role: 'user', content: prompt }],
  });

  const comparison = JSON.parse(message.content[0].text);

  return new Response(
    JSON.stringify({ success: true, data: comparison }),
    {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    },
  );
}

// ==================== Helper Functions ====================

function buildAnalysisPrompt(contractText: string, contractType: string): string {
  return `
You are a senior legal contract analyst. Perform a comprehensive analysis of this ${contractType || 'contract'}.

Analyze and score (0-100) on these dimensions:
1. **Completeness**: Are all essential clauses present?
2. **Risk Coverage**: Are risks adequately addressed?
3. **Legal Compliance**: Does it meet legal requirements?
4. **Clarity**: Is language clear and unambiguous?
5. **Commercial Protection**: Are commercial interests protected?

Provide:
- Detailed scores for each dimension
- Key findings (strengths and weaknesses)
- Missing critical clauses
- Risky provisions
- Actionable recommendations
- Overall assessment

Contract text:
${contractText}

Return analysis as JSON:
{
  "scores": {
    "completeness": number,
    "risk_coverage": number,
    "legal_compliance": number,
    "clarity": number,
    "commercial_protection": number
  },
  "strengths": ["string"],
  "weaknesses": ["string"],
  "missing_clauses": ["string"],
  "risky_provisions": [{"provision": "string", "risk": "string", "recommendation": "string"}],
  "recommendations": ["string"],
  "summary": "string",
  "insights": [{"type": "string", "title": "string", "description": "string", "severity": "string"}]
}`;
}

function calculateOverallScore(analysis: any): number {
  const scores = analysis.scores || {};
  const weights = {
    completeness: 0.20,
    risk_coverage: 0.25,
    legal_compliance: 0.25,
    clarity: 0.15,
    commercial_protection: 0.15,
  };

  let weightedScore = 0;
  for (const [key, weight] of Object.entries(weights)) {
    weightedScore += (scores[key] || 50) * weight;
  }

  return Math.round(weightedScore * 10) / 10;
}

function calculateGrade(score: number): string {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 87) return 'A-';
  if (score >= 83) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 77) return 'B-';
  if (score >= 73) return 'C+';
  if (score >= 70) return 'C';
  if (score >= 67) return 'C-';
  if (score >= 63) return 'D+';
  if (score >= 60) return 'D';
  return 'F';
}

async function saveClauses(supabase: SupabaseClient, contractId: string, clauses: any[], enterpriseId: string) {
  const clauseRecords = clauses.map(clause => ({
    contract_id: contractId,
    clause_type: clause.clause_type,
    clause_text: clause.clause_text,
    risk_level: clause.risk_level,
    risk_reason: clause.risk_reason || clause.recommendation,
    confidence_score: 0.85,
    enterprise_id: enterpriseId,
  }));

  if (clauseRecords.length > 0) {
    await supabase.from('contract_clauses').insert(clauseRecords);
  }
}

async function createInsights(supabase: SupabaseClient, contractId: string, insights: any[], userData: any) {
  const insightRecords = insights.map(insight => ({
    agent_id: null, // Will be set by trigger or separate query
    insight_type: insight.type,
    title: insight.title,
    description: insight.description,
    severity: insight.severity || 'info',
    confidence_score: 0.8,
    contract_id: contractId,
    is_actionable: true,
    enterprise_id: userData.enterprise_id,
  }));

  if (insightRecords.length > 0) {
    await supabase.from('agent_insights').insert(insightRecords);
  }
}

async function getAgentId(supabase: SupabaseClient, agentType: string, enterpriseId: string): Promise<string> {
  const { data, error } = await supabase
    .from('agents')
    .select('id')
    .eq('type', agentType)
    .eq('enterprise_id', enterpriseId)
    .eq('is_active', true)
    .single();

  if (error || !data) {
    // Create agent if doesn't exist
    const { data: newAgent } = await supabase
      .from('agents')
      .insert({
        name: `${agentType.charAt(0).toUpperCase() + agentType.slice(1)} Agent`,
        type: agentType,
        enterprise_id: enterpriseId,
        is_active: true,
      })
      .select()
      .single();

    return newAgent?.id;
  }

  return data.id;
}
