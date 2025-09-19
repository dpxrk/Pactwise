import { QueryClient } from "@tanstack/react-query";

// Create a client with optimized defaults
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds
      staleTime: 30 * 1000,
      
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
      
      // Retry failed requests 3 times with exponential backoff
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus
      refetchOnWindowFocus: false,
      
      // Don't refetch on reconnect by default
      refetchOnReconnect: "always",
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      
      // Show error notifications
      onError: (error) => {
        console.error("Mutation error:", error);
      },
    },
  },
});

// Query key factory for consistent key generation
export const queryKeys = {
  all: ["queries"] as const,
  
  contracts: () => [...queryKeys.all, "contracts"] as const,
  contract: (id: string) => [...queryKeys.contracts(), id] as const,
  contractList: (filters?: Record<string, unknown>) =>
    [...queryKeys.contracts(), "list", filters] as const,
  contractInfinite: (filters?: Record<string, unknown>) =>
    [...queryKeys.contracts(), "infinite", filters] as const,
  
  vendors: () => [...queryKeys.all, "vendors"] as const,
  vendor: (id: string) => [...queryKeys.vendors(), id] as const,
  vendorList: (filters?: Record<string, unknown>) =>
    [...queryKeys.vendors(), "list", filters] as const,
  vendorInfinite: (filters?: Record<string, unknown>) =>
    [...queryKeys.vendors(), "infinite", filters] as const,
  
  dashboard: () => [...queryKeys.all, "dashboard"] as const,
  dashboardMetrics: () => [...queryKeys.dashboard(), "metrics"] as const,
  dashboardActivity: () => [...queryKeys.dashboard(), "activity"] as const,
  
  analytics: () => [...queryKeys.all, "analytics"] as const,
  analyticsMetrics: (dateRange?: { start: Date; end: Date }) =>
    [...queryKeys.analytics(), "metrics", dateRange] as const,
  
  user: () => [...queryKeys.all, "user"] as const,
  userProfile: () => [...queryKeys.user(), "profile"] as const,
  userSettings: () => [...queryKeys.user(), "settings"] as const,
} as const;

// Mutation key factory
export const mutationKeys = {
  createContract: ["createContract"] as const,
  updateContract: ["updateContract"] as const,
  deleteContract: ["deleteContract"] as const,
  
  createVendor: ["createVendor"] as const,
  updateVendor: ["updateVendor"] as const,
  deleteVendor: ["deleteVendor"] as const,
  
  updateSettings: ["updateSettings"] as const,
} as const;