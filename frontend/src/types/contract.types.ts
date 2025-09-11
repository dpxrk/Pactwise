// src/types/contract.types.ts
import type { Id } from '@/types/id.types';
// --- IMPORT VendorType AND VendorCategory from vendor.types.ts ---
import { VendorType, VendorCategory, vendorCategoryOptions } from "./vendor.types";

// Contract status options from the schema (already defined)
export type ContractStatus =
  | "draft"
  | "pending_analysis"
  | "active"
  | "expired"
  | "terminated"
  | "archived";

// Analysis status options from the schema (already defined)
export type AnalysisStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

// --- Define Contract Type Options (mirroring schema.ts for frontend use) ---
export const contractTypeOptions = [
  "nda", "msa", "sow", "saas", "lease", "employment", "partnership", "other"
] as const;
export type ContractTypeEnum = typeof contractTypeOptions[number];

export type ContractType = {
  _id: Id<"contracts">;

  // Link to an enterprise
  enterpriseId: Id<"enterprises">; // This should be in your schema

  // Core Contract Info
  title: string;
  vendorId: Id<"vendors">;
  status: ContractStatus;

  // Contract Type field
  contractType?: ContractTypeEnum;

  // File Information
  storageId: Id<"_storage">;
  fileName: string;
  fileType: string;

  // Extracted Information (all optional since they might not be available)
  extractedParties?: string[];
  extractedStartDate?: string;
  extractedEndDate?: string;
  extractedPaymentSchedule?: string;
  extractedPricing?: string;
  extractedScope?: string;

  // Analysis Process Tracking
  analysisStatus?: AnalysisStatus;
  analysisError?: string;

  // Optional user notes
  notes?: string;

  // Not in the schema but added by the getContracts query for UI display
  // VendorType itself might now contain its category.
  vendor?: VendorType; // VendorType is imported and should include its category

  // contract_number?: string;
  // value?: number;
  // ... (other commented-out fields from your previous version)
};


// Form data for contract creation/editing
export interface ContractFormData {
  title: string;
  vendorId: string; // String representation of the Id (usually from a select input)
  contractType?: ContractTypeEnum;
  notes?: string;
  file?: File; // For uploading the contract document
  // Optional: if you allow manual setting of these during form submission
  extractedStartDate?: Date | null;
  extractedEndDate?: Date | null;
}

// Vendor form data
export interface VendorFormData {
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  website?: string;
  // Use the imported VendorCategory type
  category?: VendorCategory;
}
