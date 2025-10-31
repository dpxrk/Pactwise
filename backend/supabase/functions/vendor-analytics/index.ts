// Vendor Analytics API Endpoint
// Powered by VendorAgent AI for comprehensive vendor analysis

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';
import { VendorAgent } from '../local-agents/agents/vendor.ts';
import {
  VendorAnalyticsRequestSchema,
  validateRequestBody,
  createValidationErrorResponse,
} from '../_shared/validation-schemas.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createSupabaseClient(authHeader);

    // Get user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's enterprise
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('enterprise_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile?.enterprise_id) {
      return new Response(
        JSON.stringify({ error: 'User profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const enterpriseId = userProfile.enterprise_id;

    // Parse and validate request body
    let validatedRequest;
    try {
      const body = await req.json();
      validatedRequest = validateRequestBody(VendorAnalyticsRequestSchema, body);
    } catch (error) {
      console.error('Validation error:', error);
      return createValidationErrorResponse(error as Error);
    }

    const { vendorId } = validatedRequest;

    // Get comprehensive vendor data using database function
    const { data: vendorData, error: vendorDataError } = await supabaseClient
      .rpc('get_vendor_analytics_data', {
        p_vendor_id: vendorId,
        p_enterprise_id: enterpriseId
      });

    if (vendorDataError) {
      console.error('Error fetching vendor data:', vendorDataError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch vendor data', details: vendorDataError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vendorData) {
      return new Response(
        JSON.stringify({ error: 'Vendor not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create VendorAgent instance
    const vendorAgent = new VendorAgent();

    // Prepare vendor data for agent processing
    const vendorInput = {
      vendorId: vendorData.vendor.id,
      name: vendorData.vendor.name,
      category: vendorData.vendor.category,
      contractCount: vendorData.spend.contract_count,
      totalSpend: vendorData.spend.total_contract_value,
      activeContracts: vendorData.spend.active_contract_count,
      performanceHistory: (vendorData.performance_history || []).map((ph: any) => ({
        month: ph.month,
        score: ph.score || 0,
        issues: 0 // Will be calculated from issues data
      })),
      deliveryMetrics: {
        onTimeRate: vendorData.vendor.performance_score || 0.86,
        qualityScore: vendorData.vendor.compliance_score || 0.92,
        responsiveness: 0.87 // Default or calculate from performance history
      },
      compliance: {
        insurance: vendorData.compliance.insurance_verified || false,
        certifications: vendorData.compliance.certifications || [],
        lastAudit: vendorData.compliance.last_audit_date || new Date().toISOString()
      },
      issues: (vendorData.issues || []).map((issue: any) => ({
        date: issue.date,
        type: issue.type,
        severity: issue.severity
      }))
    };

    // Process vendor through AI agent
    const analysisResult = await vendorAgent.process(vendorInput, {
      vendorId: vendorId,
      analysisType: 'specific',
      userId: user.id,
      enterpriseId: enterpriseId
    });

    // Create agent task record for tracking
    const { error: taskError } = await supabaseClient
      .from('agent_tasks')
      .insert({
        agent_id: null, // Will be set to actual agent ID when agent system is initialized
        task_type: 'vendor_analysis',
        priority: 5,
        status: 'completed',
        payload: { vendorId, analysisType: 'specific' },
        result: analysisResult,
        vendor_id: vendorId,
        enterprise_id: enterpriseId,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });

    if (taskError) {
      console.error('Error creating agent task:', taskError);
      // Don't fail the request, just log the error
    }

    // Store insights if generated
    if (analysisResult.success && analysisResult.insights && analysisResult.insights.length > 0) {
      const insightsToInsert = analysisResult.insights.map((insight: any) => ({
        agent_id: null, // Will be set when agent system is initialized
        insight_type: insight.type,
        title: insight.title,
        description: insight.description,
        severity: insight.severity,
        confidence_score: insight.confidenceScore || 0.5,
        data: insight.data || {},
        vendor_id: vendorId,
        is_actionable: true,
        enterprise_id: enterpriseId
      }));

      const { error: insightsError } = await supabaseClient
        .from('agent_insights')
        .insert(insightsToInsert);

      if (insightsError) {
        console.error('Error storing insights:', insightsError);
        // Don't fail the request
      }
    }

    // Format response
    const response = {
      success: true,
      vendorId: vendorId,
      analysis: analysisResult.data,
      insights: analysisResult.insights || [],
      metadata: {
        analysisDate: new Date().toISOString(),
        confidence: analysisResult.confidence || 0.85,
        rulesApplied: analysisResult.rulesApplied || []
      },
      rawData: vendorData // Include raw data for frontend use
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in vendor-analytics:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
