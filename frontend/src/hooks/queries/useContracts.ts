import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type { Tables } from "@/types/database.types";
import type { Id } from "@/types/id.types";
import { createClient } from "@/utils/supabase/client";

const supabase = createClient();

// Use database-generated contract type
type Contract = Tables<'contracts'>;
type ContractWithVendor = Contract & { vendor: Tables<'vendors'> | null };

// Fetch contracts with pagination
export function useContractList(
  enterpriseId: Id<"enterprises">,
  filters?: {
    status?: string;
    type?: string;
    search?: string;
  }
) {
  return useQuery({
    queryKey: queryKeys.contractList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("contracts")
        .select(`
          *,
          vendor:vendors(*)
        `)
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = (query as any).eq("status", filters.status);
      }
      if (filters?.type) {
        query = query.eq("contract_type", filters.type);
      }
      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ContractWithVendor[];
    },
    enabled: !!enterpriseId, // Only run query when we have a valid enterprise ID
    staleTime: 60 * 1000, // Consider data stale after 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Infinite scrolling for contracts
export function useContractInfiniteList(
  enterpriseId: Id<"enterprises">,
  filters?: {
    status?: string;
    type?: string;
    search?: string;
  },
  pageSize = 20
) {
  return useInfiniteQuery({
    queryKey: queryKeys.contractInfinite({ enterpriseId, ...filters }),
    queryFn: async ({ pageParam = 0 }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let query = (supabase as any)
        .from("contracts")
        .select(`
          *,
          vendor:vendors(*)
        `, { count: "exact" })
        .eq("enterprise_id", enterpriseId)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + pageSize - 1);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.type) {
        query = query.eq("contract_type", filters.type);
      }
      if (filters?.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        contracts: data as ContractWithVendor[],
        nextCursor: pageParam + pageSize,
        hasMore: (count ?? 0) > pageParam + pageSize,
        totalCount: count,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: 0,
    enabled: !!enterpriseId, // Only run query when we have a valid enterprise ID
  });
}

// Get single contract
export function useContract(contractId: string) {
  return useQuery({
    queryKey: queryKeys.contract(contractId),
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("contracts")
        .select(`
          *,
          vendor:vendors(*),
          documents:contract_documents(*)
        `)
        .eq("id", contractId)
        .single();

      if (error) throw error;
      return data as Contract;
    },
    enabled: !!contractId,
  });
}

// Create contract mutation
export function useCreateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createContract,
    mutationFn: async (contractData: Partial<Contract>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("contracts")
        .insert(contractData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Invalidate and refetch contract lists
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.contracts() 
      });
      
      // Optimistically update the cache
      queryClient.setQueryData(
        queryKeys.contract(data.id),
        data
      );
      
      toast.success("Contract created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create contract: ${error.message}`);
    },
  });
}

// Update contract mutation
export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateContract,
    mutationFn: async ({
      id,
      updates
    }: {
      id: string;
      updates: Partial<Contract>
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("contracts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ 
        queryKey: queryKeys.contract(id) 
      });

      // Snapshot previous value
      const previousContract = queryClient.getQueryData(
        queryKeys.contract(id)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.contract(id),
        (old: Contract | undefined) => 
          old ? { ...old, ...updates } : old
      );

      return { previousContract };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousContract) {
        queryClient.setQueryData(
          queryKeys.contract(variables.id),
          context.previousContract
        );
      }
      toast.error(`Failed to update contract: ${error.message}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.contracts()
      });
      toast.success("Contract updated successfully");
    },
  });
}

// Delete contract mutation
export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteContract,
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contracts")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({ 
        queryKey: queryKeys.contract(id) 
      });
      
      // Invalidate lists
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.contracts() 
      });
      
      toast.success("Contract deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete contract: ${error.message}`);
    },
  });
}

// Prefetch contract data
export function usePrefetchContract() {
  const queryClient = useQueryClient();

  return (contractId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.contract(contractId),
      queryFn: async () => {
        const { data, error } = await (supabase as any)
          .from("contracts")
          .select(`
            *,
            vendor:vendors(*),
            documents:contract_documents(*)
          `)
          .eq("id", contractId)
          .single();

        if (error) throw error;
        return data;
      },
    });
  };
}