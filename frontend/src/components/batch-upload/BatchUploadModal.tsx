'use client';

import React, { useState, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface BatchUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete?: (batchId: string) => void;
  defaultTab?: 'contracts' | 'vendors';
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function BatchUploadModal({
  open,
  onOpenChange,
  onUploadComplete,
  defaultTab = 'contracts',
}: BatchUploadModalProps) {
  const [activeTab, setActiveTab] = useState<'contracts' | 'vendors'>(defaultTab);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [batchId, setBatchId] = useState<string | null>(null);

  // Upload settings
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [autoMatchVendors, setAutoMatchVendors] = useState(true);
  const [createUnmatchedVendors, setCreateUnmatchedVendors] = useState(true);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map((file) => ({
      file,
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      status: 'pending',
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: activeTab === 'contracts'
      ? {
          'application/pdf': ['.pdf'],
          'application/msword': ['.doc'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
          'text/plain': ['.txt'],
        }
      : {
          'text/csv': ['.csv'],
          'application/json': ['.json'],
        },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true,
  });

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const clearFiles = () => {
    setFiles([]);
    setUploadProgress(0);
    setBatchId(null);
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();

      // Add metadata
      formData.append(
        'metadata',
        JSON.stringify({
          uploadType: activeTab,
          settings: {
            autoAnalyze,
            autoMatchVendors,
            createUnmatchedVendors,
          },
        })
      );

      // Add files
      files.forEach((uploadFile, index) => {
        formData.append(`file_${index}`, uploadFile.file);
      });

      // Upload to backend
      const response = await fetch('/api/batch-upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setBatchId(result.batchUploadId);
      setUploadProgress(100);

      // Mark all as success
      setFiles((prev) =>
        prev.map((f) => ({ ...f, status: 'success' as const }))
      );

      // Notify parent
      if (onUploadComplete && result.batchUploadId) {
        onUploadComplete(result.batchUploadId);
      }

      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
        clearFiles();
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);
      setFiles((prev) =>
        prev.map((f) => ({
          ...f,
          status: 'error' as const,
          error: error instanceof Error ? error.message : 'Upload failed',
        }))
      );
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'pending':
        return <FileText className="h-4 w-4 text-gray-400" />;
      case 'uploading':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Upload</DialogTitle>
          <DialogDescription>
            Upload multiple {activeTab === 'contracts' ? 'contracts' : 'vendors'} at once for automatic processing
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'contracts' | 'vendors')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="contracts">Contracts</TabsTrigger>
            <TabsTrigger value="vendors">Vendors</TabsTrigger>
          </TabsList>

          <TabsContent value="contracts" className="space-y-4">
            {/* Upload Settings */}
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
              <h4 className="font-medium text-sm">Upload Settings</h4>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-analyze" className="text-sm">
                  Automatically analyze contracts
                </Label>
                <Switch
                  id="auto-analyze"
                  checked={autoAnalyze}
                  onCheckedChange={setAutoAnalyze}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-match" className="text-sm">
                  Automatically match vendors
                </Label>
                <Switch
                  id="auto-match"
                  checked={autoMatchVendors}
                  onCheckedChange={setAutoMatchVendors}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="create-unmatched" className="text-sm">
                  Create vendors for unmatched contracts
                </Label>
                <Switch
                  id="create-unmatched"
                  checked={createUnmatchedVendors}
                  onCheckedChange={setCreateUnmatchedVendors}
                />
              </div>
            </div>

            {/* Dropzone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-sm text-blue-600">Drop files here...</p>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    Drag & drop contract files here, or click to select
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Supported formats: PDF, DOC, DOCX, TXT (Max 100MB per file)
                  </p>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="vendors" className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>CSV Upload</AlertTitle>
              <AlertDescription>
                Upload a CSV file with vendor information. Required columns: name, email (optional), phone (optional)
              </AlertDescription>
            </Alert>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-sm text-blue-600">Drop CSV file here...</p>
              ) : (
                <>
                  <p className="text-sm font-medium">
                    Drag & drop CSV file here, or click to select
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Supported formats: CSV, JSON (Max 100MB)
                  </p>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                Files ({files.length})
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFiles}
                disabled={uploading}
              >
                Clear All
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
              {files.map((uploadFile) => (
                <div
                  key={uploadFile.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(uploadFile.status)}
                    <span className="text-sm truncate">{uploadFile.file.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {(uploadFile.file.size / 1024).toFixed(1)} KB
                    </Badge>
                  </div>
                  {!uploading && uploadFile.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                  {uploadFile.error && (
                    <span className="text-xs text-red-500 ml-2">{uploadFile.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} />
          </div>
        )}

        {/* Success Message */}
        {batchId && !uploading && (
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Upload Complete!</AlertTitle>
            <AlertDescription>
              Your files have been uploaded successfully and are being processed.
              Batch ID: {batchId.substring(0, 8)}...
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
