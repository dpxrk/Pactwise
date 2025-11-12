import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";
import { queryKeys, mutationKeys } from "@/lib/react-query-config";
import type { Id } from "@/types/id.types";
import { toast } from "sonner";

const supabase = createClient();

// Vendor type (based on database schema)
export interface Vendor {
  id: string;
  enterprise_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  contact_person: string | null;
  category: string | null;
  status: "active" | "inactive" | "pending";
  risk_level: "low" | "medium" | "high" | "critical" | null;
  performance_score: number | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Fetch vendors with pagination
export function useVendorList(
  enterpriseId: Id<"enterprises">,
  filters?: {
    status?: string;
    category?: string;
    search?: string;
    risk_level?: string;
  }
) {
  return useQuery({
    queryKey: queryKeys.vendorList({ enterpriseId, ...filters }),
    queryFn: async () => {
      let query = supabase
        .from("vendors")
        .select(`
          *,
          contracts_count:contracts(count)
        `)
        .eq("enterprise_id", enterpriseId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.risk_level) {
        query = query.eq("risk_level", filters.risk_level);
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,contact_person.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Vendor[];
    },
    staleTime: 60 * 1000, // Consider data stale after 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

// Infinite scrolling for vendors
export function useVendorInfiniteList(
  enterpriseId: Id<"enterprises">,
  filters?: {
    status?: string;
    category?: string;
    search?: string;
  },
  pageSize = 20
) {
  return useInfiniteQuery({
    queryKey: queryKeys.vendorInfinite({ enterpriseId, ...filters }),
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from("vendors")
        .select("*", { count: "exact" })
        .eq("enterprise_id", enterpriseId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(pageParam, pageParam + pageSize - 1);

      if (filters?.status) {
        query = query.eq("status", filters.status);
      }
      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        vendors: data as Vendor[],
        nextCursor: pageParam + pageSize,
        hasMore: (count ?? 0) > pageParam + pageSize,
        totalCount: count,
      };
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    initialPageParam: 0,
  });
}

// Get single vendor
export function useVendor(vendorId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.vendor(vendorId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vendors")
        .select(`
          *,
          contracts:contracts(
            id,
            title,
            status,
            start_date,
            end_date,
            value
          )
        `)
        .eq("id", vendorId)
        .is("deleted_at", null)
        .single();

      if (error) throw error;
      return data as Vendor & { contracts: any[] };
    },
    enabled: options?.enabled !== false && !!vendorId,
  });
}

// Check if vendor exists by name or email
export function useVendorExistence(
  enterpriseId: Id<"enterprises">,
  search: { name?: string; email?: string },
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['vendor-existence', enterpriseId, search],
    queryFn: async () => {
      let query = supabase
        .from("vendors")
        .select("id, name, email")
        .eq("enterprise_id", enterpriseId)
        .is("deleted_at", null);

      if (search.name) {
        query = query.eq("name", search.name);
      }
      if (search.email) {
        query = query.eq("email", search.email);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      return data ? { exists: true, vendor: data } : { exists: false, vendor: null };
    },
    enabled: options?.enabled !== false && (!!search.name || !!search.email),
  });
}

// Create vendor mutation
export function useCreateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.createVendor,
    mutationFn: async (vendorData: Omit<Partial<Vendor>, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from("vendors")
        .insert({
          ...vendorData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: (data) => {
      // Invalidate and refetch vendor lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendors()
      });

      // Optimistically update the cache
      queryClient.setQueryData(
        queryKeys.vendor(data.id),
        data
      );

      toast.success("Vendor created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create vendor: ${error.message}`);
    },
  });
}

// Update vendor mutation
export function useUpdateVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateVendor,
    mutationFn: async ({
      id,
      updates
    }: {
      id: string;
      updates: Partial<Vendor>
    }) => {
      const { data, error } = await supabase
        .from("vendors")
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: queryKeys.vendor(id)
      });

      // Snapshot previous value
      const previousVendor = queryClient.getQueryData(
        queryKeys.vendor(id)
      );

      // Optimistically update
      queryClient.setQueryData(
        queryKeys.vendor(id),
        (old: Vendor | undefined) =>
          old ? { ...old, ...updates } : old
      );

      return { previousVendor };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousVendor) {
        queryClient.setQueryData(
          queryKeys.vendor(variables.id),
          context.previousVendor
        );
      }
      toast.error(`Failed to update vendor: ${error.message}`);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendors()
      });
      toast.success("Vendor updated successfully");
    },
  });
}

// Delete (soft delete) vendor mutation
export function useDeleteVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.deleteVendor,
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vendors")
        .update({
          deleted_at: new Date().toISOString(),
          status: 'inactive',
        })
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: queryKeys.vendor(id)
      });

      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: queryKeys.vendors()
      });

      toast.success("Vendor deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete vendor: ${error.message}`);
    },
  });
}

// Prefetch vendor data
export function usePrefetchVendor() {
  const queryClient = useQueryClient();

  return (vendorId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.vendor(vendorId),
      queryFn: async () => {
        const { data, error } = await supabase
          .from("vendors")
          .select(`
            *,
            contracts:contracts(
              id,
              title,
              status,
              start_date,
              end_date,
              value
            )
          `)
          .eq("id", vendorId)
          .is("deleted_at", null)
          .single();

        if (error) throw error;
        return data;
      },
    });
  };
}

// Get vendor statistics
export function useVendorStats(enterpriseId: Id<"enterprises">) {
  return useQuery({
    queryKey: ['vendor-stats', enterpriseId],
    queryFn: async () => {
      // Get total counts
      const [activeResult, inactiveResult, totalResult] = await Promise.all([
        supabase
          .from("vendors")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .eq("status", "active")
          .is("deleted_at", null),
        supabase
          .from("vendors")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .eq("status", "inactive")
          .is("deleted_at", null),
        supabase
          .from("vendors")
          .select("id", { count: "exact", head: true })
          .eq("enterprise_id", enterpriseId)
          .is("deleted_at", null),
      ]);

      if (activeResult.error) throw activeResult.error;
      if (inactiveResult.error) throw inactiveResult.error;
      if (totalResult.error) throw totalResult.error;

      return {
        total: totalResult.count ?? 0,
        active: activeResult.count ?? 0,
        inactive: inactiveResult.count ?? 0,
        pending: 0, // Can add similar query for pending
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
