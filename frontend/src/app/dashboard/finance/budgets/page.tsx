"use client";

import { Plus, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";
import { useState } from "react";

import { BudgetAllocationDialog } from "@/app/_components/finance/BudgetAllocationDialog";
import { BudgetDetailsDialog } from "@/app/_components/finance/BudgetDetailsDialog";
import { CreateBudgetDialog } from "@/app/_components/finance/CreateBudgetDialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useBudgetList, useBudgetStats, type Budget } from "@/hooks/queries/useBudgets";
import { format } from "@/lib/date";
import type { Id } from "@/types/id.types";

export default function BudgetsPage() {
  const { userProfile } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"active" | "completed" | "cancelled" | "all">("active");

  // Fetch budgets from Supabase
  const { data: budgets, isLoading: budgetsLoading, error: budgetsError } = useBudgetList(
    userProfile?.enterprise_id as Id<"enterprises">,
    { status: selectedTab === "all" ? undefined : selectedTab }
  );

  // Fetch budget statistics
  const { data: stats, isLoading: statsLoading } = useBudgetStats(
    userProfile?.enterprise_id as Id<"enterprises">
  );

  const isLoading = budgetsLoading || statsLoading;

  if (isLoading) {
    return <BudgetsPageSkeleton />;
  }

  if (budgetsError) {
    return (
      <div className="min-h-screen bg-ghost-100 p-6">
        <div className="border border-red-300 bg-red-50 p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Error Loading Budgets</h2>
          <p className="font-mono text-sm text-red-700">
            {budgetsError instanceof Error ? budgetsError.message : "Failed to load budgets"}
          </p>
        </div>
      </div>
    );
  }

  const calculateProgress = (spent: number, total: number) => {
    if (total === 0) return 0;
    return Math.min((spent / total) * 100, 100);
  };

  const getBudgetStatus = (budget: Budget) => {
    const utilization = budget.utilization_percentage || 0;
    if (budget.status === "cancelled") return "cancelled";
    if (budget.status === "completed") return "completed";
    if (utilization >= 100) return "exceeded";
    if (utilization >= 80) return "at_risk";
    return "healthy";
  };

  const filteredBudgets = budgets || [];

  return (
    <div className="min-h-screen bg-ghost-100">
      {/* Top Status Bar */}
      <div className="border-b border-ghost-300 bg-white px-6 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-green-500" />
              <span className="font-mono text-xs text-ghost-700 uppercase">BUDGET MANAGEMENT</span>
            </div>
            <div className="font-mono text-xs text-ghost-600">
              LAST UPDATE: {new Date().toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">Total Budget:</span>
              <span className="font-semibold text-purple-900">
                ${stats?.total_allocated?.toLocaleString() || "0"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ghost-600 uppercase">At Risk:</span>
              <span className="font-semibold text-yellow-600">
                {stats?.at_risk_count || 0}
              </span>
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
              ${stats?.total_allocated?.toLocaleString() || "0"}
            </div>
          </div>

          <div className="border border-ghost-300 bg-white p-4">
            <span className="font-mono text-xs text-ghost-600 uppercase block mb-2">SPENT</span>
            <div className="text-2xl font-bold text-green-600">
              ${stats?.total_spent?.toLocaleString() || "0"}
            </div>
            <p className="font-mono text-xs text-ghost-600 mt-1">
              {stats?.overall_utilization?.toFixed(1) || "0"}% UTILIZATION
            </p>
          </div>

          <div className="border border-ghost-300 bg-white p-4">
            <span className="font-mono text-xs text-ghost-600 uppercase block mb-2">REMAINING</span>
            <div className="text-2xl font-bold text-purple-900">
              ${stats?.total_remaining?.toLocaleString() || "0"}
            </div>
          </div>

          <div className="border border-ghost-300 bg-white p-4">
            <span className="font-mono text-xs text-ghost-600 uppercase block mb-2">AT RISK</span>
            <div className="text-2xl font-bold text-yellow-600">
              {stats?.at_risk_count || 0}
            </div>
            <p className="font-mono text-xs text-ghost-600 mt-1">
              BUDGETS OVER 90% SPENT
            </p>
          </div>
        </div>

        {/* Budget Tabs */}
        <div className="flex items-center gap-0 mb-6 border border-ghost-300 bg-white w-fit">
          {(["active", "completed", "cancelled", "all"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-6 py-2 font-mono text-xs uppercase border-r border-ghost-300 last:border-r-0 ${
                selectedTab === tab
                  ? "bg-purple-900 text-white"
                  : "text-ghost-700 hover:bg-ghost-50"
              }`}
            >
              {tab === "all" ? "ALL BUDGETS" : tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Budget List */}
        {filteredBudgets.length === 0 ? (
          <div className="border border-ghost-300 bg-white p-12 text-center">
            <DollarSign className="h-12 w-12 text-ghost-400 mx-auto mb-4" />
            <p className="font-mono text-xs uppercase text-ghost-700 mb-2">
              {selectedTab === "active" ? "No budgets found" : `No ${selectedTab} budgets`}
            </p>
            <p className="font-mono text-xs text-ghost-600 mb-4">
              {selectedTab === "active"
                ? "Create your first budget to start tracking expenses"
                : `No ${selectedTab} budgets to display`}
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
            {filteredBudgets.map((budget) => {
              const status = getBudgetStatus(budget);
              const progress = calculateProgress(budget.spent_amount, budget.total_amount);

              return (
                <div
                  key={budget.id}
                  className="border border-ghost-300 bg-white cursor-pointer hover:border-purple-900 transition-all"
                  onClick={() => setSelectedBudget(budget)}
                >
                  <div className="border-b border-ghost-300 px-6 py-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-purple-900 mb-1">{budget.name}</h3>
                        <p className="font-mono text-xs text-ghost-600 uppercase">
                          {budget.category || "General"} BUDGET
                        </p>
                      </div>
                      <span
                        className={`font-mono text-xs px-2 py-1 border ${
                          status === "healthy"
                            ? "border-green-600 text-green-600 bg-green-50"
                            : status === "at_risk"
                            ? "border-yellow-600 text-yellow-600 bg-yellow-50"
                            : status === "exceeded"
                            ? "border-red-600 text-red-600 bg-red-50"
                            : "border-ghost-300 text-ghost-700"
                        }`}
                      >
                        {status.replace("_", " ").toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="font-mono text-xs text-ghost-600 uppercase">
                          BUDGET PROGRESS
                        </span>
                        <span className="font-mono text-xs font-semibold text-purple-900">
                          ${budget.spent_amount.toLocaleString()} / $
                          {budget.total_amount.toLocaleString()}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex justify-between font-mono text-xs text-ghost-600">
                        <span>{progress.toFixed(1)}% SPENT</span>
                        <span>${budget.remaining_amount.toLocaleString()} REMAINING</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-ghost-200">
                      <div>
                        <p className="font-mono text-xs text-ghost-600 uppercase mb-1">PERIOD</p>
                        <p className="font-mono text-xs text-ghost-900">
                          {format(new Date(budget.period_start), "MMM d")} -{" "}
                          {format(new Date(budget.period_end), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-xs text-ghost-600 uppercase mb-1">STATUS</p>
                        <p className="font-mono text-xs text-ghost-900 capitalize">
                          {budget.status}
                        </p>
                      </div>
                    </div>

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
                          window.location.href = `/dashboard/contracts?budgetId=${budget.id}`;
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
      </div>

      {/* Dialogs */}
      <CreateBudgetDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />

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
    <div className="min-h-screen bg-ghost-100">
      <div className="border-b border-ghost-300 bg-white px-6 py-3">
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="p-6">
        <div className="border border-ghost-300 bg-white p-6 mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="border border-ghost-300 bg-white p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-ghost-300 bg-white p-6">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-2 w-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
