import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createClient } from '@supabase/supabase-js';
import type { StorageError } from '@supabase/storage-js';
import { createTestUser, createTestEnterprise, cleanupTestData } from '../setup';

const FUNCTION_URL = 'http://localhost:54321/functions/v1';

describe('Storage Edge Function', () => {
  let supabase: ReturnType<typeof createClient>;
  let testEnterprise: { id: string; name: string };
  let adminUser: { id: string; email: string; authToken: string };
  let regularUser: { id: string; email: string; authToken: string };
  let otherUser: { id: string; email: string; authToken: string };

  // Mock file for testing
  const createMockFile = (name: string, content: string, type: string, _size?: number) => {
    const blob = new Blob([content], { type });
    return new File([blob], name, {
      type,
      lastModified: Date.now(),
    });
  };

  beforeEach(async () => {
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Create test enterprise and users
    testEnterprise = await createTestEnterprise();
    adminUser = await createTestUser(testEnterprise.id, 'admin');
    regularUser = await createTestUser(testEnterprise.id, 'user');
    otherUser = await createTestUser(testEnterprise.id, 'user');

    // Mock storage operations
    vi.spyOn(supabase.storage.from('contracts'), 'upload').mockResolvedValue({
      data: { id: 'mock-id', path: 'mocked-path/file.pdf', fullPath: 'contracts/mocked-path/file.pdf' },
      error: null,
    });
    vi.spyOn(supabase.storage.from('documents'), 'upload').mockResolvedValue({
      data: { id: 'mock-id', path: 'mocked-path/file.pdf', fullPath: 'contracts/mocked-path/file.pdf' },
      error: null,
    });
    vi.spyOn(supabase.storage.from('avatars'), 'upload').mockResolvedValue({
      data: { id: 'mock-id', path: 'mocked-path/avatar.jpg', fullPath: 'avatars/mocked-path/avatar.jpg' },
      error: null,
    });

    vi.spyOn(supabase.storage.from('contracts'), 'createSignedUrl').mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });
    vi.spyOn(supabase.storage.from('documents'), 'createSignedUrl').mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });
    vi.spyOn(supabase.storage.from('avatars'), 'createSignedUrl').mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });

    vi.spyOn(supabase.storage.from('contracts'), 'download').mockResolvedValue({
      data: new Blob(['file content'], { type: 'application/pdf' }),
      error: null,
    });

    vi.spyOn(supabase.storage.from('contracts'), 'remove').mockResolvedValue({
      data: [],
      error: null,
    });
  });

  afterEach(async () => {
    await cleanupTestData();
    vi.restoreAllMocks();
  });

  describe('POST /storage/upload', () => {
    it('should upload a contract file', async () => {
      const file = createMockFile('contract.pdf', 'Contract content', 'application/pdf');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: 'contract.pdf',
        fileType: 'pdf',
        entityType: 'contract',
        entityId: '550e8400-e29b-41d4-a716-446655440000',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.file_name).toBe('contract.pdf');
      expect(result.entity_type).toBe('contract');
      expect(result.uploaded_by).toBe(regularUser.id);
      expect(result.signedUrl).toBeDefined();
    });

    it('should upload a vendor document', async () => {
      const file = createMockFile('vendor-cert.pdf', 'Certificate', 'application/pdf');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: 'vendor-cert.pdf',
        fileType: 'pdf',
        entityType: 'vendor',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.entity_type).toBe('vendor');
      expect(result.entity_id).toBeDefined(); // Auto-generated
    });

    it('should upload an avatar image', async () => {
      const file = createMockFile('avatar.jpg', 'image data', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: 'avatar.jpg',
        fileType: 'jpg',
        entityType: 'avatar',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.entity_type).toBe('avatar');
      expect(result.is_public).toBe(true);
    });

    it('should validate file type for contracts', async () => {
      const file = createMockFile('image.jpg', 'image data', 'image/jpeg');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: 'image.jpg',
        fileType: 'jpg',
        entityType: 'contract',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Invalid file type');
      expect(result.allowed).toBeDefined();
      expect(result.received).toBe('image/jpeg');
    });

    it('should validate file type for avatars', async () => {
      const file = createMockFile('document.pdf', 'pdf content', 'application/pdf');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: 'document.pdf',
        fileType: 'pdf',
        entityType: 'avatar',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('Invalid file type');
    });

    it('should validate file size', async () => {
      // Create a large file (>5MB for avatar)
      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      const file = createMockFile('large-avatar.jpg', largeContent, 'image/jpeg');

      // Override the file size
      Object.defineProperty(file, 'size', { value: 6 * 1024 * 1024 });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: 'large-avatar.jpg',
        fileType: 'jpg',
        entityType: 'avatar',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('File too large');
      expect(result.maxSize).toBe('5MB');
    });

    it('should require file in request', async () => {
      const formData = new FormData();
      formData.append('metadata', JSON.stringify({
        fileName: 'missing.pdf',
        fileType: 'pdf',
        entityType: 'contract',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('No file provided');
    });

    it('should validate metadata', async () => {
      const file = createMockFile('test.pdf', 'content', 'application/pdf');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        // Missing required fields
        entityType: 'contract',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(500);
    });

    it('should handle storage upload errors', async () => {
      vi.spyOn(supabase.storage.from('contracts'), 'upload').mockResolvedValue({
        data: null,
        error: { __isStorageError: true, message: 'Storage error', statusCode: 500 } as StorageError,
      });

      const file = createMockFile('error.pdf', 'content', 'application/pdf');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: 'error.pdf',
        fileType: 'pdf',
        entityType: 'contract',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
        body: formData,
      });

      expect(response.status).toBe(500);
    });

    it('should require authentication', async () => {
      const file = createMockFile('test.pdf', 'content', 'application/pdf');
      const formData = new FormData();
      formData.append('file', file);
      formData.append('metadata', JSON.stringify({
        fileName: 'test.pdf',
        fileType: 'pdf',
        entityType: 'contract',
      }));

      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /storage/files/:id', () => {
    let testFile: { id: string };

    beforeEach(async () => {
      // Create test file metadata
      const { data } = await supabase
        .from('file_metadata')
        .insert({
          storage_id: 'test-path/file.pdf',
          file_name: 'test-contract.pdf',
          file_type: 'pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          entity_type: 'contract',
          entity_id: '550e8400-e29b-41d4-a716-446655440000',
          uploaded_by: regularUser.id,
          enterprise_id: testEnterprise.id,
          is_public: false,
        })
        .select()
        .single();
      testFile = data as { id: string };
    });

    it('should get file metadata with signed URL', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files/${testFile.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.id).toBe(testFile.id);
      expect(result.file_name).toBe('test-contract.pdf');
      expect(result.signedUrl).toBeDefined();
    });

    it('should not allow access to files from other enterprises', async () => {
      const otherEnterprise = await createTestEnterprise();
      const { data: otherFile } = await supabase
        .from('file_metadata')
        .insert({
          storage_id: 'other-path/file.pdf',
          file_name: 'other-file.pdf',
          file_type: 'pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          entity_type: 'contract',
          uploaded_by: adminUser.id,
          enterprise_id: otherEnterprise.id,
        })
        .select()
        .single();

      const response = await fetch(`${FUNCTION_URL}/storage/files/${otherFile!.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent file', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files/00000000-0000-0000-0000-000000000000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should require authentication', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files/${testFile.id}`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /storage/download/:id', () => {
    let testFile: { id: string };

    beforeEach(async () => {
      const { data } = await supabase
        .from('file_metadata')
        .insert({
          storage_id: 'test-path/download.pdf',
          file_name: 'download-test.pdf',
          file_type: 'pdf',
          file_size: 2048,
          mime_type: 'application/pdf',
          entity_type: 'contract',
          uploaded_by: regularUser.id,
          enterprise_id: testEnterprise.id,
        })
        .select()
        .single();
      testFile = data as { id: string };
    });

    it('should download file with proper headers', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/download/${testFile.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('download-test.pdf');
      expect(response.headers.get('Content-Length')).toBe('2048');
    });

    it('should not allow download from other enterprises', async () => {
      const otherEnterprise = await createTestEnterprise();
      const { data: otherFile } = await supabase
        .from('file_metadata')
        .insert({
          storage_id: 'other-path/file.pdf',
          file_name: 'other.pdf',
          file_type: 'pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          entity_type: 'contract',
          uploaded_by: adminUser.id,
          enterprise_id: otherEnterprise.id,
        })
        .select()
        .single();

      const response = await fetch(`${FUNCTION_URL}/storage/download/${otherFile!.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });

    it('should handle storage download errors', async () => {
      vi.spyOn(supabase.storage.from('contracts'), 'download').mockResolvedValue({
        data: null,
        error: { __isStorageError: true, message: 'Download failed', statusCode: 500 } as StorageError,
      });

      const response = await fetch(`${FUNCTION_URL}/storage/download/${testFile.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /storage/files/:id', () => {
    let testFile: { id: string };
    let otherUserFile: { id: string };

    beforeEach(async () => {
      const { data: file1 } = await supabase
        .from('file_metadata')
        .insert({
          storage_id: 'test-path/delete1.pdf',
          file_name: 'delete-test1.pdf',
          file_type: 'pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          entity_type: 'contract',
          uploaded_by: regularUser.id,
          enterprise_id: testEnterprise.id,
        })
        .select()
        .single();
      testFile = file1 as { id: string };

      const { data: file2 } = await supabase
        .from('file_metadata')
        .insert({
          storage_id: 'test-path/delete2.pdf',
          file_name: 'delete-test2.pdf',
          file_type: 'pdf',
          file_size: 1024,
          mime_type: 'application/pdf',
          entity_type: 'contract',
          uploaded_by: otherUser.id,
          enterprise_id: testEnterprise.id,
        })
        .select()
        .single();
      otherUserFile = file2 as { id: string };
    });

    it('should allow user to delete own file', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files/${testFile.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.message).toContain('deleted successfully');

      // Verify soft delete
      const { data } = await supabase
        .from('file_metadata')
        .select('deleted_at')
        .eq('id', testFile.id)
        .single();
      expect(data!.deleted_at).toBeDefined();
    });

    it('should allow admin to delete any file', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files/${otherUserFile.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
    });

    it('should not allow user to delete other user files', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files/${otherUserFile.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(403);
      const result = await response.json();
      expect(result.error).toContain('Insufficient permissions');
    });

    it('should return 404 for non-existent file', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('GET /storage/files', () => {
    beforeEach(async () => {
      // Create test files
      const files = [];
      for (let i = 0; i < 15; i++) {
        files.push({
          storage_id: `test-path/file${i}.pdf`,
          file_name: `test-file-${i}.pdf`,
          file_type: 'pdf',
          file_size: 1024 * (i + 1),
          mime_type: 'application/pdf',
          entity_type: i % 3 === 0 ? 'contract' : i % 3 === 1 ? 'vendor' : 'document',
          entity_id: i < 5 ? '550e8400-e29b-41d4-a716-446655440000' : null,
          uploaded_by: i % 2 === 0 ? regularUser.id : adminUser.id,
          enterprise_id: testEnterprise.id,
          created_at: new Date(Date.now() - i * 60000).toISOString(),
        });
      }
      await supabase.from('file_metadata').insert(files);
    });

    it('should list files with pagination', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files?page=1&limit=10`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toHaveLength(10);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(15);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should filter by entity type', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files?entityType=contract`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((f: { entity_type: string }) => f.entity_type === 'contract')).toBe(true);
    });

    it('should filter by entity ID', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files?entityId=550e8400-e29b-41d4-a716-446655440000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data).toHaveLength(5);
      expect(result.data.every((f: { entity_id: string }) => f.entity_id === '550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    });

    it('should order by created date descending', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();

      // Verify ordering
      for (let i = 1; i < result.data.length; i++) {
        expect(new Date(result.data[i - 1].created_at) >= new Date(result.data[i].created_at)).toBe(true);
      }
    });

    it('should exclude soft deleted files', async () => {
      // Soft delete a file
      await supabase
        .from('file_metadata')
        .update({ deleted_at: new Date().toISOString() })
        .eq('file_name', 'test-file-0.pdf');

      const response = await fetch(`${FUNCTION_URL}/storage/files`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.data.every((f: { file_name: string }) => f.file_name !== 'test-file-0.pdf')).toBe(true);
      expect(result.pagination.total).toBe(14);
    });
  });

  describe('Invalid routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/unknown`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${regularUser.authToken}`,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe('CORS handling', () => {
    it('should handle CORS preflight requests', async () => {
      const response = await fetch(`${FUNCTION_URL}/storage/upload`, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Methods')).toBeDefined();
      expect(response.headers.get('Access-Control-Allow-Headers')).toBeDefined();
    });
  });
});