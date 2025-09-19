import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { devtools } from 'zustand/middleware';

import { ContractType } from "@/types/contract.types";

interface ContractDataState {
  contracts: ContractType[];
  contractsById: Record<string, ContractType>; // O(1) lookups
  loading: boolean;
  error: string | null;
  lastFetch: number | null;
  totalCount: number;
}

interface ContractDataActions {
  setContracts: (contracts: ContractType[], totalCount?: number) => void;
  addContract: (contract: ContractType) => void;
  updateContract: (id: string, updates: Partial<ContractType>) => void;
  deleteContract: (id: string) => void;
  batchUpdateContracts: (updates: Array<{ id: string; changes: Partial<ContractType> }>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Getters
  getContractById: (id: string) => ContractType | undefined;
  getContractsByStatus: (status: string) => ContractType[];
  getContractsByVendor: (vendorId: string) => ContractType[];
  getExpiringContracts: (daysAhead?: number) => ContractType[];
  
  // Cache management
  invalidateCache: () => void;
  isDataStale: (maxAge?: number) => boolean;
}

type ContractDataStore = ContractDataState & ContractDataActions;

/**
 * Optimized contract data store with immer and lookup maps
 */
export const useContractDataStore = create<ContractDataStore>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => ({
        contracts: [],
        contractsById: {},
        loading: false,
        error: null,
        lastFetch: null,
        totalCount: 0,

        setContracts: (contracts, totalCount) => {
          set((state) => {
            state.contracts = contracts;
            state.contractsById = contracts.reduce((acc, contract) => {
              acc[contract._id] = contract;
              return acc;
            }, {} as Record<string, ContractType>);
            state.lastFetch = Date.now();
            if (totalCount !== undefined) {
              state.totalCount = totalCount;
            }
          });
        },

        setLoading: (loading) => {
          set((state) => {
            state.loading = loading;
          });
        },

        setError: (error) => {
          set((state) => {
            state.error = error;
          });
        },

        addContract: (contract) => {
          set((state) => {
            // Add to array
            state.contracts.unshift(contract); // Add to beginning for newest first
            // Add to lookup map
            state.contractsById[contract._id] = contract;
            state.totalCount += 1;
          });
        },

        updateContract: (id, updates) => {
          set((state) => {
            // Find in array and update
            const index = state.contracts.findIndex(c => c._id === id);
            if (index !== -1) {
              Object.assign(state.contracts[index], updates);
            }
            // Update in lookup map
            if (state.contractsById[id]) {
              Object.assign(state.contractsById[id], updates);
            }
          });
        },

        batchUpdateContracts: (updates) => {
          set((state) => {
            updates.forEach(({ id, changes }) => {
              // Update in array
              const index = state.contracts.findIndex(c => c._id === id);
              if (index !== -1) {
                Object.assign(state.contracts[index], changes);
              }
              // Update in lookup map
              if (state.contractsById[id]) {
                Object.assign(state.contractsById[id], changes);
              }
            });
          });
        },

        deleteContract: (id) => {
          set((state) => {
            // Remove from array
            const index = state.contracts.findIndex(c => c._id === id);
            if (index !== -1) {
              state.contracts.splice(index, 1);
            }
            // Remove from lookup map
            delete state.contractsById[id];
            state.totalCount = Math.max(0, state.totalCount - 1);
          });
        },

        // Getters (computed values)
        getContractById: (id) => {
          return get().contractsById[id];
        },

        getContractsByStatus: (status) => {
          const state = get();
          return state.contracts.filter(c => c.status === status);
        },

        getContractsByVendor: (vendorId) => {
          const state = get();
          return state.contracts.filter(c => c.vendorId === vendorId);
        },

        getExpiringContracts: (daysAhead = 30) => {
          const state = get();
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + daysAhead);
          
          return state.contracts.filter(c => {
            if (!c.extractedEndDate) return false;
            const endDate = new Date(c.extractedEndDate);
            return endDate <= futureDate && endDate >= new Date();
          });
        },

        // Cache management
        invalidateCache: () => {
          set((state) => {
            state.lastFetch = null;
          });
        },

        isDataStale: (maxAge = 5 * 60 * 1000) => { // 5 minutes default
          const state = get();
          if (!state.lastFetch) return true;
          return Date.now() - state.lastFetch > maxAge;
        },
      })),
      {
        name: 'contract-data-store-optimized',
      }
    )
  )
);

// Selector hooks for optimal re-renders
export const useContracts = () => 
  useContractDataStore((state) => state.contracts);

export const useContractsById = () => 
  useContractDataStore((state) => state.contractsById);

export const useContractById = (id: string) => 
  useContractDataStore((state) => state.contractsById[id]);

export const useContractLoading = () => 
  useContractDataStore((state) => state.loading);

export const useContractError = () => 
  useContractDataStore((state) => state.error);

export const useContractTotalCount = () => 
  useContractDataStore((state) => state.totalCount);

export const useContractActions = () =>
  useContractDataStore((state) => ({
    setContracts: state.setContracts,
    addContract: state.addContract,
    updateContract: state.updateContract,
    deleteContract: state.deleteContract,
    batchUpdateContracts: state.batchUpdateContracts,
    setLoading: state.setLoading,
    setError: state.setError,
  }));

export const useContractGetters = () =>
  useContractDataStore((state) => ({
    getContractById: state.getContractById,
    getContractsByStatus: state.getContractsByStatus,
    getContractsByVendor: state.getContractsByVendor,
    getExpiringContracts: state.getExpiringContracts,
  }));

export const useContractCache = () =>
  useContractDataStore((state) => ({
    invalidateCache: state.invalidateCache,
    isDataStale: state.isDataStale,
    lastFetch: state.lastFetch,
  }));