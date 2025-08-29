import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';

import { ContractType } from "@/types/contract.types";
import { Id } from "@/types/id.types";

import { useContractDataStore } from "./contractDataStore";
import { useContractModalStore } from "./contractModalStore";

interface FormData {
  contractName: string;
  contractType: string;
  contractValue: string;
  contractCategory: string;
  contractOwner: string;
  contractDescription: string;
}

interface FormState {
  startDate: Date | null;
  endDate: Date | null;
  formData: FormData;
  isSubmitting: boolean;
  setStartDate: (date: Date | null) => void;
  setEndDate: (date: Date | null) => void;
  updateFormData: (field: keyof FormData, value: string) => void;
  resetForm: () => void;
  isFormValid: () => boolean;
  submitContract: (vendorName: string, vendorExists: boolean) => Promise<void>;
}

const initialFormData: FormData = {
  contractName: "",
  contractType: "",
  contractValue: "",
  contractCategory: "",
  contractOwner: "",
  contractDescription: "",
};

/**
 * Contract form store slice
 * Manages form state and submission
 */
export const useContractFormStore = create<FormState>()(
  subscribeWithSelector((set, get) => ({
    startDate: null,
    endDate: null,
    formData: { ...initialFormData },
    isSubmitting: false,

    setStartDate: (date) => set({ startDate: date }),
    setEndDate: (date) => set({ endDate: date }),

    updateFormData: (field, value) => {
      set((state) => ({
        formData: {
          ...state.formData,
          [field]: value
        }
      }));
    },

    resetForm: () => {
      set({
        startDate: null,
        endDate: null,
        formData: { ...initialFormData },
        isSubmitting: false,
      });
    },

    isFormValid: () => {
      const state = get();
      return Boolean(
        state.formData.contractName && 
        state.formData.contractType && 
        state.formData.contractValue && 
        state.formData.contractCategory && 
        state.formData.contractOwner && 
        state.startDate && 
        state.endDate
      );
    },

    submitContract: async (vendorName: string, vendorExists: boolean) => {
      const state = get();
      
      if (!vendorExists || !state.isFormValid()) {
        throw new Error("Form is not valid or vendor does not exist");
      }
      
      set({ isSubmitting: true });
      
      try {
        const contractNumber = `CNT-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
        
        const formatDate = (date: Date | null): string => {
          return date ? date.toISOString() : new Date().toISOString();
        };
        
        const contractData: ContractType = {
          _id: `temp_${Math.floor(Math.random() * 10000)}` as Id<"contracts">,
          enterpriseId: "temp_enterprise" as Id<"enterprises">,
          title: state.formData.contractName,
          vendorId: "temp_vendor" as Id<"vendors">,
          status: "draft",
          contractType: (state.formData.contractType || "other") as "nda" | "msa" | "sow" | "saas" | "lease" | "employment" | "partnership" | "other",
          storageId: "temp_storage" as Id<"_storage">,
          fileName: "temp_file.pdf",
          fileType: "application/pdf",
          extractedStartDate: formatDate(state.startDate),
          extractedEndDate: formatDate(state.endDate),
          extractedPricing: state.formData.contractValue,
          notes: state.formData.contractDescription,
          analysisStatus: "pending",
          vendor: {
            _id: "temp_vendor" as Id<"vendors">,
            enterpriseId: "temp_enterprise" as Id<"enterprises">,
            name: vendorName,
            contactEmail: "",
            category: "other"
          }
        };
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Add contract to data store
        useContractDataStore.getState().addContract(contractData);
        
        // Reset form and close modal
        set({ isSubmitting: false });
        get().resetForm();
        useContractModalStore.getState().closeModal();
        
      } catch (error) {
        set({ isSubmitting: false });
        useContractDataStore.getState().setError((error as Error).message);
        throw error;
      }
    },
  }))
);

// Subscribe to modal close to reset form
useContractModalStore.subscribe(
  (state) => state.isModalOpen,
  (isOpen) => {
    if (!isOpen) {
      useContractFormStore.getState().resetForm();
    }
  }
);

// Selector hooks
export const useFormData = () => useContractFormStore((state) => state.formData);
export const useFormDates = () => useContractFormStore((state) => ({
  startDate: state.startDate,
  endDate: state.endDate,
}));
export const useFormSubmitting = () => useContractFormStore((state) => state.isSubmitting);
export const useFormActions = () => useContractFormStore((state) => ({
  setStartDate: state.setStartDate,
  setEndDate: state.setEndDate,
  updateFormData: state.updateFormData,
  isFormValid: state.isFormValid,
  submitContract: state.submitContract,
}));