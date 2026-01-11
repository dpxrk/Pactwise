'use client';

import {
  FileText,
  Download,
  Edit,
  Info,
  Calendar,
  CreditCard,
  Clock,
  FileBadge,
  BarChart2,
  AlertCircle,
  Users,
  Building,
  Briefcase,
  ExternalLink,
  Archive,
  Trash2,
  History,
  PenTool,
  FileSignature,
  Play,
  StopCircle,
} from 'lucide-react';

import { AgentQuickActions } from '@/components/ai/AgentQuickActions';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from '@/contexts/AuthContext';
import { useContract, useContractMutations } from '@/hooks/useContracts';
import { useVendor } from '@/hooks/useVendors';
import { useContractSessions, useCreateSessionFromContract } from '@/hooks/queries/useSessions';
import { format } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { ContractStatus, AnalysisStatus } from '@/types/contract.types';
import { Tables } from '@/types/database.types';

import ContractVersionHistory from './ContractVersionHistory';


interface ContractDetailsProps {
  contractId: string;
  onEdit?: () => void;
}

// Contract status color mapper - Bloomberg Terminal style
const statusColors: Record<ContractStatus, string> = {
  draft: 'bg-ghost-300 text-ghost-700 border border-ghost-400',
  pending_analysis: 'bg-purple-100 text-purple-800 border border-purple-200',
  active: 'bg-green-100 text-green-800 border border-green-200',
  expired: 'bg-red-100 text-red-800 border border-red-200',
  terminated: 'bg-orange-100 text-orange-800 border border-orange-200',
  archived: 'bg-ghost-200 text-ghost-600 border border-ghost-300',
};

// Analysis status color mapper
const analysisColors: Record<AnalysisStatus, string> = {
  pending: 'bg-purple-100 text-purple-800 border border-purple-200',
  processing: 'bg-purple-200 text-purple-900 border border-purple-300',
  completed: 'bg-green-100 text-green-800 border border-green-200',
  failed: 'bg-red-100 text-red-800 border border-red-200',
};

// Contract type color mapper
const contractTypeColors: Record<string, string> = {
    default: 'bg-purple-50 text-purple-900 border border-purple-100',
    nda: 'bg-purple-100 text-purple-900 border border-purple-200',
    msa: 'bg-purple-200 text-purple-900 border border-purple-300',
    saas: 'bg-purple-300 text-purple-900 border border-purple-400',
};

