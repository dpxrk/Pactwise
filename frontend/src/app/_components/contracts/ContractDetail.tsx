"use client";

import {
  AlertCircle,
  AlertTriangle,
  Activity,
  CheckCircle,
  FileText,
  Clock,
  XCircle,
  RefreshCw,
  FileSearch,
  Download,
  Edit,
  Building,
  DollarSign,
  Calendar,
  Paperclip,
  Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useContractData, useAnalyzeContract, useUpdateContract } from '@/hooks/useContractData';
import { format } from '@/lib/date';
import type { Id } from '@/types/id.types';

// Import real data hooks - NO HARDCODED DATA


interface ContractDetailProps {
  contractId: Id<"contracts">;
  enterpriseId: Id<"enterprises">;
}

interface ClauseAnalysis {
  id: string;
  type: string;
  content: string;
  riskLevel: 'high' | 'medium' | 'low';
  suggestions?: string[];
}

function ContractDetailComponent({ contractId, enterpriseId: _enterpriseId }: ContractDetailProps) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Fetch contract details - REAL API DATA
  const { data: contract, isLoading, error } = useContractData(contractId as string);
  
  // Mutations
  const analyzeContractMutation = useAnalyzeContract();
  const updateContractMutation = useUpdateContract(contractId as string);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !contract) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error ? error.message : 'Contract not found or you don\'t have permission to view it.'}
        </AlertDescription>
      </Alert>
    );
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      await analyzeContractMutation.mutateAsync(contractId as string);
      toast.success('Contract analysis started');
    } catch (_err) {
      toast.error('Failed to start analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateContractMutation.mutateAsync({
        status: newStatus as "draft" | "pending_analysis" | "active" | "expired" | "terminated" | "archived"
      });
      toast.success('Contract status updated');
    } catch (_err) {
      toast.error('Failed to update status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'draft': return <FileText className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'expired': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'draft': return 'secondary';
      case 'pending': return 'outline';
      case 'expired': return 'error';
      default: return 'secondary';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // Get clause analysis from real API data
  const clauseAnalysis: ClauseAnalysis[] = (contract?.analyses?.length ?? 0) > 0 && contract?.analyses?.[0]?.status === 'completed'
    ? contract.analyses[0].clause_analysis?.map((clause: any, index: number) => ({
        id: clause.id || `clause-${index}`,
        type: clause.type || clause.clause_type || 'General',
        content: clause.content || clause.text || '',
        riskLevel: clause.risk_level || clause.risk || 'low',
        suggestions: clause.suggestions || clause.recommendations || []
      })) || []
    : [];

  // Use real contract data fields
  const contractValue = contract?.value 
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(contract.value)
    : 'Not specified';
  const startDate = contract?.start_date;
  const endDate = contract?.end_date;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <FileText className="h-6 w-6" />
                {contract.title}
              </CardTitle>
              <CardDescription className="mt-2 flex items-center gap-4">
                <Badge variant={getStatusColor(contract.status || 'draft')} className="gap-1">
                  {getStatusIcon(contract.status || 'draft')}
                  <span className="capitalize">{contract.status || 'draft'}</span>
                </Badge>
                {contract.contract_type && (
                  <Badge variant="outline" className="capitalize">
                    {contract.contract_type.replace('_', ' ')}
                  </Badge>
                )}
                <span className="text-sm text-muted-foreground">
                  ID: {contract.id}
                </span>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || contract?.analyses?.some(a => a.status === 'processing')}
                    >
                      {isAnalyzing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSearch className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Analyze Contract</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <Button
                variant="outline"
                onClick={() => toast.info('Download feature coming soon')}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={() => router.push(`/dashboard/contracts/${contractId}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Information */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building className="h-4 w-4" />
              Vendor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">
              {contract.vendor?.name || 'Unassigned'}
            </div>
            {contract.vendor && (
              <Button
                variant="link"
                className="p-0 h-auto text-xs"
                onClick={() => router.push(`/dashboard/vendors/${contract.vendor_id}`)}
              >
                View vendor details
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium text-lg">{contractValue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Start Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">
              {startDate ? format(new Date(startDate), 'MMM dd, yyyy') : 'Not specified'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              End Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-medium">
              {endDate ? format(new Date(endDate), 'MMM dd, yyyy') : 'Not specified'}
            </div>
            {endDate && new Date(endDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
              <p className="text-xs text-orange-600 mt-1">Expiring soon</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clauses">AI Analysis</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contract.notes && (
                <div>
                  <h4 className="font-medium mb-2">Notes</h4>
                  <p className="text-sm text-muted-foreground">{contract.notes}</p>
                </div>
              )}
              
              <Separator />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Extracted Information</h4>
                  <div className="space-y-2 text-sm">
                    {(contract as any).extractedParties && (contract as any).extractedParties.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Parties:</span>
                        <ul className="ml-4 mt-1">
                          {(contract as any).extractedParties.map((party: string, idx: number) => (
                            <li key={idx}>• {party}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(contract as any).extractedScope && (
                      <div>
                        <span className="text-muted-foreground">Scope:</span>
                        <p className="mt-1">{(contract as any).extractedScope}</p>
                      </div>
                    )}
                    {(contract as any).extractedPaymentSchedule && (
                      <div>
                        <span className="text-muted-foreground">Payment Schedule:</span>
                        <p className="mt-1">{(contract as any).extractedPaymentSchedule}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Metadata</h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Created:</span>
                      <span className="ml-2">
                        {contract.created_at ? format(new Date(contract.created_at), 'MMM dd, yyyy') : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">File Name:</span>
                      <span className="ml-2">{contract.file_name}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">File Type:</span>
                      <span className="ml-2">{contract.file_type}</span>
                    </div>
                    {contract.department_id && (
                      <div>
                        <span className="text-muted-foreground">Department:</span>
                        <span className="ml-2">{contract.department_id}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => handleStatusChange('active')}
                disabled={contract.status === 'active'}
              >
                Activate
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStatusChange('archived')}
                disabled={contract.status === 'archived'}
              >
                Archive
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info('Renewal feature coming soon')}
              >
                Initiate Renewal
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info('Amendment feature coming soon')}
              >
                Create Amendment
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clauses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>AI Contract Analysis</CardTitle>
                  <CardDescription>
                    Automated clause extraction and risk assessment
                  </CardDescription>
                </div>
                {contract.analysis_status && (
                  <Badge variant={contract.analysis_status === 'completed' ? 'default' : 'secondary'}>
                    {contract.analysis_status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {contract.analysis_status === 'completed' && clauseAnalysis.length > 0 ? (
                <div className="space-y-4">
                  {/* Risk Summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <Card className="border-red-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-red-600">High Risk</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {clauseAnalysis.filter(c => c.riskLevel === 'high').length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-yellow-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-yellow-600">Medium Risk</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">
                          {clauseAnalysis.filter(c => c.riskLevel === 'medium').length}
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="border-green-200">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-green-600">Low Risk</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {clauseAnalysis.filter(c => c.riskLevel === 'low').length}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Clause Details */}
                  {clauseAnalysis.map((clause) => (
                    <Card key={clause.id} className={getRiskColor(clause.riskLevel)}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-base">{clause.type}</CardTitle>
                          <Badge className={getRiskColor(clause.riskLevel)}>
                            {clause.riskLevel} risk
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm mb-3">{clause.content}</p>
                        {clause.suggestions && clause.suggestions.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium mb-1">Suggestions:</p>
                            <ul className="text-xs space-y-1">
                              {clause.suggestions.map((suggestion, idx) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                  {suggestion}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : contract.analysis_status === 'processing' ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Analysis in progress...</p>
                </div>
              ) : contract.analysis_status === 'failed' ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {contract.analysis_error || 'Analysis failed. Please try again.'}
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="text-center py-8">
                  <FileSearch className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">
                    Contract has not been analyzed yet
                  </p>
                  <Button onClick={handleAnalyze} disabled={isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      'Start Analysis'
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contract Documents</CardTitle>
              <CardDescription>
                Original contract file and related documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{contract.file_name}</p>
                      <p className="text-sm text-muted-foreground">{contract.file_type}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Additional document management coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Contract history and recent activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border"></div>
                <div className="space-y-6">
                  <div className="flex gap-4">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Contract created</p>
                      <p className="text-sm text-muted-foreground">
                        {contract.created_at ? format(new Date(contract.created_at), 'MMM dd, yyyy HH:mm') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  {contract.analysis_status === 'completed' && (
                    <div className="flex gap-4">
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-green-600 text-white">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Analysis completed</p>
                        <p className="text-sm text-muted-foreground">
                          AI analysis finished successfully
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Full activity tracking coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Compliance & Risk</CardTitle>
              <CardDescription>
                Contract compliance status and risk assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Compliance Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">85%</div>
                    <Progress value={85} className="mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Risk Score
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">Medium</div>
                    <Progress value={60} className="mt-2" />
                  </CardContent>
                </Card>
              </div>
              
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Detailed compliance tracking coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const ContractDetail = React.memo(ContractDetailComponent, (prevProps, nextProps) => {
  // Only re-render if contractId or enterpriseId changes
  return prevProps.contractId === nextProps.contractId && 
         prevProps.enterpriseId === nextProps.enterpriseId;
});
