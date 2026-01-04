"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useStripe } from "@/lib/stripe/provider";
import { createClient } from "@/utils/supabase/client";

type PlanTier = "starter" | "professional" | "business";
type BillingPeriod = "monthly" | "annual";

interface CheckoutButtonProps {
  plan: PlanTier;
  billingPeriod: BillingPeriod;
  enterpriseId?: string;
  quantity?: number;
  className?: string;
  children?: React.ReactNode;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

interface CheckoutResponse {
  url: string;
  sessionId: string;
  error?: string;
}

export function CheckoutButton({
  plan,
  billingPeriod,
  enterpriseId,
  quantity = 1,
  className,
  children,
  variant = "default",
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { stripe } = useStripe();

  const handleCheckout = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();

      // Check if user is signed in
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        router.push("/auth/sign-in?redirect=/pricing");
        return;
      }

      // Get user profile for enterprise ID if not provided
      let finalEnterpriseId = enterpriseId;
      if (!finalEnterpriseId) {
        const { data: profile } = await supabase
          .from("users")
          .select("enterprise_id")
          .eq("auth_id", session.user.id)
          .single();

        if (profile?.enterprise_id) {
          finalEnterpriseId = profile.enterprise_id;
        } else {
          toast.error("Could not determine your organization");
          return;
        }
      }

      // Call the checkout edge function
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/stripe-checkout`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            planId: plan,
            billingPeriod,
            quantity,
            successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
            cancelUrl: `${window.location.origin}/pricing?canceled=true`,
          }),
        }
      );

      const data: CheckoutResponse = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 409) {
          toast.error("You already have an active subscription", {
            description: "Use the billing portal to manage your subscription",
            action: {
              label: "Manage Billing",
              onClick: () => router.push("/dashboard/settings/billing"),
            },
          });
          return;
        }
        throw new Error(data.error || "Failed to create checkout session");
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else if (data.sessionId) {
        // Fallback to client-side redirect
        const stripeInstance = await stripe;
        if (stripeInstance) {
          const { error } = await stripeInstance.redirectToCheckout({
            sessionId: data.sessionId,
          });

          if (error) {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start checkout process"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      className={className}
      variant={variant}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </>
      ) : (
        children || "Start Free Trial"
      )}
    </Button>
  );
}
