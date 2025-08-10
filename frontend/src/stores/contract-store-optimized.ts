import { create } from "zustand";
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { ContractType } from "@/types/contract.types";
import { Id } from "@/types/id.types";

// Separate slices for better performance
interface ContractDataSlice {
  contracts: ContractType[];
  loading: boolean;
  error: string | null;
  setContracts: (contracts: ContractType[]) => void;
  addContract: (contract: ContractType) => void;
  updateContract: (id: string, contract: Partial<ContractType>) => void;
  deleteContract: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface ModalSlice {
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

interface VendorSlice {
  vendorName: string;
  vendorExists: boolean | null;
  vendorSearchPerformed: boolean;
  showVendorDialog: boolean;
  setVendorName: (name: string) => void;
  checkVendorExists: () => void;
  openVendorDialog: () => void;
  closeVendorDialog: () => void;
  createVendor: () => void;
}

interface FormSlice {
  startDate: Date | null;
  endDate: Date | null;
  formData: {
    contractName: string;
    contractType: string;
    contractValue: string;
    contractCategory: string;
    contractOwner: string;
    contractDescription: string;
  };
  isSubmitting: boolean;
  setStartDate: (date: Date | null) => void;
  setEndDate: (date: Date | null) => void;
  updateFormData: (field: string, value: string) => void;
  isFormValid: () => boolean;
  submitContract: () => Promise<void>;
}

interface SearchSlice {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  getFilteredContracts: () => ContractType[];
}

type ContractStore = ContractDataSlice & ModalSlice & VendorSlice & FormSlice & SearchSlice;

// Create store with subscribeWithSelector middleware for selective subscriptions
const useContractStore = create<ContractStore>()(
  subscribeWithSelector((set, get) => ({
    // Contract data slice
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

    // Modal slice
    isModalOpen: false,
    openModal: () => set({ isModalOpen: true }),
    closeModal: () => {
      set({
        isModalOpen: false,
        vendorName: "",
        vendorExists: null,
        vendorSearchPerformed: false,
        startDate: null,
        endDate: null,
        formData: {
          contractName: "",
          contractType: "",
          contractValue: "",
          contractCategory: "",
          contractOwner: "",
          contractDescription: "",
        },
      });
    },

    // Vendor slice
    vendorName: "",
    vendorExists: null,
    vendorSearchPerformed: false,
    showVendorDialog: false,
    setVendorName: (name) => set({ vendorName: name }),
    checkVendorExists: () => {
      const vendorName = get().vendorName;
      if (!vendorName.trim()) return;
      set({ vendorSearchPerformed: true });
    },
    openVendorDialog: () => set({ showVendorDialog: true }),
    closeVendorDialog: () => set({ showVendorDialog: false }),
    createVendor: () => {
      set({ 
        showVendorDialog: false,
        vendorExists: true 
      });
    },

    // Form slice
    startDate: null,
    endDate: null,
    formData: {
      contractName: "",
      contractType: "",
      contractValue: "",
      contractCategory: "",
      contractOwner: "",
      contractDescription: "",
    },
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
    isFormValid: () => {
      const state = get();
      return Boolean(
        state.vendorExists && 
        state.formData.contractName && 
        state.formData.contractType && 
        state.formData.contractValue && 
        state.formData.contractCategory && 
        state.formData.contractOwner && 
        state.startDate && 
        state.endDate
      );
    },
    submitContract: async (): Promise<void> => {
      const state = get();
      if (!state.isFormValid()) return;
      
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
            name: state.vendorName,
            contactEmail: "",
            category: "other"
          }
        };
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        get().addContract(contractData);
        set({ isSubmitting: false });
        get().closeModal();
        
      } catch (error) {
        set({ 
          isSubmitting: false,
          error: (error as Error).message
        });
      }
    },

    // Search slice
    searchQuery: "",
    setSearchQuery: (query) => set({ searchQuery: query }),
    getFilteredContracts: () => {
      const { contracts, searchQuery } = get();
      if (!searchQuery.trim()) return contracts;
      
      const query = searchQuery.toLowerCase();
      return contracts.filter(contract => 
        contract.title.toLowerCase().includes(query) ||
        contract.vendor?.name?.toLowerCase().includes(query) ||
        contract.contractType?.toLowerCase().includes(query)
      );
    }
  }))
);

// Selective subscription hooks for performance
export const useContractData = () => 
  useContractStore((state) => ({
    contracts: state.contracts,
    loading: state.loading,
    error: state.error
  }));

export const useContractActions = () => 
  useContractStore((state) => ({
    setContracts: state.setContracts,
    addContract: state.addContract,
    updateContract: state.updateContract,
    deleteContract: state.deleteContract,
    setLoading: state.setLoading,
    setError: state.setError
  }));

export const useModalState = () => 
  useContractStore((state) => ({
    isModalOpen: state.isModalOpen,
    openModal: state.openModal,
    closeModal: state.closeModal
  }));

export const useVendorState = () => 
  useContractStore((state) => ({
    vendorName: state.vendorName,
    vendorExists: state.vendorExists,
    vendorSearchPerformed: state.vendorSearchPerformed,
    showVendorDialog: state.showVendorDialog,
    setVendorName: state.setVendorName,
    checkVendorExists: state.checkVendorExists,
    openVendorDialog: state.openVendorDialog,
    closeVendorDialog: state.closeVendorDialog,
    createVendor: state.createVendor
  }));

export const useFormState = () => 
  useContractStore((state) => ({
    startDate: state.startDate,
    endDate: state.endDate,
    formData: state.formData,
    isSubmitting: state.isSubmitting,
    setStartDate: state.setStartDate,
    setEndDate: state.setEndDate,
    updateFormData: state.updateFormData,
    isFormValid: state.isFormValid,
    submitContract: state.submitContract
  }));

export const useSearchState = () => 
  useContractStore((state) => ({
    searchQuery: state.searchQuery,
    setSearchQuery: state.setSearchQuery,
    getFilteredContracts: state.getFilteredContracts
  }));

export default useContractStore;