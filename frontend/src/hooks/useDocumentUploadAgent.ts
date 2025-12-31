import { useState, useCallback, useEffect } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';

import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/utils/supabase/client';
import { useAgentPreferencesStore } from '@/stores/agentPreferencesStore';
import { useAgentToast } from '@/components/ai/AgentToast';
import type { AgentType } from '@/types/agents.types';

const supabase = createClient();

// ============================================================================
// TYPES
// ============================================================================

export interface DocumentProcessingResult {
  id: string;
  status: DocumentProcessingStatus;
  filePath: string;
  fileName: string;

  // OCR Results
  extractedText?: string;
  ocrConfidence?: number;

  // Classification Results
  classification?: {
    contractType?: string;
    documentCategory?: string;
    confidence: number;
    extractedEntities?: {
      parties?: string[];
      effectiveDate?: string;
      expirationDate?: string;
      totalValue?: number;
      currency?: string;
    };
  };

  // Vendor Match Results
  vendorMatch?: {
    vendorId?: string;
    vendorName?: string;
    confidence: number;
    matchedOn?: string[];
    suggestNewVendor?: boolean;
    extractedVendorInfo?: {
      name?: string;
      email?: string;
      domain?: string;
      address?: string;
    };
  };

  // Auto-assignment
  autoAssignedVendorId?: string;
  autoAssignmentConfidence?: number;

  // Review
  requiresReview: boolean;
  reviewReason?: string;

  // Metadata
  processingDurationMs?: number;
  error?: string;
}

type DocumentProcessingStatus =
  | 'pending'
  | 'ocr_processing'
  | 'ocr_completed'
  | 'classifying'
  | 'classification_completed'
  | 'vendor_matching'
  | 'completed'
  | 'failed'
  | 'cancelled';

interface UploadContext {
  contractId?: string;
  vendorId?: string;
  sourceContext?: 'manual' | 'contract_creation' | 'vendor_document' | 'bulk_upload' | 'api';
}

