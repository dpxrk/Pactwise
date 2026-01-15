'use client';

import {
  AlertTriangle,
  TrendingUp,
  Target,
  Grid3X3,
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
    threats?: Array<{ name: string; category: string; severity: string; description: string }>;
    impact?: {
      financial: { score: number; potential_loss: number; description: string };
      operational: { score: number; description: string };
      reputational: { score: number; description: string };
      overall: number;
    };
    probability?: {
      score: number;
      likelihood: string;
      factors: Array<{ factor: string; weight: number; description: string }>;
    };
    matrix?: {
      position: { x: number; y: number };
      category: string;
      risks: Array<{ name: string; impact: number; probability: number; severity: string }>;
    };
    mitigations?: Array<{
      strategy: string;
      priority: string;
      cost: string;
      effectiveness: number;
      timeline: string;
    }>;
  };
  error?: string;
}

export default function RiskAssessmentAgentPage() {
  const { userProfile } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeCapability, setActiveCapability] = useState<string>('threat-analysis');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const capabilities = [
    {
      id: 'threat-analysis',
      name: 'Threat Analysis',
      icon: AlertTriangle,
      description: 'Identify potential threats and vulnerabilities',
    },
    {
      id: 'impact-assessment',
      name: 'Impact Assessment',
      icon: TrendingUp,
      description: 'Evaluate potential business impact (financial, operational, reputational)',
    },
    {
      id: 'probability-scoring',
      name: 'Probability Scoring',
      icon: Target,
      description: 'Calculate likelihood and probability of risk occurrence',
    },
    {
      id: 'risk-matrix',
      name: 'Risk Matrix',
      icon: Grid3X3,
      description: 'Visualize risks on impact vs. probability matrix',
    },
    {
      id: 'mitigation-strategies',
      name: 'Mitigation Strategies',
      icon: Shield,
      description: 'Recommend risk mitigation and treatment approaches',
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
        type: 'risk_assessment',
        data: {
          capability: activeCapability,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
          fileType: selectedFile.type,
        },
        priority: 9,
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
            toast.success('Risk assessment completed successfully!');
          } else if (taskStatus.status === 'failed') {
            clearInterval(pollInterval);
            setResult({
              taskId: task.id,
              status: 'error',
              error: taskStatus.error || 'Risk assessment failed',
            });
            setProcessing(false);
            toast.error('Risk assessment failed');
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
        error: 'Failed to start risk assessment',
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
      case 'threat-analysis':
        return (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider mb-3">
              Identified Threats ({result.result.threats?.length || 0})
            </div>
            {result.result.threats?.map((threat, idx) => (
              <div key={idx} className="p-4 bg-white border border-ghost-300">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-purple-500" />
                    <div>
                      <span className="text-sm font-semibold text-purple-900">{threat.name}</span>
                      <span className="text-xs text-ghost-600 ml-2 font-mono">({threat.category})</span>
                    </div>
                  </div>
                  <Badge className={`${getSeverityColor(threat.severity)} font-mono text-xs`}>
                    {threat.severity.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-ghost-700 leading-relaxed">{threat.description}</p>
              </div>
            ))}
          </div>
        );

      case 'impact-assessment':
        return (
          <div className="space-y-4">
            {/* Overall Impact Score */}
            <div className="p-6 bg-purple-500/5 border border-purple-500/20">
              <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-2">
                Overall Impact Score
              </div>
              <div className="text-4xl font-bold text-purple-900 font-mono">
                {result.result.impact?.overall || 0}/100
              </div>
            </div>

            {/* Financial Impact */}
            <div className="p-4 bg-white border border-ghost-300">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-purple-900 font-mono">FINANCIAL IMPACT</div>
                </div>
                <div className="text-2xl font-bold text-purple-900 font-mono">
                  {result.result.impact?.financial.score || 0}/10
                </div>
              </div>
              <div className="text-sm text-ghost-700 mb-2">{result.result.impact?.financial.description}</div>
              <div className="text-xs text-error font-mono">
                Potential Loss: ${result.result.impact?.financial.potential_loss.toLocaleString() || 0}
              </div>
            </div>

            {/* Operational Impact */}
            <div className="p-4 bg-white border border-ghost-300">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-purple-900 font-mono">OPERATIONAL IMPACT</div>
                <div className="text-2xl font-bold text-purple-900 font-mono">
                  {result.result.impact?.operational.score || 0}/10
                </div>
              </div>
              <div className="text-sm text-ghost-700">{result.result.impact?.operational.description}</div>
            </div>

            {/* Reputational Impact */}
            <div className="p-4 bg-white border border-ghost-300">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-purple-900 font-mono">REPUTATIONAL IMPACT</div>
                <div className="text-2xl font-bold text-purple-900 font-mono">
                  {result.result.impact?.reputational.score || 0}/10
                </div>
              </div>
              <div className="text-sm text-ghost-700">{result.result.impact?.reputational.description}</div>
            </div>
          </div>
        );

      case 'probability-scoring':
        return (
          <div className="space-y-4">
            {/* Probability Score */}
            <div className="p-6 bg-purple-500/5 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-1">
                    Probability Score
                  </div>
                  <div className="text-4xl font-bold text-purple-900 font-mono">
                    {result.result.probability?.score || 0}%
                  </div>
                </div>
                <div>
                  <Badge className={`${getSeverityColor(result.result.probability?.likelihood || 'low')} font-mono`}>
                    {result.result.probability?.likelihood?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Contributing Factors */}
            {result.result.probability?.factors && result.result.probability.factors.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  Contributing Factors ({result.result.probability.factors.length})
                </div>
                {result.result.probability.factors.map((factor, idx) => (
                  <div key={idx} className="p-4 bg-white border border-ghost-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-semibold text-purple-900">{factor.factor}</div>
                      <div className="text-sm font-mono text-purple-500">
                        Weight: {(factor.weight * 100).toFixed(0)}%
                      </div>
                    </div>
                    <p className="text-sm text-ghost-700 leading-relaxed">{factor.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'risk-matrix':
        return (
          <div className="space-y-4">
            {/* Risk Position */}
            <div className="p-6 bg-purple-500/5 border border-purple-500/20">
              <div className="text-xs text-purple-900 font-mono uppercase tracking-wider mb-3">Risk Position</div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-purple-900 font-mono mb-1">
                    {result.result.matrix?.category}
                  </div>
                  <div className="text-xs text-ghost-600 font-mono">
                    Impact: {result.result.matrix?.position.x}/10 | Probability: {result.result.matrix?.position.y}/10
                  </div>
                </div>
                <Grid3X3 className="w-12 h-12 text-purple-500 opacity-50" />
              </div>
            </div>

            {/* Risks in Category */}
            {result.result.matrix?.risks && result.result.matrix.risks.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider">
                  Risks in This Category ({result.result.matrix.risks.length})
                </div>
                {result.result.matrix.risks.map((risk, idx) => (
                  <div key={idx} className="p-4 bg-white border border-ghost-300">
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-semibold text-purple-900">{risk.name}</div>
                      <Badge className={`${getSeverityColor(risk.severity)} font-mono text-xs`}>
                        {risk.severity.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-ghost-600 font-mono">
                      <span>Impact: <span className="text-purple-900 font-semibold">{risk.impact}/10</span></span>
                      <span className="text-ghost-400">•</span>
                      <span>Probability: <span className="text-purple-900 font-semibold">{risk.probability}/10</span></span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'mitigation-strategies':
        return (
          <div className="space-y-3">
            <div className="text-sm font-semibold text-purple-900 font-mono uppercase tracking-wider mb-3">
              Recommended Mitigation Strategies ({result.result.mitigations?.length || 0})
            </div>
            {result.result.mitigations?.map((mitigation, idx) => (
              <div key={idx} className="p-4 bg-white border border-ghost-300">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-semibold text-purple-900">{mitigation.strategy}</span>
                  </div>
                  <Badge
                    className={`${
                      mitigation.priority.toLowerCase() === 'critical'
                        ? 'bg-error/20 text-error border-error/30'
                        : mitigation.priority.toLowerCase() === 'high'
                        ? 'bg-warning/20 text-warning border-warning/30'
                        : 'bg-purple-500/20 text-purple-900 border-purple-500/30'
                    } font-mono text-xs`}
                  >
                    {mitigation.priority.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-3 border-t border-ghost-200">
                  <div>
                    <div className="text-xs text-ghost-600 font-mono uppercase tracking-wider mb-1">Cost</div>
                    <div className="text-sm font-semibold text-purple-900">{mitigation.cost}</div>
                  </div>
                  <div>
                    <div className="text-xs text-ghost-600 font-mono uppercase tracking-wider mb-1">Effectiveness</div>
                    <div className="text-sm font-semibold text-success">{mitigation.effectiveness}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-ghost-600 font-mono uppercase tracking-wider mb-1">Timeline</div>
                    <div className="text-sm font-semibold text-purple-900">{mitigation.timeline}</div>
                  </div>
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
              <AlertTriangle className="w-10 h-10 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-semibold text-purple-900 font-mono">RISK ASSESSMENT</h1>
                <Badge className="bg-success/20 text-success border-success/30 font-mono text-xs">ACTIVE</Badge>
              </div>
              <p className="text-sm text-ghost-700 mb-4">
                Comprehensive risk evaluation with threat analysis, impact assessment, probability scoring, risk matrix
                visualization, and mitigation strategy recommendations.
              </p>
              <div className="p-3 bg-white/50 border border-purple-500/10">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs text-purple-900 font-semibold mb-1 font-mono">USE WHEN:</div>
                    <div className="text-xs text-ghost-700">
                      Evaluating business risks, assessing vendor threats, analyzing contract exposure, developing
                      mitigation strategies, or monitoring risk indicators.
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
                    {selectedFile ? selectedFile.name : 'Click to upload document for risk assessment'}
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
                    Analyzing Risks...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Run Risk Assessment
                  </>
                )}
              </Button>
            </Card>

            {/* Results */}
            {result && (
              <Card className="bg-white border-ghost-300 p-6">
                <h2 className="text-sm font-semibold text-purple-900 mb-4 font-mono uppercase tracking-wider">
                  RISK ASSESSMENT RESULTS
                </h2>

                {result.status === 'processing' && (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 mx-auto mb-4 text-purple-500 animate-spin" />
                    <p className="text-sm text-ghost-700 font-mono">Analyzing risks...</p>
                    <p className="text-xs text-ghost-500 mt-2">This may take a few minutes</p>
                  </div>
                )}

                {result.status === 'completed' && result.result && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-success mb-4">
                      <Shield className="w-5 h-5" />
                      <span className="text-sm font-semibold font-mono">RISK ASSESSMENT COMPLETE</span>
                    </div>

                    {formatResult()}

                    <Button variant="outline" className="border-ghost-300 hover:border-purple-500 w-full mt-4">
                      <Download className="w-4 h-4 mr-2" />
                      Download Risk Report
                    </Button>
                  </div>
                )}

                {result.status === 'error' && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
                      <AlertTriangle className="w-6 h-6 text-error" />
                    </div>
                    <p className="text-sm text-error font-mono mb-2">Risk Assessment Failed</p>
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
