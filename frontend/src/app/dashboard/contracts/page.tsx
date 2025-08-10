'use client'

import React, { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

import { NewContractButton } from "@/app/_components/contracts/NewContractButton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Eye, FileText, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useStaggeredAnimation, useEntranceAnimation } from "@/hooks/useAnimations";
import { LoadingSpinner, SkeletonStats, SkeletonTable } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";

// Import simplified hooks
// import { api } from "../../../../convex/_generated/api";

import { useDashboardStore } from "@/stores/dashboard-store";
import { ContractType } from "@/types/contract.types";
// import { Id } from "../../../../convex/_generated/dataModel";

const AllContracts = () => {
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Animation hooks
  const isVisible = useEntranceAnimation(100);
  const isStatsVisible = useStaggeredAnimation(4, 100);

  // All useCallback hooks must be declared before any conditional returns
  const viewContractDetails = useCallback((contractId: Id<"contracts">) => {
    router.push(`/dashboard/contracts/${contractId}`);
  }, [router]);

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
  const formatDate = useCallback((dateString?: string): string => {
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
  // const userContext = useQuery(api.users.getUserContext, {});
  const userContext = null;

  // Get contracts for the current user's enterprise  
  // const contractsData = useQuery(
  //   api.contracts.getContracts,
  //   userContext?.enterprise?._id ? { enterpriseId: userContext.enterprise._id } : "skip"
  // );
  const contractsData = null;

  // Extract contracts array from the result
  const contracts = contractsData?.contracts || [];

  // Use a combined loading state
  const isLoading = isLoadingUser || isLoadingContracts;

  // Filter contracts based on search and status
  const filteredContracts = useMemo(() => {
    // Ensure contracts is an array before filtering
    if (!Array.isArray(contracts)) return [];

    return contracts.filter((contract) => {
      // Filter by status if not "all"
      const matchesStatus = statusFilter === "all" || contract.status === statusFilter;
      if (!matchesStatus) return false;
      
      // Apply search filter
      if (!searchQuery) return true;

      const query = searchQuery.toLowerCase();
      return (
        contract.title?.toLowerCase().includes(query) ||
        contract.fileName?.toLowerCase().includes(query) ||
        (contract.extractedParties && 
          contract.extractedParties.some(party => 
            party.toLowerCase().includes(query)
          ))
      );
    });
  }, [contracts, searchQuery, statusFilter]);

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
      <div className="space-y-8 p-6 animate-fade-in">
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
      "space-y-8 p-6",
      isVisible && "animate-fade-in"
    )}>
      {/* Header with Stats */}
      <div className={cn(
        "flex justify-between items-center",
        isVisible && "animate-slide-in-top"
      )}>
        <div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            All Contracts
          </h2>
          <p className="text-muted-foreground mt-1">Manage and track your contract portfolio</p>
        </div>
        <div className="flex gap-2 animate-bounce-in" style={{ animationDelay: '200ms' }}>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/contracts/templates')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </Button>
          <NewContractButton />
        </div>
      </div>

      {/* Contract Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card 
          className={cn(
            "group hover:shadow-2xl hover:shadow-primary/10",
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
            "group hover:shadow-2xl hover:shadow-green-500/10",
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
            "group hover:shadow-2xl hover:shadow-yellow-500/10",
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
            "group hover:shadow-2xl hover:shadow-blue-500/10",
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
        "flex items-center space-x-4 p-6 bg-card/30 backdrop-blur-sm rounded-xl border border-border/50",
        "animate-slide-in-bottom"
      )} style={{ animationDelay: '500ms' }}>
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground transition-colors duration-200 group-focus-within:text-primary" />
          <Input
            placeholder="Search contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-background/50 border-border/50 focus:border-primary/50 focus:bg-background transition-all duration-200"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px] h-11 bg-background/50 border-border/50 hover:border-primary/50 transition-all duration-200">
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
      </div>

      {/* Contracts Table */}
      <div className={cn(
        "bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-elegant overflow-hidden",
        "animate-slide-in-bottom"
      )} style={{ animationDelay: '600ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contract</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Analysis Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">End Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract, index) => {
                  // Get vendor information (assuming we have loaded vendor data)
                  const vendor = contract.vendor || { name: 'N/A' };
                  
                  return (
                    <tr
                      key={contract._id}
                      className={cn(
                        "group cursor-pointer transition-all duration-200 ease-out",
                        "hover:bg-accent/30 hover:shadow-md hover:-translate-y-0.5",
                        "animate-fade-in-up"
                      )}
                      style={{ animationDelay: `${700 + index * 50}ms` }}
                      onClick={() => viewContractDetails(contract._id)}
                    >
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center group">
                          <FileText className="h-5 w-5 text-muted-foreground mr-3 flex-shrink-0 group-hover:text-primary transition-colors duration-200" />
                          <div>
                            <div className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200 truncate" title={contract.title}>
                              {contract.title || 'Untitled'}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">{contract.fileName || 'No file'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="font-medium text-foreground">{vendor.name}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <Badge className={cn(
                          `${getStatusBadgeClass(contract.status)} font-medium`,
                          "transition-all duration-200 group-hover:scale-105"
                        )}>
                          {formatStatusLabel(contract.status)}
                        </Badge>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {contract.analysisStatus ? (
                          <Badge className={cn(
                            contract.analysisStatus === 'completed' ? 'bg-green-100 text-green-800' :
                            contract.analysisStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                            contract.analysisStatus === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800',
                            "transition-all duration-200 group-hover:scale-105"
                          )}>
                            {formatStatusLabel(contract.analysisStatus)}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not analyzed</span>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm text-foreground">{formatDate(contract.extractedStartDate)}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm text-foreground">{formatDate(contract.extractedEndDate)}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent row click when clicking button
                            viewContractDetails(contract._id);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
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
                        {searchQuery || statusFilter !== 'all' ? "No contracts found matching your criteria" : "No contracts found"}
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