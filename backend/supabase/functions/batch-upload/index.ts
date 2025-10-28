import { withMiddleware } from '../_shared/middleware.ts';
import { createErrorResponseSync, createSuccessResponse } from '../_shared/responses.ts';
import { getUserPermissions } from '../_shared/auth.ts';
import { z } from 'zod';
import { createAdminClient } from '../_shared/supabase.ts';
import type { Database } from '../../types/database.ts';

// Validation schemas
const uploadSettingsSchema = z.object({
  autoAnalyze: z.boolean().default(true),
  autoMatchVendors: z.boolean().default(true),
  createUnmatchedVendors: z.boolean().default(true),
});

const batchUploadMetadataSchema = z.object({
  uploadType: z.enum(['contracts', 'vendors']),
  settings: uploadSettingsSchema.optional(),
});

const MAX_BATCH_SIZE = 100;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file

export default withMiddleware(
  async (context) => {
    const { req, user: profile } = context;
    const supabase = createAdminClient();
    const url = new URL(req.url);
    const { pathname } = url;
    const { method } = req;

    // Get user's permissions
    const permissions = await getUserPermissions(supabase, profile, 'contracts');

    // ================================================================
    // POST /batch-upload - Create new batch upload
    // ================================================================
    if (method === 'POST' && pathname === '/batch-upload') {
      // Check create permission
      if (!permissions.canCreate) {
        return createErrorResponseSync('Insufficient permissions', 403, req);
      }

      const formData = await req.formData();
      const files: File[] = [];
      const metadataStr = formData.get('metadata') as string;

      if (!metadataStr) {
        return createErrorResponseSync('Missing metadata', 400, req);
      }

      const { uploadType, settings } = batchUploadMetadataSchema.parse(JSON.parse(metadataStr));

      // Extract files from formData
      for (const [key, value] of formData.entries()) {
        if (key.startsWith('file_') && value instanceof File) {
          files.push(value);
        }
      }

      if (files.length === 0) {
        return createErrorResponseSync('No files provided', 400, req);
      }

      if (files.length > MAX_BATCH_SIZE) {
        return createErrorResponseSync(`Maximum batch size is ${MAX_BATCH_SIZE} files`, 400, req);
      }

      // Validate file sizes
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          return createErrorResponseSync(
            `File ${file.name} exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
            400,
            req
          );
        }
      }

      // Create batch upload record
      const { data: batchUpload, error: batchError } = await supabase
        .from('batch_uploads')
        .insert({
          enterprise_id: profile.enterprise_id,
          upload_type: uploadType,
          status: 'uploading',
          total_items: files.length,
          uploaded_by: profile.id,
          settings: settings || {},
        })
        .select()
        .single();

      if (batchError) {
        throw batchError;
      }

      // Upload files to storage and create batch items
      const batchItems: unknown[] = [];
      const uploadErrors: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        const timestamp = Date.now();
        const randomId = crypto.randomUUID().split('-')[0];
        const filePath = `${profile.enterprise_id}/batch/${batchUpload.id}/${i}_${timestamp}-${randomId}.${fileExt}`;

        try {
          // Upload to storage
          const bucket = uploadType === 'contracts' ? 'contracts' : 'vendor-documents';
          const { error: uploadError } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadError) {
            uploadErrors.push(`${file.name}: ${uploadError.message}`);
            continue;
          }

          // Create batch item record
          batchItems.push({
            batch_upload_id: batchUpload.id,
            item_index: i,
            status: 'pending',
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            entity_type: uploadType === 'contracts' ? 'contract' : 'vendor',
          });
        } catch (error) {
          uploadErrors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Insert batch items
      if (batchItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('batch_upload_items')
          .insert(batchItems);

        if (itemsError) {
          throw itemsError;
        }
      }

      // Update batch status
      const finalStatus = uploadErrors.length === files.length ? 'failed' : 'pending';
      await supabase
        .from('batch_uploads')
        .update({
          status: finalStatus,
          error_summary: uploadErrors.length > 0 ? uploadErrors.join('; ') : null,
          started_at: new Date().toISOString(),
        })
        .eq('id', batchUpload.id);

      // Queue processing task if any files uploaded successfully
      if (batchItems.length > 0) {
        await supabase.from('agent_tasks').insert({
          agent_id: await getAgentId(supabase, 'secretary'),
          task_type: uploadType === 'contracts' ? 'batch_process_contracts' : 'batch_process_vendors',
          priority: 7,
          payload: {
            batch_upload_id: batchUpload.id,
            settings: settings || {},
          },
          enterprise_id: profile.enterprise_id,
        });
      }

      return createSuccessResponse(
        {
          batchUploadId: batchUpload.id,
          totalFiles: files.length,
          uploadedFiles: batchItems.length,
          failedFiles: uploadErrors.length,
          errors: uploadErrors.length > 0 ? uploadErrors : undefined,
        },
        'Batch upload initiated',
        201,
        req
      );
    }

    // ================================================================
    // GET /batch-upload/:batchId - Get batch upload status
    // ================================================================
    if (method === 'GET' && pathname.match(/^\/batch-upload\/[a-f0-9-]+$/)) {
      const batchId = pathname.split('/')[2];

      const { data: batch, error } = await supabase
        .from('batch_uploads')
        .select(
          `
          *,
          items:batch_upload_items(
            id,
            item_index,
            status,
            file_name,
            entity_id,
            entity_type,
            error_message,
            error_code,
            created_at,
            processed_at
          )
        `
        )
        .eq('id', batchId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (error || !batch) {
        return createErrorResponseSync('Batch upload not found', 404, req);
      }

      return createSuccessResponse(batch, undefined, 200, req);
    }

    // ================================================================
    // GET /batch-upload - List batch uploads with pagination
    // ================================================================
    if (method === 'GET' && pathname === '/batch-upload') {
      const params = Object.fromEntries(url.searchParams);
      const page = parseInt(params.page || '1');
      const limit = parseInt(params.limit || '20');
      const uploadType = params.uploadType; // Optional filter
      const status = params.status; // Optional filter

      const offset = (page - 1) * limit;

      let query = supabase
        .from('batch_uploads')
        .select('*', { count: 'exact' })
        .eq('enterprise_id', profile.enterprise_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (uploadType) {
        query = query.eq('upload_type', uploadType);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error, count } = await query;

      if (error) {
        throw error;
      }

      return createSuccessResponse(
        {
          data,
          pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit),
          },
        },
        undefined,
        200,
        req
      );
    }

    // ================================================================
    // DELETE /batch-upload/:batchId - Cancel batch upload
    // ================================================================
    if (method === 'DELETE' && pathname.match(/^\/batch-upload\/[a-f0-9-]+$/)) {
      const batchId = pathname.split('/')[2];

      // Verify batch belongs to user's enterprise
      const { data: batch } = await supabase
        .from('batch_uploads')
        .select('id, status')
        .eq('id', batchId)
        .eq('enterprise_id', profile.enterprise_id)
        .single();

      if (!batch) {
        return createErrorResponseSync('Batch upload not found', 404, req);
      }

      if (batch.status === 'completed') {
        return createErrorResponseSync('Cannot cancel completed batch', 400, req);
      }

      // Update status to cancelled
      await supabase
        .from('batch_uploads')
        .update({ status: 'cancelled', completed_at: new Date().toISOString() })
        .eq('id', batchId);

      // Cancel pending agent tasks
      await supabase
        .from('agent_tasks')
        .update({ status: 'cancelled' })
        .match({
          enterprise_id: profile.enterprise_id,
          status: 'pending',
        })
        .like('payload', `%${batchId}%`);

      return createSuccessResponse({ message: 'Batch upload cancelled' }, undefined, 200, req);
    }

    return createErrorResponseSync('Not found', 404, req);
  },
  {
    requireAuth: true,
    rateLimit: true,
  }
);

// Helper function to get agent ID
async function getAgentId(supabase: SupabaseClient, agentType: string): Promise<string> {
  const { data } = await supabase
    .from('agents')
    .select('id')
    .eq('type', agentType)
    .eq('is_active', true)
    .single();

  return data?.id || crypto.randomUUID(); // Fallback to random UUID if agent not found
}
