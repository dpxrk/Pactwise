'use client'


import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, PlusCircle, Edit, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import useContractStore from "@/stores/contract-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Button } from "@/components/ui/button";

const DraftContracts = () => {
  const { contracts } = useContractStore();
  const { searchQuery, setSearchQuery } = useDashboardStore();

  // Filter draft contracts and apply search
  const draftContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const isDraft = contract.status === "draft";
      if (!searchQuery) return isDraft;

      const searchLower = searchQuery.toLowerCase();
      return (
        isDraft &&
        (contract.title.toLowerCase().includes(searchLower) ||
          contract.vendor?.name.toLowerCase().includes(searchLower) ||
          contract._id.toLowerCase().includes(searchLower))
      );
    });
  }, [contracts, searchQuery]);

  // Calculate draft statistics
  const stats = useMemo(() => {
    // const lastModified = draftContracts.reduce((latest, contract) => {
    //   const modifiedDate = new Date(contract._creationTime || contract._creationTime);
    //   return modifiedDate > latest ? modifiedDate : latest;
    // }, new Date(0));

    return {
      total: draftContracts.length,
      recentlyModified: draftContracts.filter((contract) => {
        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        return contract._creationTime && new Date(contract._creationTime) > lastWeek;
      }).length,
      oldestDraft: draftContracts.reduce<Date | null>((oldest, contract) => {
        const createdDate = contract._creationTime ? new Date(contract._creationTime) : new Date();
        return !oldest || createdDate < oldest ? createdDate : oldest;
      }, null),
    };
  }, [draftContracts]);

  return (
    <div className="space-y-6 p-6">
      {/* Header with Action Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Draft Contracts</h2>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Draft
        </Button>
      </div>

      {/* Draft Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Recently Modified
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentlyModified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Oldest Draft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.oldestDraft
                ? stats.oldestDraft.toLocaleDateString()
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search draft contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Drafts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {draftContracts.map((contract) => (
          <Card key={contract._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-medium">
                  {contract.title}
                </CardTitle>
                <Button variant="ghost" size="icon">
                  <Edit className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                Last modified:{" "}
                {contract._creationTime 
                  ? new Date(contract._creationTime).toLocaleDateString()
                  : 'N/A'}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Draft #:
                  </span>
                  <span className="font-medium">
                    {contract._id}
                  </span>
                </div>
                {contract.extractedPricing && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Pricing:
                    </span>
                    <span className="font-medium">
                      {contract.extractedPricing}
                    </span>
                  </div>
                )}
                {contract.vendor && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Vendor:
                    </span>
                    <span className="font-medium">{contract.vendor.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Created:
                  </span>
                  <span className="font-medium">
                    {contract._creationTime 
                      ? new Date(contract._creationTime).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="mt-4">
                <Button className="w-full" variant="outline">
                  Continue Editing
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {draftContracts.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No draft contracts found
          </div>
        )}
      </div>
    </div>
  );
};

export default DraftContracts;
