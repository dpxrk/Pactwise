"use client";

import { loadStripe } from "@stripe/stripe-js";
import { createContext, useContext, ReactNode } from "react";

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

// Create context
const StripeContext = createContext<{
  stripe: ReturnType<typeof loadStripe>;
}>({
  stripe: stripePromise,
});

// Provider component
export function StripeProvider({ children }: { children: ReactNode }) {
  return (
    <StripeContext.Provider value={{ stripe: stripePromise }}>
      {children}
    </StripeContext.Provider>
  );
}

// Hook to use Stripe
export function useStripe() {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error("useStripe must be used within a StripeProvider");
  }
  return context;
}