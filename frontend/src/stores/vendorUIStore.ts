import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

/**
 * Vendor UI Store - ONLY UI State (No Server Data!)
 *
 * This store manages ONLY client-side UI state for vendors.
 * All server data (vendors, loading, errors) should come from React Query hooks.
 *
 * Separation of Concerns:
 * - React Query: Server state (vendors data, loading, errors, mutations)
 * - Zustand: UI state (selections, filters, view preferences, modal states, pagination)
 */

export type VendorStatus = 'active' | 'inactive' | 'pending' | 'all';
export type VendorRiskLevel = 'low' | 'medium' | 'high' | 'critical' | 'all';
export type VendorViewMode = 'grid' | 'list' | 'table';
export type VendorSortField = 'name' | 'status' | 'risk_level' | 'performance_score' | 'total_spend' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface VendorFilters {
  status: VendorStatus;
  risk_level: VendorRiskLevel;
  category?: string;
  min_performance_score?: number;
  max_performance_score?: number;
  min_spend?: number;
  max_spend?: number;
}

export interface VendorPaginationState {
  currentPage: number;
  pageSize: number;
}

interface VendorUIState {
  // Selection state
  selectedVendorIds: Set<string>;
  selectedVendorForEdit: string | null;

  // Search and filters
  searchQuery: string;
  filters: VendorFilters;

  // Sorting
  sortBy: VendorSortField;
  sortOrder: SortOrder;

  // View preferences
  viewMode: VendorViewMode;

  // Pagination (UI state only - currentPage, pageSize)
  // Note: totalItems, totalPages, hasMore come from React Query
  pagination: VendorPaginationState;

  // Modal states
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isDetailModalOpen: boolean;

  // Bulk actions
  isBulkActionMode: boolean;
}

interface VendorUIActions {
  // Selection actions
  selectVendor: (id: string) => void;
  deselectVendor: (id: string) => void;
  toggleVendor: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  setSelectedVendorForEdit: (id: string | null) => void;

  // Search and filter actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<VendorFilters>) => void;
  resetFilters: () => void;

  // Sorting actions
  setSortBy: (field: VendorSortField) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSortOrder: () => void;

  // View actions
  setViewMode: (mode: VendorViewMode) => void;

