import { withMiddleware } from '../_shared/middleware.ts';
import { createErrorResponseSync, createSuccessResponse } from '../_shared/responses.ts';
import { z } from 'zod';

const uploadSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileType: z.string().min(1).max(100),
  entityType: z.enum(['contract', 'vendor', 'document', 'avatar']),
  entityId: z.string().uuid().optional(),
});

const ALLOWED_FILE_TYPES = {
  contract: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  vendor: ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'],
  document: ['*/*'],
  avatar: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

const MAX_FILE_SIZES = {
  contract: 50 * 1024 * 1024, // 50MB
  vendor: 10 * 1024 * 1024, // 10MB
  document: 50 * 1024 * 1024, // 50MB
  avatar: 5 * 1024 * 1024, // 5MB
};

export default withMiddleware(async (context) => {
  const { req, supabase, userData } = context;
  const url = new URL(req.url);
  const { pathname } = url;
  const { method } = req;

  // Upload file
  if (method === 'POST' && pathname === '/storage/upload') {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const metadata = JSON.parse(formData.get('metadata') as string);

    const { fileName, entityType, entityId } = uploadSchema.parse(metadata);

    if (!file) {
      return createErrorResponseSync('No file provided', 400, req);
    }

    // Validate file type
    const allowedTypes = ALLOWED_FILE_TYPES[entityType];
    if (allowedTypes[0] !== '*/*' && !allowedTypes.includes(file.type)) {
      return createErrorResponseSync('Invalid file type', 400, req, {
        allowed: allowedTypes,
        received: file.type,
      });
    }

    // Validate file size
    const maxSize = MAX_FILE_SIZES[entityType];
    if (file.size > maxSize) {
      return createErrorResponseSync('File too large', 400, req, {
        maxSize: `${maxSize / 1024 / 1024}MB`,
        received: `${(file.size / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // Generate unique file path
    const fileExt = fileName.split('.').pop();
    const timestamp = Date.now();
    const randomId = crypto.randomUUID().split('-')[0];
    const filePath = `${userData.enterprise_id}/${entityType}/${timestamp}-${randomId}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(entityType === 'avatar' ? 'avatars' : entityType === 'contract' ? 'contracts' : 'documents')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {throw uploadError;}

    // Create file metadata record
    const { data: fileMetadata, error: metadataError } = await supabase
      .from('file_metadata')
      .insert({
        storage_id: uploadData.path,
        file_name: fileName,
        file_type: fileExt,
        file_size: file.size,
        mime_type: file.type,
        entity_type: entityType,
        entity_id: entityId || crypto.randomUUID(), // Generate if not provided
        uploaded_by: userData.id,
        is_public: entityType === 'avatar',
        metadata: {
          original_name: file.name,
          upload_timestamp: timestamp,
        },
        enterprise_id: userData.enterprise_id,
      })
      .select()
      .single();

    if (metadataError) {
      // Rollback storage upload
      await supabase.storage
        .from(entityType === 'avatar' ? 'avatars' : entityType === 'contract' ? 'contracts' : 'documents')
        .remove([filePath]);
      throw metadataError;
    }

    // Generate signed URL for immediate access (24 hours)
    const { data: urlData } = await supabase.storage
      .from(entityType === 'avatar' ? 'avatars' : entityType === 'contract' ? 'contracts' : 'documents')
      .createSignedUrl(filePath, 86400);

    return createSuccessResponse({
      ...fileMetadata,
      signedUrl: urlData?.signedUrl,
    }, undefined, 201, req);
  }

  // Get file
  if (method === 'GET' && pathname.match(/^\/storage\/files\/[a-f0-9-]+$/)) {
    const fileId = pathname.split('/')[3];

    // Get file metadata
    const { data: fileData, error } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('id', fileId)
      .eq('enterprise_id', userData.enterprise_id)
      .single();

    if (error || !fileData) {
      return createErrorResponseSync('File not found', 404, req);
    }

    // Generate signed URL
    const bucket = fileData.entity_type === 'avatar' ? 'avatars' :
                  fileData.entity_type === 'contract' ? 'contracts' : 'documents';

    const { data: urlData, error: urlError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(fileData.storage_id, 3600); // 1 hour

    if (urlError) {throw urlError;}

    return createSuccessResponse({
      ...fileData,
      signedUrl: urlData.signedUrl,
    }, undefined, 200, req);
  }

  // Download file
  if (method === 'GET' && pathname.match(/^\/storage\/download\/[a-f0-9-]+$/)) {
    const fileId = pathname.split('/')[3];

    // Get file metadata
    const { data: fileData } = await supabase
      .from('file_metadata')
      .select('*')
      .eq('id', fileId)
      .eq('enterprise_id', userData.enterprise_id)
      .single();

    if (!fileData) {
      return createErrorResponseSync('File not found', 404, req);
    }

    // Get file from storage
    const bucket = fileData.entity_type === 'avatar' ? 'avatars' :
                  fileData.entity_type === 'contract' ? 'contracts' : 'documents';

    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(fileData.storage_id);

    if (downloadError) {throw downloadError;}

    // Return file with proper headers - note: middleware handles CORS automatically
    return new Response(fileBlob, {
      headers: {
        'Content-Type': fileData.mime_type,
        'Content-Disposition': `attachment; filename="${fileData.file_name}"`,
        'Content-Length': fileData.file_size.toString(),
      },
      status: 200,
    });
  }

  // Delete file
  if (method === 'DELETE' && pathname.match(/^\/storage\/files\/[a-f0-9-]+$/)) {
    const fileId = pathname.split('/')[3];

    // Check permissions
    const { data: fileData } = await supabase
      .from('file_metadata')
      .select('*, entity_type, uploaded_by')
      .eq('id', fileId)
      .eq('enterprise_id', userData.enterprise_id)
      .single();

    if (!fileData) {
      return createErrorResponseSync('File not found', 404, req);
    }

    // Check if user can delete (uploader or admin+)
    const canDelete =
      fileData.uploaded_by === userData.id ||
      ['admin', 'owner'].includes(userData.role);

    if (!canDelete) {
      return createErrorResponseSync('Insufficient permissions', 403, req);
    }

    // Soft delete metadata
    await supabase
      .from('file_metadata')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', fileId);

    // Delete from storage
    const bucket = fileData.entity_type === 'avatar' ? 'avatars' :
                  fileData.entity_type === 'contract' ? 'contracts' : 'documents';

    await supabase.storage
      .from(bucket)
      .remove([fileData.storage_id]);

    return createSuccessResponse({ message: 'File deleted successfully' }, undefined, 200, req);
  }

  // List files
  if (method === 'GET' && pathname === '/storage/files') {
    const params = Object.fromEntries(url.searchParams);
    const { entityType, entityId, page = '1', limit = '50' } = params;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase
      .from('file_metadata')
      .select('*', { count: 'exact' })
      .eq('enterprise_id', userData.enterprise_id)
      .is('deleted_at', null)
      .range(offset, offset + parseInt(limit) - 1)
      .order('created_at', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (entityId) {
      query = query.eq('entity_id', entityId);
    }

    const { data, error, count } = await query;

    if (error) {throw error;}

    return createSuccessResponse({
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil((count || 0) / parseInt(limit)),
      },
    }, undefined, 200, req);
  }

  return createErrorResponseSync('Not found', 404, req);
}, { requireAuth: true });