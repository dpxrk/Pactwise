"use client";

import { Plus, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BudgetAllocationDialog } from "@/app/_components/finance/BudgetAllocationDialog";
import { BudgetDetailsDialog } from "@/app/_components/finance/BudgetDetailsDialog";
import { CreateBudgetDialog } from "@/app/_components/finance/CreateBudgetDialog";
import { EmptyState } from "@/components/premium";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "@/lib/date";
import { cn } from "@/lib/utils";

interface Budget {
  _id: string;
  name: string;
  budgetType: string;
  departmentName?: string;
  status: 'healthy' | 'at_risk' | 'exceeded' | 'closed';
  spentAmount: number;
  totalBudget: number;
  allocatedAmount: number;
  committedAmount: number;
  startDate: string;
  endDate: string;
  alerts: { acknowledged: boolean }[];
}

interface BudgetSummary {
  totalBudget: number;
  totalAllocated: number;
  totalSpent: number;
  budgetsAtRisk: number;
}

// Mock useQuery hook
const useQuery = (query: any, args: any) => {
  return { data: [] };
};

// Mock api object
const api = {
  budgets: {
    getBudgets: (args: any) => { /* mock function */ },
    getBudgetSummary: (args: any) => { /* mock function */ },
  },
};

export default function BudgetsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("active");

  // Fetch budgets
  // const { data: budgets } = useQuery(api.budgets.getBudgets, {
  //   status: selectedTab === "all" ? undefined : selectedTab,
  // });
  const budgets = null;

  // Fetch budget summary
  // const { data: summary } = useQuery(api.budgets.getBudgetSummary, {});
  const summary = null;

  if (!budgets || !summary) {
    return <BudgetsPageSkeleton />;
  }

  const getBudgetStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "warning" | "destructive" | "secondary"; className: string }> = {
      healthy: { variant: "default", className: "bg-green-500" },
      at_risk: { variant: "warning", className: "bg-yellow-500" },
      exceeded: { variant: "destructive", className: "bg-red-500" },
      closed: { variant: "secondary", className: "" },
    };
    return variants[status] || { variant: "default", className: "" };
  };

  const calculateProgress = (spent: number, total: number) => {
    if (total === 0) return 0;
    return Math.min((spent / total) * 100, 100);
  };

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500 animate-pulse" />
              <span className="font-mono text-xs text-ghost-700 uppercase">BUDGET MANAGEMENT</span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Total Budget:</span>
              <span className="font-semibold text-purple-900">${summary ? (summary as BudgetSummary).totalBudget.toLocaleString() : '0'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">At Risk:</span>
              <span className="font-semibold text-purple-900">{summary ? (summary as BudgetSummary).budgetsAtRisk : 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Header */}
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-purple-900 mb-1">BUDGET MANAGEMENT</h1>
              <p className="font-mono text-xs text-ghost-600 uppercase">
                Track and manage your contract budgets
              </p>
            </div>
            <button
              onClick={() => setCreateDialogOpen(true)}
              className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center gap-2"
            >
              <Plus className="h-3 w-3" />
              CREATE BUDGET
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="border border-ghost-300 bg-white p-4">
            <span className="font-mono text-xs text-ghost-600 uppercase block mb-2">TOTAL BUDGET</span>
            <div className="text-2xl font-bold text-purple-900">
              ${(summary as BudgetSummary).totalBudget.toLocaleString()}
            </div>
          </div>

          <div className="border border-ghost-300 bg-white p-4">
            <span className="font-mono text-xs text-ghost-600 uppercase block mb-2">ALLOCATED</span>
            <div className="text-2xl font-bold text-purple-900">
              ${(summary as BudgetSummary).totalAllocated.toLocaleString()}
            </div>
            <p className="font-mono text-xs text-ghost-600 mt-1">
              {(((summary as BudgetSummary).totalAllocated / (summary as BudgetSummary).totalBudget) * 100).toFixed(1)}% OF TOTAL
            </p>
          </div>

          <div className="border border-ghost-300 bg-white p-4">
            <span className="font-mono text-xs text-ghost-600 uppercase block mb-2">SPENT</span>
            <div className="text-2xl font-bold text-green-600">
              ${(summary as BudgetSummary).totalSpent.toLocaleString()}
            </div>
            <p className="font-mono text-xs text-ghost-600 mt-1">
              {(((summary as BudgetSummary).totalSpent / (summary as BudgetSummary).totalBudget) * 100).toFixed(1)}% OF TOTAL
            </p>
          </div>

          <div className="border border-ghost-300 bg-white p-4">
            <span className="font-mono text-xs text-ghost-600 uppercase block mb-2">AT RISK</span>
            <div className="text-2xl font-bold text-yellow-600">
              {(summary as BudgetSummary).budgetsAtRisk}
            </div>
            <p className="font-mono text-xs text-ghost-600 mt-1">
              BUDGETS OVER 80% SPENT
            </p>
          </div>
        </div>

        {/* Budget Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <div className="flex items-center gap-0 mb-6 border border-ghost-300 bg-white w-fit">
            <button
              onClick={() => setSelectedTab("active")}
              className={`px-6 py-2 font-mono text-xs uppercase border-r border-ghost-300 ${selectedTab === 'active' ? 'bg-purple-900 text-white' : 'text-ghost-700 hover:bg-ghost-50'}`}
            >
              ACTIVE
            </button>
            <button
              onClick={() => setSelectedTab("at_risk")}
              className={`px-6 py-2 font-mono text-xs uppercase border-r border-ghost-300 ${selectedTab === 'at_risk' ? 'bg-purple-900 text-white' : 'text-ghost-700 hover:bg-ghost-50'}`}
            >
              AT RISK
            </button>
            <button
              onClick={() => setSelectedTab("exceeded")}
              className={`px-6 py-2 font-mono text-xs uppercase border-r border-ghost-300 ${selectedTab === 'exceeded' ? 'bg-purple-900 text-white' : 'text-ghost-700 hover:bg-ghost-50'}`}
            >
              EXCEEDED
            </button>
            <button
              onClick={() => setSelectedTab("all")}
              className={`px-6 py-2 font-mono text-xs uppercase ${selectedTab === 'all' ? 'bg-purple-900 text-white' : 'text-ghost-700 hover:bg-ghost-50'}`}
            >
              ALL BUDGETS
            </button>
          </div>

          <TabsContent value={selectedTab}>
            {(budgets as Budget[]).length === 0 ? (
              <div className="border border-ghost-300 bg-white p-12 text-center">
                <DollarSign className="h-12 w-12 text-ghost-400 mx-auto mb-4" />
                <p className="font-mono text-xs uppercase text-ghost-700 mb-2">
                  {selectedTab === "active" ? "No budgets found" : `No ${selectedTab.replace("_", " ")} budgets`}
                </p>
                <p className="font-mono text-xs text-ghost-600 mb-4">
                  {selectedTab === "active"
                    ? "Create your first budget to start tracking expenses"
                    : `No ${selectedTab.replace("_", " ")} budgets to display`
                  }
                </p>
                {selectedTab === "active" && (
                  <button
                    onClick={() => setCreateDialogOpen(true)}
                    className="border border-purple-900 bg-purple-900 text-white px-4 py-2 font-mono text-xs hover:bg-purple-800 flex items-center gap-2 mx-auto"
                  >
                    <Plus className="h-3 w-3" />
                    CREATE BUDGET
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4">
                {(budgets as Budget[]).map((budget) => {
                  const progress = calculateProgress(budget.spentAmount, budget.totalBudget);
                  const statusBadge = getBudgetStatusBadge(budget.status);

                  return (
                    <div
                      key={budget._id}
                      className="border border-ghost-300 bg-white cursor-pointer hover:border-purple-900 transition-all"
                      onClick={() => setSelectedBudget(budget)}
                    >
                      <div className="border-b border-ghost-300 px-6 py-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold text-purple-900 mb-1">{budget.name}</h3>
                            <p className="font-mono text-xs text-ghost-600 uppercase">
                              {budget.budgetType} BUDGET
                              {budget.departmentName && ` • ${budget.departmentName}`}
                            </p>
                          </div>
                          <span
                            className={`font-mono text-xs px-2 py-1 border ${
                              budget.status === 'healthy' ? 'border-green-600 text-green-600 bg-green-50' :
                              budget.status === 'at_risk' ? 'border-yellow-600 text-yellow-600 bg-yellow-50' :
                              budget.status === 'exceeded' ? 'border-red-600 text-red-600 bg-red-50' :
                              'border-ghost-300 text-ghost-700'
                            }`}
                          >
                            {budget.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="font-mono text-xs text-ghost-600 uppercase">BUDGET PROGRESS</span>
                            <span className="font-mono text-xs font-semibold text-purple-900">
                              ${budget.spentAmount.toLocaleString()} / ${budget.totalBudget.toLocaleString()}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <div className="flex justify-between font-mono text-xs text-ghost-600">
                            <span>{progress.toFixed(1)}% SPENT</span>
                            <span>${(budget.totalBudget - budget.spentAmount).toLocaleString()} REMAINING</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-ghost-200">
                          <div>
                            <p className="font-mono text-xs text-ghost-600 uppercase mb-1">ALLOCATED</p>
                            <p className="font-mono text-sm font-semibold text-purple-900">
                              ${budget.allocatedAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="font-mono text-xs text-ghost-600 uppercase mb-1">COMMITTED</p>
                            <p className="font-mono text-sm font-semibold text-purple-900">
                              ${budget.committedAmount.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="font-mono text-xs text-ghost-600 uppercase mb-1">PERIOD</p>
                            <p className="font-mono text-xs text-ghost-900">
                              {format(new Date(budget.startDate), "MMM d")} -
                              {format(new Date(budget.endDate), "MMM d, yyyy")}
                            </p>
                          </div>
                        </div>

                        {budget.alerts && budget.alerts.length > 0 && (
                          <div className="flex items-center gap-2 pt-4 border-t border-ghost-200">
                            <AlertTriangle className="h-4 w-4 text-yellow-600" />
                            <span className="font-mono text-xs text-yellow-600">
                              {budget.alerts.filter((a) => !a.acknowledged).length} ACTIVE ALERTS
                            </span>
                          </div>
                        )}

                        <div className="flex gap-2 pt-4 border-t border-ghost-200">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedBudget(budget);
                              setAllocationDialogOpen(true);
                            }}
                            className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900"
                          >
                            MANAGE ALLOCATIONS
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `/dashboard/contracts?budgetId=${budget._id}`;
                            }}
                            className="border border-ghost-300 bg-white px-4 py-2 font-mono text-xs text-ghost-700 hover:bg-ghost-50 hover:border-purple-900"
                          >
                            VIEW CONTRACTS
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateBudgetDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      {selectedBudget && (
        <BudgetDetailsDialog
          budget={selectedBudget}
          open={!!selectedBudget && !allocationDialogOpen}
          onOpenChange={(open) => !open && setSelectedBudget(null)}
        />
      )}

      {selectedBudget && (
        <BudgetAllocationDialog
          budget={selectedBudget}
          open={allocationDialogOpen}
          onOpenChange={setAllocationDialogOpen}
        />
      )}
    </div>
  );
}

function BudgetsPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-64 mt-2" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32 mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
