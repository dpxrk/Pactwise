"use client";

import { useState } from "react";
// import { useQuery, useMutation } from "convex/react";
// import { api } from "../../../../../convex/_generated/api";
import { Plus, TrendingUp, TrendingDown, AlertTriangle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CreateBudgetDialog } from "@/app/_components/finance/CreateBudgetDialog";
import { BudgetDetailsDialog } from "@/app/_components/finance/BudgetDetailsDialog";
import { BudgetAllocationDialog } from "@/app/_components/finance/BudgetAllocationDialog";
import { EmptyState } from "@/components/premium";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export default function BudgetsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<any>(null);
  const [allocationDialogOpen, setAllocationDialogOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState("active");

  // Fetch budgets
  const budgets = useQuery(api.budgets.getBudgets, {
    status: selectedTab === "all" ? undefined : selectedTab as any,
  });

  // Fetch budget summary
  const summary = useQuery(api.budgets.getBudgetSummary, {});

  if (!budgets || !summary) {
    return <BudgetsPageSkeleton />;
  }

  const getBudgetStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; className: string }> = {
      healthy: { variant: "default", className: "bg-green-500" },
      at_risk: { variant: "warning", className: "bg-yellow-500" },
      exceeded: { variant: "destructive", className: "bg-red-500" },
      closed: { variant: "secondary", className: "" },
    };
    return variants[status] || { variant: "default", className: "" };
  };

  const calculateProgress = (spent: number, total: number) => {
    return Math.min((spent / total) * 100, 100);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Budget Management</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your contract budgets
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Budget
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.totalBudget.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Allocated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              ${summary.totalAllocated.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((summary.totalAllocated / summary.totalBudget) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Spent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${summary.totalSpent.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((summary.totalSpent / summary.totalBudget) * 100).toFixed(1)}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              At Risk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {summary.budgetsAtRisk}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Budgets over 80% spent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="at_risk">At Risk</TabsTrigger>
          <TabsTrigger value="exceeded">Exceeded</TabsTrigger>
          <TabsTrigger value="all">All Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab}>
          {budgets.length === 0 ? (
            <EmptyState
              icon={DollarSign}
              title="No budgets found"
              description={
                selectedTab === "active"
                  ? "Create your first budget to start tracking expenses"
                  : `No ${selectedTab.replace("_", " ")} budgets`
              }
              action={
                selectedTab === "active" && (
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Budget
                  </Button>
                )
              }
            />
          ) : (
            <div className="grid gap-6">
              {budgets.map((budget) => {
                const progress = calculateProgress(budget.spentAmount, budget.totalBudget);
                const statusBadge = getBudgetStatusBadge(budget.status);
                
                return (
                  <Card 
                    key={budget._id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedBudget(budget)}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{budget.name}</CardTitle>
                          <CardDescription>
                            {budget.budgetType} budget
                            {budget.departmentName && ` • ${budget.departmentName}`}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={statusBadge.variant}
                          className={cn(statusBadge.className)}
                        >
                          {budget.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Budget Progress</span>
                          <span className="font-medium">
                            ${budget.spentAmount.toLocaleString()} / ${budget.totalBudget.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{progress.toFixed(1)}% spent</span>
                          <span>${(budget.totalBudget - budget.spentAmount).toLocaleString()} remaining</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Allocated</p>
                          <p className="text-sm font-medium">
                            ${budget.allocatedAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Committed</p>
                          <p className="text-sm font-medium">
                            ${budget.committedAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Period</p>
                          <p className="text-sm font-medium">
                            {format(new Date(budget.startDate), "MMM d")} - 
                            {format(new Date(budget.endDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>

                      {budget.alerts && budget.alerts.length > 0 && (
                        <div className="flex items-center gap-2 pt-2 text-yellow-600">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm">
                            {budget.alerts.filter((a: any) => !a.acknowledged).length} active alerts
                          </span>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedBudget(budget);
                            setAllocationDialogOpen(true);
                          }}
                        >
                          Manage Allocations
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to contracts filtered by this budget
                            window.location.href = `/dashboard/contracts?budgetId=${budget._id}`;
                          }}
                        >
                          View Contracts
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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