"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
// import { useAction } from "convex/react";
// import { api } from "@/convex/_generated/api";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useStripe } from "@/lib/stripe/provider";
// import type { Id } from "../../../convex/_generated/dataModel";
type Id<T> = string;

interface CheckoutButtonProps {
  plan: "starter" | "professional";
  billingPeriod: "monthly" | "annual";
  enterpriseId: Id<"enterprises">;
  className?: string;
  children?: React.ReactNode;
}

interface CreateCheckoutSessionArgs {
  plan: "starter" | "professional";
  billingPeriod: "monthly" | "annual";
  enterpriseId: Id<"enterprises">;
  userId: Id<"users">;
  email: string;
  successUrl: string;
  cancelUrl: string;
}

export function CheckoutButton({
  plan,
  billingPeriod,
  enterpriseId,
  className,
  children,
}: CheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { userId, isSignedIn } = useAuth();
  const router = useRouter();
  const { stripe } = useStripe();
  // const createCheckoutSession = useAction(api.stripe.checkout.createCheckoutSession);
  const createCheckoutSession = async (data: CreateCheckoutSessionArgs) => {
    console.log('Mock checkout session:', data);
    return { sessionId: 'mock_session', url: '/dashboard/settings/billing?success=true' };
  };

  const handleCheckout = async () => {
    if (!isSignedIn || !userId) {
      router.push("/sign-in");
      return;
    }

    setIsLoading(true);

    try {
      // Get user email from Clerk
      const user = await fetch("/api/user").then(res => res.json());
      
      // Create checkout session
      const { sessionId, url } = await createCheckoutSession({
        plan,
        billingPeriod,
        enterpriseId,
        userId: user.convexUserId as Id<"users">,
        email: user.email,
        successUrl: `${window.location.origin}/dashboard/settings/billing?success=true`,
        cancelUrl: `${window.location.origin}/pricing?canceled=true`,
      });

      // Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        // Fallback to client-side redirect
        const stripeInstance = await stripe;
        if (stripeInstance) {
          const { error } = await stripeInstance.redirectToCheckout({
            sessionId,
          });
          
          if (error) {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout process");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleCheckout}
      disabled={isLoading}
      className={className}
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
