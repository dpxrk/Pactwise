import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

/**
 * Contract UI Store - ONLY UI State (No Server Data!)
 *
 * This store manages ONLY client-side UI state for contracts.
 * All server data (contracts, loading, errors) should come from React Query hooks.
 *
 * Separation of Concerns:
 * - React Query: Server state (contracts data, loading, errors, mutations)
 * - Zustand: UI state (selections, filters, view preferences, modal states)
 */

export type ContractStatus = 'draft' | 'active' | 'pending' | 'expired' | 'terminated' | 'all';
export type ContractViewMode = 'grid' | 'list' | 'table';
export type ContractSortField = 'name' | 'start_date' | 'end_date' | 'value' | 'status' | 'created_at';
export type SortOrder = 'asc' | 'desc';

export interface ContractFilters {
  status: ContractStatus;
  vendor_id?: string;
  department_id?: string;
  category?: string;
  start_date_from?: string;
  start_date_to?: string;
  end_date_from?: string;
  end_date_to?: string;
  min_value?: number;
  max_value?: number;
}

interface ContractUIState {
  // Selection state
  selectedContractIds: Set<string>;
  selectedContractForEdit: string | null;

  // Search and filters
  searchQuery: string;
  filters: ContractFilters;

  // Sorting
  sortBy: ContractSortField;
  sortOrder: SortOrder;

  // View preferences
  viewMode: ContractViewMode;

  // Modal states
  isCreateModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  isDetailModalOpen: boolean;

  // Bulk actions
  isBulkActionMode: boolean;
}

interface ContractUIActions {
  // Selection actions
  selectContract: (id: string) => void;
  deselectContract: (id: string) => void;
  toggleContract: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  setSelectedContractForEdit: (id: string | null) => void;

  // Search and filter actions
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<ContractFilters>) => void;
  resetFilters: () => void;

  // Sorting actions
  setSortBy: (field: ContractSortField) => void;
  setSortOrder: (order: SortOrder) => void;
  toggleSortOrder: () => void;

  // View actions
  setViewMode: (mode: ContractViewMode) => void;

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

type ContractUIStore = ContractUIState & ContractUIActions;

const initialState: ContractUIState = {
  selectedContractIds: new Set(),
  selectedContractForEdit: null,
  searchQuery: '',
  filters: {
    status: 'all',
  },
  sortBy: 'created_at',
  sortOrder: 'desc',
  viewMode: 'table',
  isCreateModalOpen: false,
  isEditModalOpen: false,
  isDeleteModalOpen: false,
  isDetailModalOpen: false,
  isBulkActionMode: false,
};

export const useContractUIStore = create<ContractUIStore>()(
  subscribeWithSelector(
    devtools(
      (set) => ({
        ...initialState,

        // Selection actions
        selectContract: (id) => {
          set((state) => {
            const newSet = new Set(state.selectedContractIds);
            newSet.add(id);
            return { selectedContractIds: newSet };
          });
        },

        deselectContract: (id) => {
          set((state) => {
            const newSet = new Set(state.selectedContractIds);
            newSet.delete(id);
            return { selectedContractIds: newSet };
          });
        },

        toggleContract: (id) => {
          set((state) => {
            const newSet = new Set(state.selectedContractIds);
            if (newSet.has(id)) {
              newSet.delete(id);
            } else {
              newSet.add(id);
            }
            return { selectedContractIds: newSet };
          });
        },

        selectAll: (ids) => {
          set({ selectedContractIds: new Set(ids) });
        },

        deselectAll: () => {
          set({ selectedContractIds: new Set() });
        },

        setSelectedContractForEdit: (id) => {
          set({ selectedContractForEdit: id });
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
          set({ filters: { status: 'all' } });
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

        // Modal actions
        openCreateModal: () => {
          set({ isCreateModalOpen: true });
        },

        closeCreateModal: () => {
          set({ isCreateModalOpen: false });
        },

        openEditModal: (id) => {
          set({ isEditModalOpen: true, selectedContractForEdit: id });
        },

        closeEditModal: () => {
          set({ isEditModalOpen: false, selectedContractForEdit: null });
        },

        openDeleteModal: (id) => {
          set({ isDeleteModalOpen: true, selectedContractForEdit: id });
        },

        closeDeleteModal: () => {
          set({ isDeleteModalOpen: false, selectedContractForEdit: null });
        },

        openDetailModal: (id) => {
          set({ isDetailModalOpen: true, selectedContractForEdit: id });
        },

        closeDetailModal: () => {
          set({ isDetailModalOpen: false, selectedContractForEdit: null });
        },

        // Bulk action actions
        enableBulkActionMode: () => {
          set({ isBulkActionMode: true });
        },

        disableBulkActionMode: () => {
          set({ isBulkActionMode: false, selectedContractIds: new Set() });
        },

        toggleBulkActionMode: () => {
          set((state) => ({
            isBulkActionMode: !state.isBulkActionMode,
            selectedContractIds: !state.isBulkActionMode ? state.selectedContractIds : new Set()
          }));
        },

        // Reset all state
        resetUIState: () => {
          set(initialState);
        },
      }),
      {
        name: 'contract-ui-store',
      }
    )
  )
);

// Selector hooks for optimal re-renders
export const useContractSelection = () => useContractUIStore((state) => ({
  selectedContractIds: state.selectedContractIds,
  selectedContractForEdit: state.selectedContractForEdit,
  selectContract: state.selectContract,
  deselectContract: state.deselectContract,
  toggleContract: state.toggleContract,
  selectAll: state.selectAll,
  deselectAll: state.deselectAll,
}));

export const useContractSearch = () => useContractUIStore((state) => ({
  searchQuery: state.searchQuery,
  setSearchQuery: state.setSearchQuery,
}));

export const useContractFilters = () => useContractUIStore((state) => ({
  filters: state.filters,
  setFilters: state.setFilters,
  resetFilters: state.resetFilters,
}));

export const useContractSort = () => useContractUIStore((state) => ({
  sortBy: state.sortBy,
  sortOrder: state.sortOrder,
  setSortBy: state.setSortBy,
  setSortOrder: state.setSortOrder,
  toggleSortOrder: state.toggleSortOrder,
}));

export const useContractView = () => useContractUIStore((state) => ({
  viewMode: state.viewMode,
  setViewMode: state.setViewMode,
}));

export const useContractModals = () => useContractUIStore((state) => ({
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

export const useContractBulkActions = () => useContractUIStore((state) => ({
  isBulkActionMode: state.isBulkActionMode,
  enableBulkActionMode: state.enableBulkActionMode,
  disableBulkActionMode: state.disableBulkActionMode,
  toggleBulkActionMode: state.toggleBulkActionMode,
}));
