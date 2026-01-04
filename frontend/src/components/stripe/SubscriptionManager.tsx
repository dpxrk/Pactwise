"use client";

import {
  Loader2,
  CreditCard,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "@/lib/date";
import { createClient } from "@/utils/supabase/client";

// Plan feature descriptions
const PLAN_FEATURES: Record<
  string,
  { name: string; description: string; features: string[] }
> = {
  free: {
    name: "Free",
    description: "Basic contract management for individuals",
    features: [
      "Up to 10 contracts",
      "2 team members",
      "5 vendors",
      "Community support",
    ],
  },
  starter: {
    name: "Starter",
    description: "Perfect for small teams getting started",
    features: [
      "Up to 100 contracts",
      "10 team members",
      "50 vendors",
      "1 integration",
      "Email support",
    ],
  },
  professional: {
    name: "Professional",
    description: "Advanced features for growing teams",
    features: [
      "Up to 500 contracts",
      "25 team members",
      "Unlimited vendors",
      "5 integrations",
      "AI contract analysis",
      "Compliance tracking",
      "Priority support",
    ],
  },
  business: {
    name: "Business",
    description: "Full-featured solution for enterprises",
    features: [
      "Unlimited contracts",
      "100 team members",
      "Unlimited vendors",
      "Unlimited integrations",
      "AI contract analysis",
      "Compliance tracking",
      "Custom workflows",
      "Advanced analytics",
      "Dedicated support",
    ],
  },
  enterprise: {
    name: "Enterprise",
    description: "Custom solution for large organizations",
    features: [
      "Everything in Business",
      "Unlimited team members",
      "Custom AI training",
      "On-premise option",
      "SSO/SAML",
      "Audit logs",
      "SLA guarantee",
    ],
  },
};

interface SubscriptionManagerProps {
  enterpriseId: string;
}

interface SubscriptionData {
  subscription: {
    id: string;
    stripeSubscriptionId: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    canceledAt: string | null;
    trialStart: string | null;
    trialEnd: string | null;
  } | null;
  plan: {
    id?: string;
    name: string;
    tier?: string;
    display_name?: string;
    description?: string;
    features: Record<string, number | boolean | string>;
    price_amount?: number;
    billing_interval?: string;
  };
  usage: {
    contracts: number;
    users: number;
    vendors: number;
  };
  upcomingInvoice: {
    amount: number;
    currency: string;
    dueDate: string | null;
  } | null;
}

export function SubscriptionManager({ enterpriseId }: SubscriptionManagerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptionData = useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setError("Please sign in to view subscription details");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-subscription`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch subscription data");
      }

      const subscriptionData: SubscriptionData = await response.json();
      setData(subscriptionData);
      setError(null);
    } catch (err) {
      console.error("Subscription fetch error:", err);
      setError("Failed to load subscription data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  const handleManageBilling = async () => {
    setIsActionLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Please sign in to manage billing");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-billing-portal`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            returnUrl: window.location.href,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to open billing portal");
      }

      if (result.url) {
        window.location.href = result.url;
      }
    } catch (err) {
      console.error("Portal session error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to open billing portal"
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel your subscription? You will retain access until the end of your billing period."
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Please sign in to cancel subscription");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-subscription/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            immediately: false,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to cancel subscription");
      }

      toast.success(
        "Subscription will be canceled at the end of the billing period"
      );
      fetchSubscriptionData(); // Refresh data
    } catch (err) {
      console.error("Cancel subscription error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to cancel subscription"
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsActionLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Please sign in to resume subscription");
        return;
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-subscription/resume`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to resume subscription");
      }

      toast.success("Subscription resumed successfully");
      fetchSubscriptionData(); // Refresh data
    } catch (err) {
      console.error("Resume subscription error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to resume subscription"
      );
    } finally {
      setIsActionLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-600">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button
            onClick={fetchSubscriptionData}
            variant="outline"
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No subscription state
  if (!data?.subscription) {
    const planTier = data?.plan?.tier || "free";
    const planDetails = PLAN_FEATURES[planTier] || PLAN_FEATURES.free;

    return (
      <Card>
        <CardHeader>
          <CardTitle>{planDetails.name} Plan</CardTitle>
          <CardDescription>{planDetails.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {planDetails.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => (window.location.href = "/pricing")}>
            Upgrade to Pro
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { subscription, plan, usage, upcomingInvoice } = data;
  const planTier = plan.tier || plan.name?.split("_")[0] || "professional";
  const planDetails = PLAN_FEATURES[planTier] || PLAN_FEATURES.professional;

  const statusColor: Record<string, string> = {
    active: "bg-green-500",
    trialing: "bg-blue-500",
    past_due: "bg-red-500",
    canceled: "bg-gray-500",
    incomplete: "bg-yellow-500",
    incomplete_expired: "bg-red-500",
    unpaid: "bg-red-500",
  };

  // Get limits from plan features
  const limits = {
    contracts:
      typeof plan.features?.contracts === "number"
        ? plan.features.contracts
        : 500,
    users:
      typeof plan.features?.users === "number" ? plan.features.users : 25,
    vendors:
      typeof plan.features?.vendors === "number" ? plan.features.vendors : -1,
  };

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>
                {plan.display_name || planDetails.name} -{" "}
                {plan.billing_interval === "year" ? "Annual" : "Monthly"}
              </CardDescription>
            </div>
            <Badge className={statusColor[subscription.status] || "bg-gray-500"}>
              {subscription.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Plan details */}
          <div>
            <p className="text-sm text-muted-foreground">
              {plan.description || planDetails.description}
            </p>
          </div>

          {/* Billing info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Current period</p>
              <p className="font-medium">
                {format(new Date(subscription.currentPeriodStart), "MMM d, yyyy")}{" "}
                -{" "}
                {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
              </p>
            </div>
            {upcomingInvoice && (
              <div>
                <p className="text-muted-foreground">Next payment</p>
                <p className="font-medium">
                  ${(upcomingInvoice.amount / 100).toFixed(2)}{" "}
                  {upcomingInvoice.dueDate &&
                    `on ${format(new Date(upcomingInvoice.dueDate), "MMM d, yyyy")}`}
                </p>
              </div>
            )}
          </div>

          {/* Trial info */}
          {subscription.trialEnd &&
            new Date(subscription.trialEnd) > new Date() && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-600">
                    Free trial ends on{" "}
                    {format(new Date(subscription.trialEnd), "MMM d, yyyy")}
                  </p>
                </div>
              </div>
            )}

          {/* Cancellation warning */}
          {subscription.cancelAtPeriodEnd && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950 p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-600">
                  Subscription will end on{" "}
                  {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={handleManageBilling}
              disabled={isActionLoading}
              variant="outline"
            >
              {isActionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 h-4 w-4" />
              )}
              Manage Billing
            </Button>

            {subscription.cancelAtPeriodEnd ? (
              <Button
                onClick={handleResumeSubscription}
                disabled={isActionLoading}
                variant="outline"
              >
                Resume Subscription
              </Button>
            ) : (
              <Button
                onClick={handleCancelSubscription}
                disabled={isActionLoading}
                variant="outline"
                className="text-red-600 hover:text-red-700"
              >
                Cancel Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Current Usage</CardTitle>
          <CardDescription>Usage for the current billing period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(usage).map(([metric, used]) => {
              const limit = limits[metric as keyof typeof limits] ?? -1;
              const percentage = limit > 0 ? (used / limit) * 100 : 0;
              const isUnlimited = limit === -1;

              return (
                <div key={metric} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {metric
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span className="font-medium">
                      {used.toLocaleString()}
                      {!isUnlimited && ` / ${limit.toLocaleString()}`}
                      {isUnlimited && " (Unlimited)"}
                    </span>
                  </div>
                  {!isUnlimited && (
                    <div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percentage >= 90
                            ? "bg-red-500"
                            : percentage >= 70
                              ? "bg-yellow-500"
                              : "bg-green-500"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {planDetails.features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
