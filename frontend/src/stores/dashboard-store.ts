import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { ContractType } from "@/types/contract.types";
import useContractStore from "@/stores/contract-store";

interface DashboardState {
  // Filter and search states
  selectedType: string;
  searchQuery: string;
  filteredContracts: ContractType[];

  // UI states
  expandedItems: string[];

  // Filter actions
  setSelectedType: (type: string) => void;
  setSearchQuery: (query: string) => void;
  filterContracts: () => void;

  // UI actions
  setExpandedItems: (updater: (prev: string[]) => string[]) => void;
  resetState: () => void;
}

const initialState = {
  selectedType: "All Contracts",
  searchQuery: "",
  expandedItems: [],
  filteredContracts: [],
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSelectedType: (type) => {
        set((state) => ({ ...state, selectedType: type }));
        get().filterContracts();
      },

      setSearchQuery: (query) => {
        set((state) => ({ ...state, searchQuery: query }));
        get().filterContracts();
      },

      setExpandedItems: (updater) =>
        set((state) => ({
          ...state,
          expandedItems: updater(state.expandedItems),
        })),

      filterContracts: () => {
        const contracts = useContractStore.getState().contracts;
        const { selectedType, searchQuery } = get();

        let filtered = [...contracts];

        // Filter by type/status
        if (selectedType !== "All Contracts") {
          filtered = filtered.filter(
            (contract) => contract.status === selectedType.toLowerCase()
          );
        }

        // Filter by search
        if (searchQuery) {
          filtered = filtered.filter((contract) =>
            contract.title.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        set({ filteredContracts: filtered });
      },

      resetState: () => set(initialState),
    }),
    {
      name: "dashboard-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedType: state.selectedType,
        searchQuery: state.searchQuery,
        expandedItems: state.expandedItems,
      }),
    }
  )
);
