'use client'

import { Search, FileText, Eye, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";

import { NewContractButton } from "@/app/_components/contracts/NewContractButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner, SkeletonStats, SkeletonTable } from "@/components/ui/loading-spinner";
import { useContracts } from "@/hooks/useContracts";
import { useDashboardStore } from "@/stores/dashboard-store";

const PendingContracts = () => {
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const { contracts, isLoading, error } = useContracts({
    status: 'pending_analysis',
    orderBy: 'created_at',
    ascending: false,
    realtime: true
  });

  const filteredContracts = useMemo(() => {
    if (!Array.isArray(contracts)) return [];
    if (!searchQuery) return contracts;

    const query = searchQuery.toLowerCase();
    return contracts.filter((contract) =>
      contract.title?.toLowerCase().includes(query) ||
      (contract.vendors && 'name' in contract.vendors &&
        contract.vendors.name?.toLowerCase().includes(query))
    );
  }, [contracts, searchQuery]);

  const stats = useMemo(() => {
    if (!Array.isArray(contracts)) return { total: 0, processing: 0, failed: 0, recent: 0 };

    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    return {
      total: contracts.length,
      processing: contracts.filter(c => c.analysis_status === 'processing').length,
      failed: contracts.filter(c => c.analysis_status === 'failed').length,
      recent: contracts.filter(c => c.created_at && new Date(c.created_at) > twoDaysAgo).length
    };
  }, [contracts]);

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return "Not set";
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="space-y-8 p-6 animate-fade-in min-h-screen" style={{ backgroundColor: '#f0eff4' }}>
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-900">Pending Analysis</h2>
          <NewContractButton />
        </div>
        <SkeletonStats />
        <SkeletonTable rows={8} />
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" showText text="Loading pending contracts..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-red-600">Error loading contracts: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" style={{ backgroundColor: '#f0eff4' }}>
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-gray-900">Pending Analysis</h2>
        <NewContractButton />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.processing}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recently Added</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{stats.recent}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 2 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center space-x-4 p-6 bg-card/30 backdrop-blur-sm rounded-xl border border-border/50">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pending contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-white border-border/50 focus:border-primary/50"
          />
        </div>
      </div>

      <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-elegant overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-muted/50 to-muted/30 border-b border-border/50">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contract</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Analysis Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => (
                  <tr
                    key={contract.id}
                    className="group cursor-pointer transition-all duration-200 hover:bg-accent/30"
                    onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
                  >
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center group">
                        <FileText className="h-5 w-5 text-muted-foreground mr-3" />
                        <div>
                          <div className="font-semibold text-gray-900">{contract.title || 'Untitled'}</div>
                          <div className="text-xs text-muted-foreground mt-1">{contract.file_name || 'No file'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="font-medium text-foreground">
                        {contract.vendors && typeof contract.vendors === 'object' && 'name' in contract.vendors
                          ? contract.vendors.name
                          : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {contract.analysis_status ? (
                        <Badge className={
                          contract.analysis_status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          contract.analysis_status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }>
                          {contract.analysis_status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                        <span className="text-sm text-foreground">{formatDate(contract.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-all"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/contracts/${contract.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                    <div className="text-muted-foreground">
                      {searchQuery ? "No contracts found matching your criteria" : "No contracts pending analysis"}
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

export default PendingContracts;