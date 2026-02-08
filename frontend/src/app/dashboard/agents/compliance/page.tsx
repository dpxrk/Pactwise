'use client';

import {
  Shield,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  Loader2,
  ArrowLeft,
  Download,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { agentsAPI } from '@/lib/api/agents';

import { SwarmDebugPanel } from '@/components/agents/SwarmDebugPanel';
interface ProcessingResult {
  taskId: string;
  status: 'processing' | 'completed' | 'error';
  result?: {
    policyValidation?: {
      compliant: boolean;
      violations: Array<{ policy: string; description: string; severity: string }>;
      score: number;
    };
    auditTrail?: Array<{ timestamp: string; action: string; user: string; outcome: string }>;
    regulatoryCheck?: {
      framework: string;
      status: string;
      requirements: Array<{ requirement: string; met: boolean; notes: string }>;
    };
    workflow?: {
      stage: string;
      approvers: string[];
      pending: string[];
      completed: string[];
      timeline: Array<{ stage: string; date: string; status: string }>;
    };
    certifications?: Array<{ name: string; status: string; expiry: string; issuer: string }>;
  };
  error?: string;
}

export default function ComplianceAgentPage() {
  const { userProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeCapability, setActiveCapability] = useState<string>('policy-validation');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const capabilities = [
    {
      id: 'policy-validation',
      name: 'Policy Validation',
      icon: Shield,
      description: 'Verify adherence to internal policies and standards',
    },
    {
      id: 'audit-trail',
      name: 'Audit Trail',
      icon: Clock,
      description: 'Generate comprehensive compliance audit trail',
    },
    {
      id: 'regulatory-check',
      name: 'Regulatory Check',
      icon: FileText,
      description: 'Check against GDPR, SOC2, HIPAA, and other regulations',
    },
    {
      id: 'document-workflow',
      name: 'Document Workflow',
      icon: CheckCircle2,
      description: 'Track compliance workflow and approval status',
    },
    {
      id: 'certification-status',
      name: 'Certification Status',
      icon: Award,
      description: 'Verify certifications and compliance requirements',
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
      // Create agent task with swarmMode enabled
      const task = await agentsAPI.createAgentTask({
        type: 'compliance',
        data: {
          capability: activeCapability,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        },
        priority: 8,
        userId: userProfile.id,
        enterpriseId: userProfile.enterprise_id,
        swarmMode: true, // Enable swarm orchestration
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
            toast.success('Compliance check completed successfully!');
          } else if (taskStatus.status === 'failed') {
            clearInterval(pollInterval);
            setResult({
              taskId: task.id,
              status: 'error',
              error: taskStatus.error || 'Compliance check failed',
            });
            setProcessing(false);
            toast.error('Compliance check failed');
          }
        } catch (_error) {
          clearInterval(pollInterval);
          setProcessing(false);
          toast.error('Failed to check task status');
        }
      }, 2000);

      // Timeout after 3 minutes
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
        error: 'Failed to start compliance check',
      });
      toast.error('Failed to process document');
    }
  };

  const currentCapability = capabilities.find((c) => c.id === activeCapability);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
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
      case 'policy-validation':
        return (
          <div className="space-y-4">
            {/* Compliance Score */}
            <div className="p-6 bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-1">
                    Policy Compliance Score
                  </div>
                  <div className="text-3xl font-bold text-purple-900 font-mono">
                    {result.result.policyValidation?.score || 0}%
                  </div>
                </div>
                <div>
                  {result.result.policyValidation?.compliant ? (
                    <div className="flex items-center gap-2 text-success">
                      <CheckCircle2 className="w-6 h-6" />
                      <span className="text-sm font-semibold font-mono">COMPLIANT</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-error">
                      <AlertCircle className="w-6 h-6" />
                      <span className="text-sm font-semibold font-mono">NON-COMPLIANT</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Violations */}
            {result.result.policyValidation?.violations && result.result.policyValidation.violations.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  Policy Violations ({result.result.policyValidation.violations.length})
                </div>
                {result.result.policyValidation.violations.map((violation, idx) => (
                  <div key={idx} className="p-4 bg-white border border-ghost-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-semibold text-purple-900 font-mono">{violation.policy}</span>
                      </div>
                      <Badge className={`${getSeverityColor(violation.severity)} font-mono text-xs`}>
                        {violation.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="text-sm text-ghost-700 leading-relaxed">{violation.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'audit-trail':
        return (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider mb-3">
              Audit Trail ({result.result.auditTrail?.length || 0} Events)
            </div>
            {result.result.auditTrail?.map((entry, idx) => (
              <div key={idx} className="p-4 bg-white border border-ghost-300">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-purple-900 mb-1">{entry.action}</div>
                    <div className="flex items-center gap-3 text-xs text-ghost-600 font-mono">
                      <span>User: <span className="text-purple-900 font-semibold">{entry.user}</span></span>
                      <span className="text-ghost-400">•</span>
                      <span>Time: <span className="text-purple-900 font-semibold">{entry.timestamp}</span></span>
                    </div>
                  </div>
                  <Badge
                    className={`${
                      entry.outcome.toLowerCase() === 'success'
                        ? 'bg-success/20 text-success border-success/30'
                        : 'bg-error/20 text-error border-error/30'
                    } font-mono text-xs`}
                  >
                    {entry.outcome.toUpperCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        );

      case 'regulatory-check':
        return (
          <div className="space-y-4">
            {/* Framework Status */}
            <div className="p-4 bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-semibold text-purple-900 font-mono uppercase">
                  {result.result.regulatoryCheck?.framework} - {result.result.regulatoryCheck?.status}
                </span>
              </div>
            </div>

            {/* Requirements */}
            {result.result.regulatoryCheck?.requirements && result.result.regulatoryCheck.requirements.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  Requirements ({result.result.regulatoryCheck.requirements.length})
                </div>
                {result.result.regulatoryCheck.requirements.map((req, idx) => (
                  <div key={idx} className="p-4 bg-white border border-ghost-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        {req.met ? (
                          <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-error shrink-0" />
                        )}
                        <span className="text-sm font-semibold text-purple-900">{req.requirement}</span>
                      </div>
                      <Badge
                        className={`${
                          req.met
                            ? 'bg-success/20 text-success border-success/30'
                            : 'bg-error/20 text-error border-error/30'
                        } font-mono text-xs`}
                      >
                        {req.met ? 'MET' : 'NOT MET'}
                      </Badge>
                    </div>
                    {req.notes && <p className="text-sm text-ghost-700 mt-2 leading-relaxed">{req.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'document-workflow':
        return (
          <div className="space-y-4">
            {/* Current Stage */}
            <div className="p-6 bg-purple-500/5 border border-purple-500/20">
              <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-2">Current Stage</div>
              <div className="text-2xl font-bold text-purple-900 font-mono mb-4">
                {result.result.workflow?.stage}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-purple-500/20">
                <div>
                  <div className="text-xs text-ghost-600 font-mono uppercase tracking-wider mb-1">Completed</div>
                  <div className="text-lg font-bold text-success font-mono">
                    {result.result.workflow?.completed.length || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ghost-600 font-mono uppercase tracking-wider mb-1">Pending</div>
                  <div className="text-lg font-bold text-warning font-mono">
                    {result.result.workflow?.pending.length || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-ghost-600 font-mono uppercase tracking-wider mb-1">Total</div>
                  <div className="text-lg font-bold text-purple-900 font-mono">
                    {result.result.workflow?.approvers.length || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline */}
            {result.result.workflow?.timeline && result.result.workflow.timeline.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  Workflow Timeline
                </div>
                {result.result.workflow.timeline.map((item, idx) => (
                  <div key={idx} className="p-4 bg-white border border-ghost-300">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <div>
                          <div className="text-sm font-semibold text-purple-900">{item.stage}</div>
                          <div className="text-xs text-ghost-600 font-mono">{item.date}</div>
                        </div>
                      </div>
                      <Badge
                        className={`${
                          item.status.toLowerCase() === 'completed'
                            ? 'bg-success/20 text-success border-success/30'
                            : item.status.toLowerCase() === 'pending'
                            ? 'bg-warning/20 text-warning border-warning/30'
                            : 'bg-ghost-500/20 text-ghost-500 border-ghost-500/30'
                        } font-mono text-xs`}
                      >
                        {item.status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'certification-status':
        return (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider mb-3">
              Certifications ({result.result.certifications?.length || 0})
            </div>
            {result.result.certifications?.map((cert, idx) => (
              <div key={idx} className="p-4 bg-white border border-ghost-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-purple-500" />
                    <div>
                      <div className="text-sm font-semibold text-purple-900 mb-1">{cert.name}</div>
                      <div className="text-xs text-ghost-600 font-mono">Issuer: {cert.issuer}</div>
                    </div>
                  </div>
                  <Badge
                    className={`${
                      cert.status.toLowerCase() === 'valid'
                        ? 'bg-success/20 text-success border-success/30'
                        : cert.status.toLowerCase() === 'expiring'
                        ? 'bg-warning/20 text-warning border-warning/30'
                        : 'bg-error/20 text-error border-error/30'
                    } font-mono text-xs`}
                  >
                    {cert.status.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-xs text-ghost-700 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Expires: <span className="font-semibold text-purple-900">{cert.expiry}</span></span>
                </div>
              </div>
            ))}
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
              <Shield className="w-10 h-10 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-purple-900 font-mono">COMPLIANCE MONITOR</h1>
                <Badge className="bg-success/20 text-success border-success/30 font-mono text-xs">ACTIVE</Badge>
              </div>
              <p className="text-sm text-ghost-700 mb-4">
                Policy validation, audit trail generation, regulatory compliance checks, workflow tracking, and
                certification management.
              </p>
              <div className="p-3 bg-white/50 border border-purple-500/10">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-purple-900 font-semibold mb-1 font-mono">USE WHEN:</div>
                    <div className="text-xs text-ghost-700">
                      Ensuring regulatory compliance (GDPR, SOC2, HIPAA), tracking approval workflows, managing audits,
                      or verifying certifications.
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
                  accept=".pdf,.doc,.docx,.txt,.xlsx,.csv"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <Upload className="w-12 h-12 mx-auto mb-4 text-ghost-400" />
                  <p className="text-sm text-ghost-700 mb-2 font-mono">
                    {selectedFile ? selectedFile.name : 'Click to upload compliance document or policy'}
                  </p>
                  <p className="text-xs text-ghost-500">
                    Supported formats: PDF, DOC, DOCX, TXT, XLSX, CSV (max 25MB)
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
                    <Shield className="w-4 h-4 mr-2" />
                    Run Compliance Check
                  </>
                )}
              </Button>
            </Card>

            {/* Results */}
            {result && (
              <Card className="bg-white border-ghost-300 p-6">
                <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                  COMPLIANCE RESULTS
                </h2>

                {result.status === 'processing' && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-spin" />
                    <p className="text-sm text-ghost-700 font-mono">Running compliance checks...</p>
                    <p className="text-xs text-ghost-500 mt-2">This may take a few minutes</p>
                  </div>
                )}

                {result.status === 'completed' && result.result && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-success mb-4">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm font-semibold font-mono">COMPLIANCE CHECK COMPLETE</span>
                    </div>

                    {formatResult()}

                    <Button variant="outline" className="border-ghost-300 hover:border-purple-500 w-full mt-4">
                      <Download className="w-4 h-4 mr-2" />
                      Download Compliance Report
                    </Button>
                  </div>
                )}

                {result.status === 'error' && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                      <Shield className="w-6 h-6 text-error" />
                    </div>
                    <p className="text-sm text-error font-mono mb-2">Compliance Check Failed</p>
                    <p className="text-xs text-ghost-600">{result.error}</p>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </div>
      <SwarmDebugPanel />
    </div>
  );
}
