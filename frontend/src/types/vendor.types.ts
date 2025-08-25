// src/types/vendor.types.ts
import { Id } from "./id.types";
import type { Id } from '@/types/id.types';

// --- DEFINE VENDOR CATEGORY OPTIONS AND TYPE (mirrors schema.ts) ---
export const vendorCategoryOptions = [
  "technology", "marketing", "legal", "finance", "hr",
  "facilities", "logistics", "manufacturing", "consulting", "other"
] as const;
export type VendorCategory = typeof vendorCategoryOptions[number];

export type VendorType = {
  _id: Id<"vendors">;
  _creationTime?: number;
  enterpriseId: Id<"enterprises">;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  notes?: string;
  website?: string;
  

  // --- NEW: Vendor category ---
  category?: VendorCategory;

  // --- Optional: Fields from your vendor-store that might be part of the VendorType ---
  // These were in your vendor-store.ts but not explicitly in the VendorType
  // If they are derived or client-side only, they might belong in a different type or interface.
  vendor_number?: string; // Was in vendor page component
  status?: "active" | "inactive" | "pending"; // Was in vendor page component & store
  total_spend?: number; // Was in vendor page component & store
  risk_level?: "low" | "medium" | "high"; // Was in vendor page component & store
  active_contracts?: number; // Was in vendor page component & store
  compliance_score?: number; // Was in vendor store
  updated_at?: string; // Used in inactive vendors page
  metadata?: { // Used in inactive vendors page
    reviewed?: boolean;
  };
  // contractCount is likely a derived field, added in getVendors query
  contractCount?: number;
};