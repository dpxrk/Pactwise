import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';
import { ContractType } from "@/types/contract.types";
import { useContractDataStore } from "./contractDataStore";

interface SearchState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getFilteredContracts: () => ContractType[];
  clearSearch: () => void;
}

/**
 * Contract search store slice
 * Manages contract search functionality
 */
export const useContractSearchStore = create<SearchState>()(
  subscribeWithSelector((set, get) => ({
    searchQuery: "",

    setSearchQuery: (query) => set({ searchQuery: query }),

    getFilteredContracts: () => {
      const searchQuery = get().searchQuery;
      const contracts = useContractDataStore.getState().contracts;
      
      if (!searchQuery.trim()) return contracts;
      
      const query = searchQuery.toLowerCase();
      return contracts.filter(contract => 
        contract.title.toLowerCase().includes(query) ||
        contract.vendor?.name?.toLowerCase().includes(query) ||
        contract.contractType?.toLowerCase().includes(query) ||
        contract.status?.toLowerCase().includes(query) ||
        contract.extractedPricing?.toLowerCase().includes(query)
      );
    },

    clearSearch: () => set({ searchQuery: "" }),
  }))
);

// Selector hooks
export const useSearchQuery = () => useContractSearchStore((state) => state.searchQuery);
export const useFilteredContracts = () => {
  const searchQuery = useContractSearchStore((state) => state.searchQuery);
  const contracts = useContractDataStore((state) => state.contracts);
  const getFilteredContracts = useContractSearchStore((state) => state.getFilteredContracts);
  
  // Re-compute filtered contracts when either searchQuery or contracts change
  return getFilteredContracts();
};
export const useSearchActions = () => useContractSearchStore((state) => ({
  setSearchQuery: state.setSearchQuery,
  clearSearch: state.clearSearch,
}));