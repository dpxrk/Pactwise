'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { VendorType } from '@/types/vendor.types'; // Assuming this has _id
import type { ContractEntity } from '@/types/core-entities';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { VendorCreateDialog } from '@/app/_components/vendors/VendorCreateDialog';

// Icons
import {
  FileText,
  Check,
  X,
  Building,
  Tag,
  AlertCircle,
  Search,
  Plus,
  Save,
  ArrowLeft,
  Upload,
  File as FileIcon,
  Loader2
} from "lucide-react";

// Clerk
import { useAuth } from '@/contexts/AuthContext';

// API Client and types
// Removed useCurrentUser, ensure useVendors and useContract hooks are correctly defined
// and don't rely on a Convex-based useCurrentUser for enterpriseId if not intended.
// import { api } from "../../../../convex/_generated/api";
// import { Id } from "../../../../convex/_generated/dataModel";

interface ContractFormProps {
  contractId?: Id<"contracts">;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: (contractId: Id<"contracts">) => void;
}

interface FormState {
  title: string;
  description: string; // Mapped to 'notes' in Convex
  contractType: string; // Could be mapped to a custom field or part of description
  vendorId: string;
  effectiveDate?: Date; // Mapped to 'extractedStartDate' for display, 'startDate' for save
  expiresAt?: Date;     // Mapped to 'extractedEndDate' for display, 'endDate' for save
  autoRenewal: boolean;  // Not in simplified schema, might be part of 'notes' or future field
  currency: string;      // Not in simplified schema, might be part of 'notes' or 'extractedPricing'
  value?: number;       // Mapped to 'contractValue' or part of 'extractedPricing'
  documents: File[];
}

