import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { subscribeWithSelector } from "zustand/middleware";

import { VendorType } from "@/types/vendor.types";

interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasMore: boolean;
  isLoadingMore: boolean;
}

interface VendorState {
  vendors: VendorType[];
  vendorsById: Record<string, VendorType>; // For O(1) lookups
  loading: boolean;
  error: string | null;
  pagination: PaginationState;
}

interface VendorActions {
  // Vendor CRUD operations
  setVendors: (vendors: VendorType[], totalItems?: number) => void;
  addVendor: (vendor: VendorType) => void;
  updateVendor: (id: string, updates: Partial<VendorType>) => void;
  deleteVendor: (id: string) => void;
  
  // Batch operations
  updateVendors: (updates: Array<{ id: string; changes: Partial<VendorType> }>) => void;
  
  // Loading and error states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Pagination
  fetchPage: (page: number) => Promise<void>;
  setPageSize: (size: number) => void;
  resetPagination: () => void;
  
  // Additional vendor-specific operations
  updateVendorStatus: (id: string, status: "active" | "inactive" | "pending") => void;
  updateRiskLevel: (id: string, riskLevel: "low" | "medium" | "high") => void;
  updateComplianceScore: (id: string, score: number) => void;
  updateActiveContracts: (id: string, count: number) => void;
  addVendorSpend: (id: string, amount: number) => void;
  
  // Getters
  getVendorById: (id: string) => VendorType | undefined;
  getVendorsByStatus: (status: string) => VendorType[];
  getVendorsByRiskLevel: (level: string) => VendorType[];
}

type VendorStore = VendorState & VendorActions;

const initialPagination: PaginationState = {
  currentPage: 1,
  pageSize: 20,
  totalItems: 0,
  totalPages: 0,
  hasMore: true,
  isLoadingMore: false,
};

