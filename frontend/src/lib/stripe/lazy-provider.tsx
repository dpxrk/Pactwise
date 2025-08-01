"use client";

import { createContext, useContext, ReactNode, useState, useEffect } from "react";
import type { Stripe } from "@stripe/stripe-js";

// Create context
const StripeContext = createContext<{
  stripe: Stripe | null;
  loading: boolean;
  loadStripe: () => Promise<void>;
}>({
  stripe: null,
  loading: false,
  loadStripe: async () => {},
});

// Provider component with lazy loading
export function LazyStripeProvider({ children }: { children: ReactNode }) {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [loading, setLoading] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(false);

  const loadStripe = async () => {
    if (stripe || loading) return;
    
    setLoading(true);
    setShouldLoad(true);
  };

  useEffect(() => {
    if (!shouldLoad) return;

    const initStripe = async () => {
      try {
        const { loadStripe: loadStripeJS } = await import("@stripe/stripe-js");
        const stripeInstance = await loadStripeJS(
          process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
        );
        setStripe(stripeInstance);
      } catch (error) {
        console.error("Failed to load Stripe:", error);
      } finally {
        setLoading(false);
      }
    };

    initStripe();
  }, [shouldLoad]);

  return (
    <StripeContext.Provider value={{ stripe, loading, loadStripe }}>
      {children}
    </StripeContext.Provider>
  );
}

// Hook to use Stripe
export function useLazyStripe() {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error("useLazyStripe must be used within a LazyStripeProvider");
  }
  return context;
}