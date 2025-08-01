import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';
import { ContractType } from "@/types/contract.types";

interface ContractDataState {
  contracts: ContractType[];
  loading: boolean;
  error: string | null;
  setContracts: (contracts: ContractType[]) => void;
  addContract: (contract: ContractType) => void;
  updateContract: (id: string, contract: Partial<ContractType>) => void;
  deleteContract: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  fetchMoreContracts: (page: number) => Promise<void>;
}

/**
 * Contract data store slice
 * Handles CRUD operations and state management for contracts
 */
export const useContractDataStore = create<ContractDataState>()(
  subscribeWithSelector((set, get) => ({
    contracts: [],
    loading: false,
    error: null,

    setContracts: (contracts) => set({ contracts }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error }),

    addContract: (contract) => {
      set((state) => ({
        contracts: [...state.contracts, contract],
      }));
    },

    updateContract: (id, updatedContract) => {
      set((state) => ({
        contracts: state.contracts.map((contract) =>
          contract._id === id ? { ...contract, ...updatedContract } : contract
        ),
      }));
    },

    deleteContract: (id) => {
      set((state) => ({
        contracts: state.contracts.filter((contract) => contract._id !== id),
      }));
    },

    fetchMoreContracts: async (page: number) => {
      try {
        set({ loading: true });
        const response = await fetch(`/api/contracts?page=${page}`);
        const newContracts = await response.json();
        set((state) => ({
          contracts: [...state.contracts, ...newContracts],
          loading: false,
        }));
      } catch (error) {
        set({ error: (error as Error).message, loading: false });
      }
    },
  }))
);

// Selector hooks for optimal re-renders
export const useContracts = () => useContractDataStore((state) => state.contracts);
export const useContractLoading = () => useContractDataStore((state) => state.loading);
export const useContractError = () => useContractDataStore((state) => state.error);
export const useContractActions = () => useContractDataStore((state) => ({
  setContracts: state.setContracts,
  addContract: state.addContract,
  updateContract: state.updateContract,
  deleteContract: state.deleteContract,
  fetchMoreContracts: state.fetchMoreContracts,
}));