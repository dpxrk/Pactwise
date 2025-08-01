import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';
import { useContractModalStore } from "./contractModalStore";

interface VendorState {
  vendorName: string;
  vendorExists: boolean | null;
  vendorSearchPerformed: boolean;
  showVendorDialog: boolean;
  setVendorName: (name: string) => void;
  checkVendorExists: () => void;
  openVendorDialog: () => void;
  closeVendorDialog: () => void;
  createVendor: () => void;
  resetVendor: () => void;
}

/**
 * Contract vendor store slice
 * Manages vendor selection and creation for contracts
 */
export const useContractVendorStore = create<VendorState>()(
  subscribeWithSelector((set, get) => ({
    vendorName: "",
    vendorExists: null,
    vendorSearchPerformed: false,
    showVendorDialog: false,

    setVendorName: (name) => set({ vendorName: name }),

    checkVendorExists: () => {
      const vendorName = get().vendorName;
      if (!vendorName.trim()) return;
      
      set({ vendorSearchPerformed: true });
      // The actual vendor existence check is handled by the useVendorExistence hook
    },

    openVendorDialog: () => set({ showVendorDialog: true }),
    closeVendorDialog: () => set({ showVendorDialog: false }),

    createVendor: () => {
      // In a real app, this would make an API call to create the vendor
      set({ 
        showVendorDialog: false,
        vendorExists: true 
      });
    },

    resetVendor: () => {
      set({
        vendorName: "",
        vendorExists: null,
        vendorSearchPerformed: false,
        showVendorDialog: false,
      });
    },
  }))
);

// Subscribe to modal close to reset vendor state
useContractModalStore.subscribe(
  (state) => state.isModalOpen,
  (isOpen) => {
    if (!isOpen) {
      useContractVendorStore.getState().resetVendor();
    }
  }
);

// Selector hooks
export const useVendorName = () => useContractVendorStore((state) => state.vendorName);
export const useVendorExists = () => useContractVendorStore((state) => state.vendorExists);
export const useVendorSearchPerformed = () => useContractVendorStore((state) => state.vendorSearchPerformed);
export const useShowVendorDialog = () => useContractVendorStore((state) => state.showVendorDialog);
export const useVendorActions = () => useContractVendorStore((state) => ({
  setVendorName: state.setVendorName,
  checkVendorExists: state.checkVendorExists,
  openVendorDialog: state.openVendorDialog,
  closeVendorDialog: state.closeVendorDialog,
  createVendor: state.createVendor,
}));