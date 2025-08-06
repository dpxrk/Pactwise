'use client';

import React, { useState } from 'react';
import {
  FileSearch,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  DollarSign,
  Calendar,
  Shield,
  Scale,
  Building,
  FileText,
  Download,
  RefreshCw,
  Copy,
  Flag,
  Zap,
  Target,
  Lightbulb,
  Search,
  Package,
  Users
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useContractAnalysisWorker } from '@/hooks/useWebWorker';
import { trackBusinessMetric } from '@/lib/metrics';
import { SimilaritySearch } from '../ai/SimilaritySearch';

interface Clause {
  id: string;
  type: string;
  text: string;
  riskLevel: 'high' | 'medium' | 'low';
  category: string;
  explanation?: string;
  recommendations?: string[];
  similarClauses?: number;
}

interface KeyTerm {
  term: string;
  definition?: string;
  occurrences: number;
  importance: 'high' | 'medium' | 'low';
}

interface Obligation {
  id: string;
  type: 'payment' | 'delivery' | 'reporting' | 'compliance' | 'other';
  description: string;
  dueDate?: string;
  frequency?: 'one-time' | 'monthly' | 'quarterly' | 'annually';
  party: 'buyer' | 'seller' | 'both';
  status?: 'pending' | 'completed' | 'overdue';
}

interface Risk {
  id: string;
  category: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  mitigation?: string;
  probability: number;
  impact: number;
}

interface ContractAnalysisData {
  contractId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  completedAt?: string;
  summary: {
    parties: string[];
    type: string;
    value?: number;
    startDate?: string;
    endDate?: string;
    autoRenewal?: boolean;
    governingLaw?: string;
  };
  clauses: Clause[];
  keyTerms: KeyTerm[];
  obligations: Obligation[];
  risks: Risk[];
  scores: {
    overall: number;
    clarity: number;
    completeness: number;
    riskLevel: number;
    favorability: number;
  };
  insights: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    recommendations: string[];
  };
}

interface ContractAnalysisProps {
  contractId: string;
  onRefresh?: () => void;
  className?: string;
}

