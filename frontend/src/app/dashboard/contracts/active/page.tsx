'use client'

import { Search, FileText, Eye, Calendar, TrendingUp, AlertCircle, Filter, Download, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";

import { NewContractButton } from "@/app/_components/contracts/NewContractButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingSpinner, SkeletonStats, SkeletonTable } from "@/components/ui/loading-spinner";
import { useContracts } from "@/hooks/useContracts";
import { useDashboardStore } from "@/stores/dashboard-store";
import { cn } from "@/lib/utils";

const ActiveContracts = () => {
  const router = useRouter();
  const { searchQuery, setSearchQuery } = useDashboardStore();
  const { contracts, isLoading, error } = useContracts({
    status: 'active',
    orderBy: 'end_date',
    ascending: true,
    realtime: true
  });

  // Apply search filter
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

  // Calculate statistics
  const stats = useMemo(() => {
    if (!Array.isArray(contracts)) return { total: 0, totalValue: 0, expiringSoon: 0 };

    const totalValue = contracts.reduce((sum, c) => sum + (Number(c.value) || 0), 0);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringSoon = contracts.filter(c => {
      if (!c.end_date) return false;
      const endDate = new Date(c.end_date);
      // Only count as expiring soon if: in future AND within 30 days
      return endDate > now && endDate <= thirtyDaysFromNow;
    }).length;

    return {
      total: contracts.length,
      totalValue,
      expiringSoon
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
          <h2 className="text-3xl font-bold text-gray-900">Active Contracts</h2>
          <NewContractButton />
        </div>
        <SkeletonStats />
        <SkeletonTable rows={8} />
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" showText text="Loading active contracts..." />
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
    <div className="space-y-6 p-6 min-h-screen" style={{ backgroundColor: '#f7f5f0' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Active Contracts</h2>
          <p className="text-sm text-gray-600 mt-1">Manage and monitor your active contracts</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
          <NewContractButton />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Active</CardTitle>
              <div className="p-2 bg-green-50 rounded-lg">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
              <TrendingUp className="h-3 w-3" />
              <span>All contracts active</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
              <div className="p-2 bg-blue-50 rounded-lg">
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              ${stats.totalValue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-600 mt-2">Combined contract value</p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-600">Expiring Soon</CardTitle>
              <div className="p-2 bg-amber-50 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">{stats.expiringSoon}</div>
            <p className="text-xs text-gray-600 mt-2">Within 30 days</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by contract title or vendor name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 bg-white border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
            </div>
            <Button variant="outline" size="default" className="gap-2 whitespace-nowrap">
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contracts Table */}
      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Contract</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Value</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((contract) => {
                  // Calculate contract date status
                  const now = new Date();
                  const endDate = contract.end_date ? new Date(contract.end_date) : null;
                  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

                  const isExpired = endDate && endDate < now;
                  const isExpiringSoon = endDate && endDate > now && endDate <= thirtyDaysFromNow;

                  return (
                    <tr
                      key={contract.id}
                      className="group cursor-pointer transition-all duration-200 hover:bg-blue-50"
                      onClick={() => router.push(`/dashboard/contracts/${contract.id}`)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                            <FileText className="h-5 w-5 text-gray-600" />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{contract.title || 'Untitled'}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{contract.file_name || 'No file attached'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="font-medium text-gray-900">
                          {contract.vendors && typeof contract.vendors === 'object' && 'name' in contract.vendors
                            ? contract.vendors.name
                            : 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          ${(Number(contract.value) || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <span className="text-sm text-gray-700">{formatDate(contract.start_date)}</span>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span className={cn(
                            "text-sm font-medium",
                            isExpiringSoon ? "text-amber-700" : "text-gray-700"
                          )}>
                            {formatDate(contract.end_date)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap">
                        {isExpired ? (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Expired
                          </Badge>
                        ) : isExpiringSoon ? (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Expiring Soon
                          </Badge>
                        ) : contract.is_auto_renew ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 gap-1">
                            <RefreshCw className="h-3 w-3" />
                            Auto-Renew
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            Active
                          </Badge>
                        )}
                      </td>
                      <td className="px-6 py-5 whitespace-nowrap text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-all text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/contracts/${contract.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center bg-white">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {searchQuery ? "No contracts found" : "No active contracts"}
                      </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        {searchQuery
                          ? "Try adjusting your search terms"
                          : "Get started by creating your first contract"}
                      </p>
                      {!searchQuery && <NewContractButton />}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ActiveContracts;