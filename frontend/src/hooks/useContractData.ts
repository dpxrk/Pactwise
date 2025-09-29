/**
 * Custom hooks for fetching contract data
 * Uses React Query for caching and real-time updates
 * NO HARDCODED DATA - Everything from APIs
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { contractsAPI } from '@/lib/api/contracts';
import { toast } from 'sonner';
import type { Database } from '@/types/database.types';

type Contract = Database['public']['Tables']['contracts']['Row'];
type ContractInsert = Database['public']['Tables']['contracts']['Insert'];
type ContractUpdate = Database['public']['Tables']['contracts']['Update'];

/**
 * Fetch a single contract with all related data
 */
export function useContractData(contractId: string) {
  const { userProfile } = useAuth();

  return useQuery({
    queryKey: ['contract', contractId],
    queryFn: () => contractsAPI.getContract(contractId),
    enabled: !!contractId && !!userProfile,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  });
}

/**
 * Fetch multiple contracts with filtering
 */
export function useContracts(filters?: {
  status?: string;
  vendorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const { userProfile, enterprise } = useAuth();

  return useQuery({
    queryKey: ['contracts', enterprise?.id, filters],
    queryFn: () => contractsAPI.getContracts({
      ...filters,
      enterpriseId: enterprise?.id
    }),
    enabled: !!enterprise?.id,
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes
    keepPreviousData: true, // Keep data while paginating
  });
}

/**
 * Create a new contract
 */
export function useCreateContract() {
  const queryClient = useQueryClient();
  const { enterprise } = useAuth();

  return useMutation({
    mutationFn: (contract: Omit<ContractInsert, 'enterprise_id'>) => 
      contractsAPI.createContract({
        ...contract,
        enterprise_id: enterprise?.id
      }),
    onSuccess: (data) => {
      // Invalidate contracts list
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create contract: ${error.message}`);
    },
  });
}

/**
 * Update an existing contract
 */
export function useUpdateContract(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: ContractUpdate) => 
      contractsAPI.updateContract(contractId, updates),
    onSuccess: (data) => {
      // Update cache with new data
      queryClient.setQueryData(['contract', contractId], data);
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contract updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update contract: ${error.message}`);
    },
  });
}

/**
 * Delete a contract
 */
export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: string) => 
      contractsAPI.deleteContract(contractId),
    onSuccess: (_, contractId) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.removeQueries({ queryKey: ['contract', contractId] });
      toast.success('Contract deleted successfully');
    },
    onError: (error) => {
      toast.error(`Failed to delete contract: ${error.message}`);
    },
  });
}

/**
 * Analyze a contract with AI
 */
export function useAnalyzeContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractId: string) => 
      contractsAPI.analyzeContract(contractId),
    onSuccess: (data, contractId) => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      toast.success('Contract analysis started');
    },
    onError: (error) => {
      toast.error(`Failed to analyze contract: ${error.message}`);
    },
  });
}

/**
 * Get contracts expiring soon
 */
export function useExpiringContracts(daysAhead = 30) {
  const { enterprise } = useAuth();

  return useQuery({
    queryKey: ['contracts', 'expiring', enterprise?.id, daysAhead],
    queryFn: () => contractsAPI.getExpiringContracts(enterprise?.id!, daysAhead),
    enabled: !!enterprise?.id,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
}

/**
 * Get contract analytics for dashboard
 */
export function useContractAnalytics() {
  const { enterprise } = useAuth();

  return useQuery({
    queryKey: ['contracts', 'analytics', enterprise?.id],
    queryFn: () => contractsAPI.getContractAnalytics(enterprise?.id!),
    enabled: !!enterprise?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get contract value metrics
 */
export function useContractValueMetrics() {
  const { enterprise } = useAuth();

  return useQuery({
    queryKey: ['contracts', 'value-metrics', enterprise?.id],
    queryFn: () => contractsAPI.getContractValueMetrics(enterprise?.id!),
    enabled: !!enterprise?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Search contracts with full-text search
 */
export function useSearchContracts(searchTerm: string) {
  const { enterprise } = useAuth();

  return useQuery({
    queryKey: ['contracts', 'search', searchTerm, enterprise?.id],
    queryFn: () => contractsAPI.searchContracts(searchTerm, enterprise?.id!),
    enabled: !!enterprise?.id && searchTerm.length > 2,
    staleTime: 1 * 60 * 1000,
    keepPreviousData: true,
  });
}

/**
 * Get contract status distribution
 */
export function useContractStatusDistribution() {
  const { enterprise } = useAuth();

  return useQuery({
    queryKey: ['contracts', 'status-distribution', enterprise?.id],
    queryFn: () => contractsAPI.getStatusDistribution(enterprise?.id!),
    enabled: !!enterprise?.id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Upload contract document
 */
export function useUploadContractDocument(contractId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => 
      contractsAPI.uploadContractDocument(contractId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', contractId] });
      toast.success('Document uploaded successfully');
    },
    onError: (error) => {
      toast.error(`Failed to upload document: ${error.message}`);
    },
  });
}

/**
 * Get contract history/timeline
 */
export function useContractHistory(contractId: string) {
  return useQuery({
    queryKey: ['contract', contractId, 'history'],
    queryFn: () => contractsAPI.getContractHistory(contractId),
    enabled: !!contractId,
    staleTime: 2 * 60 * 1000,
  });
}