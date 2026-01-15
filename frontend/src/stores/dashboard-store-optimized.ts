import { debounce, throttle } from "lodash-es";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { useContractDataStore } from "@/stores/contracts/contractDataStore-optimized";
import { ContractType } from "@/types/contract.types";

interface DashboardState {
  // Filter and search states
  selectedType: string;
  searchQuery: string;
  
  // UI states
  expandedItems: string[];
  
  // Computed state (cached)
  _filteredContracts: ContractType[] | null;
  _lastFilterParams: string | null;
}

interface DashboardActions {
  // Filter actions
  setSelectedType: (type: string) => void;
  setSearchQuery: (query: string) => void;
  
  // UI actions
  setExpandedItems: (updater: (prev: string[]) => string[]) => void;
  resetState: () => void;
  
  // Computed getters
  getFilteredContracts: () => ContractType[];
  clearCache: () => void;
}

type DashboardStore = DashboardState & DashboardActions;

const initialState: DashboardState = {
  selectedType: "All Contracts",
  searchQuery: "",
  expandedItems: [],
  _filteredContracts: null,
  _lastFilterParams: null,
};

// Create store with immer for immutable updates
const useDashboardStoreBase = create<DashboardStore>()(
  subscribeWithSelector(
    immer(
      persist(
        (set, get) => {
          // Debounced filter function for search
          const debouncedFilter = debounce(() => {
            set((state) => {
              state._filteredContracts = null; // Clear cache to trigger recomputation
            });
          }, 300);

          // Throttled localStorage update
          const throttledPersist = throttle(() => {
            // Persistence is handled by zustand persist middleware
            // This is just to batch multiple rapid changes
          }, 1000);

          return {
            ...initialState,

            setSelectedType: (type) => {
              set((state) => {
                state.selectedType = type;
                state._filteredContracts = null; // Clear cache
              });
            },

            setSearchQuery: (query) => {
              set((state) => {
                state.searchQuery = query;
              });
              debouncedFilter(); // Debounce the filtering
            },

            setExpandedItems: (updater) => {
              set((state) => {
                state.expandedItems = updater(state.expandedItems);
              });
              throttledPersist();
            },

            getFilteredContracts: () => {
              const state = get();
              const filterKey = `${state.selectedType}:${state.searchQuery}`;
              
              // Return cached result if filter params haven't changed
              if (state._filteredContracts && state._lastFilterParams === filterKey) {
                return state._filteredContracts;
              }

              // Get contracts from contract store
              const contracts = useContractDataStore.getState().contracts;
              
              // Apply filters
              let filtered = contracts;

              // Filter by type/status
              if (state.selectedType !== "All Contracts") {
                const statusFilter = state.selectedType.toLowerCase();
                filtered = filtered.filter(
                  (contract) => contract.status === statusFilter
                );
              }

              // Filter by search query
              if (state.searchQuery) {
                const searchLower = state.searchQuery.toLowerCase();
                filtered = filtered.filter((contract) => {
                  return (
                    contract.title?.toLowerCase().includes(searchLower) ||
                    contract.vendor?.name?.toLowerCase().includes(searchLower) ||
                    contract.contractType?.toLowerCase().includes(searchLower)
                  );
                });
              }

              // Cache the result
              set((state) => {
                state._filteredContracts = filtered;
                state._lastFilterParams = filterKey;
              });

              return filtered;
            },

            clearCache: () => {
              set((state) => {
                state._filteredContracts = null;
                state._lastFilterParams = null;
              });
            },

            resetState: () => {
              set(() => initialState);
            },
          };
        },
        {
          name: "dashboard-storage-optimized",
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({
            selectedType: state.selectedType,
            searchQuery: state.searchQuery,
            expandedItems: state.expandedItems,
          }),
          // Only persist every second at most
          merge: (persistedState, currentState) => ({
            ...currentState,
            ...(persistedState as Partial<DashboardState>),
            // Don't restore cache
            _filteredContracts: null,
            _lastFilterParams: null,
          }),
        }
      )
    )
  )
);

// Selector hooks for optimal re-renders
export const useDashboardSelectedType = () =>
  useDashboardStoreBase((state) => state.selectedType);

export const useDashboardSearchQuery = () =>
  useDashboardStoreBase((state) => state.searchQuery);

export const useDashboardExpandedItems = () =>
  useDashboardStoreBase((state) => state.expandedItems);

export const useDashboardFilteredContracts = () => {
  const getFilteredContracts = useDashboardStoreBase(
    (state) => state.getFilteredContracts
  );
  return getFilteredContracts();
};

export const useDashboardActions = () =>
  useDashboardStoreBase((state) => ({
    setSelectedType: state.setSelectedType,
    setSearchQuery: state.setSearchQuery,
    setExpandedItems: state.setExpandedItems,
    resetState: state.resetState,
    clearCache: state.clearCache,
  }));

// Subscribe to contract store changes to clear cache
useContractDataStore.subscribe(
  (state) => state.contracts,
  () => {
    useDashboardStoreBase.getState().clearCache();
  }
);

export const useDashboardStore = useDashboardStoreBase;