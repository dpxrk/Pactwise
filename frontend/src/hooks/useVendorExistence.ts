// import { useQuery } from 'convex/react';
// import { api } from '../../convex/_generated/api';
// import { Id } from '../../convex/_generated/dataModel';

// Mock Id type
type Id<T extends string> = string & { __tableName: T };

export function useVendorExistence(vendorName: string, enterpriseId: Id<"enterprises">) {
  // TODO: Replace with Supabase implementation
  return {
    exists: null,
    vendor: null,
    isLoading: false,
    error: null,
  };
}
