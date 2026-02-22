'use client'

import { useQueryClient } from "@tanstack/react-query";
import { Search, Eye, FileText } from "lucide-react";
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import React, { useMemo, useState, useCallback, useEffect, CSSProperties } from "react";

// Dynamic imports for heavy components
const NewContractButton = dynamic(() => import("@/app/_components/contracts/NewContractButton").then(mod => ({ default: mod.NewContractButton })), {
  loading: () => <button className="border border-ghost-300 bg-purple-900 text-white px-4 py-2 font-mono text-xs font-semibold opacity-50">LOADING...</button>,
  ssr: false
});

const TemplatesExplorerModal = dynamic(() => import("@/app/_components/contracts/TemplatesExplorerModal").then(mod => ({ default: mod.TemplatesExplorerModal })), {
  ssr: false
});

import { InfiniteVirtualList } from "@/components/performance/VirtualList";
import { SkeletonLoader } from "@/components/loading";
import { BannerError } from "@/components/errors";
import { EmptyState } from "@/components/empty-states";
// Import data hooks
import { useAuth } from "@/contexts/AuthContext";
import { useContractInfiniteList } from "@/hooks/queries/useContracts";
import { useVendors } from "@/hooks/useVendors";
import { queryKeys } from "@/lib/react-query-config";
import { cn } from "@/lib/utils";
import type { Tables } from "@/types/database.types";
import { createClient } from "@/utils/supabase/client";

// Use database types for contracts
type ContractWithVendor = Tables<'contracts'> & { vendor: Tables<'vendors'> | null };

