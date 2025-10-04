import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { getCorsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';
import type { Database } from '../../types/database.ts';

/**
 * Batch Processor Edge Function
 * Processes batch upload items asynchronously
 * Triggered by agent tasks or cron job
 */

const MAX_RETRIES = 2;
const PROCESSING_TIMEOUT = 120000; // 2 minutes per item

interface BatchProcessorPayload {
  batch_upload_id: string;
  settings?: {
    autoAnalyze?: boolean;
    autoMatchVendors?: boolean;
    createUnmatchedVendors?: boolean;
  };
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const supabase = createAdminClient();

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const payload: BatchProcessorPayload = await req.json();
    const { batch_upload_id, settings } = payload;

    if (!batch_upload_id) {
      throw new Error('batch_upload_id is required');
    }

    // Get batch upload details
    const { data: batch, error: batchError } = await supabase
      .from('batch_uploads')
      .select('*, items:batch_upload_items(*)')
      .eq('id', batch_upload_id)
      .single();

    if (batchError || !batch) {
      throw new Error(`Batch upload not found: ${batch_upload_id}`);
    }

    // Update batch status to processing
    await supabase
      .from('batch_uploads')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', batch_upload_id);

    // Get pending items
    const pendingItems = batch.items?.filter((item: any) => item.status === 'pending') || [];

    console.log(`Processing ${pendingItems.length} pending items for batch ${batch_upload_id}`);

    // Process each item sequentially
    for (const item of pendingItems) {
      await processItem(supabase, item, batch, settings);
    }

    // Final batch status update is handled by trigger
    console.log(`Batch ${batch_upload_id} processing complete`);

    return new Response(
      JSON.stringify({
        success: true,
        batchId: batch_upload_id,
        processedItems: pendingItems.length,
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Batch processor error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

/**
 * Process a single batch item
 */
async function processItem(supabase: any, item: any, batch: any, settings: any) {
  const startTime = Date.now();

  try {
    // Update item status to processing
    await supabase
      .from('batch_upload_items')
      .update({ status: 'processing', started_at: new Date().toISOString() })
      .eq('id', item.id);

    // Get file from storage
    const bucket = item.entity_type === 'contract' ? 'contracts' : 'vendor-documents';
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(item.file_path);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Convert blob to text for processing
    const fileText = await fileBlob.text();

    if (item.entity_type === 'contract') {
      await processContractItem(supabase, item, fileText, batch.enterprise_id, settings);
    } else if (item.entity_type === 'vendor') {
      await processVendorItem(supabase, item, fileText, batch.enterprise_id, settings);
    }

    // Update item as completed
    await supabase
      .from('batch_upload_items')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', item.id);

    const processingTime = Date.now() - startTime;
    console.log(`Item ${item.id} processed successfully in ${processingTime}ms`);
  } catch (error) {
    console.error(`Error processing item ${item.id}:`, error);

    // Check if we should retry
    const shouldRetry = item.retry_count < MAX_RETRIES;

    if (shouldRetry) {
      await supabase
        .from('batch_upload_items')
        .update({
          status: 'pending',
          retry_count: item.retry_count + 1,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', item.id);
    } else {
      await supabase
        .from('batch_upload_items')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_code: 'PROCESSING_FAILED',
          processed_at: new Date().toISOString(),
        })
        .eq('id', item.id);
    }
  }
}

/**
 * Process a contract batch item
 */
async function processContractItem(
  supabase: any,
  item: any,
  fileText: string,
  enterpriseId: string,
  settings: any
) {
  // Step 1: Classify document as contract
  const classificationResult = await classifyDocument(fileText);

  if (!classificationResult.isContract) {
    throw new Error(`File is not a contract: ${classificationResult.summary}`);
  }

  // Step 2: Extract vendor/counterparty information
  const vendorInfo = await extractVendorFromContract(supabase, fileText, enterpriseId);

  // Step 3: Match or create vendor
  let vendorId: string | null = null;

  if (settings?.autoMatchVendors && vendorInfo) {
    vendorId = await matchOrCreateVendor(supabase, vendorInfo, enterpriseId, item.id, settings);
  }

  // Step 4: Create contract
  const { data: contract, error: contractError } = await supabase.from('contracts').insert({
    title: item.file_name.replace(/\.[^/.]+$/, ''), // Remove file extension
    file_name: item.file_name,
    file_type: item.mime_type,
    storage_id: item.file_path,
    vendor_id: vendorId,
    status: 'draft',
    analysis_status: settings?.autoAnalyze ? 'pending' : 'none',
    enterprise_id: enterpriseId,
    created_by: (await supabase.from('batch_uploads').select('uploaded_by').eq('id', item.batch_upload_id).single()).data?.uploaded_by,
  }).select().single();

  if (contractError) {
    throw contractError;
  }

  // Update item with contract ID
  await supabase
    .from('batch_upload_items')
    .update({ entity_id: contract.id })
    .eq('id', item.id);

  // Step 5: Queue analysis if auto-analyze is enabled
  if (settings?.autoAnalyze) {
    const agentId = await getAgentId(supabase, 'secretary');
    await supabase.from('agent_tasks').insert({
      agent_id: agentId,
      task_type: 'analyze_contract',
      priority: 6,
      payload: { contract_id: contract.id },
      contract_id: contract.id,
      enterprise_id: enterpriseId,
    });
  }

  console.log(`Contract created: ${contract.id} for item ${item.id}`);
}

/**
 * Process a vendor batch item (CSV import)
 */
async function processVendorItem(
  supabase: any,
  item: any,
  fileText: string,
  enterpriseId: string,
  settings: any
) {
  // Parse CSV data (simplified - production would use a CSV parser library)
  const lines = fileText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());

  // For now, just create a basic vendor record
  const vendorData: any = {
    name: item.file_name.replace(/\.[^/.]+$/, ''),
    enterprise_id: enterpriseId,
    status: 'uncategorized',
    created_by: (await supabase.from('batch_uploads').select('uploaded_by').eq('id', item.batch_upload_id).single()).data?.uploaded_by,
  };

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .insert(vendorData)
    .select()
    .single();

  if (vendorError) {
    throw vendorError;
  }

  // Update item with vendor ID
  await supabase
    .from('batch_upload_items')
    .update({ entity_id: vendor.id })
    .eq('id', item.id);

  // Queue vendor categorization task
  const agentId = await getAgentId(supabase, 'vendor');
  await supabase.from('agent_tasks').insert({
    agent_id: agentId,
    task_type: 'vendor_auto_categorization',
    priority: 5,
    payload: { vendor_id: vendor.id },
    enterprise_id: enterpriseId,
  });

  console.log(`Vendor created: ${vendor.id} for item ${item.id}`);
}

/**
 * Classify document using document-classifier
 */
async function classifyDocument(content: string): Promise<any> {
  // Call document-classifier function
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/document-classifier`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
    },
    body: JSON.stringify({ content }),
  });

  const result = await response.json();
  return result.classification || { isContract: false, summary: 'Classification failed' };
}

/**
 * Extract vendor information from contract
 */
async function extractVendorFromContract(supabase: any, contractText: string, enterpriseId: string): Promise<any> {
  // Get primary party info
  const { data: enterprise } = await supabase
    .from('enterprises')
    .select('primary_party_name, primary_party_aliases')
    .eq('id', enterpriseId)
    .single();

  // Simple extraction (production would use more sophisticated NLP)
  // This is a placeholder - will be enhanced in document-classifier
  const primaryParty = enterprise?.primary_party_name || '';
  const aliases = enterprise?.primary_party_aliases || [];

  // Look for common vendor patterns
  const vendorNameMatch = contractText.match(/Vendor:\s*([^\n]+)/i) ||
                         contractText.match(/Contractor:\s*([^\n]+)/i) ||
                         contractText.match(/Service Provider:\s*([^\n]+)/i);

  if (vendorNameMatch && vendorNameMatch[1]) {
    const candidateName = vendorNameMatch[1].trim();

    // Check if this is not the primary party
    if (
      !candidateName.toLowerCase().includes(primaryParty.toLowerCase()) &&
      !aliases.some((alias: string) => candidateName.toLowerCase().includes(alias.toLowerCase()))
    ) {
      return {
        name: candidateName,
        extractedFrom: 'contract_header',
      };
    }
  }

  return null;
}

/**
 * Match vendor or create new one
 */
async function matchOrCreateVendor(
  supabase: any,
  vendorInfo: any,
  enterpriseId: string,
  batchItemId: string,
  settings: any
): Promise<string | null> {
  const vendorName = vendorInfo.name;

  // Try exact match first (case-insensitive)
  const { data: exactMatch } = await supabase
    .from('vendors')
    .select('id, name')
    .eq('enterprise_id', enterpriseId)
    .ilike('name', vendorName)
    .is('deleted_at', null)
    .single();

  if (exactMatch) {
    // Create match suggestion with high confidence
    await supabase.from('vendor_match_suggestions').insert({
      enterprise_id: enterpriseId,
      batch_upload_item_id: batchItemId,
      suggested_vendor_name: vendorName,
      matched_vendor_id: exactMatch.id,
      confidence_score: 100,
      match_type: 'exact',
      matching_algorithm: 'exact_match',
      is_confirmed: true, // Auto-confirm exact matches
    });

    return exactMatch.id;
  }

  // Try fuzzy match using pg_trgm similarity
  const { data: fuzzyMatches } = await supabase.rpc('find_duplicate_vendors', {
    p_name: vendorName,
    p_enterprise_id: enterpriseId,
  });

  if (fuzzyMatches && fuzzyMatches.length > 0) {
    const bestMatch = fuzzyMatches[0];
    const confidenceScore = bestMatch.similarity_score * 100;

    // Create match suggestion
    await supabase.from('vendor_match_suggestions').insert({
      enterprise_id: enterpriseId,
      batch_upload_item_id: batchItemId,
      suggested_vendor_name: vendorName,
      matched_vendor_id: bestMatch.id,
      confidence_score: confidenceScore,
      match_type: 'fuzzy',
      matching_algorithm: 'trigram_similarity',
      is_confirmed: confidenceScore >= 90, // Auto-confirm high-confidence matches
      similarity_details: { similarity_score: bestMatch.similarity_score },
    });

    if (confidenceScore >= 90) {
      return bestMatch.id;
    } else if (confidenceScore >= 50) {
      // Medium confidence - don't auto-assign, wait for user review
      return null;
    }
  }

  // No good match found - create new vendor if enabled
  if (settings?.createUnmatchedVendors) {
    const { data: newVendor } = await supabase
      .from('vendors')
      .insert({
        name: vendorName,
        enterprise_id: enterpriseId,
        status: 'uncategorized',
        category: 'other',
        created_by: (await supabase.from('batch_uploads').select('uploaded_by').eq('enterprise_id', enterpriseId).limit(1).single()).data?.uploaded_by,
      })
      .select()
      .single();

    if (newVendor) {
      // Create match suggestion showing we created a new vendor
      await supabase.from('vendor_match_suggestions').insert({
        enterprise_id: enterpriseId,
        batch_upload_item_id: batchItemId,
        suggested_vendor_name: vendorName,
        created_vendor_id: newVendor.id,
        confidence_score: 0,
        match_type: 'new',
        matching_algorithm: 'no_match',
        is_confirmed: true,
      });

      return newVendor.id;
    }
  }

  return null;
}

/**
 * Get agent ID by type
 */
async function getAgentId(supabase: any, agentType: string): Promise<string> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('type', agentType)
    .eq('is_active', true)
    .single();

  return data?.id || crypto.randomUUID();
}