interface DocumentQueueRecord {
  id: string;
  status: DocumentProcessingStatus;
  file_path: string;
  file_name: string;
  file_type: string | null;
  extracted_text: string | null;
  ocr_confidence: number | null;
  document_classification: Record<string, unknown> | null;
  classification_confidence: number | null;
  vendor_match_result: Record<string, unknown> | null;
  vendor_match_confidence: number | null;
  auto_assigned_vendor_id: string | null;
  auto_assignment_confidence: number | null;
  requires_review: boolean;
  review_reason: string | null;
  processing_duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// ============================================================================
// HOOK: useDocumentUploadAgent
// ============================================================================

export function useDocumentUploadAgent() {
  const { userProfile } = useAuth();
  const { addActiveTask, updateActiveTask, removeActiveTask } = useAgentPreferencesStore();
  const { notifyTaskStarted, notifyTaskCompleted, notifyTaskFailed } = useAgentToast();

  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentDocument, setCurrentDocument] = useState<DocumentProcessingResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // Process a file upload through the agent pipeline
  const processUpload = useCallback(
    async (
      file: File,
      context: UploadContext = {}
    ): Promise<{ documentId: string; result: Promise<DocumentProcessingResult> }> => {
      if (!userProfile?.enterprise_id) {
        throw new Error('User not authenticated');
      }

      setIsUploading(true);
      setUploadProgress(0);
      setError(null);

      try {
        // 1. Upload file to Supabase Storage
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userProfile.enterprise_id}/documents/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        setUploadProgress(50);

        // 2. Create document processing queue entry
        const { data: queueEntry, error: queueError } = await supabase
          .from('document_processing_queue')
          .insert({
            file_path: filePath,
            file_name: file.name,
            file_type: fileExt,
            file_size_bytes: file.size,
            enterprise_id: userProfile.enterprise_id,
            user_id: userProfile.id,
            source_context: context.sourceContext || 'manual',
            target_contract_id: context.contractId || null,
            target_vendor_id: context.vendorId || null,
          })
          .select('id')
          .single();

        if (queueError || !queueEntry) {
          throw new Error(`Failed to queue document: ${queueError?.message}`);
        }

        setUploadProgress(100);
        setIsUploading(false);
        setIsProcessing(true);

        // 3. Add to activity tracking
        addActiveTask({
          id: queueEntry.id,
          agentType: 'secretary',
          taskType: 'process_document',
          status: 'processing',
          message: `Processing: ${file.name}`,
          startedAt: new Date(),
          contractId: context.contractId,
          vendorId: context.vendorId,
        });

        // Show notification
        notifyTaskStarted('secretary', 'process_document');

        // 4. Return document ID and a promise that resolves when processing completes
        const resultPromise = waitForProcessingComplete(queueEntry.id);

        return {
          documentId: queueEntry.id,
          result: resultPromise,
        };
      } catch (err) {
        const error = err as Error;
        setError(error);
        setIsUploading(false);
        setIsProcessing(false);
        throw error;
      }
    },
    [userProfile, addActiveTask, notifyTaskStarted]
  );

  // Wait for processing to complete
  const waitForProcessingComplete = useCallback(
    async (documentId: string): Promise<DocumentProcessingResult> => {
      return new Promise((resolve, reject) => {
        let channel: RealtimeChannel | null = null;
        let timeoutId: NodeJS.Timeout | null = null;

        // Set timeout for 5 minutes
        timeoutId = setTimeout(() => {
          if (channel) {
            supabase.removeChannel(channel);
          }
          reject(new Error('Document processing timed out'));
        }, 5 * 60 * 1000);

        // Subscribe to changes
        channel = supabase
          .channel(`doc-processing-${documentId}`)
          .on<DocumentQueueRecord>(
            'postgres_changes' as unknown as 'system',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'document_processing_queue',
              filter: `id=eq.${documentId}`,
            } as unknown as Record<string, string>,
            async (payload) => {
              const record = payload.new as DocumentQueueRecord;

              // Update current document state
              const result = mapRecordToResult(record);
              setCurrentDocument(result);

              // Update activity tracking
              const statusMap: Record<DocumentProcessingStatus, 'pending' | 'processing' | 'completed' | 'failed'> = {
                pending: 'pending',
                ocr_processing: 'processing',
                ocr_completed: 'processing',
                classifying: 'processing',
                classification_completed: 'processing',
                vendor_matching: 'processing',
                completed: 'completed',
                failed: 'failed',
                cancelled: 'failed',
              };

              updateActiveTask(documentId, {
                status: statusMap[record.status],
                message: getStatusMessage(record.status),
              });

              // Check if processing is complete
              if (record.status === 'completed' || record.status === 'failed' || record.status === 'cancelled') {
                if (timeoutId) clearTimeout(timeoutId);
                if (channel) supabase.removeChannel(channel);

                setIsProcessing(false);

                if (record.status === 'completed') {
                  notifyTaskCompleted(
                    'secretary',
                    'process_document',
                    result.classification?.contractType
                      ? `Classified as ${result.classification.contractType}`
                      : 'Document processed successfully'
                  );
                  resolve(result);
                } else {
                  notifyTaskFailed('secretary', 'process_document', record.error_message || 'Processing failed');
                  reject(new Error(record.error_message || 'Processing failed'));
                }

                // Remove from activity after delay
                setTimeout(() => {
                  removeActiveTask(documentId);
                }, 5000);
              }
            }
          )
          .subscribe();
      });
    },
    [updateActiveTask, removeActiveTask, notifyTaskCompleted, notifyTaskFailed]
  );

  // Cancel processing
  const cancelProcessing = useCallback(
    async (documentId: string) => {
      const { error } = await supabase
        .from('document_processing_queue')
        .update({ status: 'cancelled' })
        .eq('id', documentId);

      if (error) {
        throw new Error(`Failed to cancel: ${error.message}`);
      }

      removeActiveTask(documentId);
      setIsProcessing(false);
      setCurrentDocument(null);
    },
    [removeActiveTask]
  );

  // Get processing status
  const getProcessingStatus = useCallback(async (documentId: string): Promise<DocumentProcessingResult | null> => {
    const { data, error } = await supabase
      .from('document_processing_queue')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !data) {
      return null;
    }

    return mapRecordToResult(data as DocumentQueueRecord);
  }, []);

  return {
    // Upload & processing
    processUpload,
    cancelProcessing,
    getProcessingStatus,

    // State
    isUploading,
    isProcessing,
    uploadProgress,
    currentDocument,
    error,

    // Computed
    isActive: isUploading || isProcessing,
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mapRecordToResult(record: DocumentQueueRecord): DocumentProcessingResult {
  const classification = record.document_classification as {
    contract_type?: string;
    document_category?: string;
    confidence?: number;
    extracted_entities?: {
      parties?: string[];
      effective_date?: string;
      expiration_date?: string;
      total_value?: number;
      currency?: string;
    };
  } | null;

  const vendorMatch = record.vendor_match_result as {
    matches?: Array<{
      vendor_id?: string;
      vendor_name?: string;
      confidence?: number;
      matched_on?: string[];
    }>;
    suggest_new_vendor?: boolean;
    extracted_vendor_info?: {
      name?: string;
      email?: string;
      domain?: string;
      address?: string;
    };
  } | null;

  const bestMatch = vendorMatch?.matches?.[0];

  return {
    id: record.id,
    status: record.status,
    filePath: record.file_path,
    fileName: record.file_name,

    extractedText: record.extracted_text || undefined,
    ocrConfidence: record.ocr_confidence || undefined,

    classification: classification
      ? {
          contractType: classification.contract_type,
          documentCategory: classification.document_category,
          confidence: classification.confidence || 0,
          extractedEntities: classification.extracted_entities
            ? {
                parties: classification.extracted_entities.parties,
                effectiveDate: classification.extracted_entities.effective_date,
                expirationDate: classification.extracted_entities.expiration_date,
                totalValue: classification.extracted_entities.total_value,
                currency: classification.extracted_entities.currency,
              }
            : undefined,
        }
      : undefined,

    vendorMatch: bestMatch
      ? {
          vendorId: bestMatch.vendor_id,
          vendorName: bestMatch.vendor_name,
          confidence: bestMatch.confidence || 0,
          matchedOn: bestMatch.matched_on,
          suggestNewVendor: vendorMatch?.suggest_new_vendor,
          extractedVendorInfo: vendorMatch?.extracted_vendor_info,
        }
      : undefined,

    autoAssignedVendorId: record.auto_assigned_vendor_id || undefined,
    autoAssignmentConfidence: record.auto_assignment_confidence || undefined,

    requiresReview: record.requires_review,
    reviewReason: record.review_reason || undefined,

    processingDurationMs: record.processing_duration_ms || undefined,
    error: record.error_message || undefined,
  };
}

function getStatusMessage(status: DocumentProcessingStatus): string {
  const messages: Record<DocumentProcessingStatus, string> = {
    pending: 'Waiting to start...',
    ocr_processing: 'Extracting text (OCR)...',
    ocr_completed: 'Text extracted, classifying...',
    classifying: 'Classifying document type...',
    classification_completed: 'Classified, matching vendor...',
    vendor_matching: 'Matching to vendor...',
    completed: 'Processing complete',
    failed: 'Processing failed',
    cancelled: 'Processing cancelled',
  };
  return messages[status];
}

// ============================================================================
// HOOK: useDocumentProcessingQueue (for viewing queue)
// ============================================================================

export function useDocumentProcessingQueue(options: {
  status?: DocumentProcessingStatus;
  requiresReview?: boolean;
  limit?: number;
} = {}) {
  const { userProfile } = useAuth();
  const [documents, setDocuments] = useState<DocumentProcessingResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.enterprise_id) return;

    const fetchDocuments = async () => {
      setIsLoading(true);

      let query = supabase
        .from('document_processing_queue')
        .select('*')
        .eq('enterprise_id', userProfile.enterprise_id)
        .order('created_at', { ascending: false })
        .limit(options.limit || 50);

      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.requiresReview !== undefined) {
        query = query.eq('requires_review', options.requiresReview);
      }

      const { data, error } = await query;

      if (!error && data) {
        setDocuments(data.map((r) => mapRecordToResult(r as DocumentQueueRecord)));
      }

      setIsLoading(false);
    };

    fetchDocuments();
  }, [userProfile?.enterprise_id, options.status, options.requiresReview, options.limit]);

  return {
    documents,
    isLoading,
    pendingCount: documents.filter((d) =>
      ['pending', 'ocr_processing', 'classifying', 'vendor_matching'].includes(d.status)
    ).length,
    needsReviewCount: documents.filter((d) => d.requiresReview && d.status === 'completed').length,
  };
}

export default useDocumentUploadAgent;
