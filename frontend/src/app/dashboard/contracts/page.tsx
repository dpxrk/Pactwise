'use client'

import { Search, Eye, FileText, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from "lucide-react";
import dynamic from 'next/dynamic';
import { useRouter } from "next/navigation";
import React, { useMemo, useState, useCallback, Suspense } from "react";

// Dynamic imports for heavy components
const NewContractButton = dynamic(() => import("@/app/_components/contracts/NewContractButton").then(mod => ({ default: mod.NewContractButton })), {
  loading: () => <button className="border border-ghost-300 bg-purple-900 text-white px-4 py-2 font-mono text-xs font-semibold opacity-50">LOADING...</button>,
  ssr: false
});

const TemplatesExplorerModal = dynamic(() => import("@/app/_components/contracts/TemplatesExplorerModal").then(mod => ({ default: mod.TemplatesExplorerModal })), {
  ssr: false
});
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingSpinner, SkeletonStats, SkeletonTable } from "@/components/ui/loading-spinner";
import { useStaggeredAnimation, useEntranceAnimation } from "@/hooks/useAnimations";
import { cn } from "@/lib/utils";

// Import data hooks
import { useAuth } from "@/contexts/AuthContext";
import { useContracts } from "@/hooks/useContracts";
import { useVendors } from "@/hooks/useVendors";
import { useDashboardStore } from "@/stores/dashboard-store";
import { ContractType } from "@/types/contract.types";
import type { Id } from '@/types/id.types';

type SortField = 'vendor' | 'start_date' | 'end_date' | null;
type SortOrder = 'asc' | 'desc';