const AllContracts = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const supabase = createClient();

  // Get URL parameters for filters
  const statusParam = searchParams.get('status') || 'all';
  const vendorParam = searchParams.get('vendor') || 'all';
  const searchParam = searchParams.get('search') || '';

  // Local state for controlled inputs (synced with URL)
  const [searchInput, setSearchInput] = useState(searchParam);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  // Debounce search input updates to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== searchParam) {
        updateFilters({ search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync search input when URL changes (browser back/forward)
  useEffect(() => {
    setSearchInput(searchParam);
  }, [searchParam]);

  // Update URL with new filter values
  const updateFilters = useCallback((newFilters: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '') {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  // All useCallback hooks must be declared before any conditional returns
  const viewContractDetails = useCallback((contractId: string) => {
    router.push(`/dashboard/contracts/${contractId}`);
  }, [router]);

  const viewVendorDetails = useCallback((vendorId: string) => {
    router.push(`/dashboard/vendors/${vendorId}`);
  }, [router]);

  // Format date for display
  const formatDate = useCallback((dateString?: string | null): string => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (_e) {
      return "Invalid date";
    }
  }, []);

  // Format status label
  const formatStatusLabel = useCallback((status: string): string => {
    if (!status) return "Unknown";
    return status.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  }, []);

  // Get current user context to obtain enterprise ID
  const { userProfile, isLoading: isAuthLoading } = useAuth();

  // Get contracts using infinite scroll hook
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isContractsLoading,
    error: contractsError,
    refetch
  } = useContractInfiniteList(
    userProfile?.enterprise_id || '',
    {
      status: statusParam !== 'all' ? statusParam : undefined,
      search: searchParam || undefined,
    },
    20 // page size
  );

  // Get vendors for filter dropdown
  const { vendors } = useVendors({
    orderBy: 'name',
    ascending: true
  });

  // Real-time subscription with query invalidation
  useEffect(() => {
    if (!userProfile?.enterprise_id) return;

    const channel = supabase
      .channel('contracts-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
          filter: `enterprise_id=eq.${userProfile.enterprise_id}`,
        },
        () => {
          // Invalidate the infinite query to refetch
          queryClient.invalidateQueries({
            queryKey: queryKeys.contractInfinite({
              enterpriseId: userProfile.enterprise_id,
              status: statusParam !== 'all' ? statusParam : undefined,
              search: searchParam || undefined,
            }),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile?.enterprise_id, statusParam, searchParam, queryClient, supabase]);

  // Flatten pages into single array for virtual list
  const contracts = useMemo(() => {
    return data?.pages.flatMap(page => page.contracts) ?? [];
  }, [data]);

  // Calculate total count from first page
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // Use a combined loading state
  const isLoading = isAuthLoading || isContractsLoading;
  const userError = !userProfile && !isAuthLoading ? new Error('User not authenticated') : null;

  // Filter contracts by vendor (client-side for now since backend doesn't support vendor filter)
  const filteredContracts = useMemo(() => {
    if (vendorParam === 'all') return contracts;
    return contracts.filter(contract => contract.vendor_id === vendorParam);
  }, [contracts, vendorParam]);

  // Calculate contract statistics
  const stats = useMemo(() => {
    if (!Array.isArray(contracts)) return {
      total: 0,
      activeCount: 0,
      pendingCount: 0,
      draftCount: 0,
    };

    return {
      total: totalCount,
      activeCount: contracts.filter((c) => c.status === "active").length,
      pendingCount: contracts.filter((c) => c.status === "pending_analysis").length,
      draftCount: contracts.filter((c) => c.status === "draft").length,
    };
  }, [contracts, totalCount]);

  // Render a single contract row
  const renderContractRow = useCallback((contract: ContractWithVendor, index: number, style: CSSProperties) => {
    const vendor = contract.vendor || { name: 'N/A' };
    const contractId = contract.id.substring(0, 8).toUpperCase();

    return (
      <div
        style={style}
        className="flex items-center border-b border-ghost-200 hover:bg-purple-50 transition-colors cursor-pointer px-4"
      >
        <div className="w-24 py-2.5 font-mono text-xs text-purple-900 flex-shrink-0">{contractId}</div>
        <div className="flex-1 min-w-0 py-2.5 px-4">
          <div
            onClick={() => viewContractDetails(contract.id)}
            className="hover:text-purple-900 hover:underline cursor-pointer truncate font-mono text-xs text-ghost-900"
          >
            {contract.title || 'Untitled'}
          </div>
        </div>
        <div className="w-48 py-2.5 px-4 flex-shrink-0">
          {vendor && typeof vendor === 'object' && 'name' in vendor && contract.vendor_id ? (
            <span
              className="cursor-pointer hover:text-purple-900 hover:underline font-mono text-xs text-ghost-700"
              onClick={() => viewVendorDetails(contract.vendor_id as string)}
            >
              {vendor.name}
            </span>
          ) : (
            <span className="font-mono text-xs text-ghost-700">N/A</span>
          )}
        </div>
        <div className="w-32 py-2.5 px-4 flex-shrink-0">
          <span
            className={cn(
              "px-2 py-0.5 text-[10px] uppercase font-mono",
              contract.status === 'active'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : contract.status === 'pending_analysis'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : contract.status === 'draft'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : contract.status === 'expired'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-ghost-50 text-ghost-700 border border-ghost-200'
            )}
          >
            {formatStatusLabel(contract.status || 'draft')}
          </span>
        </div>
        <div className="w-32 py-2.5 px-4 font-mono text-xs text-ghost-900 flex-shrink-0">{formatDate(contract.start_date)}</div>
        <div className="w-32 py-2.5 px-4 font-mono text-xs text-ghost-900 flex-shrink-0">{formatDate(contract.end_date)}</div>
        <div className="w-24 py-2.5 text-right flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              viewContractDetails(contract.id);
            }}
            className="border border-ghost-300 bg-white px-3 py-1 text-[10px] font-mono text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 uppercase"
          >
            <Eye className="h-3 w-3 inline mr-1" />
            VIEW
          </button>
        </div>
      </div>
    );
  }, [viewContractDetails, viewVendorDetails, formatDate, formatStatusLabel]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghost-100">
        <div className="border-b border-ghost-300 bg-white px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-ghost-400 animate-pulse" />
                <span className="font-mono text-xs text-ghost-700">CONTRACTS SYSTEM</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          <SkeletonLoader variant="stats" className="mb-6" />
          <SkeletonLoader variant="contract-list" count={8} />
        </div>
      </div>
    );
  }

  // Handle error state
  if (contractsError || userError) {
    const error = contractsError || userError;
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <BannerError
          severity="error"
          message="Error Loading Contracts"
          description={error?.message || "An error occurred while loading contracts"}
          action={{ label: 'Retry', onClick: () => refetch() }}
          dismissible
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700">CONTRACTS SYSTEM</span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">TOTAL:</span>
              <span className="font-semibold text-purple-900">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">ACTIVE:</span>
              <span className="font-semibold text-purple-900">{stats.activeCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600">PENDING:</span>
              <span className="font-semibold text-purple-900">{stats.pendingCount}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-ghost-400" />
              <input
                type="text"
                placeholder="SEARCH CONTRACTS..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="border border-ghost-300 bg-white pl-9 pr-4 py-2 font-mono text-xs placeholder:text-ghost-400 focus:outline-none focus:border-purple-900 w-64"
              />
            </div>
            <select
              value={statusParam}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 focus:outline-none focus:border-purple-900"
            >
              <option value="all">ALL STATUSES</option>
              <option value="active">ACTIVE</option>
              <option value="draft">DRAFT</option>
              <option value="pending_analysis">PENDING</option>
              <option value="expired">EXPIRED</option>
              <option value="terminated">TERMINATED</option>
              <option value="archived">ARCHIVED</option>
            </select>
            <select
              value={vendorParam}
              onChange={(e) => updateFilters({ vendor: e.target.value })}
              className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 focus:outline-none focus:border-purple-900"
            >
              <option value="all">ALL VENDORS</option>
              {vendors && vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTemplatesModalOpen(true)}
              className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 flex items-center gap-2"
            >
              <FileText className="h-3 w-3" />
              TEMPLATES
            </button>
            <NewContractButton
              className="border border-ghost-300 bg-purple-900 text-white px-4 py-2 font-mono text-xs font-semibold hover:bg-purple-800 hover:border-purple-900 flex items-center gap-2"
              onContractCreated={refetch}
            />
          </div>
        </div>

        {/* Main Data Panel with Virtual Scroll */}
        <div className="border border-ghost-300 bg-white">
          <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
            <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
              ALL CONTRACTS ({filteredContracts.length})
            </h3>
          </div>

          {/* Table Header */}
          <div className="flex items-center border-b border-ghost-300 bg-ghost-700 font-mono text-xs text-white px-4 py-2">
            <div className="w-24 flex-shrink-0">ID</div>
            <div className="flex-1 min-w-0 px-4">TITLE</div>
            <div className="w-48 px-4 flex-shrink-0">VENDOR</div>
            <div className="w-32 px-4 flex-shrink-0">STATUS</div>
            <div className="w-32 px-4 flex-shrink-0">START</div>
            <div className="w-32 px-4 flex-shrink-0">END</div>
            <div className="w-24 text-right flex-shrink-0">ACTION</div>
          </div>

          {/* Virtual Scrollable Table Body */}
          {filteredContracts.length > 0 ? (
            <div className="h-[600px]">
              <InfiniteVirtualList
                items={filteredContracts}
                itemHeight={44} // Height of each row
                hasMore={hasNextPage ?? false}
                isLoading={isFetchingNextPage}
                loadMore={fetchNextPage}
                renderItem={renderContractRow}
                overscan={5}
                loadingComponent={
                  <div className="flex items-center justify-center py-4 font-mono text-xs text-ghost-600">
                    <div className="animate-spin mr-2 h-3 w-3 border-2 border-purple-900 border-t-transparent rounded-full"></div>
                    LOADING MORE...
                  </div>
                }
              />
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="h-12 w-12 text-ghost-400" />}
              title={searchParam || statusParam !== 'all' ? "No Contracts Found" : "No Contracts Available"}
              description={
                searchParam || statusParam !== 'all'
                  ? "Try adjusting your search or filter criteria"
                  : "Get started by creating your first contract"
              }
              primaryAction={
                !searchParam && statusParam === 'all'
                  ? { label: 'Create Contract', onClick: () => document.querySelector<HTMLButtonElement>('[data-new-contract]')?.click() }
                  : undefined
              }
            />
          )}
        </div>
      </div>

      {/* Templates Explorer Modal */}
      <TemplatesExplorerModal
        open={isTemplatesModalOpen}
        onOpenChange={setIsTemplatesModalOpen}
      />
    </div>
  );
};

export default AllContracts;
