'use client'


import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, AlertCircle, History, Archive } from "lucide-react";
import { Input } from "@/components/ui/input";
import useContractStore from "@/stores/contract-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Button } from "@/components/ui/button";

const ExpiredContracts = () => {
  const { contracts } = useContractStore();
  const { searchQuery, setSearchQuery } = useDashboardStore();

  // Filter expired contracts and apply search
  const expiredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const isExpired = contract.status === "expired";
      if (!searchQuery) return isExpired;

      const searchLower = searchQuery.toLowerCase();
      return (
        isExpired &&
        (contract.title.toLowerCase().includes(searchLower) ||
          contract.vendor?.name.toLowerCase().includes(searchLower) ||
          contract._id.toLowerCase().includes(searchLower))
      );
    });
  }, [contracts, searchQuery]);

  // Calculate expired contract statistics
  const stats = useMemo(() => {
    const totalValue = expiredContracts.reduce(
      (sum, contract) => sum + (0 || 0),
      0
    );
    const now = new Date();
    const lastThirtyDays = new Date(now.setDate(now.getDate() - 30));

    return {
      total: expiredContracts.length,
      totalValue,
      recentlyExpired: expiredContracts.filter(
        (contract) => contract.extractedEndDate && new Date(contract.extractedEndDate) > lastThirtyDays
      ).length,
      renewableCount: expiredContracts.filter(
        (contract) => false || false
      ).length,
    };
  }, [expiredContracts]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Expired Contracts</h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Expired</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recently Expired
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentlyExpired}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Renewable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.renewableCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search expired contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Expired Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {expiredContracts.map((contract) => (
          <Card key={contract._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-medium">
                  {contract.title}
                </CardTitle>
                <div className="flex space-x-2">
                  {false && (
                    <Button variant="ghost" size="icon" title="Renew Contract">
                      <History className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" title="Archive Contract">
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center text-sm text-red-500">
                <AlertCircle className="h-4 w-4 mr-1" />
                Expired on {contract.extractedEndDate ? new Date(contract.extractedEndDate).toLocaleDateString() : 'Unknown'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Contract #:
                  </span>
                  <span className="font-medium">
                    {contract._id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Value:</span>
                  <span className="font-medium">
                    ${0?.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{contract.vendor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Duration:
                  </span>
                  <span className="font-medium">
                    {contract.extractedStartDate ? new Date(contract.extractedStartDate).toLocaleDateString() : 'Unknown'} -{" "}
                    {contract.extractedEndDate ? new Date(contract.extractedEndDate).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
              </div>
              {false && (
                <Button className="w-full mt-4" variant="outline">
                  <History className="mr-2 h-4 w-4" />
                  Renew Contract
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {expiredContracts.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No expired contracts found
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiredContracts;