const AllContracts = () => {
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);

  // Animation hooks
  const isVisible = useEntranceAnimation(100);
  const isStatsVisible = useStaggeredAnimation(4, 100);

  // All useCallback hooks must be declared before any conditional returns
  const viewContractDetails = useCallback((contractId: string) => {
    router.push(`/dashboard/contracts/${contractId}`);
  }, [router]);

  const viewVendorDetails = useCallback((vendorId: string) => {
    router.push(`/dashboard/vendors/${vendorId}`);
  }, [router]);

  // Handle column sort
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortOrder('asc');
    }
  }, [sortField, sortOrder]);

  // Map status to badge style
  const getStatusBadgeClass = useCallback((status: string): string => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800";
      case "pending_analysis": return "bg-yellow-100 text-yellow-800";
      case "draft": return "bg-blue-100 text-blue-800";
      case "expired": return "bg-red-100 text-red-800";
      case "terminated": return "bg-orange-100 text-orange-800";
      case "archived": return "bg-gray-100 text-gray-800";
      default: return "bg-slate-100 text-slate-800";
    }
  }, []);

  // Format date for display
  const formatDate = useCallback((dateString?: string | null): string => {
    if (!dateString) return "Not available";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
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
  
  // Get contracts for the current user's enterprise
  const { contracts, isLoading: isContractsLoading, error: contractsError, refetch } = useContracts({
    orderBy: 'created_at',
    ascending: false,
    realtime: true
  });

  // Get vendors for filter dropdown
  const { vendors } = useVendors({
    orderBy: 'name',
    ascending: true
  });

  // Use a combined loading state
  const isLoading = isAuthLoading || isContractsLoading;
  const userError = !userProfile && !isAuthLoading ? new Error('User not authenticated') : null;

  // Filter and sort contracts based on search, status, vendor, and sorting
  const filteredContracts = useMemo(() => {
    // Ensure contracts is an array before filtering
    if (!Array.isArray(contracts)) return [];

    let filtered = contracts.filter((contract) => {
      // Filter by status if not "all"
      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
      if (!matchesStatus) return false;

      // Filter by vendor if not "all"
      const matchesVendor = vendorFilter === "all" || contract.vendor_id === vendorFilter;
      if (!matchesVendor) return false;

      // Apply search filter
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      return (
        contract.title?.toLowerCase().includes(query) ||
        contract.description?.toLowerCase().includes(query) ||
        (contract.vendors && 'name' in contract.vendors &&
          contract.vendors.name?.toLowerCase().includes(query))
      );
    });

    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number | null = null;
        let bValue: string | number | null = null;

        if (sortField === 'vendor') {
          aValue = (a.vendors && typeof a.vendors === 'object' && 'name' in a.vendors ? a.vendors.name : '') || '';
          bValue = (b.vendors && typeof b.vendors === 'object' && 'name' in b.vendors ? b.vendors.name : '') || '';
        } else if (sortField === 'start_date') {
          aValue = a.start_date ? new Date(a.start_date).getTime() : 0;
          bValue = b.start_date ? new Date(b.start_date).getTime() : 0;
        } else if (sortField === 'end_date') {
          aValue = a.end_date ? new Date(a.end_date).getTime() : 0;
          bValue = b.end_date ? new Date(b.end_date).getTime() : 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortOrder === 'asc'
            ? aValue - bValue
            : bValue - aValue;
        }
        return 0;
      });
    }

    return filtered;
  }, [contracts, searchQuery, statusFilter, vendorFilter, sortField, sortOrder]);

  // Calculate contract statistics
  const stats = useMemo(() => {
    // Ensure contracts is an array
    if (!Array.isArray(contracts)) return {
      total: 0, 
      activeCount: 0, 
      pendingCount: 0, 
      draftCount: 0,
    };

    return {
      total: contracts.length,
      activeCount: contracts.filter((c) => c.status === "active").length,
      pendingCount: contracts.filter((c) => c.status === "pending_analysis").length,
      draftCount: contracts.filter((c) => c.status === "draft").length,
    };
  }, [contracts]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-ghost-100">
        <div className="border-b border-ghost-300 bg-white px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-ghost-400 animate-pulse" />
                <span className="font-mono text-xs text-ghost-700">LOADING...</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size="lg" showText text="Loading contracts..." />
        </div>
      </div>
    );
  }

  // Handle error state
  if (contractsError || userError) {
    const error = contractsError || userError;
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Contracts</AlertTitle>
        <AlertDescription>
          {error?.message || "An error occurred while loading contracts"}
          <pre className="mt-2 text-xs">Please try refreshing the page.</pre>
        </AlertDescription>
      </Alert>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border border-ghost-300 bg-white pl-9 pr-4 py-2 font-mono text-xs placeholder:text-ghost-400 focus:outline-none focus:border-purple-900 w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
              value={vendorFilter}
              onChange={(e) => setVendorFilter(e.target.value)}
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

        {/* Main Data Panel */}
        <div className="border border-ghost-300 bg-white">
          <div className="border-b border-ghost-300 px-4 py-3 flex items-center justify-between">
            <h3 className="font-mono text-xs uppercase tracking-wider text-ghost-700">
              ALL CONTRACTS ({filteredContracts.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-mono text-xs">
              <thead>
                <tr className="border-b border-ghost-300 bg-ghost-700">
                  <th className="px-4 py-2 text-left font-normal text-white">ID</th>
                  <th className="px-4 py-2 text-left font-normal text-white">TITLE</th>
                  <th className="px-4 py-2 text-left font-normal text-white">
                    <button
                      onClick={() => handleSort('vendor')}
                      className="flex items-center gap-1 hover:text-purple-300"
                    >
                      VENDOR
                      {sortField === 'vendor' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left font-normal text-white">STATUS</th>
                  <th className="px-4 py-2 text-left font-normal text-white">
                    <button
                      onClick={() => handleSort('start_date')}
                      className="flex items-center gap-1 hover:text-purple-300"
                    >
                      START
                      {sortField === 'start_date' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left font-normal text-white">
                    <button
                      onClick={() => handleSort('end_date')}
                      className="flex items-center gap-1 hover:text-purple-300"
                    >
                      END
                      {sortField === 'end_date' ? (
                        sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                      ) : (
                        <ArrowUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-2 text-right font-normal text-white">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ghost-200">
                {filteredContracts.length > 0 ? (
                  filteredContracts.map((contract) => {
                    const vendor = contract.vendors || { name: 'N/A' };
                    const contractId = contract.id.substring(0, 8).toUpperCase();

                    return (
                      <tr
                        key={contract.id}
                        className="hover:bg-purple-50 transition-colors cursor-pointer"
                      >
                        <td className="px-4 py-2.5 text-purple-900">{contractId}</td>
                        <td className="px-4 py-2.5 text-ghost-900">
                          <div
                            onClick={() => viewContractDetails(contract.id)}
                            className="hover:text-purple-900 hover:underline cursor-pointer"
                          >
                            {contract.title || 'Untitled'}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-ghost-700">
                          {vendor && typeof vendor === 'object' && 'name' in vendor && contract.vendor_id ? (
                            <span
                              className="cursor-pointer hover:text-purple-900 hover:underline"
                              onClick={() => viewVendorDetails(contract.vendor_id as string)}
                            >
                              {vendor.name}
                            </span>
                          ) : (
                            <span>N/A</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`px-2 py-0.5 text-[10px] uppercase ${
                              contract.status === 'active'
                                ? 'bg-green-50 text-green-700 border border-green-200'
                                : contract.status === 'pending_analysis'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : contract.status === 'draft'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : contract.status === 'expired'
                                ? 'bg-red-50 text-red-700 border border-red-200'
                                : 'bg-ghost-50 text-ghost-700 border border-ghost-200'
                            }`}
                          >
                            {formatStatusLabel(contract.status)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-ghost-900">{formatDate(contract.start_date)}</td>
                        <td className="px-4 py-2.5 text-ghost-900">{formatDate(contract.end_date)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewContractDetails(contract.id);
                            }}
                            className="border border-ghost-300 bg-white px-3 py-1 text-[10px] text-ghost-700 hover:bg-ghost-50 hover:border-purple-900 uppercase"
                          >
                            <Eye className="h-3 w-3 inline mr-1" />
                            VIEW
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center space-y-3">
                        <FileText className="h-12 w-12 text-ghost-400" />
                        <div className="font-mono text-xs text-ghost-600 uppercase">
                          {searchQuery || statusFilter !== 'all' ? "NO CONTRACTS FOUND" : "NO CONTRACTS AVAILABLE"}
                        </div>
                        {(!searchQuery && statusFilter === 'all') && (
                          <NewContractButton onContractCreated={refetch} />
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
