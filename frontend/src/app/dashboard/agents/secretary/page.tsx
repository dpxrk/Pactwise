'use client';

import {
  FileText,
  Upload,
  Download,
  Loader2,
  FileCheck,
  FileType,
  Tags,
  TextQuote,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';

interface ProcessingResult {
  taskId: string;
  status: 'processing' | 'completed' | 'error';
  result?: any;
  error?: string;
}

export default function SecretaryAgentPage() {
  const { userProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeCapability, setActiveCapability] = useState<string>('extract-metadata');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const capabilities = [
    {
      id: 'extract-metadata',
      name: 'Extract Metadata',
      icon: FileCheck,
      description: 'Extract structured metadata including dates, parties, amounts, and key terms',
    },
    {
      id: 'summarize',
      name: 'Summarize Document',
      icon: TextQuote,
      description: 'Generate concise summaries capturing key points and obligations',
    },
    {
      id: 'extract-entities',
      name: 'Extract Entities',
      icon: Tags,
      description: 'Identify and extract named entities like companies, people, and locations',
    },
    {
      id: 'format-document',
      name: 'Format Document',
      icon: FileType,
      description: 'Convert document formats (PDF, DOCX, TXT) while preserving structure',
    },
    {
      id: 'classify-content',
      name: 'Classify Content',
      icon: FileText,
      description: 'Classify document types, content categories, and compliance requirements',
    },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleProcess = async () => {
    if (!selectedFile || !userProfile?.enterprise_id) {
      toast.error('Please select a file first');
      return;
    }

    setProcessing(true);
    setResult({ taskId: '', status: 'processing' });

    try {
      // Create agent task
      const task = await agentsAPI.createAgentTask({
        type: 'secretary',
        data: {
          capability: activeCapability,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        },
        priority: 7,
        userId: userProfile.id,
        enterpriseId: userProfile.enterprise_id,
      });

      setResult({
        taskId: task.id,
        status: 'processing',
      });

      // Poll for task completion
      const pollInterval = setInterval(async () => {
        try {
          const taskStatus = await agentsAPI.getTaskStatus(task.id);

          if (taskStatus.status === 'completed') {
            clearInterval(pollInterval);
            setResult({
              taskId: task.id,
              status: 'completed',
              result: taskStatus.result as ProcessingResult['result'],
            });
            setProcessing(false);
            toast.success('Document processed successfully!');
          } else if (taskStatus.status === 'failed') {
            clearInterval(pollInterval);
            setResult({
              taskId: task.id,
              status: 'error',
              error: taskStatus.error || 'Processing failed',
            });
            setProcessing(false);
            toast.error('Document processing failed');
          }
        } catch (_error) {
          clearInterval(pollInterval);
          setProcessing(false);
          toast.error('Failed to check task status');
        }
      }, 2000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (processing) {
          setProcessing(false);
          toast.error('Processing timeout');
        }
      }, 120000);
    } catch (error) {
      console.error('Processing error:', error);
      setProcessing(false);
      setResult({
        taskId: '',
        status: 'error',
        error: 'Failed to start processing',
      });
      toast.error('Failed to process document');
    }
  };

  const currentCapability = capabilities.find(c => c.id === activeCapability);

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Grid Background */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(210, 209, 222) 0.5px, transparent 0.5px),
            linear-gradient(to bottom, rgb(210, 209, 222) 0.5px, transparent 0.5px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1920px] mx-auto px-6 py-6">
        {/* Back Button */}
        <Link href="/dashboard/agents">
          <Button variant="ghost" className="mb-4 text-ghost-600 hover:text-purple-900">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </Link>

        {/* Header */}
        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-300/5 border-purple-500/20 p-6 mb-6">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-purple-500/10 border border-purple-500/20">
              <FileText className="w-10 h-10 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-purple-900 font-mono">DOCUMENT SECRETARY</h1>
                <Badge className="bg-success/20 text-success border-success/30 font-mono text-xs">
                  ACTIVE
                </Badge>
              </div>
              <p className="text-sm text-ghost-700 mb-4">
                Document extraction, metadata generation, and file processing powered by advanced NLP and pattern recognition.
              </p>
              <div className="p-3 bg-white/50 border border-purple-500/10">
                <div className="flex items-start gap-2">
                  <FileCheck className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-purple-900 font-semibold mb-1 font-mono">USE WHEN:</div>
                    <div className="text-xs text-ghost-700">
                      Processing and extracting data from contracts, invoices, reports, or any business documents requiring structured analysis.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Capabilities */}
          <div className="lg:col-span-1">
            <Card className="bg-white border-ghost-300 p-6">
              <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                CAPABILITIES
              </h2>
              <div className="space-y-2">
                {capabilities.map((capability) => (
                  <button
                    key={capability.id}
                    onClick={() => setActiveCapability(capability.id)}
                    className={`w-full p-4 text-left border transition-all ${
                      activeCapability === capability.id
                        ? 'border-purple-500 bg-purple-500/5'
                        : 'border-ghost-300 hover:border-purple-500/50 hover:bg-ghost-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <capability.icon
                        className={`w-5 h-5 mt-0.5 ${
                          activeCapability === capability.id ? 'text-purple-500' : 'text-ghost-600'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={`text-sm font-semibold mb-1 font-mono ${
                            activeCapability === capability.id ? 'text-purple-900' : 'text-ghost-700'
                          }`}
                        >
                          {capability.name}
                        </div>
                        <div className="text-xs text-ghost-600 leading-relaxed">
                          {capability.description}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </Card>
          </div>

          {/* Right: Processing Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* File Upload */}
            <Card className="bg-white border-ghost-300 p-6">
              <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                {currentCapability?.name}
              </h2>
              <p className="text-sm text-ghost-700 mb-6">{currentCapability?.description}</p>

              {/* Upload Area */}
              <div className="border-2 border-dashed border-ghost-300 hover:border-purple-500 transition-colors p-8 text-center mb-6">
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.txt"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-ghost-400" />
                  <p className="text-sm text-ghost-700 mb-2 font-mono">
                    {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
                  </p>
                  <p className="text-xs text-ghost-500">
                    Supported formats: PDF, DOC, DOCX, TXT (max 10MB)
                  </p>
                </label>
              </div>

              {/* Process Button */}
              <Button
                onClick={handleProcess}
                disabled={!selectedFile || processing}
                className="w-full bg-purple-900 hover:bg-purple-800 text-white"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileCheck className="w-4 h-4 mr-2" />
                    Process Document
                  </>
                )}
              </Button>
            </Card>

            {/* Results */}
            {result && (
              <Card className="bg-white border-ghost-300 p-6">
                <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                  RESULTS
                </h2>

                {result.status === 'processing' && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-spin" />
                    <p className="text-sm text-ghost-700 font-mono">Processing document...</p>
                    <p className="text-xs text-ghost-500 mt-2">This may take a few moments</p>
                  </div>
                )}

                {result.status === 'completed' && result.result && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-success mb-4">
                      <FileCheck className="w-5 h-5" />
                      <span className="text-sm font-semibold font-mono">PROCESSING COMPLETE</span>
                    </div>

                    <div className="p-4 bg-ghost-50 border border-ghost-300">
                      <pre className="text-xs text-ghost-700 font-mono overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(result.result, null, 2)}
                      </pre>
                    </div>

                    <Button variant="outline" className="border-ghost-300 hover:border-purple-500">
                      <Download className="w-4 h-4 mr-2" />
                      Download Results
                    </Button>
                  </div>
                )}

                {result.status === 'error' && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-error" />
                    </div>
                    <p className="text-sm text-error font-mono mb-2">Processing Failed</p>
                    <p className="text-xs text-ghost-600">{result.error}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
