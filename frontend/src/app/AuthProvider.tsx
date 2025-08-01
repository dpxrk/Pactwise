"use client";

import { ReactNode, useEffect } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { userAnalytics, errorTracker, healthMonitor } from "@/lib/monitoring";

// Monitoring wrapper component
function MonitoringProvider({ children }: { children: ReactNode }) {
  
  useEffect(() => {
    // Initialize monitoring when the app starts
    if (typeof window !== 'undefined') {
      // Track initial page load
      userAnalytics.track('app_loaded', {
        url: window.location.href,
        timestamp: Date.now(),
      });

      // Clean up on unmount
      return () => {
        healthMonitor.destroy();
        userAnalytics.flush();
      };
    }
    return undefined;
  }, []);

  return <>{children}</>;
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // If environment variables are missing, render children without providers
  if (!publishableKey) {
    console.warn("Missing environment variables. Running in demo mode without authentication.");
    return <>{children}</>;
  }

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <MonitoringProvider>
        {children}
      </MonitoringProvider>
    </ClerkProvider>
  );
}