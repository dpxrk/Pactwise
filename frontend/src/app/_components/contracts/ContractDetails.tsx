'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useConvexQuery } from '@/lib/api-client';
// import { api } from '../../../../convex/_generated/api';
// import { Id } from '../../../../convex/_generated/dataModel';
import type { ContractStatus, AnalysisStatus, ContractTypeEnum } from '@/types/contract.types'; // Added ContractTypeEnum
import type { VendorCategory } from '@/types/vendor.types'; // Added VendorCategory for vendor display

// Clerk hook to get user information
import { useUser } from '@clerk/nextjs';

// UI Components
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added Tooltip
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Icons
import {
  Building,
  Calendar,
  Edit,
  FileText,
  Download,
  AlertCircle,
  Trash2,
  Archive,
  Info,
  ExternalLink,
  BarChart2,
  CreditCard, // PenTool was not used, CreditCard is used
  Users,
  Clock,
  FileBadge, // Using FileBadge for contract type
  Briefcase, // Using Briefcase for vendor category
  History,
  PenTool
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ContractVersionHistory from './ContractVersionHistory';
import { ContractCollaborativeEditor } from '@/app/_components/collaborative-editor/CollaborativeDocumentEditor';

interface ContractDetailsProps {
  contractId: Id<"contracts">;
  onEdit?: () => void;
  // enterpriseId should ideally be fetched within the component or passed if readily available higher up
}

interface ContractDetailsState {
  showCollaborativeEditor: boolean;
}

// Contract status color mapper
const statusColors: Record<ContractStatus, string> = {
  draft: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300',
  pending_analysis: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/70 dark:text-yellow-300',
  active: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
  expired: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300',
  terminated: 'bg-orange-100 text-orange-800 dark:bg-orange-900/70 dark:text-orange-300',
  archived: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
};

// Analysis status color mapper
const analysisColors: Record<AnalysisStatus, string> = {
  pending: 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
  processing: 'bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/70 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/70 dark:text-red-300',
};

// Contract type color mapper (example)
const contractTypeColors: Record<string, string> = {
    default: 'bg-purple-100 text-purple-800 dark:bg-purple-900/70 dark:text-purple-300',
    nda: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/70 dark:text-indigo-300',
    msa: 'bg-sky-100 text-sky-800 dark:bg-sky-900/70 dark:text-sky-300',
    saas: 'bg-teal-100 text-teal-800 dark:bg-teal-900/70 dark:text-teal-300',
};

export const ContractDetails = ({ contractId, onEdit }: ContractDetailsProps) => {
  const router = useRouter();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [showCollaborativeEditor, setShowCollaborativeEditor] = React.useState(false);

  // --- Get enterpriseId from Clerk user's public metadata ---
  // Ensure this is correctly set in your Clerk dashboard for users.
  const enterpriseId = clerkUser?.publicMetadata?.enterpriseId as Id<"enterprises"> | undefined;

  // Fetch contract data - now passing enterpriseId
  const { data: contract, isLoading: isLoadingContract, error: contractError } = useConvexQuery(
    api.contracts.getContractById,
    // Skip query if contractId or enterpriseId is not available yet
    (contractId && enterpriseId) ? { contractId, enterpriseId } : "skip"
  );

  // Fetch vendor data - now passing enterpriseId
  // The `getVendorById` query in `convex/vendors.ts` should also expect `enterpriseId`
  const { data: vendor, isLoading: isLoadingVendor } = useConvexQuery(
    api.vendors.getVendorById,
    (contract?.vendorId && enterpriseId) ? { vendorId: contract.vendorId, enterpriseId } : "skip"
  );

  const { data: fileUrl, isLoading: isLoadingFileUrl } = useConvexQuery(
    api.contracts.getContractFileUrl,
    contract?.storageId ? { storageId: contract.storageId } : "skip"
    // Consider adding enterpriseId to getContractFileUrl args if strict permission is needed for file URLs
  );

  const isLoading = isLoadingContract || isLoadingVendor || isLoadingFileUrl || !isClerkLoaded;

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'N/A';
    try {
      // Check if dateString is a valid ISO string or timestamp number
      const date = new Date(isNaN(Number(dateString)) ? dateString : Number(dateString));
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      return format(date, 'PPP'); // e.g., Jun 20, 2023
    } catch (e) {
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

   if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading contract details...</p>
      </div>
    );
  }

  if (!enterpriseId && isClerkLoaded) {
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
  const vendorInfo = contract.vendor || vendor || { name: 'Unknown Vendor', category: undefined };

  const statusColor = statusColors[contract.status as ContractStatus] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const analysisColor = contract.analysisStatus
    ? (analysisColors[contract.analysisStatus as AnalysisStatus] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300')
    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const currentContractTypeColor = contract.contractType
    ? (contractTypeColors[contract.contractType] || contractTypeColors.default)
    : contractTypeColors.default;


  const formatStatusLabel = (status?: string): string => {
    if (!status) return 'N/A';
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 p-1"> {/* Added p-1 for slight padding */}
        {/* Contract Header */}
        <Card className="border-border dark:border-border/50 bg-card shadow-sm">
          <CardHeader className="flex flex-col md:flex-row items-start justify-between gap-4">
            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <FileText className="h-7 w-7 text-primary mr-2 flex-shrink-0" />
                <CardTitle className="text-2xl font-sans text-primary dark:text-primary-foreground break-all">
                  {contract.title}
                </CardTitle>
                <Badge className={`${statusColor} font-medium`}>
                  {formatStatusLabel(contract.status)}
                </Badge>
                {contract.analysisStatus && (
                  <Badge className={`${analysisColor} font-medium`}>
                    Analysis: {formatStatusLabel(contract.analysisStatus)}
                  </Badge>
                )}
                 {contract.contractType && (
                  <Badge className={`${currentContractTypeColor} font-medium`}>
                    Type: {formatStatusLabel(contract.contractType)}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground ml-9">
                File: {contract.fileName || 'N/A'} ({contract.fileType || 'N/A'})
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0 self-start md:self-center">
              {fileUrl && (
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Document</span>
                </Button>
              )}
              <Button variant="default" size="sm" onClick={handleEdit}> {/* Changed to default */}
                <Edit className="h-4 w-4 md:mr-2" /> <span className="hidden md:inline">Edit</span>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Contract Information (Spans 2 cols on lg) */}
          <Card className="border-border dark:border-border/50 bg-card shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-medium text-primary dark:text-primary-foreground">
                <Info className="inline h-5 w-5 mr-2" />
                Contract Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Section for Key Dates & Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <DetailItem icon={Calendar} label="Start Date" value={formatDate(contract.extractedStartDate)} />
                <DetailItem icon={Calendar} label="End Date" value={formatDate(contract.extractedEndDate)} />
                <DetailItem icon={CreditCard} label="Pricing / Value" value={contract.extractedPricing || 'N/A'} />
                <DetailItem icon={Clock} label="Payment Schedule" value={contract.extractedPaymentSchedule || 'N/A'} />
              </div>
              <Separator />
               {/* Contract Type and Analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <DetailItem icon={FileBadge} label="Contract Type" value={contract.contractType ? formatStatusLabel(contract.contractType) : 'N/A'} />
                <DetailItem icon={BarChart2} label="Analysis Status" value={contract.analysisStatus ? formatStatusLabel(contract.analysisStatus) : 'N/A'} />
                {contract.analysisStatus === 'failed' && contract.analysisError && (
                    <div className="sm:col-span-2">
                        <DetailItem icon={AlertCircle} label="Analysis Error" value={contract.analysisError} valueClassName="text-red-600 dark:text-red-400" />
                    </div>
                )}
              </div>

              {contract.extractedParties && contract.extractedParties.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <DetailItem icon={Users} label="Parties Involved" />
                    <ul className="mt-1 space-y-1 pl-8">
                      {contract.extractedParties.map((party: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground list-disc list-inside">
                          {party}
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {contract.extractedScope && (
                <>
                  <Separator />
                  <div>
                    <DetailItem icon={FileText} label="Scope of Work" />
                    <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line pl-8">
                      {contract.extractedScope}
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
          <div className="space-y-6">
            <Card className="border-border dark:border-border/50 bg-card shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-primary dark:text-primary-foreground">
                  <Building className="inline h-5 w-5 mr-2" />
                  Vendor Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <DetailItem label="Name" value={vendorInfo.name} />
                {vendorInfo.category && (
                  <DetailItem icon={Briefcase} label="Category" value={formatStatusLabel(vendorInfo.category)} />
                )}
                {'contactEmail' in vendorInfo && vendorInfo.contactEmail && (
                    <DetailItem label="Email" value={vendorInfo.contactEmail} isLink={`mailto:${vendorInfo.contactEmail}`} />
                )}
                {'contactPhone' in vendorInfo && vendorInfo.contactPhone && (
                  <DetailItem label="Phone" value={vendorInfo.contactPhone} />
                )}
                {'website' in vendorInfo && vendorInfo.website && (
                  <DetailItem label="Website" value={vendorInfo.website} isLink={vendorInfo.website.startsWith('http') ? vendorInfo.website : `https://${vendorInfo.website}`} />
                )}
              </CardContent>
            </Card>

            <Card className="border-border dark:border-border/50 bg-card shadow-sm h-fit">
                <CardHeader>
                    <CardTitle className="text-lg font-medium text-primary dark:text-primary-foreground">
                        <Info className="inline h-5 w-5 mr-2" />
                        System Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <DetailItem icon={Calendar} label="Date Created" value={formatDate(contract._creationTime?.toString())} />
                    <DetailItem icon={FileText} label="File Name" value={contract.fileName || "N/A"} />
                    <DetailItem icon={FileBadge} label="File Type" value={contract.fileType || "N/A"} />
                    <DetailItem icon={Edit} label="Contract ID" value={contract._id} isMonospace={true} />
                    <DetailItem icon={Edit} label="Storage ID" value={contract.storageId} isMonospace={true}/>
                </CardContent>
            </Card>
          </div>
        </div>

            {/* Contract Actions - simplified, can be expanded */}
            <Card className="border-border dark:border-border/50 bg-card shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-medium text-primary dark:text-primary-foreground">Contract Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
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
            <ContractVersionHistory contractId={contractId} currentContract={contract} />
          </TabsContent>

          <TabsContent value="collaborative" className="mt-6">
            {showCollaborativeEditor ? (
              <ContractCollaborativeEditor
                contractId={contractId}
                onClose={() => setShowCollaborativeEditor(false)}
              />
            ) : (
              <Card className="border-border dark:border-border/50 bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-primary dark:text-primary-foreground">
                    <PenTool className="inline h-5 w-5 mr-2" />
                    Collaborative Document Editor
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Launch the collaborative editor to work on this contract with real-time collaboration features including:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-2 ml-4">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      Real-time collaborative editing with operational transformation
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      Live cursor tracking and user presence
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      Comments and suggestions system
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      Version history and conflict resolution
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                      Document locking and permissions
                    </li>
                  </ul>
                  <div className="pt-4">
                    <Button 
                      onClick={() => setShowCollaborativeEditor(true)}
                      className="w-full sm:w-auto"
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Launch Collaborative Editor
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

// Helper component for detail items
const DetailItem = ({ icon: Icon, label, value, isLink, isMonospace, valueClassName }: { icon?: React.ElementType, label: string, value?: string | number | null, isLink?: string, isMonospace?: boolean, valueClassName?: string}) => (
    <div>
        <p className="text-sm font-medium text-foreground dark:text-gray-300 flex items-center">
            {Icon && React.createElement(Icon, { className: "h-4 w-4 text-muted-foreground mr-2 flex-shrink-0" })}
            {label}
        </p>
        {value && (
            isLink ? (
                <a
                    href={isLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("text-sm text-primary hover:underline dark:text-blue-400 break-all", valueClassName)}
                >
                    {value} <ExternalLink className="inline h-3 w-3 ml-1" />
                </a>
            ) : (
                <p className={cn("text-sm text-muted-foreground dark:text-gray-400 break-all", isMonospace && "font-mono text-xs", valueClassName)}>
                    {value}
                </p>
            )
        )}
         {!value && <p className="text-sm text-muted-foreground dark:text-gray-500">N/A</p>}
    </div>
);

export default ContractDetails;