'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, Loader2, AlertCircle, Download } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';

interface BatchProgressTrackerProps {
  batchId: string;
  onComplete?: () => void;
}

interface BatchUpload {
  id: string;
  upload_type: 'contracts' | 'vendors';
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled';
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  created_at: string;
  completed_at: string | null;
  error_summary: string | null;
  items?: BatchUploadItem[];
}

interface BatchUploadItem {
  id: string;
  item_index: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  file_name: string;
  entity_id: string | null;
  entity_type: 'contract' | 'vendor';
  error_message: string | null;
  error_code: string | null;
  created_at: string;
  processed_at: string | null;
}

export function BatchProgressTracker({ batchId, onComplete }: BatchProgressTrackerProps) {
  const [batch, setBatch] = useState<BatchUpload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch batch data
  const fetchBatchData = async () => {
    try {
      const response = await fetch(`/api/batch-upload/${batchId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch batch data');
      }
      const data = await response.json();
      setBatch(data);
      setLoading(false);

      // Call onComplete if batch is done
      if (data.status === 'completed' && onComplete) {
        onComplete();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchBatchData();
  }, [batchId]);

  // Real-time subscription for updates
  useEffect(() => {
    if (!batch) return;

    const channel = supabase
      .channel(`batch_upload:${batchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batch_uploads',
          filter: `id=eq.${batchId}`,
        },
        (payload) => {
          console.log('Batch updated:', payload);
          fetchBatchData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batch_upload_items',
          filter: `batch_upload_id=eq.${batchId}`,
        },
        (payload) => {
          console.log('Batch item updated:', payload);
          fetchBatchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [batch, batchId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading batch progress...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error || !batch) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error || 'Batch not found'}</AlertDescription>
      </Alert>
    );
  }

  const progress = batch.total_items > 0
    ? Math.round((batch.processed_items / batch.total_items) * 100)
    : 0;

  const getStatusBadge = (status: BatchUpload['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'uploading':
        return <Badge className="bg-blue-500"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Uploading</Badge>;
      case 'processing':
        return <Badge className="bg-yellow-500"><Loader2 className="mr-1 h-3 w-3 animate-spin" />Processing</Badge>;
      case 'completed':
        return <Badge className="bg-green-500"><CheckCircle2 className="mr-1 h-3 w-3" />Completed</Badge>;
      case 'failed':
        return <Badge variant="error"><XCircle className="mr-1 h-3 w-3" />Failed</Badge>;
      case 'cancelled':
        return <Badge variant="outline"><XCircle className="mr-1 h-3 w-3" />Cancelled</Badge>;
    }
  };

  const getItemStatusIcon = (status: BatchUploadItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'skipped':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const downloadFailedReport = () => {
    const failedItems = batch.items?.filter(item => item.status === 'failed') || [];
    const report = failedItems.map(item => ({
      file: item.file_name,
      error: item.error_message,
      code: item.error_code,
    }));

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-${batchId.substring(0, 8)}-errors.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              Batch Upload Progress
              {getStatusBadge(batch.status)}
            </CardTitle>
            <CardDescription>
              {batch.upload_type === 'contracts' ? 'Contract' : 'Vendor'} batch upload
              • Started {new Date(batch.created_at).toLocaleString()}
            </CardDescription>
          </div>
          {batch.failed_items > 0 && (
            <Button variant="outline" size="sm" onClick={downloadFailedReport}>
              <Download className="mr-2 h-4 w-4" />
              Download Error Report
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Overall Progress</span>
            <span className="text-muted-foreground">
              {batch.processed_items} of {batch.total_items} processed
            </span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {batch.successful_items} successful
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              {batch.failed_items} failed
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-400" />
              {batch.total_items - batch.processed_items} pending
            </span>
          </div>
        </div>

        {/* Error Summary */}
        {batch.error_summary && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Errors Encountered</AlertTitle>
            <AlertDescription>{batch.error_summary}</AlertDescription>
          </Alert>
        )}

        {/* Item List */}
        {batch.items && batch.items.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Files</h4>
            <div className="max-h-96 overflow-y-auto space-y-2 border rounded-lg p-3">
              {batch.items
                .sort((a, b) => a.item_index - b.item_index)
                .map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border transition-colors hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {getItemStatusIcon(item.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.file_name}</p>
                        {item.error_message && (
                          <p className="text-xs text-red-500 mt-1">{item.error_message}</p>
                        )}
                        {item.entity_id && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {item.entity_type === 'contract' ? 'Contract' : 'Vendor'} created
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Completion Message */}
        {batch.status === 'completed' && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Batch Upload Complete!</AlertTitle>
            <AlertDescription>
              Successfully processed {batch.successful_items} of {batch.total_items} items.
              {batch.failed_items > 0 && (
                <> {batch.failed_items} items failed and may require manual review.</>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