const ContractAnalysisComponent: React.FC<ContractAnalysisProps> = ({
  contractId,
  onRefresh,
  className
}) => {
  const [selectedClause, setSelectedClause] = useState<Clause | null>(null);
  const [showSimilaritySearch, setShowSimilaritySearch] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { analyzeContract, result: workerResult } = useContractAnalysisWorker();

  // Mock data - replace with Supabase implementation
  const analysis: ContractAnalysisData | null = null; // TODO: Replace with Supabase query
  const runAnalysis = async (params: { contractId: string }) => {
    // TODO: Replace with Supabase implementation
    console.log('Running analysis:', params);
    return { success: true };
  };

  // Mock analysis data
  const mockAnalysis: ContractAnalysisData = {
    contractId,
    status: 'completed',
    completedAt: new Date().toISOString(),
    summary: {
      parties: ['Acme Corporation', 'TechVendor Inc.'],
      type: 'Software License Agreement',
      value: 250000,
      startDate: '2024-01-01',
      endDate: '2025-12-31',
      autoRenewal: true,
      governingLaw: 'State of California'
    },
    clauses: [
      {
        id: '1',
        type: 'Payment Terms',
        text: 'Payment shall be made within 30 days of invoice receipt...',
        riskLevel: 'low',
        category: 'financial',
        explanation: 'Standard payment terms with reasonable timeline',
        recommendations: ['Consider negotiating for 45-day payment terms'],
        similarClauses: 15
      },
      {
        id: '2',
        type: 'Limitation of Liability',
        text: 'In no event shall either party be liable for indirect, incidental, special...',
        riskLevel: 'high',
        category: 'legal',
        explanation: 'Broad limitation of liability may limit recourse in case of issues',
        recommendations: ['Review with legal counsel', 'Consider carve-outs for gross negligence'],
        similarClauses: 8
      },
      {
        id: '3',
        type: 'Termination',
        text: 'Either party may terminate this agreement with 30 days written notice...',
        riskLevel: 'medium',
        category: 'operational',
        explanation: 'Short termination notice period provides flexibility but less stability',
        recommendations: ['Consider extending to 60-90 days for better planning'],
        similarClauses: 12
      }
    ],
    keyTerms: [
      { term: 'Software License', occurrences: 12, importance: 'high' },
      { term: 'Confidential Information', occurrences: 8, importance: 'high' },
      { term: 'Support Services', occurrences: 6, importance: 'medium' },
      { term: 'Updates and Upgrades', occurrences: 4, importance: 'medium' }
    ],
    obligations: [
      {
        id: '1',
        type: 'payment',
        description: 'Annual license fee payment',
        dueDate: '2024-01-31',
        frequency: 'annually',
        party: 'buyer',
        status: 'pending'
      },
      {
        id: '2',
        type: 'reporting',
        description: 'Quarterly usage reports',
        frequency: 'quarterly',
        party: 'buyer',
        status: 'pending'
      },
      {
        id: '3',
        type: 'compliance',
        description: 'Annual security audit',
        frequency: 'annually',
        party: 'seller',
        status: 'pending'
      }
    ],
    risks: [
      {
        id: '1',
        category: 'Financial',
        description: 'Auto-renewal may lead to unexpected costs',
        severity: 'medium',
        mitigation: 'Set calendar reminders 90 days before renewal',
        probability: 0.6,
        impact: 0.7
      },
      {
        id: '2',
        category: 'Operational',
        description: 'Limited customization rights may impact future needs',
        severity: 'medium',
        mitigation: 'Document customization requirements early',
        probability: 0.5,
        impact: 0.6
      },
      {
        id: '3',
        category: 'Legal',
        description: 'Broad indemnification clause',
        severity: 'high',
        mitigation: 'Seek legal review and negotiate mutual indemnification',
        probability: 0.3,
        impact: 0.9
      }
    ],
    scores: {
      overall: 75,
      clarity: 82,
      completeness: 78,
      riskLevel: 35,
      favorability: 68
    },
    insights: {
      strengths: [
        'Clear payment terms with standard net-30 timeline',
        'Comprehensive definition of licensed software',
        'Well-defined support service levels'
      ],
      weaknesses: [
        'Broad limitation of liability clause',
        'Short termination notice period',
        'Limited customization rights'
      ],
      opportunities: [
        'Negotiate volume discounts for additional licenses',
        'Explore extended support options',
        'Consider multi-year pricing lock'
      ],
      recommendations: [
        'Review auto-renewal clause and set reminders',
        'Seek legal counsel for liability limitations',
        'Document all customization needs upfront',
        'Consider adding SLA penalties'
      ]
    }
  };

  const data = analysis || mockAnalysis;

  const handleRunAnalysis = async () => {
    setIsRefreshing(true);
    const startTime = performance.now();
    
    try {
      // First run the backend analysis
      await runAnalysis({ contractId });
      
      // Then use Web Worker for additional text analysis if contract content is available
      // TODO: Replace with Supabase contract fetching
      const contract: { content: string } | null = null; // await supabase.from('contracts').select('*').eq('id', contractId).single();
      if (contract?.content) {
        // Offload heavy text analysis to Web Worker
        analyzeContract(contract.content, {
          includeReadability: true,
          extractMetadata: true
        });
        
        logger.info('Running advanced text analysis in Web Worker');
      }
      
      const duration = performance.now() - startTime;
      trackBusinessMetric.contractAnalyzed(duration, 'success');
      logger.info('Contract analysis completed', { contractId, duration });
      
      onRefresh?.();
    } catch (error) {
      logger.error('Contract analysis failed', error as Error);
      trackBusinessMetric.contractAnalyzed(performance.now() - startTime, 'failure');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle Web Worker results
  React.useEffect(() => {
    if (workerResult && workerResult.type === 'ANALYZE_CONTRACT_RESULT') {
      // setWorkerAnalysis(workerResult.data);
      logger.info('Web Worker analysis complete', workerResult.data);
    }
  }, [workerResult]);

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'critical':
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number, inverse: boolean = false) => {
    if (inverse) {
      if (score < 30) return 'text-green-600';
      if (score < 60) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getImportanceBadgeVariant = (importance: string) => {
    switch (importance) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const handleExport = () => {
    trackBusinessMetric.userAction('export-contract-analysis', 'contracts');
    // Implement export logic
    logger.info('Exporting contract analysis', { contractId });
  };

  if (!data || data.status === 'pending') {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <FileSearch className="h-12 w-12 mx-auto text-muted-foreground" />
            <div className="space-y-2">
              <h3 className="text-lg font-medium">No Analysis Available</h3>
              <p className="text-sm text-muted-foreground">
                This contract hasn't been analyzed yet
              </p>
            </div>
            <Button onClick={handleRunAnalysis} disabled={isRefreshing}>
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Run Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (data.status === 'processing') {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="relative">
              <FileSearch className="h-12 w-12 mx-auto text-muted-foreground" />
              <RefreshCw className="h-6 w-6 absolute -bottom-2 -right-2 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Analysis in Progress</h3>
              <p className="text-sm text-muted-foreground">
                AI is analyzing your contract. This may take a few moments...
              </p>
            </div>
            <Progress value={33} className="w-48 mx-auto" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5" />
                Contract Analysis
              </CardTitle>
              <CardDescription>
                AI-powered analysis completed {data.completedAt && 
                  new Date(data.completedAt).toLocaleDateString()
                }
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRunAnalysis}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Overall Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Contract Health Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center space-y-2">
              <div className={cn(
                "text-3xl font-bold",
                getScoreColor(data.scores.overall)
              )}>
                {data.scores.overall}%
              </div>
              <p className="text-xs text-muted-foreground">Overall Score</p>
              <Progress value={data.scores.overall} className="h-2" />
            </div>
            
            <div className="text-center space-y-2">
              <div className={cn(
                "text-2xl font-bold",
                getScoreColor(data.scores.clarity)
              )}>
                {data.scores.clarity}%
              </div>
              <p className="text-xs text-muted-foreground">Clarity</p>
              <Progress value={data.scores.clarity} className="h-1" />
            </div>
            
            <div className="text-center space-y-2">
              <div className={cn(
                "text-2xl font-bold",
                getScoreColor(data.scores.completeness)
              )}>
                {data.scores.completeness}%
              </div>
              <p className="text-xs text-muted-foreground">Completeness</p>
              <Progress value={data.scores.completeness} className="h-1" />
            </div>
            
            <div className="text-center space-y-2">
              <div className={cn(
                "text-2xl font-bold",
                getScoreColor(data.scores.riskLevel, true)
              )}>
                {data.scores.riskLevel}%
              </div>
              <p className="text-xs text-muted-foreground">Risk Level</p>
              <Progress value={data.scores.riskLevel} className="h-1" />
            </div>
            
            <div className="text-center space-y-2">
              <div className={cn(
                "text-2xl font-bold",
                getScoreColor(data.scores.favorability)
              )}>
                {data.scores.favorability}%
              </div>
              <p className="text-xs text-muted-foreground">Favorability</p>
              <Progress value={data.scores.favorability} className="h-1" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Tabs */}
      <Tabs defaultValue="summary" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="clauses">Clauses</TabsTrigger>
          <TabsTrigger value="obligations">Obligations</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Parties</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    {data.summary.parties.map((party, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">
                        {party}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Contract Type</span>
                  </div>
                  <p className="pl-6 text-sm text-muted-foreground">
                    {data.summary.type}
                  </p>
                </div>

                {data.summary.value && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Contract Value</span>
                    </div>
                    <p className="pl-6 text-sm text-muted-foreground">
                      ${data.summary.value.toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Duration</span>
                  </div>
                  <div className="pl-6 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      Start: {data.summary.startDate && new Date(data.summary.startDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      End: {data.summary.endDate && new Date(data.summary.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {data.summary.autoRenewal !== undefined && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Auto-Renewal</span>
                    </div>
                    <p className="pl-6 text-sm text-muted-foreground">
                      {data.summary.autoRenewal ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}

                {data.summary.governingLaw && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Governing Law</span>
                    </div>
                    <p className="pl-6 text-sm text-muted-foreground">
                      {data.summary.governingLaw}
                    </p>
                  </div>
                )}
              </div>

              {/* Key Terms */}
              <Separator />
              <div className="space-y-3">
                <h4 className="font-medium">Key Terms</h4>
                <div className="flex flex-wrap gap-2">
                  {data.keyTerms.map((term) => (
                    <TooltipProvider key={term.term}>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge 
                            variant={getImportanceBadgeVariant(term.importance)}
                            className="cursor-help"
                          >
                            {term.term} ({term.occurrences})
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">
                            Appears {term.occurrences} times • {term.importance} importance
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clauses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Analyzed Clauses</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSimilaritySearch(!showSimilaritySearch)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Find Similar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="space-y-2">
                {data.clauses.map((clause) => (
                  <AccordionItem key={clause.id} value={clause.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <Badge variant={getRiskBadgeVariant(clause.riskLevel)}>
                            {clause.riskLevel} risk
                          </Badge>
                          <span className="font-medium">{clause.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {clause.similarClauses && clause.similarClauses > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {clause.similarClauses} similar
                            </Badge>
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div className="bg-muted/50 p-3 rounded-lg">
                          <p className="text-sm">{clause.text}</p>
                        </div>
                        
                        {clause.explanation && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Info className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Analysis</span>
                            </div>
                            <p className="text-sm text-muted-foreground pl-6">
                              {clause.explanation}
                            </p>
                          </div>
                        )}
                        
                        {clause.recommendations && clause.recommendations.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">Recommendations</span>
                            </div>
                            <ul className="space-y-1 pl-6">
                              {clause.recommendations.map((rec, idx) => (
                                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(clause.text);
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedClause(clause);
                              setShowSimilaritySearch(true);
                            }}
                          >
                            <Search className="h-3 w-3 mr-1" />
                            Find Similar
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          {showSimilaritySearch && (
            <SimilaritySearch
              contractId={contractId}
              initialClauseText={selectedClause?.text || ''}
              onSelectClause={(clause) => {
                logger.info('Selected similar clause', { clauseId: clause.id });
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="obligations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Obligations</CardTitle>
              <CardDescription>
                Key obligations and deadlines for all parties
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.obligations.map((obligation) => (
                  <Card key={obligation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            {obligation.type === 'payment' && <DollarSign className="h-4 w-4" />}
                            {obligation.type === 'delivery' && <Package className="h-4 w-4" />}
                            {obligation.type === 'reporting' && <FileText className="h-4 w-4" />}
                            {obligation.type === 'compliance' && <Shield className="h-4 w-4" />}
                            {obligation.type === 'other' && <Flag className="h-4 w-4" />}
                            <span className="font-medium">{obligation.description}</span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {obligation.party === 'buyer' ? 'Buyer' : 
                               obligation.party === 'seller' ? 'Seller' : 'Both parties'}
                            </span>
                            
                            {obligation.frequency && (
                              <span className="flex items-center gap-1">
                                <RefreshCw className="h-3 w-3" />
                                {obligation.frequency}
                              </span>
                            )}
                            
                            {obligation.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(obligation.dueDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {obligation.status && (
                          <Badge 
                            variant={
                              obligation.status === 'completed' ? 'outline' :
                              obligation.status === 'overdue' ? 'destructive' :
                              'secondary'
                            }
                          >
                            {obligation.status}
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="risks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
              <CardDescription>
                Identified risks and mitigation strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.risks.map((risk) => (
                  <Card key={risk.id} className={cn(
                    "border-l-4",
                    risk.severity === 'critical' && "border-l-red-600",
                    risk.severity === 'high' && "border-l-orange-600",
                    risk.severity === 'medium' && "border-l-yellow-600",
                    risk.severity === 'low' && "border-l-green-600"
                  )}>
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className={cn(
                                "h-4 w-4",
                                risk.severity === 'critical' && "text-red-600",
                                risk.severity === 'high' && "text-orange-600",
                                risk.severity === 'medium' && "text-yellow-600",
                                risk.severity === 'low' && "text-green-600"
                              )} />
                              <span className="font-medium">{risk.category}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {risk.description}
                            </p>
                          </div>
                          <Badge variant={getRiskBadgeVariant(risk.severity)}>
                            {risk.severity}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Probability</p>
                            <Progress value={risk.probability * 100} className="h-2" />
                            <p className="text-xs text-right">{Math.round(risk.probability * 100)}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs text-muted-foreground">Impact</p>
                            <Progress value={risk.impact * 100} className="h-2" />
                            <p className="text-xs text-right">{Math.round(risk.impact * 100)}%</p>
                          </div>
                        </div>
                        
                        {risk.mitigation && (
                          <Alert>
                            <Shield className="h-4 w-4" />
                            <AlertTitle className="text-sm">Mitigation Strategy</AlertTitle>
                            <AlertDescription className="text-xs">
                              {risk.mitigation}
                            </AlertDescription>
                          </Alert>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  Weaknesses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.opportunities.map((opportunity, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Target className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-purple-600" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.insights.recommendations.map((recommendation, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Lightbulb className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const ContractAnalysis = React.memo(ContractAnalysisComponent, (prevProps, nextProps) => {
  // Only re-render if contractId changes
  return prevProps.contractId === nextProps.contractId;
});
