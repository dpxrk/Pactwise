'use client';

import {
  Scale,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Shield,
  Upload,
  Loader2,
  ArrowLeft,
  Download,
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
  result?: {
    clauses?: Array<{ type: string; content: string; risk: string }>;
    obligations?: Array<{ obligation: string; deadline: string; party: string }>;
    compliance?: { status: string; issues: string[]; recommendations: string[] };
    terms?: Array<{ term: string; definition: string; category: string }>;
    risks?: { overall: string; score: number; critical: string[]; high: string[]; medium: string[] };
  };
  error?: string;
}

export default function LegalAgentPage() {
  const { userProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeCapability, setActiveCapability] = useState<string>('review-clauses');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const capabilities = [
    {
      id: 'review-clauses',
      name: 'Review Clauses',
      icon: FileText,
      description: 'Analyze liability, indemnification, and termination clauses',
    },
    {
      id: 'analyze-obligations',
      name: 'Analyze Obligations',
      icon: CheckCircle2,
      description: 'Identify contractual obligations and key deadlines',
    },
    {
      id: 'check-compliance',
      name: 'Check Compliance',
      icon: Shield,
      description: 'Verify regulatory compliance (GDPR, SOC2, industry standards)',
    },
    {
      id: 'extract-terms',
      name: 'Extract Terms',
      icon: Scale,
      description: 'Extract and categorize key legal terms and definitions',
    },
    {
      id: 'identify-risks',
      name: 'Identify Risks',
      icon: AlertTriangle,
      description: 'Comprehensive legal risk assessment with severity scoring',
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
        type: 'legal',
        data: {
          capability: activeCapability,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        },
        priority: 8,
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
            toast.success('Legal analysis completed successfully!');
          } else if (taskStatus.status === 'failed') {
            clearInterval(pollInterval);
            setResult({
              taskId: task.id,
              status: 'error',
              error: taskStatus.error || 'Analysis failed',
            });
            setProcessing(false);
            toast.error('Legal analysis failed');
          }
        } catch (_error) {
          clearInterval(pollInterval);
          setProcessing(false);
          toast.error('Failed to check task status');
        }
      }, 2000);

      // Timeout after 3 minutes (legal analysis may take longer)
      setTimeout(() => {
        clearInterval(pollInterval);
        if (processing) {
          setProcessing(false);
          toast.error('Processing timeout');
        }
      }, 180000);
    } catch (error) {
      console.error('Processing error:', error);
      setProcessing(false);
      setResult({
        taskId: '',
        status: 'error',
        error: 'Failed to start analysis',
      });
      toast.error('Failed to process document');
    }
  };

  const currentCapability = capabilities.find((c) => c.id === activeCapability);

  const getRiskBadgeColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'critical':
        return 'bg-error/20 text-error border-error/30';
      case 'high':
        return 'bg-warning/20 text-warning border-warning/30';
      case 'medium':
        return 'bg-purple-500/20 text-purple-900 border-purple-500/30';
      case 'low':
        return 'bg-success/20 text-success border-success/30';
      default:
        return 'bg-ghost-500/20 text-ghost-500 border-ghost-500/30';
    }
  };

  const formatResult = () => {
    if (!result?.result) return null;

    switch (activeCapability) {
      case 'review-clauses':
        return (
          <div className="space-y-4">
            {result.result.clauses?.map((clause, idx) => (
              <div key={idx} className="p-4 bg-white border border-ghost-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-semibold text-purple-900 font-mono uppercase">
                      {clause.type}
                    </span>
                  </div>
                  <Badge className={`${getRiskBadgeColor(clause.risk)} font-mono text-xs`}>
                    {clause.risk.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-ghost-700 leading-relaxed">{clause.content}</p>
              </div>
            ))}
          </div>
        );

      case 'analyze-obligations':
        return (
          <div className="space-y-3">
            {result.result.obligations?.map((obligation, idx) => (
              <div key={idx} className="p-4 bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-purple-900 mb-1">{obligation.obligation}</div>
                    <div className="flex items-center gap-3 text-xs text-ghost-600 font-mono">
                      <span>Party: <span className="text-purple-900 font-semibold">{obligation.party}</span></span>
                      <span className="text-ghost-400">•</span>
                      <span>Deadline: <span className="text-purple-900 font-semibold">{obligation.deadline}</span></span>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-purple-500 shrink-0 ml-3" />
                </div>
              </div>
            ))}
          </div>
        );

      case 'check-compliance':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-semibold text-purple-900 font-mono uppercase">
                  Compliance Status: {result.result.compliance?.status}
                </span>
              </div>

              {result.result.compliance?.issues && result.result.compliance.issues.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-semibold text-error mb-2 font-mono uppercase">Issues Found:</div>
                  <ul className="space-y-1">
                    {result.result.compliance.issues.map((issue, idx) => (
                      <li key={idx} className="text-sm text-ghost-700 flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-error mt-0.5 shrink-0" />
                        <span>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.result.compliance?.recommendations && result.result.compliance.recommendations.length > 0 && (
                <div>
                  <div className="text-xs font-semibold text-purple-900 mb-2 font-mono uppercase">
                    Recommendations:
                  </div>
                  <ul className="space-y-1">
                    {result.result.compliance.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-ghost-700 flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 text-success mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );

      case 'extract-terms':
        return (
          <div className="space-y-3">
            {result.result.terms?.map((term, idx) => (
              <div key={idx} className="p-4 bg-white border border-ghost-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-900 font-mono">{term.term}</span>
                  <Badge className="bg-purple-500/20 text-purple-900 border-purple-500/30 font-mono text-xs">
                    {term.category}
                  </Badge>
                </div>
                <p className="text-sm text-ghost-700 leading-relaxed">{term.definition}</p>
              </div>
            ))}
          </div>
        );

      case 'identify-risks':
        return (
          <div className="space-y-4">
            {/* Overall Risk Score */}
            <div className="p-6 bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-1">
                    Overall Risk Level
                  </div>
                  <div className="text-2xl font-bold text-purple-900 font-mono">
                    {result.result.risks?.overall || 'MEDIUM'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-ghost-600 font-mono uppercase tracking-wider mb-1">Risk Score</div>
                  <div className="text-3xl font-bold text-purple-900 font-mono">
                    {result.result.risks?.score || 0}/100
                  </div>
                </div>
              </div>
            </div>

            {/* Critical Risks */}
            {result.result.risks?.critical && result.result.risks.critical.length > 0 && (
              <div className="p-4 bg-error/5 border border-error/20">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-error" />
                  <span className="text-sm font-semibold text-error font-mono uppercase">
                    Critical Risks ({result.result.risks.critical.length})
                  </span>
                </div>
                <ul className="space-y-2">
                  {result.result.risks.critical.map((risk, idx) => (
                    <li key={idx} className="text-sm text-ghost-700 flex items-start gap-2">
                      <span className="text-error font-mono">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* High Risks */}
            {result.result.risks?.high && result.result.risks.high.length > 0 && (
              <div className="p-4 bg-warning/5 border border-warning/20">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  <span className="text-sm font-semibold text-warning font-mono uppercase">
                    High Risks ({result.result.risks.high.length})
                  </span>
                </div>
                <ul className="space-y-2">
                  {result.result.risks.high.map((risk, idx) => (
                    <li key={idx} className="text-sm text-ghost-700 flex items-start gap-2">
                      <span className="text-warning font-mono">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Medium Risks */}
            {result.result.risks?.medium && result.result.risks.medium.length > 0 && (
              <div className="p-4 bg-purple-500/5 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-purple-500" />
                  <span className="text-sm font-semibold text-purple-900 font-mono uppercase">
                    Medium Risks ({result.result.risks.medium.length})
                  </span>
                </div>
                <ul className="space-y-2">
                  {result.result.risks.medium.map((risk, idx) => (
                    <li key={idx} className="text-sm text-ghost-700 flex items-start gap-2">
                      <span className="text-purple-500 font-mono">•</span>
                      <span>{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );

      default:
        return (
          <div className="p-4 bg-ghost-50 border border-ghost-300">
            <pre className="text-xs text-ghost-700 font-mono overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </div>
        );
    }
  };

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
              <Scale className="w-10 h-10 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-purple-900 font-mono">LEGAL ANALYST</h1>
                <Badge className="bg-success/20 text-success border-success/30 font-mono text-xs">ACTIVE</Badge>
              </div>
              <p className="text-sm text-ghost-700 mb-4">
                Contract analysis, clause review, compliance verification, obligation tracking, and comprehensive legal
                risk assessment.
              </p>
              <div className="p-3 bg-white/50 border border-purple-500/10">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-purple-900 font-semibold mb-1 font-mono">USE WHEN:</div>
                    <div className="text-xs text-ghost-700">
                      Reviewing contracts for legal compliance, analyzing contractual obligations, assessing legal
                      risks, or extracting key terms and clauses.
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
                        <div className="text-xs text-ghost-600 leading-relaxed">{capability.description}</div>
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
                    {selectedFile ? selectedFile.name : 'Click to upload contract or legal document'}
                  </p>
                  <p className="text-xs text-ghost-500">Supported formats: PDF, DOC, DOCX, TXT (max 25MB)</p>
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
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4 mr-2" />
                    Analyze Document
                  </>
                )}
              </Button>
            </Card>

            {/* Results */}
            {result && (
              <Card className="bg-white border-ghost-300 p-6">
                <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                  ANALYSIS RESULTS
                </h2>

                {result.status === 'processing' && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-spin" />
                    <p className="text-sm text-ghost-700 font-mono">Analyzing legal document...</p>
                    <p className="text-xs text-ghost-500 mt-2">This may take a few minutes for complex documents</p>
                  </div>
                )}

                {result.status === 'completed' && result.result && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-success mb-4">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-semibold font-mono">ANALYSIS COMPLETE</span>
                    </div>

                    {formatResult()}

                    <Button variant="outline" className="border-ghost-300 hover:border-purple-500 w-full mt-4">
                      <Download className="w-4 h-4 mr-2" />
                      Download Analysis Report
                    </Button>
                  </div>
                )}

                {result.status === 'error' && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                      <Scale className="w-6 h-6 text-error" />
                    </div>
                    <p className="text-sm text-error font-mono mb-2">Analysis Failed</p>
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
