import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/**
 * Dashboard store - simplified for URL-based filtering
 * Search query is kept in local state for controlled input
 * Filtering is now handled via URL parameters in the contracts page
 */
interface DashboardState {
  // Search state (for controlled input only)
  searchQuery: string;

  // UI states
  expandedItems: string[];

  // Actions
  setSearchQuery: (query: string) => void;
  setExpandedItems: (updater: (prev: string[]) => string[]) => void;
  resetState: () => void;
}

const initialState = {
  searchQuery: "",
  expandedItems: [],
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      ...initialState,

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setExpandedItems: (updater) =>
        set((state) => ({
          expandedItems: updater(state.expandedItems),
        })),

      resetState: () => set(initialState),
    }),
    {
      name: "dashboard-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        searchQuery: state.searchQuery,
        expandedItems: state.expandedItems,
      }),
    }
  )
);
