import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';

interface ModalState {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  resetModalData: () => void;
}

/**
 * Contract modal store slice
 * Manages modal open/close state
 */
export const useContractModalStore = create<ModalState>()(
  subscribeWithSelector((set, get) => ({
    isModalOpen: false,
    
    openModal: () => set({ isModalOpen: true }),
    
    closeModal: () => {
      set({ isModalOpen: false });
      // Trigger reset in other stores
      get().resetModalData();
    },
    
    resetModalData: () => {
      // This will be called by other stores to reset their modal-related data
      // Each store handles its own reset logic
    }
  }))
);

// Selector hooks
export const useModalOpen = () => useContractModalStore((state) => state.isModalOpen);
export const useModalActions = () => useContractModalStore((state) => ({
  openModal: state.openModal,
  closeModal: state.closeModal,
}));