'use client';

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  FileText,
  X,
  Check,
  Loader2,
  AlertTriangle,
  Eye,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

interface UploadedFile {
  file: File;
  id?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  documentId?: string;
  reviewId?: string;
}

interface BatchOcrUploadProps {
  onComplete?: (jobId: string) => void;
  onReviewReady?: (reviewId: string, documentId: string) => void;
}

export default function BatchOcrUpload({ onComplete, onReviewReady }: BatchOcrUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<{
    total: number;
    processed: number;
    pending: number;
    approved: number;
    progress: number;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    const newFiles: UploadedFile[] = selectedFiles.map(file => ({
      file,
      status: 'pending',
      progress: 0,
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('Please log in to upload documents');
      setIsProcessing(false);
      return;
    }

    try {
      const uploadedDocumentIds: string[] = [];

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const fileData = files[i];

        // Update status to uploading
        setFiles(prev => prev.map((f, idx) =>
          idx === i ? { ...f, status: 'uploading', progress: 0 } : f
        ));

        try {
          // Upload file to Supabase Storage
          const fileName = `${Date.now()}-${fileData.file.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileName, fileData.file, {
              onUploadProgress: (progress) => {
                const percentage = (progress.loaded / progress.total) * 100;
                setFiles(prev => prev.map((f, idx) =>
                  idx === i ? { ...f, progress: percentage } : f
                ));
              },
            });

          if (uploadError) throw uploadError;

          // Create document record
          const { data: docData, error: docError } = await supabase
            .from('documents')
            .insert({
              file_name: fileData.file.name,
              file_type: fileData.file.type,
              file_size: fileData.file.size,
              file_path: uploadData.path,
              status: 'pending_ocr',
            })
            .select()
            .single();

          if (docError) throw docError;

          uploadedDocumentIds.push(docData.id);

          // Update status to uploaded
          setFiles(prev => prev.map((f, idx) =>
            idx === i ? {
              ...f,
              status: 'uploaded',
              progress: 100,
              documentId: docData.id
            } : f
          ));

        } catch (error) {
          console.error('Upload error:', error);
          setFiles(prev => prev.map((f, idx) =>
            idx === i ? {
              ...f,
              status: 'failed',
              error: error instanceof Error ? error.message : 'Upload failed'
            } : f
          ));
        }
      }

      // Create OCR job
      if (uploadedDocumentIds.length > 0) {
        const { data: jobData, error: jobError } = await supabase
          .rpc('create_ocr_job', {
            p_enterprise_id: user.user_metadata.enterprise_id,
            p_user_id: user.id,
            p_job_name: `Batch OCR ${new Date().toISOString()}`,
            p_document_ids: uploadedDocumentIds,
            p_priority: 7,
          });

        if (jobError) throw jobError;

        setJobId(jobData);
        startPolling(jobData);
        onComplete?.(jobData);

        // Update all uploaded files to processing
        setFiles(prev => prev.map(f =>
          f.status === 'uploaded' ? { ...f, status: 'processing' } : f
        ));
      }

    } catch (error) {
      console.error('Error creating OCR job:', error);
      alert('Failed to create OCR job');
    } finally {
      setIsProcessing(false);
    }
  };

  const startPolling = (jobIdToSend: string) => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Poll every 2 seconds
    intervalRef.current = setInterval(async () => {
      const { data, error } = await supabase
        .rpc('get_ocr_job_status', { p_job_id: jobIdToSend });

      if (error) {
        console.error('Error polling job status:', error);
        return;
      }

      if (data && data.length > 0) {
        const status = data[0];
        setJobStatus({
          total: status.total_documents,
          processed: status.processed_documents,
          pending: status.pending_reviews,
          approved: status.approved_reviews,
          progress: status.progress_percentage,
        });

        // Update file statuses
        if (status.status === 'completed') {
          setFiles(prev => prev.map(f =>
            f.status === 'processing' ? { ...f, status: 'completed' } : f
          ));

          // Load reviews
          loadReviews(jobIdToSend);

          // Stop polling
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    }, 2000);
  };

  const loadReviews = async (jobIdToLoad: string) => {
    const { data: reviews } = await supabase
      .from('extracted_data_reviews')
      .select('id, document_id, status')
      .eq('ocr_job_id', jobIdToLoad);

    if (reviews) {
      setFiles(prev => prev.map(f => {
        const review = reviews.find(r => r.document_id === f.documentId);
        if (review) {
          return {
            ...f,
            reviewId: review.id,
            status: review.status === 'approved' ? 'completed' : 'completed',
          };
        }
        return f;
      }));
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-5 w-5 text-gray-400" />;
      case 'uploading':
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'uploaded':
        return <Upload className="h-5 w-5 text-purple-500" />;
      case 'completed':
        return <Check className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusLabel = (status: UploadedFile['status']): string => {
    switch (status) {
      case 'pending': return 'Pending';
      case 'uploading': return 'Uploading';
      case 'uploaded': return 'Uploaded';
      case 'processing': return 'Processing OCR';
      case 'completed': return 'Ready for Review';
      case 'failed': return 'Failed';
    }
  };

  const getStatusColor = (status: UploadedFile['status']): string => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700 border-gray-300';
      case 'uploading':
      case 'processing': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'uploaded': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'failed': return 'bg-red-100 text-red-700 border-red-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Document Upload & OCR</CardTitle>
          <CardDescription>
            Upload multiple documents for OCR processing and data extraction
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Input */}
          <div
            className={cn(
              'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
              'hover:border-purple-500 hover:bg-purple-50',
              files.length > 0 && 'border-purple-300 bg-purple-50'
            )}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-purple-500" />
            <p className="text-sm font-medium mb-1">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              PDF, PNG, JPG up to 10MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <Label>Files ({files.length})</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg bg-white"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getStatusIcon(file.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {file.file.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-gray-500">
                            {(file.file.size / 1024).toFixed(1)} KB
                          </p>
                          <Badge
                            variant="outline"
                            className={getStatusColor(file.status)}
                          >
                            {getStatusLabel(file.status)}
                          </Badge>
                        </div>
                        {(file.status === 'uploading' || file.status === 'processing') && (
                          <Progress value={file.progress} className="h-1 mt-2" />
                        )}
                        {file.error && (
                          <p className="text-xs text-red-600 mt-1">{file.error}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {file.reviewId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReviewReady?.(file.reviewId!, file.documentId!)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Review
                        </Button>
                      )}
                      {file.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {files.length > 0 && !jobId && (
            <Button
              onClick={uploadDocuments}
              disabled={isProcessing}
              className="w-full bg-purple-900 hover:bg-purple-800"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Start OCR ({files.length} files)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Job Status */}
      {jobStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">OCR Job Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span>{jobStatus.progress.toFixed(0)}%</span>
              </div>
              <Progress value={jobStatus.progress} className="h-2" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg border">
                <p className="text-2xl font-bold text-gray-900">{jobStatus.total}</p>
                <p className="text-xs text-gray-600">Total Documents</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-2xl font-bold text-purple-900">{jobStatus.processed}</p>
                <p className="text-xs text-purple-700">Processed</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-2xl font-bold text-amber-900">{jobStatus.pending}</p>
                <p className="text-xs text-amber-700">Pending Review</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-900">{jobStatus.approved}</p>
                <p className="text-xs text-green-700">Approved</p>
              </div>
            </div>

            {jobStatus.processed === jobStatus.total && (
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  All documents have been processed! Review extracted data to approve or make corrections.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
