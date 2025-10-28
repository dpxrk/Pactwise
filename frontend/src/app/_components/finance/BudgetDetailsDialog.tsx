"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  TrendingUp
} from 'lucide-react';

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "@/lib/date";
import { cn } from "@/lib/utils";

interface Budget {
  _id: string;
  name: string;
  budgetType: string;
  startDate: string;
  endDate: string;
  status: 'healthy' | 'at_risk' | 'exceeded';
  totalBudget: number;
  allocatedAmount: number;
  spentAmount: number;
  committedAmount: number;
  alerts: Alert[];
}

interface Allocation {
  _id: string;
  contractTitle: string;
  contractId: string;
  allocationType: string;
  allocatedAmount: number;
  startDate: string;
  endDate: string;
  contractStatus: string;
}

interface Analytics {
  burnRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  projectedTotal: number;
  topCategories: { name: string; amount: number; percentage: number }[];
  daysUntilExhausted: number | null;
  recommendedDailyLimit: number;
}

interface Alert {
  type: 'exceeded' | 'threshold_reached' | 'forecast';
  threshold?: number;
  triggeredAt: string;
  acknowledged: boolean;
}

interface BudgetDetailsDialogProps {
  budget: Budget;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BudgetDetailsDialog({
  budget,
  open,
  onOpenChange,
}: BudgetDetailsDialogProps) {
  const [selectedTab, setSelectedTab] = useState("overview");
  
  // Mock data - replace with actual Supabase implementation
  const allocations: Allocation[] | null = null;
  const analytics: Analytics | null = null;
  const acknowledgeAlert = (params: { budgetId: string; alertIndex: number }) => Promise.resolve();

  const handleAcknowledgeAlert = async (alertIndex: number) => {
    try {
      await acknowledgeAlert({
        budgetId: budget._id,
        alertIndex,
      });
      toast.success("Alert acknowledged");
    } catch (err) {
      toast.error("Failed to acknowledge alert");
    }
  };

  const progress = (budget.spentAmount / budget.totalBudget) * 100;
  const remaining = budget.totalBudget - budget.spentAmount;
  const daysRemaining = Math.ceil(
    (new Date(budget.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">{budget.name}</DialogTitle>
              <DialogDescription>
                {budget.budgetType} budget • {format(new Date(budget.startDate), "MMM d, yyyy")} - {format(new Date(budget.endDate), "MMM d, yyyy")}
              </DialogDescription>
            </div>
            <Badge
              variant={
                budget.status === "healthy"
                  ? "default"
                  : budget.status === "at_risk"
                  ? "warning"
                  : "destructive"
              }
              className="text-sm"
            >
              {budget.status.replace("_", " ")}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="allocations">Allocations</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[500px] mt-6">
            <TabsContent value="overview" className="space-y-6">
              {/* Budget Progress */}
              <Card>
                <CardHeader>
                  <CardTitle>Budget Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Total Budget</span>
                      <span className="text-sm font-bold">
                        ${budget.totalBudget.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={progress} className="h-3" />
                    <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                      <span>{progress.toFixed(1)}% used</span>
                      <span>${remaining.toLocaleString()} remaining</span>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Allocated</p>
                      <p className="text-xl font-semibold">
                        ${budget.allocatedAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((budget.allocatedAmount / budget.totalBudget) * 100).toFixed(1)}% of budget
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Spent</p>
                      <p className="text-xl font-semibold">
                        ${budget.spentAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {((budget.spentAmount / budget.allocatedAmount) * 100).toFixed(1)}% of allocated
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Committed</p>
                      <p className="text-xl font-semibold">
                        ${budget.committedAmount.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Future spending from contracts
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Available</p>
                      <p className="text-xl font-semibold">
                        ${(budget.totalBudget - budget.allocatedAmount - budget.committedAmount).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        For new allocations
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Time & Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Time & Burn Rate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Days Remaining</span>
                    </div>
                    <span className="text-xl font-semibold">{daysRemaining}</span>
                  </div>

                  {analytics && (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Daily Burn Rate</span>
                        </div>
                        <span className="text-xl font-semibold">
                          ${analytics.burnRate.daily.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Projected Total</span>
                        </div>
                        <span
                          className={cn(
                            "text-xl font-semibold",
                            analytics.projectedTotal > budget.totalBudget
                              ? "text-red-600"
                              : "text-green-600"
                          )}
                        >
                          ${analytics.projectedTotal.toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="allocations" className="space-y-4">
              {allocations && allocations.length > 0 ? (
                allocations.map((allocation) => (
                  <Card key={allocation._id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">
                            {allocation.contractTitle}
                          </CardTitle>
                          <CardDescription>
                            Contract #{allocation.contractId}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          {allocation.allocationType}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Allocated</p>
                          <p className="font-medium">
                            ${allocation.allocatedAmount.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Period</p>
                          <p className="font-medium">
                            {format(new Date(allocation.startDate), "MMM d")} -
                            {format(new Date(allocation.endDate), "MMM d")}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <p className="font-medium">{allocation.contractStatus}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No contracts allocated yet</p>
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => onOpenChange(false)}
                    >
                      Allocate Contracts
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              {analytics && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Spending Trends</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Weekly Average</p>
                          <p className="text-xl font-semibold">
                            ${analytics.burnRate.weekly.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Monthly Average</p>
                          <p className="text-xl font-semibold">
                            ${analytics.burnRate.monthly.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <p className="text-sm text-muted-foreground mb-2">Top Spending Categories</p>
                        {analytics.topCategories.map((category) => (
                          <div key={category.name} className="flex justify-between items-center py-1">
                            <span className="text-sm">{category.name}</span>
                            <span className="text-sm font-medium">
                              ${category.amount.toLocaleString()} ({category.percentage.toFixed(1)}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Forecast</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Projected End Date Spending</span>
                          <span
                            className={cn(
                              "font-semibold",
                              analytics.projectedTotal > budget.totalBudget
                                ? "text-red-600"
                                : "text-green-600"
                            )}
                          >
                            ${analytics.projectedTotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Days Until Budget Exhausted</span>
                          <span className="font-semibold">
                            {analytics.daysUntilExhausted || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Recommended Daily Limit</span>
                          <span className="font-semibold">
                            ${analytics.recommendedDailyLimit.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              {budget.alerts && budget.alerts.length > 0 ? (
                budget.alerts.map((alert, index) => (
                  <Card key={index} className={cn(
                    "border-l-4",
                    alert.type === "exceeded" ? "border-l-red-500" :
                    alert.type === "threshold_reached" ? "border-l-yellow-500" :
                    "border-l-blue-500"
                  )}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className={cn(
                            "h-5 w-5 mt-0.5",
                            alert.type === "exceeded" ? "text-red-500" :
                            alert.type === "threshold_reached" ? "text-yellow-500" :
                            "text-blue-500"
                          )} />
                          <div>
                            <CardTitle className="text-base">
                              {alert.type === "exceeded" ? "Budget Exceeded" :
                               alert.type === "threshold_reached" ? `${alert.threshold}% Threshold Reached` :
                               "Budget Forecast Alert"}
                            </CardTitle>
                            <CardDescription>
                              {format(new Date(alert.triggeredAt), "PPP")}
                            </CardDescription>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAcknowledgeAlert(index)}
                          >
                            Acknowledge
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    {alert.acknowledged && (
                      <CardContent>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Acknowledged</span>
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <p className="text-muted-foreground">No active alerts</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