export const ContractDetails = ({ contractId, onEdit }: ContractDetailsProps) => {
  const router = useRouter();
  const { userProfile, user, isLoading: isAuthLoading } = useAuth();
  const enterpriseId = userProfile?.enterprise_id;

  // Fetch contract data with related information using Supabase hook
  const { contract, isLoading: isLoadingContract, error: contractError, refetch } = useContract(contractId);

  // Fetch vendor data separately if needed for additional details
  const { vendor, isLoading: isLoadingVendor } = useVendor(contract?.vendor_id || '');

  // Use contract mutations for delete/update actions
  const { updateContract, deleteContract, isLoading: isMutating } = useContractMutations();

  // Collaborative session hooks
  const { data: contractSessions, isLoading: isLoadingSessions } = useContractSessions(
    enterpriseId || '',
    contractId
  );
  const createSessionMutation = useCreateSessionFromContract();

  const fileUrl = (contract as any)?.storage_url || null;

  const isLoading = isLoadingContract || isLoadingVendor;

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'N/A';
    try {
      // Check if dateString is a valid ISO string or timestamp number
      const date = new Date(isNaN(Number(dateString)) ? dateString : Number(dateString));
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      return format(date, 'PPP'); // e.g., Jun 20, 2023
    } catch (err) {
      // Error formatting date
      return dateString; // Fallback to original string if formatting fails
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      router.push(`/dashboard/contracts/edit/${contractId}`);
    }
  };

  const handleDownload = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  const handleRequestSignature = () => {
    router.push(`/dashboard/contracts/signatures/create?contract_id=${contractId}`);
  };

  const handleStartCollaboration = async () => {
    if (!enterpriseId || !user?.id) return;

    try {
      const result = await createSessionMutation.mutateAsync({
        contract_id: contractId,
        enterprise_id: enterpriseId,
        user_id: user.id,
      });
      router.push(`/dashboard/contracts/sessions/${result.id}`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleJoinSession = (sessionId: string) => {
    router.push(`/dashboard/contracts/sessions/${sessionId}`);
  };

   if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading contract details...</p>
      </div>
    );
  }

  if (!enterpriseId) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Configuration Error</AlertTitle>
        <AlertDescription>
          Enterprise information is missing for your user account. Please contact support.
        </AlertDescription>
      </Alert>
    );
  }

  if (contractError || !contract) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {contractError ? `Failed to load contract: ${contractError.message}` : 'Contract not found or access denied.'}
        </AlertDescription>
      </Alert>
    );
  }

  // Use the vendor data directly from the contract object if it's already populated by getContractById
  const vendorInfo = contract.vendors || vendor || { name: 'Unknown Vendor', category: undefined };

  const statusColor = statusColors[contract.status as ContractStatus] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const analysisColor = contract.analysis_status
    ? (analysisColors[contract.analysis_status as AnalysisStatus] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')
    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const currentContractTypeColor = contract.contract_type
    ? (contractTypeColors[contract.contract_type] || contractTypeColors.default)
    : contractTypeColors.default;


  const formatStatusLabel = (status?: string | null): string => {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Contract Header */}
        <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
          <CardHeader className="flex flex-col md:flex-row items-start justify-between gap-4 pb-4">
            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <FileText className="h-5 w-5 mr-2 flex-shrink-0" style={{ color: '#291528' }} />
                <CardTitle className="text-xl font-semibold break-all" style={{ color: '#291528' }}>
                  {contract.title}
                </CardTitle>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge className={`${statusColor} text-xs font-medium uppercase tracking-wide`}>
                  {formatStatusLabel(contract.status)}
                </Badge>
                {contract.analysis_status && (
                  <Badge className={`${analysisColor} text-xs font-medium uppercase tracking-wide`}>
                    {formatStatusLabel(contract.analysis_status)}
                  </Badge>
                )}
                 {contract.contract_type && (
                  <Badge className={`${currentContractTypeColor} text-xs font-medium uppercase tracking-wide`}>
                    {formatStatusLabel(contract.contract_type)}
                  </Badge>
                )}
              </div>
              <p className="text-xs font-mono" style={{ color: '#80808c' }}>
                {contract.file_name || 'N/A'} • {contract.file_type || 'N/A'}
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0 self-start md:self-center">
              <AgentQuickActions
                entityType="contract"
                entityId={contractId}
                compact={true}
              />
              {fileUrl && (
                <Button variant="outline" size="sm" className="rounded-none border text-xs" style={{ borderColor: '#291528', color: '#291528' }} onClick={handleDownload}>
                  <Download className="h-3.5 w-3.5 md:mr-2" /> <span className="hidden md:inline">Download</span>
                </Button>
              )}
              <Button size="sm" className="rounded-none text-xs" style={{ backgroundColor: '#291528', color: '#ffffff' }} onClick={handleEdit}>
                <Edit className="h-3.5 w-3.5 md:mr-2" /> <span className="hidden md:inline">Edit</span>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Main Content Tabs */}
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Contract Details
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Version History
            </TabsTrigger>
            <TabsTrigger value="collaborative" className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Collaborative Editor
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="space-y-6 mt-6">

        {/* Contract Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Contract Information (Spans 2 cols on lg) */}
          <Card className="border bg-white lg:col-span-2" style={{ borderColor: '#d2d1de' }}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                <Info className="inline h-4 w-4 mr-2" />
                Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Section for Key Dates & Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <DetailItem icon={Calendar} label="Start Date" value={formatDate((contract as any).extracted_start_date)} />
                <DetailItem icon={Calendar} label="End Date" value={formatDate((contract as any).extracted_end_date)} />
                <DetailItem icon={CreditCard} label="Pricing / Value" value={(contract as any).extracted_pricing || 'N/A'} />
                <DetailItem icon={Clock} label="Payment Schedule" value={(contract as any).extracted_payment_schedule || 'N/A'} />
              </div>
              <Separator />
               {/* Contract Type and Analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <DetailItem icon={FileBadge} label="Contract Type" value={contract.contract_type ? formatStatusLabel(contract.contract_type) : 'N/A'} />
                <DetailItem icon={BarChart2} label="Analysis Status" value={contract.analysis_status ? formatStatusLabel(contract.analysis_status) : 'N/A'} />
                {contract.analysis_status === 'failed' && contract.analysis_error && (
                    <div className="sm:col-span-2">
                        <DetailItem icon={AlertCircle} label="Analysis Error" value={contract.analysis_error} valueClassName="text-red-600 dark:text-red-400" />
                    </div>
                )}
              </div>

              {(contract as any).extracted_parties && (contract as any).extracted_parties.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <DetailItem icon={Users} label="Parties Involved" />
                    <ul className="mt-1 space-y-1 pl-8">
                      {(contract as any).extracted_parties.map((party: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground list-disc list-inside">
                          {party}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {(contract as any).extracted_scope && (
                <>
                  <Separator />
                  <div>
                    <DetailItem icon={FileText} label="Scope of Work" />
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line pl-8">
                      {(contract as any).extracted_scope}
                    </p>
                  </div>
                </>
              )}

              {contract.notes && (
                <>
                  <Separator />
                  <div>
                    <DetailItem icon={Edit} label="Internal Notes" />
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line pl-8">
                      {contract.notes}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Sidebar Information (Vendor & System Info) */}
          <div className="space-y-4">
            <Card className="border bg-white h-fit" style={{ borderColor: '#d2d1de' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                  <Building className="inline h-4 w-4 mr-2" />
                  Vendor Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailItem
                  label="Name"
                  value={vendorInfo.name}
                  isLink={contract.vendor_id ? `/dashboard/vendors/${contract.vendor_id}` : undefined}
                />
                {vendorInfo.category && (
                  <DetailItem icon={Briefcase} label="Category" value={formatStatusLabel(vendorInfo.category as string)} />
                )}
                {'contactEmail' in vendorInfo && (vendorInfo as any).contactEmail && (
                    <DetailItem label="Email" value={(vendorInfo as any).contactEmail} isLink={`mailto:${(vendorInfo as any).contactEmail}`} />
                )}
                {'contactPhone' in vendorInfo && (vendorInfo as any).contactPhone && (
                  <DetailItem label="Phone" value={(vendorInfo as any).contactPhone} />
                )}
                {'website' in vendorInfo && (vendorInfo as any).website && (
                  <DetailItem label="Website" value={(vendorInfo as any).website} isLink={(vendorInfo as any).website.startsWith('http') ? (vendorInfo as any).website : `https://${(vendorInfo as any).website}`} />
                )}
              </CardContent>
            </Card>

            <Card className="border bg-white h-fit" style={{ borderColor: '#d2d1de' }}>
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                        <Info className="inline h-4 w-4 mr-2" />
                        System Info
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={Calendar} label="Date Created" value={formatDate(contract.created_at)} />
                    <DetailItem icon={FileText} label="File Name" value={contract.file_name || "N/A"} />
                    <DetailItem icon={FileBadge} label="File Type" value={contract.file_type || "N/A"} />
                    <DetailItem icon={Edit} label="Contract ID" value={contract.id} isMonospace={true} />
                    <DetailItem icon={Edit} label="Storage ID" value={contract.storage_id} isMonospace={true}/>
                </CardContent>
            </Card>
          </div>
        </div>

            {/* Contract Actions */}
            <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold uppercase tracking-wider" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {/* Signature Request */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-none border"
                    style={{ borderColor: '#291528', color: '#291528' }}
                    onClick={handleRequestSignature}
                  >
                    <FileSignature className="h-4 w-4 mr-2" /> Request Signature
                  </Button>

                  {/* Start Collaboration */}
                  <Button
                    size="sm"
                    className="rounded-none"
                    style={{ backgroundColor: '#291528', color: '#ffffff' }}
                    onClick={handleStartCollaboration}
                    disabled={createSessionMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {createSessionMutation.isPending ? 'Starting...' : 'Start Collaboration'}
                  </Button>

                  {/* Add other actions like archive, terminate, delete etc. based on backend capabilities */}
                  <Button variant="outline" size="sm" disabled>
                    <Archive className="h-4 w-4 mr-2" /> Archive (Coming Soon)
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive-foreground" disabled>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="mt-6">
            <ContractVersionHistory contractId={contractId} currentContract={contract as any} />
          </TabsContent>

          <TabsContent value="collaborative" className="mt-6">
            <div className="space-y-6">
              {/* Active Sessions */}
              <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                      <Users className="h-4 w-4 mr-2" />
                      Collaborative Sessions
                    </CardTitle>
                    <Button
                      size="sm"
                      className="rounded-none"
                      style={{ backgroundColor: '#291528', color: '#ffffff' }}
                      onClick={handleStartCollaboration}
                      disabled={createSessionMutation.isPending}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {createSessionMutation.isPending ? 'Starting...' : 'New Session'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingSessions ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : contractSessions && contractSessions.length > 0 ? (
                    <div className="space-y-3">
                      {contractSessions.map((session) => (
                        <div
                          key={session.id}
                          className={cn(
                            "border p-4 cursor-pointer hover:bg-ghost-50 transition-colors",
                            session.status === 'active' ? "border-green-300 bg-green-50/50" : "border-ghost-200"
                          )}
                          onClick={() => handleJoinSession(session.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-2 h-2 rounded-full",
                                session.status === 'active' ? "bg-green-500 animate-pulse" : "bg-ghost-400"
                              )} />
                              <div>
                                <div className="font-mono text-sm font-medium" style={{ color: '#291528' }}>
                                  {session.document_title}
                                </div>
                                <div className="font-mono text-xs" style={{ color: '#80808c' }}>
                                  {session.participant_count} participants • {new Date(session.updated_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <Badge
                              className={cn(
                                "font-mono text-xs",
                                session.status === 'active' ? "bg-green-100 text-green-800" : "bg-ghost-100 text-ghost-600"
                              )}
                            >
                              {session.status === 'active' ? (
                                <><Play className="h-3 w-3 mr-1" /> Active</>
                              ) : (
                                <><StopCircle className="h-3 w-3 mr-1" /> Ended</>
                              )}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-8 w-8 mx-auto mb-3" style={{ color: '#d2d1de' }} />
                      <p className="font-mono text-sm" style={{ color: '#80808c' }}>
                        No collaborative sessions yet
                      </p>
                      <p className="font-mono text-xs mt-1" style={{ color: '#a0a0a5' }}>
                        Start a session to collaborate on this contract in real-time
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Collaboration Info */}
              <Card className="border bg-white" style={{ borderColor: '#d2d1de' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold uppercase tracking-wider flex items-center" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
                    <Info className="h-4 w-4 mr-2" />
                    About Collaborative Editing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm" style={{ color: '#3a3e3b' }}>
                    Collaborative sessions allow multiple users to edit the contract document simultaneously.
                    Changes are synced in real-time using CRDT technology.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="text-center p-3 bg-ghost-50 border" style={{ borderColor: '#e1e0e9' }}>
                      <div className="font-mono text-2xl font-bold" style={{ color: '#291528' }}>Real-time</div>
                      <div className="font-mono text-xs uppercase" style={{ color: '#9e829c' }}>Sync</div>
                    </div>
                    <div className="text-center p-3 bg-ghost-50 border" style={{ borderColor: '#e1e0e9' }}>
                      <div className="font-mono text-2xl font-bold" style={{ color: '#291528' }}>Tracked</div>
                      <div className="font-mono text-xs uppercase" style={{ color: '#9e829c' }}>Changes</div>
                    </div>
                    <div className="text-center p-3 bg-ghost-50 border" style={{ borderColor: '#e1e0e9' }}>
                      <div className="font-mono text-2xl font-bold" style={{ color: '#291528' }}>External</div>
                      <div className="font-mono text-xs uppercase" style={{ color: '#9e829c' }}>Guests</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

// Helper component for detail items - Bloomberg Terminal style
const DetailItem = ({ icon: Icon, label, value, isLink, isMonospace, valueClassName }: { icon?: React.ElementType, label: string, value?: string | number | null, isLink?: string, isMonospace?: boolean, valueClassName?: string}) => (
    <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider flex items-center mb-1" style={{ color: '#9e829c', letterSpacing: '0.1em' }}>
            {Icon && React.createElement(Icon, { className: "h-3 w-3 mr-1.5 flex-shrink-0" })}
            {label}
        </p>
        {value && (
            isLink ? (
                <a
                    href={isLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("text-sm hover:underline break-all", valueClassName)}
                    style={{ color: '#291528' }}
                >
                    {value} <ExternalLink className="inline h-3 w-3 ml-1" />
                </a>
            ) : (
                <p className={cn("text-sm break-all", isMonospace && "font-mono text-xs", valueClassName)} style={{ color: '#3a3e3b' }}>
                    {value}
                </p>
            )
        )}
         {!value && <p className="text-sm" style={{ color: '#80808c' }}>N/A</p>}
    </div>
);

export default ContractDetails;