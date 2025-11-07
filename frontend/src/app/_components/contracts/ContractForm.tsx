'use client';

import { Loader2, Upload, X } from "lucide-react";
import React, { useState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useContractMutations } from "@/hooks/useContracts";
import { useVendors } from "@/hooks/useVendors";
import { Tables } from "@/types/database.types";

type Contract = Tables<'contracts'>;

interface ContractFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contract?: Contract | null;
  onSuccess?: () => void;
}

interface FormData {
  title: string;
  vendor_id: string;
  contract_type?: string;
  start_date?: string;
  end_date?: string;
  value?: number;
  status: Contract['status'];
  notes?: string;
  file?: File | null;
}

const contractTypeOptions = [
  'software_license',
  'saas_subscription',
  'professional_services',
  'maintenance_support',
  'consulting',
  'data_processing',
  'master_services',
  'other'
];

const contractStatusOptions: Contract['status'][] = [
  'draft',
  'pending_analysis',
  'active',
  'expired',
  'terminated',
  'archived'
];

export const ContractForm: React.FC<ContractFormProps> = ({
  open,
  onOpenChange,
  contract,
  onSuccess,
}) => {
  const { userProfile } = useAuth();
  const { vendors, isLoading: isLoadingVendors } = useVendors();
  const { createContract, updateContract, isLoading: isMutating } = useContractMutations();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    vendor_id: "",
    status: "draft",
    notes: "",
    file: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens/closes or contract changes
  useEffect(() => {
    if (contract) {
      setFormData({
        title: contract.title || "",
        vendor_id: contract.vendor_id || "",
        contract_type: contract.contract_type || undefined,
        start_date: contract.start_date || undefined,
        end_date: contract.end_date || undefined,
        value: contract.value || undefined,
        status: contract.status || "draft",
        notes: contract.notes || "",
        file: null,
      });
    } else {
      setFormData({
        title: "",
        vendor_id: "",
        status: "draft",
        notes: "",
        file: null,
      });
    }
    setErrors({});
  }, [contract, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = "Contract title is required";
    }

    if (!formData.vendor_id) {
      newErrors.vendor_id = "Vendor selection is required";
    }

    if (!contract && !formData.file) {
      newErrors.file = "Contract document is required for new contracts";
    }

    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate < startDate) {
        newErrors.end_date = "End date must be after start date";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !userProfile?.enterprise_id) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (contract) {
        // Update existing contract
        await updateContract(
          contract.id,
          {
            title: formData.title,
            vendor_id: formData.vendor_id,
            contract_type: formData.contract_type,
            start_date: formData.start_date,
            end_date: formData.end_date,
            value: formData.value,
            status: formData.status,
            notes: formData.notes,
          },
          {
            onSuccess: () => {
              toast.success("Contract updated successfully");
              onSuccess?.();
              onOpenChange(false);
            },
            onError: (error) => {
              toast.error(`Failed to update contract: ${error.message}`);
            }
          }
        );
      } else {
        // For new contracts, we'd need to upload the file first
        // This is simplified - in production you'd upload to storage first
        toast.info("File upload not yet implemented. Creating contract metadata...");

        await createContract(
          {
            title: formData.title,
            vendor_id: formData.vendor_id,
            contract_type: formData.contract_type || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            value: formData.value || null,
            status: formData.status,
            notes: formData.notes || null,
            file_name: formData.file?.name || "untitled",
            file_type: formData.file?.type || "application/pdf",
            storage_id: null,
            owner_id: null,
            department_id: null,
            is_auto_renew: false,
            analysis_status: null,
            analysis_error: null,
            analyzed_at: null,
            metadata: null,
            tags: null,
            last_modified_by: null,
          },
          {
            onSuccess: () => {
              toast.success("Contract created successfully");
              onSuccess?.();
              onOpenChange(false);
            },
            onError: (error) => {
              toast.error(`Failed to create contract: ${error.message}`);
            }
          }
        );
      }
    } catch (error) {
      console.error("Error submitting contract form:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number | File | null) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user makes changes
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, file: "File size must be less than 10MB" }));
        return;
      }
      handleInputChange("file", file);
    }
  };

  const removeFile = () => {
    handleInputChange("file", null);
  };

  const formatFileName = (name: string) => {
    if (name.length > 30) {
      return name.substring(0, 27) + "...";
    }
    return name;
  };

  const isLoading = isLoadingVendors || isMutating || isSubmitting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {contract ? "Edit Contract" : "Create New Contract"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>

            <div className="space-y-2">
              <Label htmlFor="title">
                Contract Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="Enter contract title"
                className={errors.title ? "border-red-500" : ""}
                disabled={isLoading}
              />
              {errors.title && (
                <p className="text-sm text-red-500">{errors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendor_id">
                  Vendor <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => handleInputChange("vendor_id", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className={errors.vendor_id ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vendor_id && (
                  <p className="text-sm text-red-500">{errors.vendor_id}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="contract_type">Contract Type</Label>
                <Select
                  value={formData.contract_type}
                  onValueChange={(value) => handleInputChange("contract_type", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {contractTypeOptions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.split('_').map(word =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                        ).join(' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange("status", value as Contract['status'])}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {contractStatusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.split('_').map(word =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contract Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Contract Details</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date || ""}
                  onChange={(e) => handleInputChange("start_date", e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date || ""}
                  onChange={(e) => handleInputChange("end_date", e.target.value)}
                  className={errors.end_date ? "border-red-500" : ""}
                  disabled={isLoading}
                />
                {errors.end_date && (
                  <p className="text-sm text-red-500">{errors.end_date}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">Contract Value ($)</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                value={formData.value || ""}
                onChange={(e) => handleInputChange("value", parseFloat(e.target.value))}
                placeholder="0.00"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                placeholder="Any additional notes about this contract..."
                rows={3}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* File Upload (only for new contracts) */}
          {!contract && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Contract Document</h3>

              <div className="space-y-2">
                <Label htmlFor="file">
                  Upload Document <span className="text-red-500">*</span>
                </Label>
                {!formData.file ? (
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors ${
                      errors.file ? "border-red-500" : "border-gray-300"
                    }`}
                    onClick={() => document.getElementById('file')?.click()}
                  >
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      PDF, DOC, DOCX up to 10MB
                    </p>
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded">
                        <Upload className="h-5 w-5 text-purple-900" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {formatFileName(formData.file.name)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(formData.file.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeFile}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {errors.file && (
                  <p className="text-sm text-red-500">{errors.file}</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: '#291528', color: '#ffffff' }}
              className="hover:opacity-90"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {contract ? "Update Contract" : "Create Contract"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ContractForm;
