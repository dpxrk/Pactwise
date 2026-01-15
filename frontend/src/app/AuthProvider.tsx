"use client";

import { ReactNode, useEffect } from "react";

import { AuthProvider as SupabaseAuthProvider } from "@/contexts/AuthContext";
import { userAnalytics, healthMonitor } from "@/lib/monitoring";

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

  return children;
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <SupabaseAuthProvider>
      <MonitoringProvider>
        {children}
      </MonitoringProvider>
    </SupabaseAuthProvider>
  );
}