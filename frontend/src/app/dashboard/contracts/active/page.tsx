'use client'

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import useContractStore from "@/stores/contract-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

const ActiveContracts = () => {
  const { contracts } = useContractStore();
  const { searchQuery, setSearchQuery } = useDashboardStore();

  // Filter active contracts and apply search
  const activeContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const isActive = contract.status === "active";
      if (!searchQuery) return isActive;

      // Apply search filter to active contracts
      const searchLower = searchQuery.toLowerCase();
      return (
        isActive &&
        (contract.title.toLowerCase().includes(searchLower) ||
          contract.vendor?.name.toLowerCase().includes(searchLower) ||
          contract._id.toLowerCase().includes(searchLower))
      );
    });
  }, [contracts, searchQuery]);

  // Calculate active contract statistics
  const stats = useMemo(() => {
    const totalValue = activeContracts.reduce(
      (sum, contract) => sum + 0, // TODO: Add value field to contract
      0
    );
    const avgValue =
      activeContracts.length > 0 ? totalValue / activeContracts.length : 0;

    return {
      total: activeContracts.length,
      totalValue: totalValue,
      averageValue: avgValue,
      expiringSoon: activeContracts.filter((contract) => {
        const expiryDate = contract.extractedEndDate ? new Date(contract.extractedEndDate) : null;
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        return expiryDate && expiryDate <= thirtyDaysFromNow;
      }).length,
    };
  }, [activeContracts]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Active Contracts</h2>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Contract
        </Button>
      </div>
      {/* Active Contracts Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Active Contracts
            </CardTitle>
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
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiringSoon}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search active contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeContracts.map((contract) => (
          <Card key={contract._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                {contract.title}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Contract #{contract._id}
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Value:</span>
                  <span className="font-medium">
                    {contract.extractedPricing || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{contract.vendor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Expires:
                  </span>
                  <span className="font-medium">
                    {contract.extractedEndDate ? new Date(contract.extractedEndDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {activeContracts.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No active contracts found
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveContracts;
