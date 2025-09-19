'use client';

import React, { useState, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { CalendarIcon, Upload, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Use optimized stores and React Query
import { useCreateContract, useUpdateContract, useContract } from '@/hooks/queries/useContracts';
import { useVendors } from '@/stores/vendor-store-optimized';
import { useContractFormStore } from '@/stores/contracts/contractFormStore';
import type { Id } from '@/types/id.types';
import type { ContractType } from '@/types/contract.types';

// Form validation schema
const contractFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  contractType: z.enum(['nda', 'msa', 'sow', 'saas', 'lease', 'employment', 'partnership', 'other']),
  vendorId: z.string().min(1, "Vendor is required"),
  startDate: z.date({
    required_error: "Start date is required",
  }),
  endDate: z.date({
    required_error: "End date is required",
  }),
  value: z.string().optional(),
  description: z.string().optional(),
  autoRenewal: z.boolean().default(false),
  renewalPeriod: z.number().optional(),
}).refine(data => data.endDate > data.startDate, {
  message: "End date must be after start date",
  path: ["endDate"],
});

type ContractFormData = z.infer<typeof contractFormSchema>;

interface OptimizedContractFormProps {
  contractId?: Id<"contracts">;
  isModal?: boolean;
  onClose?: () => void;
  onSuccess?: (contractId: Id<"contracts">) => void;
}

const contractTypes = [
  { value: "nda", label: "Non-Disclosure Agreement (NDA)" },
  { value: "msa", label: "Master Service Agreement (MSA)" },
  { value: "sow", label: "Statement of Work (SOW)" },
  { value: "saas", label: "Software as a Service (SaaS)" },
  { value: "lease", label: "Lease Agreement" },
  { value: "employment", label: "Employment Contract" },
  { value: "partnership", label: "Partnership Agreement" },
  { value: "other", label: "Other" },
];

export const OptimizedContractForm: React.FC<OptimizedContractFormProps> = memo(({ 
  contractId, 
  isModal = false, 
  onClose, 
  onSuccess 
}) => {
  const router = useRouter();
  const { userProfile } = useAuth();
  const enterpriseId = userProfile?.enterprise_id as Id<"enterprises">;

  // State
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // Use optimized stores
  const vendors = useVendors();
  
  // React Query hooks
  const { data: existingContract, isLoading: isLoadingContract } = useContract(contractId || '');
  const createContract = useCreateContract();
  const updateContract = useUpdateContract();

  // React Hook Form
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: existingContract ? {
      title: existingContract.title,
      contractType: existingContract.contractType,
      vendorId: existingContract.vendorId,
      startDate: existingContract.extractedStartDate ? new Date(existingContract.extractedStartDate) : undefined,
      endDate: existingContract.extractedEndDate ? new Date(existingContract.extractedEndDate) : undefined,
      value: existingContract.extractedPricing || existingContract.value?.toString(),
      description: existingContract.notes,
      autoRenewal: false,
    } : {
      contractType: 'other',
      autoRenewal: false,
    },
  });

  const watchStartDate = watch("startDate");
  const watchEndDate = watch("endDate");

  // Handle form submission
  const onSubmit = useCallback(async (data: ContractFormData) => {
    if (!enterpriseId) {
      toast.error("Enterprise context not found");
      return;
    }

    try {
      const contractData: Partial<ContractType> = {
        title: data.title,
        contractType: data.contractType,
        vendorId: data.vendorId as Id<"vendors">,
        enterpriseId,
        extractedStartDate: data.startDate.toISOString(),
        extractedEndDate: data.endDate.toISOString(),
        extractedPricing: data.value,
        notes: data.description,
        status: 'draft',
      };

      let result;
      if (contractId) {
        result = await updateContract.mutateAsync({
          id: contractId,
          updates: contractData,
        });
      } else {
        result = await createContract.mutateAsync(contractData);
      }

      // Handle file uploads if any
      if (uploadedFiles.length > 0) {
        // TODO: Implement file upload logic
        console.log('Files to upload:', uploadedFiles);
      }

      toast.success(`Contract ${contractId ? 'updated' : 'created'} successfully`);
      
      if (onSuccess) {
        onSuccess(result.id as Id<"contracts">);
      } else if (!isModal) {
        router.push(`/dashboard/contracts/${result.id}`);
      }
      
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving contract:', error);
      toast.error(`Failed to ${contractId ? 'update' : 'create'} contract`);
    }
  }, [enterpriseId, contractId, uploadedFiles, createContract, updateContract, router, isModal, onSuccess, onClose]);

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setUploadedFiles(prev => [...prev, ...files]);
  }, []);

  // Remove file
  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Format file size
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  if (isLoadingContract) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{contractId ? 'Edit' : 'Create'} Contract</CardTitle>
          <CardDescription>
            {contractId ? 'Update the contract details below' : 'Fill in the contract details to create a new contract'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Contract Title *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Enter contract title"
                className={errors.title ? "border-red-500" : ""}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contractType">Contract Type *</Label>
                <Select
                  value={watch("contractType")}
                  onValueChange={(value) => setValue("contractType", value as any)}
                >
                  <SelectTrigger className={errors.contractType ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.contractType && (
                  <p className="text-sm text-red-500">{errors.contractType.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendorId">Vendor *</Label>
                <Select
                  value={watch("vendorId")}
                  onValueChange={(value) => setValue("vendorId", value)}
                >
                  <SelectTrigger className={errors.vendorId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map(vendor => (
                      <SelectItem key={vendor._id} value={vendor._id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendorId && (
                  <p className="text-sm text-red-500">{errors.vendorId.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Contract Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contract Period</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchStartDate && "text-muted-foreground",
                        errors.startDate && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchStartDate ? format(watchStartDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watchStartDate}
                      onSelect={(date) => setValue("startDate", date!)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.startDate && (
                  <p className="text-sm text-red-500">{errors.startDate.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>End Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !watchEndDate && "text-muted-foreground",
                        errors.endDate && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {watchEndDate ? format(watchEndDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={watchEndDate}
                      onSelect={(date) => setValue("endDate", date!)}
                      disabled={(date) => watchStartDate ? date < watchStartDate : false}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {errors.endDate && (
                  <p className="text-sm text-red-500">{errors.endDate.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Financial Details</h3>
            <div className="space-y-2">
              <Label htmlFor="value">Contract Value</Label>
              <Input
                id="value"
                {...register("value")}
                placeholder="e.g., $10,000 or $1,000/month"
              />
            </div>
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Information</h3>
            <div className="space-y-2">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Enter any additional notes or description"
                rows={4}
              />
            </div>
          </div>

          <Separator />

          {/* File Uploads */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Documents</h3>
            <div className="space-y-2">
              <Label htmlFor="files">Upload Contract Documents</Label>
              <Input
                id="files"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt"
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <span className="text-xs text-gray-500 mx-2">{formatFileSize(file.size)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {isModal && (
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isSubmitting || createContract.isPending || updateContract.isPending}
        >
          {(isSubmitting || createContract.isPending || updateContract.isPending) && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {contractId ? 'Update' : 'Create'} Contract
        </Button>
      </div>
    </form>
  );
});

OptimizedContractForm.displayName = 'OptimizedContractForm';

export default OptimizedContractForm;