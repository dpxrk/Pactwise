// src/lib/api-client.ts
import { useState, useEffect } from 'react';
import { performanceMonitor } from './performance-monitoring';

// Define a constant for skipping queries cleanly
const SKIP_TOKEN = 'skip' as const;

// Placeholder types until Supabase types are defined
type Id<T extends string> = string;
type FakeDoc<T> = T & {
  _id: string;
  _creationTime: number;
}

/**
 * Placeholder hook for queries - will be replaced with Supabase queries
 * Returns mock data for now to keep the UI functional
 */
export function useConvexQuery<T>(
  queryName: string,
  args: any | typeof SKIP_TOKEN
) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(args !== SKIP_TOKEN);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        if (args === SKIP_TOKEN) {
            setIsLoading(false);
            return;
        }

        // Simulate async loading
        const timer = setTimeout(() => {
            // Return empty arrays/null for now
            setData(null);
            setIsLoading(false);
        }, 100);

        return () => clearTimeout(timer);
    }, [args, queryName]);

    return { data, isLoading, error };
}

/**
 * Placeholder hook for mutations - will be replaced with Supabase mutations
 */
export function useConvexMutation<T>(
  mutationName: string
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = async (args: any): Promise<T | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Simulate async mutation
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log(`Mock mutation: ${mutationName}`, args);
      return null;
    } catch (err) {
      const caughtError = err instanceof Error ? err : new Error(String(err));
      setError(caughtError);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error };
}

/**
 * Placeholder hook for actions - will be replaced with Supabase functions
 */
export function useConvexAction<T>(actionName: string) {
  return useConvexMutation<T>(actionName);
}

// ============================================================================
// Vendor API Hooks (Placeholders)
// ============================================================================

interface UseVendorsArgs {
  enterpriseId: string;
  category?: string | "all";
}

export const useVendors = (args: UseVendorsArgs | null | undefined | typeof SKIP_TOKEN) => {
  return useConvexQuery<any[]>(
      'vendors.getVendors',
      args === SKIP_TOKEN || !args || !args.enterpriseId ? SKIP_TOKEN : args
  );
};

interface UseVendorArgs {
    vendorId: string;
    enterpriseId: string;
}

export const useVendor = (args: UseVendorArgs | null | undefined | typeof SKIP_TOKEN) => {
   return useConvexQuery<any>(
       'vendors.getVendorById',
       args === SKIP_TOKEN || !args || !args.vendorId || !args.enterpriseId ? SKIP_TOKEN : args
   );
};

export const useCreateVendor = () => {
  return useConvexMutation('vendors.createVendor');
};

export const useUpdateVendor = () => {
  return useConvexMutation('vendors.updateVendor');
};

export const useDeleteVendor = () => {
  return useConvexMutation('vendors.deleteVendor');
};

// ============================================================================
// Contract API Hooks (Placeholders)
// ============================================================================

export const useGenerateUploadUrl = () => {
    return useConvexMutation('contracts.generateUploadUrl');
};

export const useCreateContract = () => {
  return useConvexMutation('contracts.createContract');
};

interface UseContractsArgs {
    enterpriseId: string;
    contractType?: string | "all";
    status?: string;
    cursor?: string;
    limit?: number;
}

export const useContracts = (args: UseContractsArgs | null | undefined | typeof SKIP_TOKEN) => {
    return useConvexQuery<any[]>(
        'contracts.getContracts',
        args === SKIP_TOKEN || !args || !args.enterpriseId ? SKIP_TOKEN : args
    );
}

interface UseContractsByVendorArgs {
    vendorId: string;
    enterpriseId: string;
}

export const useContractsByVendor = (args: UseContractsByVendorArgs | null | undefined | typeof SKIP_TOKEN) => {
  return useConvexQuery<any[]>(
    'contracts.getContractsByVendor',
    args === SKIP_TOKEN || !args || !args.vendorId || !args.enterpriseId ? SKIP_TOKEN : args
  );
};

interface UseContractArgs {
    contractId: string;
    enterpriseId: string;
}

export const useContract = (args: UseContractArgs | null | undefined | typeof SKIP_TOKEN) => {
   return useConvexQuery<any>(
       'contracts.getContractById',
       args === SKIP_TOKEN || !args || !args.contractId || !args.enterpriseId ? SKIP_TOKEN : args
   );
};

export const useUpdateContract = () => {
  return useConvexMutation('contracts.updateContract');
};

export const useDeleteContract = () => {
  return useConvexMutation('contracts.deleteContract');
};

export const useContractFileUrl = (storageId: string | null | undefined | typeof SKIP_TOKEN) => {
    return useConvexQuery<string>(
        'contracts.getContractFileUrl',
        storageId === SKIP_TOKEN || !storageId ? SKIP_TOKEN : { storageId }
    );
};

// ============================================================================
// Direct API Client Export (Placeholder)
// ============================================================================
export const apiClient = {
  vendors: {
    create: 'vendors.createVendor',
    list: 'vendors.getVendors',
    get: 'vendors.getVendorById',
    update: 'vendors.updateVendor',
    delete: 'vendors.deleteVendor',
  },
  contracts: {
    generateUploadUrl: 'contracts.generateUploadUrl',
    create: 'contracts.createContract',
    list: 'contracts.getContracts',
    listByVendor: 'contracts.getContractsByVendor',
    get: 'contracts.getContractById',
    getFileUrl: 'contracts.getContractFileUrl',
    update: 'contracts.updateContract',
    delete: 'contracts.deleteContract',
  },
};

// Export the SKIP_TOKEN for use in components
export { SKIP_TOKEN };