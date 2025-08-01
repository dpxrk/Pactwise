'use client'


import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Clock, FileSignature, Send, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import useContractStore from "@/stores/contract-store";
import { useDashboardStore } from "@/stores/dashboard-store";
import { Button } from "@/components/ui/button";

const PendingContracts = () => {
  const { contracts } = useContractStore();
  const { searchQuery, setSearchQuery } = useDashboardStore();

  // Filter pending signature contracts and apply search
  const pendingContracts = useMemo(() => {
    return contracts.filter((contract) => {
      const isPending = contract.status === "pending_analysis";
      if (!searchQuery) return isPending;

      const searchLower = searchQuery.toLowerCase();
      return (
        isPending &&
        (contract.title.toLowerCase().includes(searchLower) ||
          contract.vendor?.name.toLowerCase().includes(searchLower) ||
          contract._id.toLowerCase().includes(searchLower))
      );
    });
  }, [contracts, searchQuery]);

  // Calculate pending contract statistics
  const stats = useMemo(() => {
    const now = new Date();
    const twoDaysAgo = new Date(now.setDate(now.getDate() - 2));

    return {
      total: pendingContracts.length,
      urgentSignatures: pendingContracts.filter((contract) => {
        const dueDate = contract._creationTime ? new Date(contract._creationTime) : new Date();
        return dueDate <= now;
      }).length,
      recentlySent: pendingContracts.filter(
        (contract) => contract._creationTime ? new Date(contract._creationTime) > twoDaysAgo : false
      ).length,
      awaitingCounterparty: pendingContracts.filter(
        (contract) => false
      ).length,
    };
  }, [pendingContracts]);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Pending Signatures</h2>
        <Button>
          <Send className="mr-2 h-4 w-4" />
          Send for Signature
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-red-600">
              Urgent Signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.urgentSignatures}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recently Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentlySent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Awaiting Counterparty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.awaitingCounterparty}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pending contracts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Pending Contracts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pendingContracts.map((contract) => (
          <Card key={contract._id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-medium">
                  {contract.title}
                </CardTitle>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" title="View Contract">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Sign Contract">
                    <FileSignature className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-1" />
                Due by:{" "}
                {contract._creationTime ? new Date(contract._creationTime).toLocaleDateString() : 'Unknown'}
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
                  <span className="text-sm text-muted-foreground">Vendor:</span>
                  <span className="font-medium">{contract.vendor?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Sent on:
                  </span>
                  <span className="font-medium">
                    {contract._creationTime ? new Date(
                      contract._creationTime
                    ).toLocaleDateString() : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Signers:
                  </span>
                  <span className="font-medium">
                    {[]?.length || 0} remaining
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <Button className="w-full" variant="outline">
                  <Eye className="mr-2 h-4 w-4" />
                  View Contract
                </Button>
                <Button className="w-full">
                  <FileSignature className="mr-2 h-4 w-4" />
                  Sign Now
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {pendingContracts.length === 0 && (
          <div className="col-span-full text-center py-10 text-muted-foreground">
            No contracts pending signature
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingContracts;
