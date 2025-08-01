import { withMiddleware } from '../_shared/middleware.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
// Configuration may be used in future implementations
// import { config } from '../_shared/config.ts';
import { localAnalyzer, localChatAgent, localEmbedding } from '../_shared/local-ai.ts';

withMiddleware(async (context) => {
  const { req, user } = context;
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;
  
  // Create supabase client from context
  const supabase = createSupabaseClient();

  // Route handling
  if (method === 'POST' && pathname === '/ai-analysis/contracts') {
    const { contractId, fileContent } = await req.json();

    if (!contractId || !fileContent) {
      return new Response(JSON.stringify({ error: 'Contract ID and file content required' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Update analysis status
    await supabase
      .from('contracts')
      .update({
        analysis_status: 'processing',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)
      .eq('enterprise_id', user.enterprise_id);

    try {
      // Analyze contract with local AI
      const analysis = await localAnalyzer.analyzeContract(fileContent);

      // Update contract with extracted data
      const updateData = {
        extracted_parties: analysis.parties || [],
        extracted_start_date: analysis.startDate,
        extracted_end_date: analysis.endDate,
        extracted_payment_schedule: analysis.paymentSchedule || [],
        extracted_pricing: analysis.pricing || {},
        extracted_scope: analysis.scope,
        extracted_key_terms: analysis.keyTerms || [],
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        analysis_summary: analysis.summary,
        confidence_score: analysis.confidence,
      };

      await supabase
        .from('contracts')
        .update(updateData)
        .eq('id', contractId);

      // Extract and save clauses
      if (analysis.clauses && Array.isArray(analysis.clauses)) {
        const clauses = analysis.clauses.map(clause => ({
          contract_id: contractId,
          clause_type: clause.type,
          clause_text: clause.content,
          risk_level: clause.importance === 'high' ? 'high' : clause.importance === 'medium' ? 'medium' : 'low',
          risk_reason: `${clause.importance} importance clause`,
          confidence_score: analysis.confidence,
          enterprise_id: user.enterprise_id,
        }));

        await supabase
          .from('contract_clauses')
          .insert(clauses);
      }

      // Generate insights
      if (analysis.risks && analysis.risks.length > 0) {
        const agentId = await getAgentId(supabase, 'legal');
        const insights = analysis.risks.map(risk => ({
          agent_id: agentId,
          insight_type: 'contract_risk',
          title: risk.title,
          description: risk.description,
          severity: risk.severity || 'medium',
          confidence_score: risk.confidence || 0.7,
          data: { risk },
          contract_id: contractId,
          is_actionable: true,
          enterprise_id: user.enterprise_id,
        }));

        await supabase
          .from('agent_insights')
          .insert(insights);
      }

      return new Response(JSON.stringify({
        message: 'Analysis completed',
        analysis: updateData,
      }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (analysisError) {
      // Update status to failed
      await supabase
        .from('contracts')
        .update({
          analysis_status: 'failed',
          analysis_error: analysisError instanceof Error ? analysisError.message : 'Analysis failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', contractId);

      throw analysisError;
    }
  }

  if (method === 'POST' && pathname === '/ai-analysis/chat') {
    const { sessionId, message } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    let session;

    // Get or create session
    if (sessionId) {
      const { data } = await supabase
        .from('chat_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      session = data;
    } else {
      const { data } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: message.substring(0, 100),
          enterprise_id: user.enterprise_id,
        })
        .select()
        .single();

      session = data;
    }

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Get recent messages for context
    const { data: recentMessages } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', session.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get AI response from local agent
    const chatResponse = await localChatAgent.generateResponse(message, {
      recentMessages: recentMessages?.slice(0, 5), // Last 5 messages for context
      sessionId: session.id,
    });

    const aiResponse = chatResponse.message;
    const totalTokens = Math.floor(message.length / 4); // Rough token estimate

    // Save messages
    await supabase
      .from('chat_messages')
      .insert([
        {
          session_id: session.id,
          role: 'user',
          content: message,
          tokens: Math.floor(message.length / 4), // Rough token estimate
        },
        {
          session_id: session.id,
          role: 'assistant',
          content: aiResponse,
          tokens: Math.floor((aiResponse?.length || 0) / 4), // Rough token estimate
        },
      ]);

    // Update session tokens
    await supabase
      .from('chat_sessions')
      .update({
        total_tokens: (session.total_tokens || 0) + totalTokens,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    return new Response(JSON.stringify({
      sessionId: session.id,
      message: aiResponse,
      tokens: totalTokens,
    }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 200,
    });
  }

  if (method === 'POST' && pathname === '/ai-analysis/embeddings') {
    const { text, entityType, entityId } = await req.json();

    if (!text || !entityType || !entityId) {
      return new Response(JSON.stringify({ error: 'Text, entity type, and entity ID required' }), {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Generate embedding locally
    const embeddingResult = await localEmbedding.generateEmbedding(text);
    const vector = embeddingResult.vector;

    // Save embedding
    await supabase
      .from('embeddings')
      .insert({
        entity_type: entityType,
        entity_id: entityId,
        content: text,
        embedding: vector,
        enterprise_id: user.enterprise_id,
      });

    return new Response(JSON.stringify({ message: 'Embedding created' }), {
      headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
      status: 201,
    });
  }

  // Method not allowed
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
    status: 405,
  });
}, { requireAuth: true });

async function getAgentId(supabase: any, agentType: string): Promise<string> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('type', agentType)
    .eq('is_active', true)
    .single();

  return data?.id;
}