  // Pagination actions (UI only)
  setCurrentPage: (page: number) => void;
  setPageSize: (size: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;

  // Modal actions
  openCreateModal: () => void;
  closeCreateModal: () => void;
  openEditModal: (id: string) => void;
  closeEditModal: () => void;
  openDeleteModal: (id: string) => void;
  closeDeleteModal: () => void;
  openDetailModal: (id: string) => void;
  closeDetailModal: () => void;

  // Bulk action actions
  enableBulkActionMode: () => void;
  disableBulkActionMode: () => void;
  toggleBulkActionMode: () => void;

  // Reset all state
  resetUIState: () => void;
}

type VendorUIStore = VendorUIState & VendorUIActions;

const initialState: VendorUIState = {
  selectedVendorIds: new Set(),
  selectedVendorForEdit: null,
  searchQuery: '',
  filters: {
    status: 'all',
    risk_level: 'all',
  },
  sortBy: 'created_at',
  sortOrder: 'desc',
  viewMode: 'table',
  pagination: {
    currentPage: 1,
    pageSize: 20,
  },
  isCreateModalOpen: false,
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  isDetailModalOpen: false,
  isBulkActionMode: false,
};

export const useVendorUIStore = create<VendorUIStore>()(
  subscribeWithSelector(
    devtools(
      (set) => ({
        ...initialState,

        // Selection actions
        selectVendor: (id) => {
          set((state) => {
            const newSet = new Set(state.selectedVendorIds);
            newSet.add(id);
            return { selectedVendorIds: newSet };
          });
        },

        deselectVendor: (id) => {
          set((state) => {
            const newSet = new Set(state.selectedVendorIds);
            newSet.delete(id);
            return { selectedVendorIds: newSet };
          });
        },

        toggleVendor: (id) => {
          set((state) => {
            const newSet = new Set(state.selectedVendorIds);
            if (newSet.has(id)) {
              newSet.delete(id);
            } else {
              newSet.add(id);
            }
            return { selectedVendorIds: newSet };
          });
        },

        selectAll: (ids) => {
          set({ selectedVendorIds: new Set(ids) });
        },

        deselectAll: () => {
          set({ selectedVendorIds: new Set() });
        },

        setSelectedVendorForEdit: (id) => {
          set({ selectedVendorForEdit: id });
        },

        // Search and filter actions
        setSearchQuery: (query) => {
          set({ searchQuery: query });
        },

        setFilters: (newFilters) => {
          set((state) => ({
            filters: { ...state.filters, ...newFilters }
          }));
        },

        resetFilters: () => {
          set({ filters: { status: 'all', risk_level: 'all' } });
        },

        // Sorting actions
        setSortBy: (field) => {
          set({ sortBy: field });
        },

        setSortOrder: (order) => {
          set({ sortOrder: order });
        },

        toggleSortOrder: () => {
          set((state) => ({
            sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc'
          }));
        },

        // View actions
        setViewMode: (mode) => {
          set({ viewMode: mode });
        },

        // Pagination actions (UI only)
        setCurrentPage: (page) => {
          set((state) => ({
            pagination: { ...state.pagination, currentPage: page }
          }));
        },

        setPageSize: (size) => {
          set((state) => ({
            pagination: { ...state.pagination, pageSize: size, currentPage: 1 }
          }));
        },

        nextPage: () => {
          set((state) => ({
            pagination: { ...state.pagination, currentPage: state.pagination.currentPage + 1 }
          }));
        },

        prevPage: () => {
          set((state) => ({
            pagination: {
              ...state.pagination,
              currentPage: Math.max(1, state.pagination.currentPage - 1)
            }
          }));
        },

        resetPagination: () => {
          set((state) => ({
            pagination: { ...state.pagination, currentPage: 1 }
          }));
        },

        // Modal actions
        openCreateModal: () => {
          set({ isCreateModalOpen: true });
        },

        closeCreateModal: () => {
          set({ isCreateModalOpen: false });
        },

        openEditModal: (id) => {
          set({ isEditModalOpen: true, selectedVendorForEdit: id });
        },

        closeEditModal: () => {
          set({ isEditModalOpen: false, selectedVendorForEdit: null });
        },

        openDeleteModal: (id) => {
          set({ isDeleteModalOpen: true, selectedVendorForEdit: id });
        },

        closeDeleteModal: () => {
          set({ isDeleteModalOpen: false, selectedVendorForEdit: null });
        },

        openDetailModal: (id) => {
          set({ isDetailModalOpen: true, selectedVendorForEdit: id });
        },

        closeDetailModal: () => {
          set({ isDetailModalOpen: false, selectedVendorForEdit: null });
        },

        // Bulk action actions
        enableBulkActionMode: () => {
          set({ isBulkActionMode: true });
        },

        disableBulkActionMode: () => {
          set({ isBulkActionMode: false, selectedVendorIds: new Set() });
        },

        toggleBulkActionMode: () => {
          set((state) => ({
            isBulkActionMode: !state.isBulkActionMode,
            selectedVendorIds: !state.isBulkActionMode ? state.selectedVendorIds : new Set()
          }));
        },

        // Reset all state
        resetUIState: () => {
          set(initialState);
        },
      }),
      {
        name: 'vendor-ui-store',
      }
    )
  )
);

// Selector hooks for optimal re-renders
export const useVendorSelection = () => useVendorUIStore((state) => ({
  selectedVendorIds: state.selectedVendorIds,
  selectedVendorForEdit: state.selectedVendorForEdit,
  selectVendor: state.selectVendor,
  deselectVendor: state.deselectVendor,
  toggleVendor: state.toggleVendor,
  selectAll: state.selectAll,
  deselectAll: state.deselectAll,
}));

export const useVendorSearch = () => useVendorUIStore((state) => ({
  searchQuery: state.searchQuery,
  setSearchQuery: state.setSearchQuery,
}));

export const useVendorFilters = () => useVendorUIStore((state) => ({
  filters: state.filters,
  setFilters: state.setFilters,
  resetFilters: state.resetFilters,
}));

export const useVendorSort = () => useVendorUIStore((state) => ({
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
  setSortBy: state.setSortBy,
  setSortOrder: state.setSortOrder,
  toggleSortOrder: state.toggleSortOrder,
}));

export const useVendorView = () => useVendorUIStore((state) => ({
  viewMode: state.viewMode,
  setViewMode: state.setViewMode,
}));

export const useVendorPagination = () => useVendorUIStore((state) => ({
  pagination: state.pagination,
  setCurrentPage: state.setCurrentPage,
  setPageSize: state.setPageSize,
  nextPage: state.nextPage,
  prevPage: state.prevPage,
  resetPagination: state.resetPagination,
}));

export const useVendorModals = () => useVendorUIStore((state) => ({
  isCreateModalOpen: state.isCreateModalOpen,
  isEditModalOpen: state.isEditModalOpen,
  isDeleteModalOpen: state.isDeleteModalOpen,
  isDetailModalOpen: state.isDetailModalOpen,
  openCreateModal: state.openCreateModal,
  closeCreateModal: state.closeCreateModal,
  openEditModal: state.openEditModal,
  closeEditModal: state.closeEditModal,
  openDeleteModal: state.openDeleteModal,
  closeDeleteModal: state.closeDeleteModal,
  openDetailModal: state.openDetailModal,
  closeDetailModal: state.closeDetailModal,
}));

export const useVendorBulkActions = () => useVendorUIStore((state) => ({
  isBulkActionMode: state.isBulkActionMode,
  enableBulkActionMode: state.enableBulkActionMode,
  disableBulkActionMode: state.disableBulkActionMode,
  toggleBulkActionMode: state.toggleBulkActionMode,
}));