function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export const ContractForm = ({ contractId, isModal = false, onClose, onSuccess }: ContractFormProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showVendorSearch, setShowVendorSearch] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState('');
  const [showVendorCreate, setShowVendorCreate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user, userProfile, isLoading: isAuthLoading } = useAuth();

  // IMPORTANT: How enterpriseId is determined:
  // From user profile
  const enterpriseIdFromProfile = userProfile?.enterprise_id;
  // Option B: If you create a Convex 'users' table linked to Clerk users and enterprises,
  // you'd fetch that record here using a new Convex query.
  // For now, we rely on enterpriseIdFromClerk.

  // Adjust useVendors hook if it needs enterpriseId for filtering.
  // Assuming useVendors is designed to fetch all or you'll filter client-side for now.
  // If useVendors *requires* enterpriseId, this query will be skipped until enterpriseIdFromClerk is available.
  const { data: vendors = [], isLoading: isLoadingVendors } = useVendors(
    enterpriseIdFromClerk ? { enterpriseId: enterpriseIdFromClerk, category: "all" } : "skip"
  );


  const { data: contractData, isLoading: isLoadingContract, error: contractError } = useContract(
    contractId && enterpriseIdFromClerk ? { contractId, enterpriseId: enterpriseIdFromClerk } : "skip"
  );

  const placeholder = { execute: async () => ({}), isLoading: false };

  const [formState, setFormState] = useState<FormState>({
    title: '', 
    description: '', 
    contractType: '', 
    vendorId: '',
    autoRenewal: false, 
    currency: 'USD', 
    documents: [],
  });

  const contractTypes = [
    // Legal & Compliance
    { value: "nda", label: "Non-Disclosure Agreement (NDA)" },
    { value: "msa", label: "Master Service Agreement (MSA)" },
    { value: "sow", label: "Statement of Work (SOW)" },
    { value: "contract_amendment", label: "Contract Amendment" },
    { value: "license", label: "License Agreement" },
    { value: "terms_of_service", label: "Terms of Service" },
    { value: "privacy_policy", label: "Privacy Policy Agreement" },
    
    // Sales & Procurement
    { value: "sales", label: "Sales Agreement" },
    { value: "purchase", label: "Purchase Agreement" },
    { value: "supply", label: "Supply Agreement" },
    { value: "distribution", label: "Distribution Agreement" },
    { value: "reseller", label: "Reseller Agreement" },
    { value: "vendor", label: "Vendor Agreement" },
    { value: "procurement", label: "Procurement Contract" },
    
    // Technology & Software
    { value: "saas", label: "Software as a Service (SaaS)" },
    { value: "software_license", label: "Software License Agreement" },
    { value: "api", label: "API License Agreement" },
    { value: "hosting", label: "Hosting Agreement" },
    { value: "cloud_services", label: "Cloud Services Agreement" },
    { value: "data_processing", label: "Data Processing Agreement (DPA)" },
    { value: "it_services", label: "IT Services Agreement" },
    { value: "maintenance", label: "Software Maintenance Agreement" },
    
    // Professional Services
    { value: "service", label: "Service Agreement" },
    { value: "consulting", label: "Consulting Agreement" },
    { value: "professional_services", label: "Professional Services Agreement" },
    { value: "marketing", label: "Marketing Services Agreement" },
    { value: "advertising", label: "Advertising Agreement" },
    { value: "development", label: "Development Agreement" },
    { value: "design", label: "Design Services Agreement" },
    
    // Employment & HR
    { value: "employment", label: "Employment Agreement" },
    { value: "contractor", label: "Independent Contractor Agreement" },
    { value: "non_compete", label: "Non-Compete Agreement" },
    { value: "severance", label: "Severance Agreement" },
    { value: "internship", label: "Internship Agreement" },
    
    // Real Estate & Facilities
    { value: "lease", label: "Lease Agreement" },
    { value: "rental", label: "Rental Agreement" },
    { value: "facilities", label: "Facilities Management Agreement" },
    { value: "construction", label: "Construction Agreement" },
    
    // Financial & Insurance
    { value: "loan", label: "Loan Agreement" },
    { value: "credit", label: "Credit Agreement" },
    { value: "insurance", label: "Insurance Agreement" },
    { value: "indemnity", label: "Indemnity Agreement" },
    { value: "escrow", label: "Escrow Agreement" },
    
    // Partnership & Investment
    { value: "partnership", label: "Partnership Agreement" },
    { value: "joint_venture", label: "Joint Venture Agreement" },
    { value: "investment", label: "Investment Agreement" },
    { value: "shareholder", label: "Shareholder Agreement" },
    { value: "merger", label: "Merger Agreement" },
    
    // Specialized
    { value: "franchise", label: "Franchise Agreement" },
    { value: "manufacturing", label: "Manufacturing Agreement" },
    { value: "transportation", label: "Transportation Agreement" },
    { value: "logistics", label: "Logistics Agreement" },
    { value: "energy", label: "Energy Services Agreement" },
    { value: "telecom", label: "Telecommunications Agreement" },
    { value: "media", label: "Media License Agreement" },
    { value: "research", label: "Research Agreement" },
    { value: "clinical_trial", label: "Clinical Trial Agreement" },
    
    // Other
    { value: "general", label: "General Contract" },
    { value: "other", label: "Other" }
  ];

  useEffect(() => {
    if (contractData && contractId && contractData._id === contractId) {
      const newFormState: FormState = {
        title: contractData.title || '',
        description: contractData.notes || '', // Map to notes
        contractType: (contractData as ContractEntity & { contractType?: string }).contractType || '', // Add missing field
        vendorId: contractData.vendorId?.toString() || '',
        // These fields are not in the simplified schema
        autoRenewal: (contractData as ContractEntity & { autoRenewal?: boolean }).autoRenewal || false,
        currency: (contractData as ContractEntity & { currency?: string }).currency || 'USD',
        documents: [],
      };
      
      if (contractData.extractedStartDate) {
        newFormState.effectiveDate = new Date(contractData.extractedStartDate);
      }
      
      if (contractData.extractedEndDate) {
        newFormState.expiresAt = new Date(contractData.extractedEndDate);
      }
      
      if ((contractData as ContractEntity).extractedPricing) {
        const value = parseFloat((contractData as ContractEntity).extractedPricing.replace(/[^0-9.-]+/g,""));
        if (!isNaN(value)) {
          newFormState.value = value;
        }
      }
      
      setFormState(newFormState);
    } else if (!contractId) { // Reset for new contract
      setFormState({
        title: '', 
        description: '', 
        contractType: '', 
        vendorId: '',
        autoRenewal: false, 
        currency: 'USD',
        documents: [],
      });
    }
  }, [contractData, contractId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: name === 'value' ? parseFloat(value) || undefined : value }));
  };
  const handleSelectChange = (name: string, value: string) => setFormState(prev => ({ ...prev, [name]: value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormState(prev => ({ ...prev, documents: Array.from(e.target.files!) }));
      if (e.target) e.target.value = ''; // Allow re-selecting the same file
    }
  };
  const removeDocument = (indexToRemove: number) => setFormState(prev => ({ ...prev, documents: prev.documents.filter((_, index) => index !== indexToRemove) }));
  const selectVendor = (vendorId: string) => { setFormState(prev => ({ ...prev, vendorId })); setShowVendorSearch(false); };

  const vendorsList = Array.isArray(vendors) ? vendors : (vendors?.vendors || []);
  const filteredVendors = vendorsList.filter((vendor: VendorType) => {
    if (!vendorSearchQuery) return true;
    return vendor.name?.toLowerCase().includes(vendorSearchQuery.toLowerCase());
  });

  const isFormValid = (): boolean => {
    // For new contracts, enterpriseIdFromClerk and a document are now essential.
    if (!contractId) {
      return !!(formState.title && formState.vendorId && enterpriseIdFromClerk && formState.documents.length > 0);
    }
    // For existing contracts, these might not be changed.
    return !!(formState.title && formState.vendorId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null);

    if (false) { setError('User data is loading. Please wait.'); return; }

    // Check enterpriseId specifically for new contracts
    if (!contractId && !enterpriseIdFromClerk) {
      setError('Enterprise information is missing. Unable to create contract.');
      return;
    }
    if (!isFormValid()) {
      setError('Please fill all required fields: Title, Vendor, and Attachment (for new contracts).');
      return;
    }
    setIsLoading(true);

    try {
      let uploadedStorageId: Id<"_storage"> | null = null;
      let uploadedFileName = '';
      let uploadedFileType = '';

      if (formState.documents.length > 0) {
        const fileToUpload = formState.documents[0]!; // Process first file
        uploadedFileName = fileToUpload.name;
        uploadedFileType = fileToUpload.type;

        const postUrlResult = await generateUploadUrlMutation.execute(fileToUpload.type);
        if (!postUrlResult) throw new Error("Could not get an upload URL.");
        
        const uploadResponse = await fetch(postUrlResult.toString(), {
            method: "POST", 
            headers: { "Content-Type": fileToUpload.type }, 
            body: fileToUpload as BodyInit,
        });
        const { storageId } = await uploadResponse.json();
        if (!storageId) throw new Error(`Upload failed for ${fileToUpload.name}`);
        uploadedStorageId = storageId;
      } else if (!contractId) { // File required for new contracts
        throw new Error("A document is required to create a new contract.");
      }

      if (contractId) { // Update existing contract
        const updatePayload: {
          id: Id<"contracts">;
          title?: string;
          notes?: string;
          enterpriseId?: Id<"enterprises">;
        } = { id: contractId };
        // Only include fields if they've changed and are part of the schema
        if (formState.title !== contractData?.title) updatePayload.title = formState.title;
        if (formState.description !== contractData?.notes) updatePayload.notes = formState.description;
        // Note: Updating vendorId, status, or file (storageId) for an existing contract
        // would require specific logic and potentially different mutations or checks.
        // The current `updateContract` in `convex/contracts.ts` is simple.
        if (formState.vendorId !== contractData?.vendorId?.toString()) {
            // You might want to add a specific check or disallow vendor change here
            // or ensure backend handles implications of vendor change.
            // For now, let's assume it's not directly updatable via this form post-creation
            // to keep it simple with the current backend `updateContract`.
        }
        await updateContractMutation.execute({
            ...updatePayload,
            // Pass enterpriseId for permission check if your updateContract mutation expects it
            ...(enterpriseIdFromClerk && { enterpriseId: enterpriseIdFromClerk }),
        });
        setSuccess('Contract updated successfully!');
        if (onSuccess) onSuccess(contractId);
        if (!isModal) setTimeout(() => router.push(`/dashboard/contracts/${contractId}`), 1500);

      } else { // Create new contract
        if (!uploadedStorageId) throw new Error("File upload is required for new contract.");
        if (!enterpriseIdFromClerk) throw new Error("Enterprise ID is required to create a new contract."); // Should be caught by isFormValid

        const newContractArgs = {
          enterpriseId: enterpriseIdFromClerk, // Pass the enterpriseId
          vendorId: formState.vendorId as Id<"vendors">,
          title: formState.title,
          storageId: uploadedStorageId,
          fileName: uploadedFileName,
          fileType: uploadedFileType,
          notes: formState.description,
          status: 'pending_analysis' as const,
        };
        const newContractResult = await createContractMutation.execute(newContractArgs);

        if (newContractResult) {
          setSuccess('Contract created successfully!');
          if (onSuccess) onSuccess(newContractResult);
          if (!isModal) setTimeout(() => router.push(`/dashboard/contracts/${newContractResult}`), 1500);
        } else {
           setError(createContractMutation.error?.message || 'Failed to create contract.');
        }
      }

      if (!error && !createContractMutation.error && !updateContractMutation.error) {
         setFormState(prev => ({ ...prev, documents: [] })); // Clear documents on success
      }

    } catch (err) {
      console.error("Error saving contract:", err);
      setError(`Submission failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const initialDataLoading = isLoadingVendors || (contractId && isLoadingContract);

  // --- Form JSX ---
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" /> <AlertTitle>Error</AlertTitle> <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default">
          <Check className="h-4 w-4" /> <AlertTitle>Success</AlertTitle> <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Contract Details</h3>
        <Separator />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Contract Title <span className="text-destructive">*</span></Label>
            <div className="relative">
              <FileText className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input id="title" name="title" placeholder="e.g., Annual SaaS Subscription" className="pl-8" value={formState.title} onChange={handleInputChange} required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contractType">Category/Type <span className="text-destructive">*</span></Label>
            <div className="relative">
               <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Select value={formState.contractType} onValueChange={(value) => handleSelectChange('contractType', value)} required>
                 <SelectTrigger className="pl-8"><SelectValue placeholder="Select type..." /></SelectTrigger>
                 <SelectContent>{contractTypes.map((type) => ( <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem> ))}</SelectContent>
               </Select>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Vendor <span className="text-destructive">*</span></Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-grow">
               <Building className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <Button type="button" variant="outline" className="w-full justify-start text-left font-normal pl-8" onClick={() => setShowVendorSearch(true)} disabled={isLoadingVendors || (!enterpriseIdFromClerk && !contractId) }>
                 {isLoadingVendors ? 'Loading vendors...' : ( formState.vendorId && vendorsList.length > 0 ? vendorsList.find((v:VendorType) => v._id.toString() === formState.vendorId)?.name ?? 'Select vendor...' : 'Select vendor...' )}
               </Button>
            </div>
            <Button type="button" variant="outline" size="icon" onClick={() => setShowVendorSearch(true)} disabled={isLoadingVendors || (!enterpriseIdFromClerk && !contractId) }><Search className="h-4 w-4" /></Button>
          </div>
           {!enterpriseIdFromClerk && !contractId && <p className="text-xs text-amber-600 mt-1">Enterprise information is missing. Vendor selection is disabled.</p>}
           <input type="text" value={formState.vendorId} required style={{ display: 'none' }} readOnly/>
        </div>
      </div>


      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Optional Details</h3>
        <Separator />
        {/* Description / Notes */}
        <div className="space-y-1.5">
           <Label htmlFor="description">Description / Notes</Label>
           <Textarea id="description" name="description" placeholder="Add key terms, notes, or summary..." className="min-h-[100px]" value={formState.description} onChange={handleInputChange} />
        </div>
      </div>


      {/* Attachment Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Attachment</h3>
        <Separator />
        <div className="space-y-1.5">
            <Label htmlFor="document-upload">
              Document <span className="text-destructive">{!contractId ? '*' : '(Optional if not changing)'}</span>
            </Label>
            <input type="file" id="document-upload" ref={fileInputRef} className="hidden" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png" required={!contractId} />
            <label htmlFor="document-upload" className="flex flex-col items-center justify-center w-full h-32 px-4 text-center border-2 border-dashed rounded-lg cursor-pointer bg-card hover:border-primary/50 hover:bg-muted/50 transition-colors" >
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground"> <span className="font-semibold text-primary">Click to upload</span> or drag and drop </p>
                <p className="text-xs text-muted-foreground">PDF, DOCX, etc. (Single file)</p>
            </label>
            {formState.documents.length > 0 && (
            <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-foreground">Selected file:</p>
                <ul className="space-y-1 max-h-40 overflow-y-auto rounded-md border p-2">
                {formState.documents.slice(0, 1).map((file, index) => ( /* Show only first file if multiple selected */
                    <li key={index} className="flex items-center justify-between text-sm p-1.5 bg-muted/30 rounded">
                    <div className="flex items-center gap-2 truncate">
                        <FileIcon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <span className="truncate flex-grow">{file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">({formatBytes(file.size)})</span>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => removeDocument(index)} aria-label={`Remove ${file.name}`} >
                        <X className="h-4 w-4" />
                    </Button>
                    </li>
                ))}
                </ul>
                {formState.documents.length > 1 && ( <p className="text-xs text-amber-600">Note: Only the first selected file will be uploaded.</p> )}
            </div>
            )}
        </div>
      </div>

      <Separator className="mt-8"/>
      <div className="flex justify-between items-center pt-4 gap-4 flex-wrap">
         <Button type="button" variant="outline" onClick={isModal ? onClose : () => router.back()} disabled={isLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {isModal ? 'Cancel' : 'Back'}
         </Button>
         <Button type="submit" disabled={!isFormValid() || isLoading} className="min-w-[120px]">
            {isLoading ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <Save className="mr-2 h-4 w-4" /> )}
            {isLoading ? (contractId ? 'Updating...' : 'Creating...') : (contractId ? 'Update Contract' : 'Create Contract')}
         </Button>
      </div>
    </form>
  );

  const vendorSearchDialog = (
    <Dialog open={showVendorSearch} onOpenChange={setShowVendorSearch}>
      <DialogContent className="sm:max-w-[425px] bg-background">
        <DialogHeader> <DialogTitle>Select Vendor</DialogTitle> <DialogDescription>Search for an existing vendor.</DialogDescription> </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name..." value={vendorSearchQuery} onChange={(e) => setVendorSearchQuery(e.target.value)} className="pl-8" />
          </div>
          <div className="max-h-60 overflow-y-auto border rounded-md bg-card">
            {isLoadingVendors ? ( <div className="p-4 text-center text-muted-foreground">Loading vendors...</div> )
             : (filteredVendors && filteredVendors.length > 0) ? (
              filteredVendors.map((vendor: VendorType) => ( 
                <button type="button" key={vendor._id.toString()} className="flex items-center justify-between w-full p-3 text-left hover:bg-muted/50 cursor-pointer border-b last:border-0" onClick={() => selectVendor(vendor._id.toString())} >
                  <div> <p className="font-medium text-sm">{vendor.name}</p> </div>
                  {formState.vendorId === vendor._id.toString() && ( <Check className="ml-auto h-4 w-4 text-green-600 flex-shrink-0" /> )}
                </button>
              ))
            ) : ( <div className="p-4 text-center text-muted-foreground"> {vendorSearchQuery ? 'No vendors found.' : 'No vendors available.'} </div> )}
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
          <Button variant="outline" onClick={() => { setShowVendorSearch(false); setShowVendorCreate(true); }}>
            <Plus className="mr-2 h-4 w-4" /> New Vendor
          </Button>
          <Button variant="ghost" onClick={() => setShowVendorSearch(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // --- Final Render Logic ---
  if (initialDataLoading && !isModal) {
    return (
      <div className="flex items-center justify-center p-10 min-h-[300px] bg-background rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-muted-foreground">Loading form data...</p>
      </div>
    );
  }

  if (contractId && contractError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" /> <AlertTitle>Error Loading Contract Data</AlertTitle> <AlertDescription>{contractError.message}</AlertDescription>
      </Alert>
    );
  }
  if (isModal) {
    return (
      <>
        {initialDataLoading && (
             <div className="flex items-center justify-center p-10 min-h-[200px]">
                <Loader2 className="h-6 w-6 animate-spin text-primary" /> <p className="ml-2 text-muted-foreground">Loading...</p>
            </div>
        )}
        {!initialDataLoading && formContent}
        {vendorSearchDialog}
        {enterpriseIdFromClerk && (
          <VendorCreateDialog
            open={showVendorCreate}
            onOpenChange={setShowVendorCreate}
            enterpriseId={enterpriseIdFromClerk}
            onVendorCreated={(vendorId) => {
              setFormState(prev => ({ ...prev, vendorId: vendorId.toString() }));
              setShowVendorCreate(false);
            }}
          />
        )}
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Card className="bg-card shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl"> {contractId ? 'Edit Contract' : 'Create New Contract'} </CardTitle>
          <CardDescription> {contractId ? 'Update the details of the existing contract.' : 'Fill in the details to create a new contract.'} </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {false && <div className="flex items-center justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2"/>Loading user data...</div>}
          {!enterpriseIdFromClerk && !contractId && ( // Show warning if enterpriseId is missing for new contracts
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Enterprise Information Missing</AlertTitle>
              <AlertDescription>
                Your enterprise ID could not be determined from your user profile.
                Please ensure this is set up correctly in your Clerk user public metadata.
                You will not be able to create new contracts without it.
              </AlertDescription>
            </Alert>
          )}
          {formContent}
        </CardContent>
      </Card>
      {vendorSearchDialog}
      {enterpriseIdFromClerk && (
        <VendorCreateDialog
          open={showVendorCreate}
          onOpenChange={setShowVendorCreate}
          enterpriseId={enterpriseIdFromClerk}
          onVendorCreated={(vendorId) => {
            setFormState(prev => ({ ...prev, vendorId: vendorId.toString() }));
            setShowVendorCreate(false);
          }}
        />
      )}
    </div>
  );
};

export default ContractForm;