const useVendorStoreBase = create<VendorStore>()(
  subscribeWithSelector(
    devtools(
      immer((set, get) => ({
        // Initial state
        vendors: [],
        vendorsById: {},
        loading: false,
        error: null,
        pagination: initialPagination,

        // Core actions with immer
        setVendors: (vendors, totalItems) => {
          set((state) => {
            state.vendors = vendors;
            state.vendorsById = vendors.reduce((acc, vendor) => {
              acc[vendor._id] = vendor;
              return acc;
            }, {} as Record<string, VendorType>);
            
            if (totalItems !== undefined) {
              state.pagination.totalItems = totalItems;
              state.pagination.totalPages = Math.ceil(totalItems / state.pagination.pageSize);
              state.pagination.hasMore = state.pagination.currentPage < state.pagination.totalPages;
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

        // CRUD operations with immer
        addVendor: (vendor) => {
          set((state) => {
            state.vendors.push(vendor);
            state.vendorsById[vendor._id] = vendor;
            state.pagination.totalItems += 1;
          });
        },

        updateVendor: (id, updates) => {
          set((state) => {
            const vendorIndex = state.vendors.findIndex(v => v._id === id);
            if (vendorIndex !== -1) {
              Object.assign(state.vendors[vendorIndex], updates);
              Object.assign(state.vendorsById[id], updates);
            }
          });
        },

        updateVendors: (updates) => {
          set((state) => {
            updates.forEach(({ id, changes }) => {
              const vendorIndex = state.vendors.findIndex(v => v._id === id);
              if (vendorIndex !== -1) {
                Object.assign(state.vendors[vendorIndex], changes);
                Object.assign(state.vendorsById[id], changes);
              }
            });
          });
        },

        deleteVendor: (id) => {
          set((state) => {
            const index = state.vendors.findIndex(v => v._id === id);
            if (index !== -1) {
              state.vendors.splice(index, 1);
              delete state.vendorsById[id];
              state.pagination.totalItems = Math.max(0, state.pagination.totalItems - 1);
            }
          });
        },

        // Pagination actions
        fetchPage: async (page) => {
          const state = get();
          if (state.pagination.isLoadingMore) return;
          
          set((state) => {
            state.pagination.isLoadingMore = true;
            state.error = null;
          });

          try {
            const response = await fetch(
              `/api/vendors?page=${page}&pageSize=${state.pagination.pageSize}`
            );
            
            if (!response.ok) {
              throw new Error(`Failed to fetch vendors: ${response.statusText}`);
            }

            const data = await response.json();
            
            set((state) => {
              if (page === 1) {
                // Replace vendors for first page
                state.vendors = data.vendors || [];
              } else {
                // Append for subsequent pages
                state.vendors.push(...(data.vendors || []));
              }
              
              // Update lookup map
              (data.vendors || []).forEach((vendor: VendorType) => {
                state.vendorsById[vendor._id] = vendor;
              });
              
              // Update pagination
              state.pagination.currentPage = page;
              state.pagination.totalItems = data.totalItems || 0;
              state.pagination.totalPages = Math.ceil(
                (data.totalItems || 0) / state.pagination.pageSize
              );
              state.pagination.hasMore = page < state.pagination.totalPages;
              state.pagination.isLoadingMore = false;
            });
          } catch (error) {
            set((state) => {
              state.error = (error as Error).message;
              state.pagination.isLoadingMore = false;
            });
          }
        },

        setPageSize: (size) => {
          set((state) => {
            state.pagination.pageSize = size;
            state.pagination.totalPages = Math.ceil(
              state.pagination.totalItems / size
            );
          });
        },

        resetPagination: () => {
          set((state) => {
            state.pagination = initialPagination;
            state.vendors = [];
            state.vendorsById = {};
          });
        },

        // Specific vendor operations with immer
        updateVendorStatus: (id, status) => {
          set((state) => {
            if (state.vendorsById[id]) {
              state.vendorsById[id].status = status;
              const vendor = state.vendors.find(v => v._id === id);
              if (vendor) vendor.status = status;
            }
          });
        },

        updateRiskLevel: (id, riskLevel) => {
          set((state) => {
            if (state.vendorsById[id]) {
              state.vendorsById[id].risk_level = riskLevel;
              const vendor = state.vendors.find(v => v._id === id);
              if (vendor) vendor.risk_level = riskLevel;
            }
          });
        },

        updateComplianceScore: (id, score) => {
          set((state) => {
            if (state.vendorsById[id]) {
              state.vendorsById[id].compliance_score = score;
              const vendor = state.vendors.find(v => v._id === id);
              if (vendor) vendor.compliance_score = score;
            }
          });
        },

        updateActiveContracts: (id, count) => {
          set((state) => {
            if (state.vendorsById[id]) {
              state.vendorsById[id].active_contracts = count;
              const vendor = state.vendors.find(v => v._id === id);
              if (vendor) vendor.active_contracts = count;
            }
          });
        },

        addVendorSpend: (id, amount) => {
          set((state) => {
            if (state.vendorsById[id]) {
              const currentSpend = state.vendorsById[id].total_spend || 0;
              state.vendorsById[id].total_spend = currentSpend + amount;
              
              const vendor = state.vendors.find(v => v._id === id);
              if (vendor) {
                vendor.total_spend = currentSpend + amount;
              }
            }
          });
        },

        // Getters
        getVendorById: (id) => {
          return get().vendorsById[id];
        },

        getVendorsByStatus: (status) => {
          return get().vendors.filter(v => v.status === status);
        },

        getVendorsByRiskLevel: (level) => {
          return get().vendors.filter(v => v.risk_level === level);
        },
      })),
      {
        name: "vendor-store-optimized",
      }
    )
  )
);

// Selector hooks for optimal re-renders
export const useVendors = () => 
  useVendorStoreBase((state) => state.vendors);

export const useVendorById = (id: string) => 
  useVendorStoreBase((state) => state.vendorsById[id]);

export const useVendorLoading = () => 
  useVendorStoreBase((state) => state.loading);

export const useVendorError = () => 
  useVendorStoreBase((state) => state.error);

export const useVendorPagination = () => 
  useVendorStoreBase((state) => state.pagination);

export const useVendorActions = () =>
  useVendorStoreBase((state) => ({
    setVendors: state.setVendors,
    addVendor: state.addVendor,
    updateVendor: state.updateVendor,
    deleteVendor: state.deleteVendor,
    updateVendors: state.updateVendors,
    fetchPage: state.fetchPage,
    setPageSize: state.setPageSize,
    resetPagination: state.resetPagination,
  }));

export const useVendorOperations = () =>
  useVendorStoreBase((state) => ({
    updateVendorStatus: state.updateVendorStatus,
    updateRiskLevel: state.updateRiskLevel,
    updateComplianceScore: state.updateComplianceScore,
    updateActiveContracts: state.updateActiveContracts,
    addVendorSpend: state.addVendorSpend,
  }));

export const useVendorGetters = () =>
  useVendorStoreBase((state) => ({
    getVendorById: state.getVendorById,
    getVendorsByStatus: state.getVendorsByStatus,
    getVendorsByRiskLevel: state.getVendorsByRiskLevel,
  }));

// Export the store itself for backward compatibility
export const useVendorStore = useVendorStoreBase;
export default useVendorStore;