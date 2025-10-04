'use client'

import { Search, Eye, FileText, Calendar, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState, useCallback } from "react";

import { NewContractButton } from "@/app/_components/contracts/NewContractButton";
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
      <div className="space-y-8 p-6 animate-fade-in min-h-screen" style={{ backgroundColor: '#f0eff4' }}>
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              All Contracts
            </h2>
            <p className="text-muted-foreground mt-1">Manage and track your contract portfolio</p>
          </div>
          <NewContractButton />
        </div>

        {/* Loading Stats */}
        <SkeletonStats />

        {/* Loading Filters */}
        <div className="p-6 bg-card/30 backdrop-blur-sm rounded-xl border border-border/50">
          <div className="flex items-center space-x-4">
            <div className="flex-1 h-11 bg-muted/30 rounded animate-pulse"></div>
            <div className="w-[200px] h-11 bg-muted/30 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Loading Table */}
        <SkeletonTable rows={8} />
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center py-8">
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
    <div className={cn(
      "space-y-4 sm:space-y-6 lg:space-y-8 p-4 sm:p-6 min-h-screen",
      isVisible && "animate-fade-in"
    )} style={{ backgroundColor: '#f0eff4' }}>
      {/* Header with Stats */}
      <div className={cn(
        "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
        isVisible && "animate-slide-in-top"
      )}>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            All Contracts
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage and track your contract portfolio</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto animate-bounce-in" style={{ animationDelay: '200ms' }}>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/contracts/templates')}
            className="flex-1 sm:flex-none"
          >
            <FileText className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Templates</span>
          </Button>
          <NewContractButton />
        </div>
      </div>

      {/* Contract Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card 
          className={cn(
            "group hover:shadow-2xl hover:shadow-primary/10 bg-white",
            isStatsVisible(0) && "animate-zoom-in"
          )}
          style={{ animationDelay: '100ms' }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform duration-200">
              {stats.total}
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "group hover:shadow-2xl hover:shadow-green-500/10 bg-white",
            isStatsVisible(1) && "animate-zoom-in"
          )}
          style={{ animationDelay: '200ms' }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 group-hover:scale-110 transition-transform duration-200">
              {stats.activeCount}
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "group hover:shadow-2xl hover:shadow-yellow-500/10 bg-white",
            isStatsVisible(2) && "animate-zoom-in"
          )}
          style={{ animationDelay: '300ms' }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600 group-hover:scale-110 transition-transform duration-200">
              {stats.pendingCount}
            </div>
          </CardContent>
        </Card>
        
        <Card 
          className={cn(
            "group hover:shadow-2xl hover:shadow-blue-500/10 bg-white",
            isStatsVisible(3) && "animate-zoom-in"
          )}
          style={{ animationDelay: '400ms' }}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 group-hover:scale-110 transition-transform duration-200">
              {stats.draftCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className={cn(
        "flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-card/30 backdrop-blur-sm rounded-xl border border-border/50",
        "animate-slide-in-bottom"
      )} style={{ animationDelay: '500ms' }}>
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-2.5 sm:top-2.5 h-4 w-4 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
          <Input
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 sm:h-11 bg-white border-border/50 focus:border-primary/50 transition-all duration-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px] lg:w-[200px] h-10 sm:h-11 bg-background/50 border-border/50 hover:border-primary/50 transition-all duration-200">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="bg-card/95 backdrop-blur-sm border-border/50">
            <SelectItem value="all" className="hover:bg-accent/50">All Statuses</SelectItem>
            <SelectItem value="draft" className="hover:bg-accent/50">Draft</SelectItem>
            <SelectItem value="pending_analysis" className="hover:bg-accent/50">Pending Analysis</SelectItem>
            <SelectItem value="active" className="hover:bg-accent/50">Active</SelectItem>
            <SelectItem value="expired" className="hover:bg-accent/50">Expired</SelectItem>
            <SelectItem value="terminated" className="hover:bg-accent/50">Terminated</SelectItem>
            <SelectItem value="archived" className="hover:bg-accent/50">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Select value={vendorFilter} onValueChange={setVendorFilter}>
          <SelectTrigger className="w-full sm:w-[180px] lg:w-[200px] h-10 sm:h-11 bg-background/50 border-border/50 hover:border-primary/50 transition-all duration-200">
            <SelectValue placeholder="Filter by vendor" />
          </SelectTrigger>
          <SelectContent className="bg-card/95 backdrop-blur-sm border-border/50">
            <SelectItem value="all" className="hover:bg-accent/50">All Vendors</SelectItem>
            {vendors && vendors.map((vendor) => (
              <SelectItem key={vendor.id} value={vendor.id} className="hover:bg-accent/50">
                {vendor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Contracts Table */}
      <div className={cn(
        "bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-elegant overflow-hidden",
        "animate-slide-in-bottom"
      )} style={{ animationDelay: '600ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Contract</th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  <button
                    onClick={() => handleSort('vendor')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors duration-200"
                  >
                    Vendor
                    {sortField === 'vendor' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                <th className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Analysis Status</th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  <button
                    onClick={() => handleSort('start_date')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors duration-200"
                  >
                    Start Date
                    {sortField === 'start_date' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  <button
                    onClick={() => handleSort('end_date')}
                    className="flex items-center gap-1 hover:text-gray-900 transition-colors duration-200"
                  >
                    End Date
                    {sortField === 'end_date' ? (
                      sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-50" />
                    )}
                  </button>
                </th>
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract, index) => {
                  // Get vendor information from the joined data
                  const vendor = contract.vendors || { name: 'N/A' };
                  
                  return (
                    <tr
                      key={contract.id}
                      className={cn(
                        "group transition-all duration-200 ease-out",
                        "hover:shadow-sm",
                        "animate-fade-in-up"
                      )}
                      style={{ animationDelay: `${700 + index * 50}ms` }}
                    >
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
                        <div className="flex items-center group/title">
                          <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mr-2 sm:mr-3 flex-shrink-0 group-hover/title:text-primary transition-colors duration-200" />
                          <div
                            className="cursor-pointer min-w-0"
                            onClick={() => viewContractDetails(contract.id)}
                          >
                            <div className="font-semibold text-sm sm:text-base text-gray-900 group-hover/title:text-primary transition-colors duration-200 truncate hover:underline" title={contract.title}>
                              {contract.title || 'Untitled'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5 sm:mt-1 truncate">{contract.file_name || 'No file'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 whitespace-nowrap">
                        {vendor && typeof vendor === 'object' && 'name' in vendor && contract.vendor_id ? (
                          <span
                            className="font-medium text-sm sm:text-base text-gray-900 cursor-pointer hover:text-primary hover:underline transition-colors duration-200"
                            onClick={() => viewVendorDetails(contract.vendor_id as string)}
                          >
                            {vendor.name}
                          </span>
                        ) : (
                          <span className="font-medium text-sm sm:text-base text-gray-500">N/A</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 whitespace-nowrap">
                        <Badge className={cn(
                          `${getStatusBadgeClass(contract.status)} font-medium text-xs`,
                          "transition-all duration-200 group-hover:scale-105"
                        )}>
                          {formatStatusLabel(contract.status)}
                        </Badge>
                      </td>
                      <td className="hidden lg:table-cell px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 whitespace-nowrap">
                        {contract.analysis_status ? (
                          <Badge className={cn(
                            contract.analysis_status === 'completed' ? 'bg-green-100 text-green-800' :
                            contract.analysis_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                            contract.analysis_status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800',
                            "transition-all duration-200 group-hover:scale-105 text-xs"
                          )}>
                            {formatStatusLabel(contract.analysis_status)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not analyzed</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 whitespace-nowrap">
                        <span className="text-xs sm:text-sm text-gray-900 font-medium">{formatDate(contract.start_date)}</span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 whitespace-nowrap">
                        <span className="text-xs sm:text-sm text-gray-900 font-medium">{formatDate(contract.end_date)}</span>
                      </td>
                      <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5 whitespace-nowrap text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="!text-gray-900 border-gray-300 hover:bg-gray-100 hover:border-gray-400 transition-all duration-200"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click when clicking button
                            viewContractDetails(contract.id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2 !text-gray-900" />
                          <span className="!text-gray-900 font-medium">View</span>
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <FileText className="h-12 w-12 text-muted-foreground/50" />
                      <div className="text-muted-foreground">
                        {searchQuery || statusFilter !== 'all' ? "No contracts found matching your criteria" : "You need to add contracts to get started"}
                      </div>
                      {(!searchQuery && statusFilter === 'all') && (
                        <NewContractButton />
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
  );
};

export default AllContracts;
