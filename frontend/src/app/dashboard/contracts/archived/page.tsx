'use client'


import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import useContractStore from "@/stores/contract-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { RefreshCcw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

const ArchivedContracts = () => {
  const { contracts } = useContractStore();
  const { searchQuery, setSearchQuery } = useDashboardStore();

  // Filter archived contracts and apply search
  const archivedContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const isArchived = contract.status === "archived";
      if (!searchQuery) return isArchived;

      const searchLower = searchQuery.toLowerCase();
      return (
        isArchived &&
        (contract.title.toLowerCase().includes(searchLower) ||
          contract.vendor?.name.toLowerCase().includes(searchLower) ||
          contract._id.toLowerCase().includes(searchLower))
      );
    });
  }, [contracts, searchQuery]);

  // Calculate archive statistics
  const stats = useMemo(() => {
    const totalValue = archivedContracts.reduce(
      (sum, contract) => {
        // Parse value from extractedPricing field
        if (contract.extractedPricing) {
          const priceMatch = contract.extractedPricing.match(/[\d,]+\.?\d*/);
          if (priceMatch) {
            const value = parseFloat(priceMatch[0].replace(/,/g, ''));
            return sum + (isNaN(value) ? 0 : value);
          }
        }
        // Fallback to value field if it exists
        return sum + (contract.value || 0);
      },
      0
    );
    const lastThirtyDays = new Date();
    lastThirtyDays.setDate(lastThirtyDays.getDate() - 30);

    return {
      total: archivedContracts.length,
      totalValue: totalValue,
      recentlyArchived: archivedContracts.filter(
        (contract) => contract._creationTime && new Date(contract._creationTime) > lastThirtyDays
      ).length,
    };
  }, [archivedContracts]);

  return (
    <div className="space-y-6 p-6">
      {/* Header with Stats */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Archived Contracts</h2>
      </div>

      {/* Archive Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Total Archived
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
            <CardTitle className="text-sm font-medium">
              Recently Archived
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentlyArchived}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search archived contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {archivedContracts.map((contract) => (
          <Card key={contract._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-medium">
                  {contract.title}
                </CardTitle>
                <Button variant="ghost" size="icon">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Archive className="h-4 w-4 mr-1" />
                Archived on{" "}
                {contract._creationTime ? new Date(contract._creationTime).toLocaleDateString() : 'N/A'}
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
                    {contract.extractedPricing || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{contract.vendor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    End Date:
                  </span>
                  <span className="font-medium">
                    {contract.extractedEndDate ? new Date(contract.extractedEndDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {archivedContracts.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No archived contracts found
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivedContracts;
